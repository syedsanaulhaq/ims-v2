const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'approvalService.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 250 to 350 of approvalService.ts:');
for (let i = 250; i < Math.min(lines.length, 350); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
