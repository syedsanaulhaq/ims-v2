const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApprovalManagement.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 180 to 350 of ApprovalManagement.tsx:');
for (let i = 179; i < Math.min(lines.length, 350); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
