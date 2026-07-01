import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import os from 'os'

// Database initialization
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}
let db: Database.Database

function initDb() {
  const dbPath = join(app.getPath('userData'), 'inventory.db')
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS consumer_sales_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_name TEXT,
      contact_no TEXT,
      payment_mode TEXT,
      total_amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN notes TEXT')
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN cash_amount REAL DEFAULT 0')
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN card_amount REAL DEFAULT 0')
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN upi_amount REAL DEFAULT 0')
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN credit_amount REAL DEFAULT 0')
  } catch {
    // Columns already exist
  }

  try {
    db.exec('ALTER TABLE consumer_sales_transactions ADD COLUMN items_summary TEXT')
  } catch {
    // Column already exists
  }

  // Create users table and insert default users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `)

  try {
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)')
    insertUser.run('Rushabh', 'XyzRushabh@123')
    insertUser.run('Aaditya', 'XyzAaditya@123')
  } catch (error) {
    console.error('Failed to insert default users', error)
  }
}

// Excel backup initialization
function backupToExcel(record: any) {
  try {
    const documentsPath = join(os.homedir(), 'Documents')
    const excelPath = join(documentsPath, 'Consumer_Sales_Transactions.xlsx')

    let workbook: XLSX.WorkBook
    let worksheet: XLSX.WorkSheet
    const sheetName = 'Consumer Sales Transactions'

    const newRow = {
      Date: record.date,
      'Customer Name': record.customer_name,
      'Contact No': record.contact_no,
      'Total Sale': record.total_amount,
      Cash: record.cash_amount || 0,
      Card: record.card_amount || 0,
      UPI: record.upi_amount || 0,
      Credit: record.credit_amount || 0,
      'Items Summary': record.items_summary || '',
      Notes: record.notes || ''
    }

    if (existsSync(excelPath)) {
      workbook = XLSX.readFile(excelPath)
      worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        worksheet = XLSX.utils.json_to_sheet([newRow])
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      } else {
        XLSX.utils.sheet_add_json(worksheet, [newRow], { skipHeader: true, origin: -1 })
      }
    } else {
      workbook = XLSX.utils.book_new()
      worksheet = XLSX.utils.json_to_sheet([newRow])
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }
    XLSX.writeFile(workbook, excelPath)
  } catch (error) {
    console.error('Failed to backup to Excel:', error)
  }
}

function createWindow(): void {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. Restart the application to apply the updates.',
        buttons: ['Restart Now', 'Later']
      })
      .then((result) => {
        if (result.response === 0) {
          // User clicked "Restart Now"
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (error) => {
    console.error('Update failed:', error)
  })

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    // icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // Save Bill to PDF
  ipcMain.on('save-bill-pdf', async (event, defaultFilename) => {
    const webContents = event.sender

    try {
      // Prompt user for save location
      const { filePath } = await dialog.showSaveDialog({
        title: 'Save Bill PDF',
        defaultPath: defaultFilename || 'Invoice.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      })

      if (filePath) {
        // printBackground preserves our CSS colors, pageRanges enforces one page
        const pdfData = await webContents.printToPDF({
          printBackground: true,
          pageRanges: '1-1'
        })

        writeFileSync(filePath, pdfData)
        // Optionally send a success message back
        webContents.send('save-pdf-success', filePath)
      }
    } catch (error) {
      console.error('Failed to save PDF:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      webContents.send('save-pdf-error', errorMessage)
    }
  })

  // Show Message Box
  ipcMain.handle('show-message-box', async (_event, options) => {
    return await dialog.showMessageBox(options)
  })

  // Check Duplicate Transaction
  ipcMain.handle('check-duplicate-transaction', (_event, record) => {
    try {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM consumer_sales_transactions 
        WHERE date = @date 
        AND customer_name = @customer_name 
        AND total_amount = @total_amount 
        AND items_summary = @items_summary
      `)
      const result = stmt.get({
        date: record.date,
        customer_name: record.customer_name,
        total_amount: record.total_amount,
        items_summary: record.items_summary
      }) as { count: number }
      return result.count > 0
    } catch (error) {
      console.error('Failed to check duplicate:', error)
      return false // If it fails, default to false so we don't block them forever
    }
  })

  // Submit Transaction
  ipcMain.handle('submit-transaction', async (_event, record) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO consumer_sales_transactions 
        (date, customer_name, contact_no, total_amount, cash_amount, card_amount, upi_amount, credit_amount, notes, items_summary)
        VALUES (@date, @customer_name, @contact_no, @total_amount, @cash_amount, @card_amount, @upi_amount, @credit_amount, @notes, @items_summary)
      `)
      stmt.run(record)

      // Run backup asynchronously so it doesn't block UI
      setTimeout(() => backupToExcel(record), 0)
      return { success: true }
    } catch (error) {
      console.error('Database insert error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get Daily Totals
  ipcMain.handle('get-daily-totals', async (_event, dateStr) => {
    try {
      // dateStr is 'YYYY-MM-DD'
      const row = db
        .prepare(
          `
        SELECT SUM(total_amount) as totalAmount,
               SUM(cash_amount) as totalCash,
               SUM(card_amount) as totalCard,
               SUM(upi_amount) as totalUPI,
               SUM(credit_amount) as totalCredit
        FROM consumer_sales_transactions
        WHERE date = ?
      `
        )
        .get(dateStr) as any

      return {
        Total: row?.totalAmount || 0,
        Cash: row?.totalCash || 0,
        Card: row?.totalCard || 0,
        UPI: row?.totalUPI || 0,
        Credit: row?.totalCredit || 0
      }
    } catch (error) {
      console.error('Failed to get daily totals:', error)
      return { Total: 0, Cash: 0, Card: 0, UPI: 0, Credit: 0 }
    }
  })

  // Get Filtered Records
  ipcMain.handle('get-filtered-records', async (_event, filters) => {
    try {
      let query = 'SELECT * FROM consumer_sales_transactions WHERE 1=1'
      const params: any[] = []

      if (filters.startDate) {
        query += ' AND date >= ?'
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        query += ' AND date <= ?'
        params.push(filters.endDate)
      }
      if (filters.customerName) {
        query += ' AND customer_name LIKE ?'
        params.push(`%${filters.customerName}%`)
      }
      if (filters.contactNo) {
        query += ' AND contact_no LIKE ?'
        params.push(`%${filters.contactNo}%`)
      }
      // if (filters.paymentMode) {
      //   // Since we dropped overall paymentMode, filtering by it requires checking the amounts
      //   if (filters.paymentMode === 'Cash') query += ' AND cash_amount > 0';
      //   else if (filters.paymentMode === 'Card') query += ' AND card_amount > 0';
      //   else if (filters.paymentMode === 'UPI') query += ' AND upi_amount > 0';
      //   else if (filters.paymentMode === 'On Credit') query += ' AND credit_amount > 0';
      // }

      query += ' ORDER BY date DESC, id DESC'

      const records = db.prepare(query).all(params)
      return records
    } catch (error) {
      console.error('Failed to get records:', error)
      return []
    }
  })

  // Delete Record
  ipcMain.handle('delete-record', async (_event, id) => {
    try {
      const stmt = db.prepare('DELETE FROM consumer_sales_transactions WHERE id = ?')
      const result = stmt.run(id)
      return { success: result.changes > 0 }
    } catch (error) {
      console.error('Failed to delete record:', error)
      return { success: false, error: String(error) }
    }
  })

  // Verify Login
  ipcMain.handle('verify-login', async (_event, { username, password }) => {
    try {
      const stmt = db.prepare('SELECT id FROM users WHERE username = ? AND password = ?')
      const user = stmt.get(username, password)
      if (user) {
        return { success: true }
      }
      return { success: false, error: 'Invalid username or password' }
    } catch (error) {
      console.error('Login verification failed:', error)
      return { success: false, error: String(error) }
    }
  })

  createWindow()

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
