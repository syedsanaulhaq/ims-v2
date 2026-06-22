const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ApprovalForwarding.tsx');
if (!fs.existsSync(filePath)) {
  console.log('File does not exist!');
  process.exit(1);
}
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
for (let i = 200; i < 255; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
