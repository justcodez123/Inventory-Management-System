const XLSX = require('xlsx');
const path = require('path');
const os = require('os');

const excelPath = path.join(os.homedir(), 'Documents', 'Consumer_Sales_Transactions.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = 'Consumer Sales Transactions';
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log("Total rows:", data.length);
console.log("Row 1:", data[0]);
console.log("Row 2:", data[1]);
console.log("Row 3:", data[2]);
