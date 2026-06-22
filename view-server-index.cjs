const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 70 to 110 of index.cjs:');
for (let i = 69; i < Math.min(lines.length, 110); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
