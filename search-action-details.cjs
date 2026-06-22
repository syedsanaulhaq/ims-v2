const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RequestDetailsPage.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines containing click, handle, button, submit, approve, reject, forward in RequestDetailsPage.tsx:');
for (let i = 400; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('button') || line.includes('click') || line.includes('handle') || line.includes('submit') || line.includes('approve') || line.includes('reject') || line.includes('forward')) {
    console.log(`${i+1}: ${line}`);
  }
}
