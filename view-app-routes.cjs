const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /path=/gi;
let match;
console.log('Routes in App.tsx:');
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  console.log(`Line ${lineNum}: ${fileContent.split('\n')[lineNum - 1]}`);
}
