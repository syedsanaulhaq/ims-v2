# Comprehensive fix for ALL hardcoded localhost:3001/api URLs in src folder
# This script will:
# 1. Add getApiBaseUrl import if missing
# 2. Replace ALL hardcoded URLs with getApiBaseUrl() calls

$files = Get-ChildItem -Path "src" -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch '\\node_modules\\' 
}

$totalFixed = 0
$filesModified = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $modified = $false
    
    # Check if file has hardcoded URLs
    if ($content -match "http://localhost:3001/api") {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
        
        # Check if getApiBaseUrl import exists
        $hasImport = $content -match "import.*getApiBaseUrl.*from.*['`"]@/services/invmisApi['`"]"
        
        if (-not $hasImport -and $content -match "^import ") {
            Write-Host "  Adding getApiBaseUrl import..." -ForegroundColor Yellow
            # Add import after the last import statement
            $content = $content -replace "(import [^;]+;)(\r?\n)(?!import)", "`$1`$2import { getApiBaseUrl } from '@/services/invmisApi';`$2"
            $modified = $true
        }
        
        # Count replacements
        $urlCount = ([regex]::Matches($content, "http://localhost:3001/api")).Count
        
        if ($urlCount -gt 0) {
            Write-Host "  Replacing $urlCount hardcoded URLs..." -ForegroundColor Yellow
            
            # Replace ALL hardcoded localhost:3001/api URLs with getApiBaseUrl()
            $replacements = 0
            
            # Simple approach: replace all instances
            $pattern = 'http://localhost:3001/api'
            $replacement = '${getApiBaseUrl()}'
            
            $newContent = $content -replace [regex]::Escape($pattern), $replacement
            $replacements = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
            
            if ($replacements -gt 0) {
                $content = $newContent
                Write-Host "  Replaced $replacements URLs" -ForegroundColor Yellow
            }
            
            $modified = $true
            $totalFixed += $urlCount
        }
        
        if ($modified) {
            # Write back to file
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
            $filesModified++
            Write-Host "  ✓ Fixed $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "Files modified: $filesModified" -ForegroundColor Green
Write-Host "Total URLs fixed: $totalFixed" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
