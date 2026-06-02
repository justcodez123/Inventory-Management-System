const XLSX = require('xlsx');

const newRow = {
  Date: '2026-06-02',
  'Customer Name': 'Shaahbaaz',
  'Contact No': '',
  'Total Sale': 4000,
  Cash: 0,
  Card: 0,
  UPI: 4000,
  Credit: 0,
  'Items Summary': '5x Trousers (Size: Xl)',
  Notes: ''
};

const worksheet = XLSX.utils.json_to_sheet([newRow]);
console.log(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));
