const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApprovalManagement.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /\/approvals/gi;
let match;
console.log('Matches:');
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  console.log(`Line ${lineNum}: ${fileContent.split('\n')[lineNum - 1]}`);
}
