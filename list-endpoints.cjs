const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const regex = /router\.(post|get|put|delete)\(['"]([^'"]+)['"]/gi;
let match;
console.log('Endpoints in approvals.cjs:');
while ((match = regex.exec(fileContent)) !== null) {
  const lineNum = fileContent.substr(0, match.index).split('\n').length;
  console.log(`Line ${lineNum}: ${match[1].toUpperCase()} ${match[2]}`);
}
