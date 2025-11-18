// ======================================================================
// Fix ALL Remaining API URL References
// ======================================================================
// This Node.js script replaces all hardcoded localhost:3001/api URLs
// ======================================================================

const fs = require('fs');
const path = require('path');

const rootDir = 'e:\\ECP-Projects\\inventory-management-system-ims\\ims-v1';
const srcDir = path.join(rootDir, 'src');

let filesFixed = 0;
let errors = [];

// Recursively get all .ts and .tsx files
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      getAllFiles(filePath, fileList);
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if already imports getApiBaseUrl or doesn't have localhost:3001
    if (!content.includes('localhost:3001/api')) {
      return false;
    }
    
    // Skip invmisApi.ts itself (it defines the function)
    if (filePath.endsWith('invmisApi.ts')) {
      return false;
    }
    
    // Add import if not present
    if (!content.includes('getApiBaseUrl')) {
      // Find last import line
      const importMatch = content.match(/(import .+;\n)+/);
      if (importMatch) {
        const lastImportEnd = importMatch[0].length;
        const importLine = "import { getApiBaseUrl } from '@/services/invmisApi';\n";
        content = content.slice(0, lastImportEnd) + importLine + content.slice(lastImportEnd);
      }
    }
    
    // Add const apiBase in functions/components
    const needsApiBase = content.includes('localhost:3001/api') && 
                         !content.match(/const\s+apiBase\s*=\s*getApiBaseUrl\(\)/);
    
    if (needsApiBase) {
      // Try to add after function declaration
      content = content.replace(
        /(export\s+(default\s+)?function\s+\w+.*?\{)/,
        '$1\n  const apiBase = getApiBaseUrl();\n'
      );
      
      // Or after const component declaration
      if (!content.includes('const apiBase = getApiBaseUrl()')) {
        content = content.replace(
          /(const\s+\w+\s*[:=]\s*\(\s*\)\s*=>\s*\{)/,
          '$1\n  const apiBase = getApiBaseUrl();\n'
        );
      }
    }
    
    // Replace all fetch calls
    content = content.replace(
      /fetch\s*\(\s*[`'"]http:\/\/localhost:3001\/api\/([^`'"]+)[`'"]/g,
      'fetch(`${apiBase}/$1`'
    );
    
    // Replace template literals
    content = content.replace(
      /[`'"]http:\/\/localhost:3001\/api\/([^`'"]+)[`'"]/g,
      '`${apiBase}/$1`'
    );
    
    // Replace const declarations
    content = content.replace(
      /(const|let)\s+(\w+)\s*=\s*[`'"]http:\/\/localhost:3001\/api([^`'"]*)[`'"]/g,
      '$1 $2 = `${apiBase}$3`'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    errors.push({ file: filePath, error: error.message });
    return false;
  }
}

console.log('[INFO] Scanning for files with hardcoded API URLs...\n');

const allFiles = getAllFiles(srcDir);
console.log(`[INFO] Found ${allFiles.length} TypeScript files\n`);

allFiles.forEach(file => {
  if (fixFile(file)) {
    filesFixed++;
    const relativePath = path.relative(rootDir, file);
    console.log(`[OK] Fixed: ${relativePath}`);
  }
});

console.log(`\n======================================================================`);
console.log(`[SUMMARY] Fixed ${filesFixed} files`);
console.log(`[SUMMARY] Errors: ${errors.length}`);
console.log(`======================================================================\n`);

if (errors.length > 0) {
  console.log('[ERROR] Issues encountered:');
  errors.forEach(({ file, error }) => {
    console.log(`  - ${path.relative(rootDir, file)}: ${error}`);
  });
}

console.log('\n[INFO] Next steps:');
console.log('  1. Review changes: git diff');
console.log('  2. Test locally: npm run dev');
console.log('  3. Commit and push changes');
console.log('  4. Deploy to server\n');
