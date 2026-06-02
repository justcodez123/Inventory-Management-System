// const Database = require('better-sqlite3');
// const XLSX = require('xlsx');
// const path = require('path');
// const os = require('os');
// const fs = require('fs');

// async function fixExcel() {
//   const dbPath = path.join(os.homedir(), '.config', 'Electron', 'inventory.db'); // Note: 'Electron' might be different, let's use app.getPath if we can? Actually, let's just query the current db. Wait, let's just use the known path. If it's not Electron, it's whatever the app name is.
//   // Wait, looking at the main/index.ts, app.getPath('userData') is used. In dev mode on Linux, it's usually ~/.config/Electron
  
//   try {
//     const db = new Database(dbPath);
//     const records = db.prepare('SELECT * FROM consumer_sales_transactions ORDER BY id ASC').all();
    
//     const excelData = records.map(record => ({
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
//     }));

//     const documentsPath = path.join(os.homedir(), 'Documents');
//     const excelPath = path.join(documentsPath, 'Consumer_Sales_Transactions.xlsx');
    
//     const workbook = XLSX.utils.book_new();
//     const worksheet = XLSX.utils.json_to_sheet(excelData);
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumer Sales Transactions');
    
//     XLSX.writeFile(workbook, excelPath);
//     console.log('Successfully recreated Excel file with headers and', records.length, 'records.');
//   } catch (err) {
//     console.error('Error fixing excel:', err);
//   }
// }

// fixExcel();
