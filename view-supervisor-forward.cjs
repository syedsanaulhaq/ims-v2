const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 1076 to 1180 of approvals.cjs:');
for (let i = 1075; i < Math.min(lines.length, 1180); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
