#!/usr/bin/env python3
"""
Fix ALL remaining hardcoded http://localhost:3001 URLs in TypeScript/TSX files.
Replaces module-level const API_BASE_URL and all usages.
"""

import os
import re

def fix_file(filepath):
    """Fix hardcoded URLs in a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = []
    
    # Pattern 1: Module-level const API_BASE_URL = 'http://localhost:3001';
    if re.search(r"const\s+API_BASE_URL\s*=\s*['\"]http://localhost:3001['\"];?", content):
        # Add import if missing
        if 'getApiBaseUrl' not in content:
            # Find last import line
            import_lines = []
            for match in re.finditer(r'^import .+$', content, re.MULTILINE):
                import_lines.append(match.end())
            
            if import_lines:
                insert_pos = max(import_lines)
                content = content[:insert_pos] + "\nimport { getApiBaseUrl } from '@/services/invmisApi';" + content[insert_pos:]
            else:
                content = "import { getApiBaseUrl } from '@/services/invmisApi';\n\n" + content
            
            changes.append("Added getApiBaseUrl import")
        
        # Replace const declaration
        content = re.sub(
            r"const\s+API_BASE_URL\s*=\s*['\"]http://localhost:3001['\"];?",
            "const getApiBase = () => getApiBaseUrl().replace('/api', '');",
            content
        )
        changes.append("Replaced const API_BASE_URL with getApiBase()")
        
        # Replace all ${API_BASE_URL} with ${getApiBase()}
        content = content.replace('${API_BASE_URL}', '${getApiBase()}')
        content = content.replace('API_BASE_URL +', 'getApiBase() +')
        changes.append("Replaced API_BASE_URL usages")
    
    # Pattern 2: Direct fetch with hardcoded URL
    pattern = r"fetch\(['\"]http://localhost:3001(/api/[^'\"]+)['\"]"
    if re.search(pattern, content):
        if 'getApiBaseUrl' not in content:
            # Add import
            import_lines = []
            for match in re.finditer(r'^import .+$', content, re.MULTILINE):
                import_lines.append(match.end())
            
            if import_lines:
                insert_pos = max(import_lines)
                content = content[:insert_pos] + "\nimport { getApiBaseUrl } from '@/services/invmisApi';" + content[insert_pos:]
            else:
                content = "import { getApiBaseUrl } from '@/services/invmisApi';\n\n" + content
        
        content = re.sub(pattern, r"fetch(`${getApiBaseUrl()}\1`", content)
        changes.append("Fixed hardcoded fetch URLs")
    
    # Pattern 3: Template strings with hardcoded URL
    pattern = r"`http://localhost:3001(/api/[^`]+)`"
    if re.search(pattern, content):
        if 'getApiBaseUrl' not in content:
            import_lines = []
            for match in re.finditer(r'^import .+$', content, re.MULTILINE):
                import_lines.append(match.end())
            
            if import_lines:
                insert_pos = max(import_lines)
                content = content[:insert_pos] + "\nimport { getApiBaseUrl } from '@/services/invmisApi';" + content[insert_pos:]
            else:
                content = "import { getApiBaseUrl } from '@/services/invmisApi';\n\n" + content
        
        content = re.sub(pattern, r"`${getApiBaseUrl()}\1`", content)
        changes.append("Fixed template string URLs")
    
    # Pattern 4: Upload URLs
    pattern = r"['\"]http://localhost:3001(/uploads/[^'\"]+)['\"]"
    if re.search(pattern, content):
        if 'getApiBaseUrl' not in content:
            import_lines = []
            for match in re.finditer(r'^import .+$', content, re.MULTILINE):
                import_lines.append(match.end())
            
            if import_lines:
                insert_pos = max(import_lines)
                content = content[:insert_pos] + "\nimport { getApiBaseUrl } from '@/services/invmisApi';" + content[insert_pos:]
            else:
                content = "import { getApiBaseUrl } from '@/services/invmisApi';\n\n" + content
        
        content = re.sub(pattern, r"`${getApiBaseUrl().replace('/api', '')}\1`", content)
        changes.append("Fixed upload URLs")
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    
    return []

def main():
    """Main function to process all TypeScript/TSX files."""
    src_dir = 'src'
    total_files = 0
    changed_files = 0
    
    for root, dirs, files in os.walk(src_dir):
        # Skip node_modules
        dirs[:] = [d for d in dirs if d != 'node_modules']
        
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                total_files += 1
                
                changes = fix_file(filepath)
                if changes:
                    changed_files += 1
                    print(f"✓ {filepath}")
                    for change in changes:
                        print(f"  - {change}")
    
    print(f"\n{'='*50}")
    print(f"Total files scanned: {total_files}")
    print(f"Files changed: {changed_files}")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()
