# Fix Hardcoded API URLs
# This script replaces all http://localhost:3001/api URLs with proper API base URL usage

Write-Host "`n🔧 Fixing hardcoded API URLs in frontend code..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$srcPath = ".\src"
$apiBaseUrl = "http://localhost:3001/api"
$replacementPattern = "`${getApiBaseUrl()}"

# Count of files to fix
$filesToFix = 0
$totalReplacements = 0

# Get all TypeScript and TSX files
$files = Get-ChildItem -Path $srcPath -Recurse -Include *.ts,*.tsx | Where-Object { $_.Name -notlike "*.d.ts" }

Write-Host "`nScanning $($files.Count) files for hardcoded API URLs..." -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "http://localhost:3001/api") {
        $originalContent = $content
        
        # Replace various patterns of hardcoded URLs
        # Pattern 1: fetch('http://localhost:3001/api/...')
        $content = $content -replace "fetch\('http://localhost:3001/api/([^']+)'\)", 'fetch(`${getApiBaseUrl()}/$1`)'
        
        # Pattern 2: fetch("http://localhost:3001/api/...")
        $content = $content -replace 'fetch\("http://localhost:3001/api/([^"]+)"\)', 'fetch(`${getApiBaseUrl()}/$1`)'
        
        # Pattern 3: fetch(`http://localhost:3001/api/...`)
        $content = $content -replace 'fetch\(`http://localhost:3001/api/([^`]+)`\)', 'fetch(`${getApiBaseUrl()}/$1`)'
        
        # Pattern 4: URL in string: 'http://localhost:3001/api/...'
        $content = $content -replace "'http://localhost:3001/api/([^']+)'", '`${getApiBaseUrl()}/$1`'
        
        # Pattern 5: URL in string: "http://localhost:3001/api/..."
        $content = $content -replace '"http://localhost:3001/api/([^"]+)"', '`${getApiBaseUrl()}/$1`'
        
        # Pattern 6: URL in template literal: `http://localhost:3001/api/...`
        $content = $content -replace '`http://localhost:3001/api/([^`]+)`', '`${getApiBaseUrl()}/$1`'
        
        if ($content -ne $originalContent) {
            # Check if file needs getApiBaseUrl import
            $needsImport = $false
            if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
                $needsImport = $true
            }
            
            # Add import if needed
            if ($needsImport) {
                # Find first import statement
                if ($content -match "(?ms)^(import .+?from .+?;)") {
                    $firstImport = $matches[1]
                    $importStatement = "import { getApiBaseUrl } from '../services/invmisApi';"
                    
                    # Adjust path based on file location
                    $relativePath = $file.DirectoryName.Replace((Get-Location).Path + "\src\", "")
                    $depth = ($relativePath -split "\\").Count
                    $pathPrefix = "../" * $depth
                    $importStatement = "import { getApiBaseUrl } from '${pathPrefix}services/invmisApi';"
                    
                    # Insert import after first import
                    $content = $content -replace "(?ms)(^import .+?from .+?;)", "`$1`n$importStatement"
                }
            }
            
            # Write updated content
            Set-Content -Path $file.FullName -Value $content -NoNewline
            
            $filesToFix++
            $replacements = ([regex]::Matches($originalContent, "http://localhost:3001/api")).Count
            $totalReplacements += $replacements
            
            Write-Host "  ✅ Fixed: $($file.Name) ($replacements URL(s))" -ForegroundColor Green
        }
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Files fixed: $filesToFix" -ForegroundColor Yellow
Write-Host "  Total URLs replaced: $totalReplacements" -ForegroundColor Yellow

if ($filesToFix -gt 0) {
    Write-Host "`n✅ Fixed all hardcoded API URLs!" -ForegroundColor Green
    Write-Host "   Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes: git diff" -ForegroundColor Gray
    Write-Host "   2. Rebuild frontend: npm run build" -ForegroundColor Gray
    Write-Host "   3. Deploy: .\start-production.ps1" -ForegroundColor Gray
} else {
    Write-Host "`n✅ No hardcoded API URLs found!" -ForegroundColor Green
}

Write-Host ""
