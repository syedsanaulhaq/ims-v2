const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApprovalManagement.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 50 to 180 of ApprovalManagement.tsx:');
for (let i = 49; i < Math.min(lines.length, 180); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
