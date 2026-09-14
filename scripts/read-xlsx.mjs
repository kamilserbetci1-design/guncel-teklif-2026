import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = '/Users/onurcelebi/Downloads/ikas-urunler (2).xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\nColumn headers:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}
console.log('\nFirst 3 rows (sample):');
data.slice(0, 3).forEach((row, i) => {
  console.log(`\n--- Row ${i + 1} ---`);
  Object.entries(row).forEach(([key, val]) => {
    const v = String(val).substring(0, 100);
    console.log(`  ${key}: ${v}`);
  });
});
