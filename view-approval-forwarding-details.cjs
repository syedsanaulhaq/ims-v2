const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 300 to 500 of ApprovalForwarding.tsx:');
for (let i = 299; i < Math.min(lines.length, 500); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
