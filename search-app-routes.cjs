const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines in App.tsx containing request-details:');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('request-details')) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
