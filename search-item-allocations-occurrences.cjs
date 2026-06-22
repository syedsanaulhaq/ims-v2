const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'approvals.cjs');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
console.log('Lines containing item_allocations:');
for (let i = 1636; i < lines.length; i++) {
  if (lines[i].includes('item_allocations')) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
