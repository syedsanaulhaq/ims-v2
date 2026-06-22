const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 20 to 60 of approvals.cjs:');
for (let i = 19; i < Math.min(lines.length, 60); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
