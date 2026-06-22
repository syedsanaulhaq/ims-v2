const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'stockIssuanceService.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 160 to 200 of stockIssuanceService.ts:');
for (let i = 159; i < Math.min(lines.length, 200); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
