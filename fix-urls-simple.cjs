const fs = require('fs');
const path = require('path');

const rootDir = 'e:\\ECP-Projects\\inventory-management-system-ims\\ims-v1';
const srcDir = path.join(rootDir, 'src');

let filesFixed = 0;

function getAllTsFiles(dir, files = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules')) getAllTsFiles(filePath, files);
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      files.push(filePath);
    }
  });
  return files;
}

console.log('[INFO] Fixing all remaining API URLs...\n');

getAllTsFiles(srcDir).forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Skip if no localhost:3001
  if (!content.includes('localhost:3001/api')) return;
  
  // Skip invmisApi.ts (it defines getApiBaseUrl)
  if (file.endsWith('invmisApi.ts')) return;
  
  const original = content;
  
  // Step 1: Add import if not present
  if (!content.includes('getApiBaseUrl')) {
    const hasReactImport = content.match(/^import\s+React/m);
    const lastImport = content.match(/(^import\s+.*\n)+/m);
    
    if (lastImport) {
      const importStatement = `import { getApiBaseUrl } from '@/services/invmisApi';\n`;
      const insertPos = lastImport.index + lastImport[0].length;
      content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    }
  }
  
  // Step 2: Add const apiBase in first function/component
  if (!content.includes('const apiBase = getApiBaseUrl()')) {
    // Find first function or arrow function after imports
    const patterns = [
      /^(export\s+(?:default\s+)?function\s+\w+[^{]*{)(\s*)/m,
      /^(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{)(\s*)/m,
      /^(function\s+\w+[^{]*{)(\s*)/m
    ];
    
    for (let pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, '$1$2  const apiBase = getApiBaseUrl();\n$2');
        break;
      }
    }
  }
  
  // Step 3: Replace all URL patterns
  // Pattern 1: fetch('http://localhost:3001/api/...')
  content = content.replace(
    /fetch\s*\(\s*'http:\/\/localhost:3001\/api\/([^']+)'\s*\)/g,
    "fetch(`${apiBase}/$1`)"
  );
  
  // Pattern 2: fetch("http://localhost:3001/api/...")
  content = content.replace(
    /fetch\s*\(\s*"http:\/\/localhost:3001\/api\/([^"]+)"\s*\)/g,
    "fetch(`${apiBase}/$1`)"
  );
  
  // Pattern 3: fetch(`http://localhost:3001/api/...`)
  content = content.replace(
    /fetch\s*\(\s*`http:\/\/localhost:3001\/api\/([^`]+)`\s*\)/g,
    "fetch(`${apiBase}/$1`)"
  );
  
  // Pattern 4: URL assignments with quotes
  content = content.replace(
    /(['"])http:\/\/localhost:3001\/api\/([^\1]+?)\1/g,
    "`${apiBase}/$2`"
  );
  
  // Pattern 5: URL in template literals
  content = content.replace(
    /`http:\/\/localhost:3001\/api\/([^`]+)`/g,
    "`${apiBase}/$1`"
  );
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    filesFixed++;
    console.log(`[OK] ${path.relative(rootDir, file)}`);
  }
});

console.log(`\n[SUMMARY] Fixed ${filesFixed} files`);
