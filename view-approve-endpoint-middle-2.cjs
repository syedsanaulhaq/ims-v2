const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 1850 to 1930 of approvals.cjs:');
for (let i = 1849; i < Math.min(lines.length, 1930); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
