const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /APPROVE_FOR_PROCUREMENT/gi;
let match;
console.log('Matches for APPROVE_FOR_PROCUREMENT in approvals.cjs:');
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  console.log(`Line ${lineNum}: ${fileContent.split('\n')[lineNum - 1]}`);
}
