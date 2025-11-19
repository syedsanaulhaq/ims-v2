import os
import re

src_folder = "src"
excluded = ['node_modules', 'invmisApi.ts']
totalFixed = 0
filesModified = []

for root, dirs, files in os.walk(src_folder):
    # Skip node_modules
    if 'node_modules' in root:
        continue
        
    for file in files:
        if not (file.endswith('.tsx') or file.endswith('.ts')):
            continue
            
        filepath = os.path.join(root, file)
        
        # Skip invmisApi.ts itself
        if 'invmisApi.ts' in filepath:
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Check if file has hardcoded URLs
        if 'http://localhost:3001/api' not in content:
            continue
        
        print(f"Processing: {file}")
        
        # Add import if missing
        if 'getApiBaseUrl' not in content and 'import ' in content:
            # Add import after first import line
            content = re.sub(
                r'(import [^\n]+\n)',
                r'\1import { getApiBaseUrl } from \'@/services/invmisApi\';\n',
                content,
                count=1
            )
            print(f"  Added import")
        
        # Replace all variations of hardcoded URLs
        patterns = [
            (r"'http://localhost:3001/api/([^']+)'", r"`${getApiBaseUrl()}/\1`"),
            (r'"http://localhost:3001/api/([^"]+)"', r'`${getApiBaseUrl()}/\1`'),
            (r'`http://localhost:3001/api/([^`]+)`', r'`${getApiBaseUrl()}/\1`'),
        ]
        
        url_count = content.count('http://localhost:3001/api')
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            filesModified.append(file)
            totalFixed += url_count
            print(f"  Fixed {url_count} URLs in {file}")

print("\n" + "="*40)
print("SUMMARY:")
print(f"Files modified: {len(filesModified)}")
print(f"Total URLs fixed: {totalFixed}")
print("="*40)
