const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'utils', 'workflowEngine.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 300 to 400 of workflowEngine.cjs:');
for (let i = 299; i < Math.min(lines.length, 400); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
