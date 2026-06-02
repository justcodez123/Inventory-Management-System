const XLSX = require('xlsx');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function fixExcelHeaders() {
  const documentsPath = path.join(os.homedir(), 'Documents');
  const excelPath = path.join(documentsPath, 'Consumer_Sales_Transactions.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.log("Excel file does not exist.");
    return;
  }

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = 'Consumer Sales Transactions';
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      console.log("Worksheet not found.");
      return;
    }

    // Convert sheet to array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Check if the first row is already a header
    const firstRow = data[0];
    if (firstRow && firstRow[0] === 'Date' && firstRow[1] === 'Customer Name') {
      console.log("Headers already exist.");
      return;
    }

    // Unshift the header row
    const headers = [
      'Date', 
      'Customer Name', 
      'Contact No', 
      'Total', 
      'Cash', 
      'Card', 
      'UPI', 
      'Credit', 
      'Items Summary', 
      'Notes'
    ];
    data.unshift(headers);

    // Write back to sheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newWorksheet;
    
    XLSX.writeFile(workbook, excelPath);
    console.log('Successfully added headers to the existing Excel file!');
  } catch (err) {
    console.error('Error fixing excel:', err);
  }
}

fixExcelHeaders();
