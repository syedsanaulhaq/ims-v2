const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'utils', 'workflowEngine.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines 450 to 700 of workflowEngine.cjs:');
for (let i = 450; i < Math.min(lines.length, 700); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
