const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'approvalForwardingService.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 400 to 500 of approvalForwardingService.ts:');
for (let i = 400; i < Math.min(lines.length, 500); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
