const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 250 to 300 of ApprovalForwarding.tsx:');
for (let i = 249; i < Math.min(lines.length, 300); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
