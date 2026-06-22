const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'stockIssuance.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 66 to 200 of stockIssuance.cjs:');
for (let i = 65; i < Math.min(lines.length, 200); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
