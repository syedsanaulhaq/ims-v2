const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 2050 to 2110 of approvals.cjs:');
for (let i = 2049; i < Math.min(lines.length, 2110); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
