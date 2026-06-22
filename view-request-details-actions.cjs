const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RequestDetailsPage.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 700 to 976:');
for (let i = 700; i < Math.min(lines.length, 976); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
