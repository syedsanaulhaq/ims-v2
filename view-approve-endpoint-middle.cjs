const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 1750 to 1850 of approvals.cjs:');
for (let i = 1749; i < Math.min(lines.length, 1850); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
