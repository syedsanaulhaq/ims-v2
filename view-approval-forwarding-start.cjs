const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 1 to 150 of ApprovalForwarding.tsx:');
for (let i = 0; i < Math.min(lines.length, 150); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
