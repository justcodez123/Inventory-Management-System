import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
//import { writeFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import sqlite3 from 'sqlite3';
const sqlite = sqlite3.verbose();

//import * as XLSX from 'xlsx'
import os from 'os'
import http from 'http'
import 'dotenv/config'
import {
  initLicenseSchema,
  getLicenseStatus,
  registerAppUser,
  updateClockHeartbeat,
  syncSubscriptionWithN8N,
  getMachineId
} from './licenseService'

let latestPdfBuffer: Buffer | null = null
const localServerPort = 4988
let localIp = 'localhost'

try {
  const ifaces = os.networkInterfaces()
  for (const dev in ifaces) {
    ifaces[dev]?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        localIp = details.address
      }
    })
  }
} catch (e) {
  console.error('Failed to get local IP', e)
}

// Start embedded local HTTP server for Wi-Fi direct downloads
const localServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url?.startsWith('/invoice.pdf')) {
    if (!latestPdfBuffer) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('No invoice generated yet.')
      return
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="AddyStudio_Invoice.pdf"',
      'Content-Length': latestPdfBuffer.length
    })
    res.end(latestPdfBuffer)
    return
  }
  // Mobile-friendly landing page with auto-download script
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Addy's Studio Invoice</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:2.5rem 1rem;background:#f9fafb;color:#1f2937}h1{margin-bottom:0.25rem;font-size:1.6rem}p{color:#6b7280;font-size:0.95rem}.btn{display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;margin-top:1.5rem;box-shadow:0 4px 14px rgba(79,70,229,0.3)}</style></head><body><h1>Addy's Studio</h1><p>Your official PDF invoice is ready.</p><a href="/invoice.pdf" class="btn" download="AddyStudio_Invoice.pdf">📥 Download PDF Bill</a><script>setTimeout(()=>{location.href='/invoice.pdf';},400);</script></body></html>`)
})

localServer.listen(localServerPort, '0.0.0.0', () => {
  console.log(`Local invoice server started on http://${localIp}:${localServerPort}`)
})

// Database initialization
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}
let db: sqlite3.Database;

function initDb() {
  const dbPath = join(app.getPath('userData'), 'inventory.db')
  db = new sqlite.Database(dbPath, (err) => {
    if (err) console.error('Failed to open DB', err)
  })

  // Ensure table exists with all standard columns
  db.exec(`
    CREATE TABLE IF NOT EXISTS consumer_sales_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_name TEXT,
      contact_no TEXT,
      payment_mode TEXT,
      total_amount REAL,
      cash_amount REAL DEFAULT 0,
      card_amount REAL DEFAULT 0,
      upi_amount REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      notes TEXT,
      items_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // For existing databases, dynamically add any missing columns safely
  db.all('PRAGMA table_info(consumer_sales_transactions)', (err, rows: any[]) => {
    if (err || !Array.isArray(rows)) return
    const existingCols = new Set(rows.map((r) => r.name))
    const requiredCols = [
      { name: 'cash_amount', def: 'REAL DEFAULT 0' },
      { name: 'card_amount', def: 'REAL DEFAULT 0' },
      { name: 'upi_amount', def: 'REAL DEFAULT 0' },
      { name: 'credit_amount', def: 'REAL DEFAULT 0' },
      { name: 'notes', def: 'TEXT' },
      { name: 'items_summary', def: 'TEXT' }
    ]

    requiredCols.forEach(({ name, def }) => {
      if (!existingCols.has(name)) {
        db.run(`ALTER TABLE consumer_sales_transactions ADD COLUMN ${name} ${def}`, (alterErr) => {
          if (alterErr) console.warn(`Migration note for column ${name}:`, alterErr.message)
        })
      }
    })
  })

  // Create users table and insert default users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `)

  // Automatically ensure default authentication credentials (embeds password.js logic)
  try {
    const defaultUser = process.env.USER1_NAME || 'user'
    const defaultPass = process.env.USER1_PASSWORD || '1232131972'

    db.get('SELECT id, username, password FROM users WHERE username = ?', [defaultUser], (err, row: any) => {
      if (err) {
        console.error('[Auth] Failed to query users table:', err)
        return
      }

      if (!row) {
        // If 'user' doesn't exist yet, check if id=1 exists to update it (password.js logic) or insert fresh
        db.get('SELECT id FROM users WHERE id = 1', (idErr, idRow: any) => {
          if (!idErr && idRow) {
            db.run(
              'UPDATE users SET username = ?, password = ? WHERE id = 1',
              [defaultUser, defaultPass],
              (updateErr) => {
                if (updateErr) console.error('[Auth] Failed to set default user credentials:', updateErr)
                else console.log(`[Auth] User credentials set for id=1 (username: "${defaultUser}")`)
              }
            )
          } else {
            db.run(
              'INSERT OR IGNORE INTO users (id, username, password) VALUES (1, ?, ?)',
              [defaultUser, defaultPass],
              (insertErr) => {
                if (insertErr) console.error('[Auth] Failed to insert default user:', insertErr)
                else console.log(`[Auth] Default user initialized (id=1, username: "${defaultUser}")`)
              }
            )
          }
        })
      } else if (!row.password || row.password === 'undefined') {
        db.run('UPDATE users SET password = ? WHERE id = ?', [defaultPass, row.id], (updErr) => {
          if (updErr) console.error('[Auth] Failed to repair empty password:', updErr)
          else console.log('[Auth] Password set successfully for user.')
        })
      } else {
        console.log(`[Auth] Verified active credentials for "${row.username}".`)
      }
    })
  } catch (error) {
    console.error('Failed to initialize default user credentials', error)
  }

  // Wholesalers & Vendor Khata Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS wholesalers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      city TEXT,
      notes TEXT,
      opening_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wholesaler_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wholesaler_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      transaction_type TEXT DEFAULT 'PURCHASE',
      product TEXT,
      quantity INTEGER DEFAULT 0,
      bill_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      pending_amount REAL DEFAULT 0,
      running_outstanding REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wholesaler_id) REFERENCES wholesalers (id) ON DELETE CASCADE
    );
  `)

  // Seed default wholesalers if table is brand new
  db.get('SELECT COUNT(*) as count FROM wholesalers', (err, row: any) => {
    if (!err && row && row.count === 0) {
      // 1. Hariyan Wholesale (Opening balance of 1,00,000 as per user note)
      db.run(
        'INSERT INTO wholesalers (name, phone, city, notes, opening_balance) VALUES (?, ?, ?, ?, ?)',
        ['Hariyan Wholesale', '+91 98230 11223', 'Haryana', 'Lease supplier for denim & shirts', 100000],
        function (insertErr) {
          if (!insertErr && this.lastID) {
            const hId = this.lastID
            // Insert exact handwritten entry: Date: 14/05/2026, Product: Jeans, Qty: 56, Amt: 56000, Paid: 25000, Pending: 31000, Outstanding: 131000
            db.run(
              `INSERT INTO wholesaler_transactions 
               (wholesaler_id, date, transaction_type, product, quantity, bill_amount, paid_amount, pending_amount, running_outstanding, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [hId, '2026-05-14', 'PURCHASE', 'Jeans', 56, 56000, 25000, 31000, 131000, 'Taken on credit / lease']
            )
          }
        }
      )
      // 2. Mumbai Wholesaler
      db.run(
        'INSERT INTO wholesalers (name, phone, city, notes, opening_balance) VALUES (?, ?, ?, ?, ?)',
        ['Mumbai Wholesaler', '+91 98190 44556', 'Mumbai', 'Wholesale supplier for jackets & trousers', 0]
      )
      // 3. Delhi Wholesaler
      db.run(
        'INSERT INTO wholesalers (name, phone, city, notes, opening_balance) VALUES (?, ?, ?, ?, ?)',
        ['Delhi Wholesaler', '+91 98110 77889', 'Delhi', 'Cotton & casual wear supplier', 0]
      )
    }
  })

  // Initialize licensing and anti-tamper registration table
  initLicenseSchema(db).catch((err) => console.error('Failed to init license schema:', err))
}

// Helper async wrappers for sqlite3
const runAsync = (sql: string, params: any[] = []) => new Promise<void>((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve();
  });
});
const runAsyncChanges = (sql: string, params: any[] = []) => new Promise<number>((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this.changes);
  });
});
const getAsync = (sql: string, params: any[] = []) => new Promise<any>((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});
const allAsync = (sql: string, params: any[] = []) => new Promise<any[]>((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Excel backup initialization
// function backupToExcel(record: any) {
//   try {
//     const documentsPath = join(os.homedir(), 'Documents')
//     const excelPath = join(documentsPath, 'Consumer_Sales_Transactions.xlsx')

//     let workbook: XLSX.WorkBook
//     let worksheet: XLSX.WorkSheet
//     const sheetName = 'Consumer Sales Transactions'

//     const newRow = {
//       Date: record.date,
//       'Customer Name': record.customer_name,
//       'Contact No': record.contact_no,
//       'Total Sale': record.total_amount,
//       Cash: record.cash_amount || 0,
//       Card: record.card_amount || 0,
//       UPI: record.upi_amount || 0,
//       Credit: record.credit_amount || 0,
//       'Items Summary': record.items_summary || '',
//       Notes: record.notes || ''
//     }

//     if (existsSync(excelPath)) {
//       workbook = XLSX.readFile(excelPath)
//       worksheet = workbook.Sheets[sheetName]
//       if (!worksheet) {
//         worksheet = XLSX.utils.json_to_sheet([newRow])
//         XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
//       } else {
//         XLSX.utils.sheet_add_json(worksheet, [newRow], { skipHeader: true, origin: -1 })
//       }
//     } else {
//       workbook = XLSX.utils.book_new()
//       worksheet = XLSX.utils.json_to_sheet([newRow])
//       XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
//     }
//     XLSX.writeFile(workbook, excelPath)
//   } catch (error) {
//     console.error('Failed to backup to Excel:', error)
//   }
// }

let mainWindow: BrowserWindow | null = null

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Update available (v${info.version}). Downloading silently in the background...`)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] App is up to date.')
  })

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error encountered:', error)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdater] Update downloaded (v${info.version}). Forcing restart to install...`)

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    let hasInstalled = false
    const forceRestart = (): void => {
      if (!hasInstalled) {
        hasInstalled = true
        autoUpdater.quitAndInstall(false, true)
      }
    }

    // Failsafe timer: forces app to restart and install within 10 seconds even if left unattended
    const forceTimeout = setTimeout(forceRestart, 10000)

    const dialogOptions = {
      type: 'info' as const,
      title: 'Update Ready - Restart Required',
      message: `A new version (v${info.version}) has been downloaded.\n\nThe application will now restart to apply updates.`,
      buttons: ['Restart & Update Now'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }

    const showDialogPromise =
      mainWindow && !mainWindow.isDestroyed()
        ? dialog.showMessageBox(mainWindow, dialogOptions)
        : dialog.showMessageBox(dialogOptions)

    showDialogPromise
      .then(() => {
        clearTimeout(forceTimeout)
        forceRestart()
      })
      .catch(() => {
        clearTimeout(forceTimeout)
        forceRestart()
      })
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  initDb()
  setupAutoUpdater()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Show Message Box
  ipcMain.handle('show-message-box', async (_event, options) => {
    return await dialog.showMessageBox(options)
  })

  // Subscription & Licensing IPCs
  ipcMain.handle('get-license-status', async () => {
    return await getLicenseStatus(db)
  })

  ipcMain.handle('register-app-user', async (_event, data) => {
    return await registerAppUser(db, data)
  })

  ipcMain.handle('sync-subscription-status', async () => {
    return await syncSubscriptionWithN8N(db)
  })

  ipcMain.handle('get-machine-id', async () => {
    return getMachineId()
  })

  // Upload PDF Invoice via Node.js (no browser CORS)
  ipcMain.handle('upload-pdf-invoice', async (_event, { pdfBase64, fileName }) => {
    const buffer = Buffer.from(pdfBase64, 'base64')
    latestPdfBuffer = buffer
    const finalFileName = fileName || 'AddyStudio_Invoice.pdf'

    // 1. Primary Cloud Provider: Catbox
    try {
      const form = new FormData()
      form.append('reqtype', 'fileupload')
      form.append('fileToUpload', new Blob([buffer], { type: 'application/pdf' }), finalFileName)

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form
      })

      if (res.ok) {
        const cloudUrl = (await res.text()).trim()
        if (cloudUrl.startsWith('http')) {
          return {
            success: true,
            cloudUrl,
            localUrl: `http://${localIp}:${localServerPort}/invoice.pdf`
          }
        }
      }
    } catch {
      // Primary cloud provider failed, continue to fallback
    }

    // 2. Secondary Cloud Provider: tmpfiles.org
    try {
      const tmpForm = new FormData()
      tmpForm.append('file', new Blob([buffer], { type: 'application/pdf' }), finalFileName)

      const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: tmpForm
      })

      if (tmpRes.ok) {
        const json = (await tmpRes.json()) as { data?: { url?: string } }
        if (json?.data?.url) {
          const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
          return {
            success: true,
            cloudUrl: directUrl,
            localUrl: `http://${localIp}:${localServerPort}/invoice.pdf`
          }
        }
      }
    } catch {
      // Secondary cloud provider failed, continue to local Wi-Fi fallback
    }

    // 3. Offline / Local Network Fallback: Embedded HTTP Server on LAN Wi-Fi
    console.log(`[Invoice] Using local Wi-Fi direct link: http://${localIp}:${localServerPort}/invoice.pdf`)
    return {
      success: false,
      localUrl: `http://${localIp}:${localServerPort}/invoice.pdf`
    }
  })

  // Guard helper: Enforce subscription lock and anti-tamper across all IPC operations
  async function assertLicenseActive(): Promise<void> {
    const license = await getLicenseStatus(db)
    if (license.isLocked) {
      const reason =
        license.lockReason === 'CLOCK_TAMPERED'
          ? 'Security Alert: Database signature or system clock tampering detected.'
          : license.lockReason === 'TRIAL_EXPIRED'
            ? 'Free trial has expired. Please renew.'
            : 'Subscription is pending or expired.'
      throw new Error(reason)
    }
  }

  // Check Duplicate Transaction
ipcMain.handle('check-duplicate-transaction', async (_event, record) => {
  try {
    await assertLicenseActive();
    const result = await getAsync(
      `SELECT COUNT(*) as count FROM consumer_sales_transactions 
       WHERE date = ? AND customer_name = ? AND total_amount = ? AND items_summary = ?`,
      [record.date, record.customer_name, record.total_amount, record.items_summary]
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error('Failed to check duplicate:', error);
    return false; // If it fails, default to false so we don't block them forever
  }
});

  // Submit Transaction
ipcMain.handle('submit-transaction', async (_event, record) => {
  try {
    await assertLicenseActive();

    await runAsync(
      `INSERT INTO consumer_sales_transactions 
       (date, customer_name, contact_no, total_amount, cash_amount, card_amount, upi_amount, credit_amount, notes, items_summary)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        record.date,
        record.customer_name,
        record.contact_no,
        record.total_amount,
        record.cash_amount,
        record.card_amount,
        record.upi_amount,
        record.credit_amount,
        record.notes,
        record.items_summary
      ]
    );
    //setTimeout(() => backupToExcel(record), 0);
    return { success: true };
  } catch (error) {
    console.error('Database insert error:', error);
    return { success: false, error: String(error) };
  }
});

  // Get Daily Totals
ipcMain.handle('get-daily-totals', async (_event, dateStr) => {
  try {
    await assertLicenseActive();
    const row = await getAsync(
      `SELECT SUM(total_amount) as totalAmount,
              SUM(cash_amount) as totalCash,
              SUM(card_amount) as totalCard,
              SUM(upi_amount) as totalUPI,
              SUM(credit_amount) as totalCredit
       FROM consumer_sales_transactions
       WHERE date = ?`,
      [dateStr]
    );
    return {
      Total: row?.totalAmount || 0,
      Cash: row?.totalCash || 0,
      Card: row?.totalCard || 0,
      UPI: row?.totalUPI || 0,
      Credit: row?.totalCredit || 0
    };
  } catch (error) {
    console.error('Failed to get daily totals:', error);
    return { Total: 0, Cash: 0, Card: 0, UPI: 0, Credit: 0 };
  }
});

  // Get Filtered Records
ipcMain.handle('get-filtered-records', async (_event, filters) => {
  try {
    await assertLicenseActive();
    let query = 'SELECT * FROM consumer_sales_transactions WHERE 1=1';
    const params: any[] = [];

    if (filters.startDate) { query += ' AND date >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { query += ' AND date <= ?'; params.push(filters.endDate); }
    if (filters.customerName) { query += ' AND customer_name LIKE ?'; params.push(`%${filters.customerName}%`); }
    if (filters.contactNo) { query += ' AND contact_no LIKE ?'; params.push(`%${filters.contactNo}%`); }

    query += ' ORDER BY date DESC, id DESC';

    const records = await allAsync(query, params);
    return records;
  } catch (error) {
    console.error('Failed to get records:', error);
    return [];
  }
});

  // Delete Record
ipcMain.handle('delete-record', async (_event, id) => {
  try {
    await assertLicenseActive();
    const changes = await runAsyncChanges('DELETE FROM consumer_sales_transactions WHERE id = ?', [id]);
    return { success: changes > 0 };
  } catch (error) {
    console.error('Failed to delete record:', error);
    return { success: false, error: String(error) };
  }
});

  // Verify Login
ipcMain.handle('verify-login', async (_event, { username, password }) => {
  try {
    const user = await getAsync('SELECT id FROM users WHERE username = ? AND password = ?', [username, password]);
    if (user) {
      return { success: true };
    }
    return { success: false, error: 'Invalid username or password' };
  } catch (error) {
    console.error('Login verification failed:', error);
    return { success: false, error: String(error) };
  }
});

  // Update / Set User Password
ipcMain.handle('update-user-password', async (_event, { username, newPassword }) => {
  try {
    if (!username || !newPassword) {
      return { success: false, error: 'Username and new password are required' };
    }
    await runAsync('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);
    return { success: true };
  } catch (error) {
    console.error('Failed to update password:', error);
    return { success: false, error: String(error) };
  }
});

  // ================= VENDORS & WHOLESALERS IPC HANDLERS =================

  // Get all vendors with aggregate stats
  ipcMain.handle('get-vendors', async () => {
    try {
      await assertLicenseActive();
      const rows = await allAsync(`
        SELECT w.id, w.name, w.phone, w.city, w.notes, w.opening_balance, w.created_at,
               COALESCE(SUM(t.quantity), 0) as total_quantity,
               COALESCE(SUM(t.bill_amount), 0) as total_purchases,
               COALESCE(SUM(t.paid_amount), 0) as total_paid,
               (w.opening_balance + COALESCE(SUM(t.bill_amount - t.paid_amount), 0)) as current_outstanding
        FROM wholesalers w
        LEFT JOIN wholesaler_transactions t ON w.id = t.wholesaler_id
        GROUP BY w.id
        ORDER BY w.name ASC
      `);
      return rows;
    } catch (error) {
      console.error('Failed to get vendors:', error);
      return [];
    }
  });

  // Add new vendor
  ipcMain.handle('add-vendor', async (_event, vendor) => {
    try {
      await assertLicenseActive();
      await runAsync(
        `INSERT INTO wholesalers (name, phone, city, notes, opening_balance) VALUES (?, ?, ?, ?, ?)`,
        [
          vendor.name?.trim(),
          vendor.phone || '',
          vendor.city || '',
          vendor.notes || '',
          Number(vendor.opening_balance) || 0
        ]
      );
      return { success: true };
    } catch (error) {
      console.error('Failed to add vendor:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update existing vendor
  ipcMain.handle('update-vendor', async (_event, vendor) => {
    try {
      await assertLicenseActive();
      await runAsync(
        `UPDATE wholesalers SET name = ?, phone = ?, city = ?, notes = ?, opening_balance = ? WHERE id = ?`,
        [
          vendor.name?.trim(),
          vendor.phone || '',
          vendor.city || '',
          vendor.notes || '',
          Number(vendor.opening_balance) || 0,
          vendor.id
        ]
      );
      return { success: true };
    } catch (error) {
      console.error('Failed to update vendor:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete vendor and all transactions
  ipcMain.handle('delete-vendor', async (_event, id) => {
    try {
      await assertLicenseActive();
      await runAsync('DELETE FROM wholesaler_transactions WHERE wholesaler_id = ?', [id]);
      await runAsync('DELETE FROM wholesalers WHERE id = ?', [id]);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get transactions for a vendor
  ipcMain.handle('get-vendor-transactions', async (_event, vendorId) => {
    try {
      await assertLicenseActive();
      const rows = await allAsync(
        `SELECT * FROM wholesaler_transactions WHERE wholesaler_id = ? ORDER BY date DESC, id DESC`,
        [vendorId]
      );
      return rows;
    } catch (error) {
      console.error('Failed to get vendor transactions:', error);
      return [];
    }
  });

  // Add vendor transaction (Purchase/Lease or Payment Settlement)
  ipcMain.handle('add-vendor-transaction', async (_event, tx) => {
    try {
      await assertLicenseActive();
      const billAmount = Number(tx.bill_amount) || 0;
      const paidAmount = Number(tx.paid_amount) || 0;
      const pendingAmount = billAmount - paidAmount;

      // Calculate current cumulative balance
      const vendor = await getAsync('SELECT opening_balance FROM wholesalers WHERE id = ?', [tx.wholesaler_id]);
      const prevTransactions = await allAsync(
        'SELECT bill_amount, paid_amount FROM wholesaler_transactions WHERE wholesaler_id = ?',
        [tx.wholesaler_id]
      );

      let prevTotalOutstanding = vendor ? Number(vendor.opening_balance) || 0 : 0;
      prevTransactions.forEach((t) => {
        prevTotalOutstanding += (Number(t.bill_amount) || 0) - (Number(t.paid_amount) || 0);
      });

      const newRunningOutstanding = prevTotalOutstanding + pendingAmount;

      await runAsync(
        `INSERT INTO wholesaler_transactions 
         (wholesaler_id, date, transaction_type, product, quantity, bill_amount, paid_amount, pending_amount, running_outstanding, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.wholesaler_id,
          tx.date,
          tx.transaction_type || 'PURCHASE',
          tx.product || '',
          Number(tx.quantity) || 0,
          billAmount,
          paidAmount,
          pendingAmount,
          newRunningOutstanding,
          tx.notes || ''
        ]
      );
      return { success: true };
    } catch (error) {
      console.error('Failed to add vendor transaction:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete vendor transaction
  ipcMain.handle('delete-vendor-transaction', async (_event, id) => {
    try {
      await assertLicenseActive();
      const changes = await runAsyncChanges('DELETE FROM wholesaler_transactions WHERE id = ?', [id]);
      return { success: changes > 0 };
    } catch (error) {
      console.error('Failed to delete vendor transaction:', error);
      return { success: false, error: String(error) };
    }
  });

  createWindow()

  // Monotonic clock heartbeat & database signature integrity ticker (every 5s)
  setInterval(() => {
    updateClockHeartbeat(db)
  }, 5 * 1000)

  // Sync subscription status with n8n on startup and every 5 minutes
  syncSubscriptionWithN8N(db).catch(() => {})
  setInterval(() => {
    syncSubscriptionWithN8N(db).catch(() => {})
  }, 5 * 60 * 1000)

  // In production, trigger check for updates on startup and check periodically
  if (!is.dev) {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] Initial update check failed:', err)
    })

    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[AutoUpdater] Periodic update check failed:', err)
      })
    }, 60 * 60 * 1000)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
