# Comprehensive fix that handles URLs in any context

$files = Get-ChildItem -Path "src" -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch 'invmisApi\.ts$'
}

$totalFixed = 0
$filesModified = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # Check if file has hardcoded URLs (in quotes or backticks)
    if ($content -match "(['\`"])http://localhost:3001/api") {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
        
        # Check if import exists  
        if ($content -notmatch 'getApiBaseUrl') {
            # Find first import and add after it
            if ($content -match '(?m)^import\s') {
                $content = $content -replace '(?m)(^import\s[^\r\n]+)', "`$1`r`nimport { getApiBaseUrl } from '@/services/invmisApi';"
                Write-Host "  Added import" -ForegroundColor Yellow
                $modified = $true
            }
        }
        
        # Count URLs before replacement
        $urlMatches = [regex]::Matches($content, "(['\`"])http://localhost:3001/api/([^'\`"]+)\1")
        $count = $urlMatches.Count
        
        if ($count -gt 0) {
            # Replace URLs in single quotes
            $content = $content -replace "'http://localhost:3001/api/([^']+)'", '`${getApiBaseUrl()}/$1`'
            
            # Replace URLs in double quotes
            $content = $content -replace '"http://localhost:3001/api/([^"]+)"', '`${getApiBaseUrl()}/$1`'
            
            # Replace URLs in backticks
            $content = $content -replace '`http://localhost:3001/api/([^`]+)`', '`${getApiBaseUrl()}/$1`'
            
            Write-Host "  Replaced $count URLs" -ForegroundColor Yellow
            $modified = $true
            $totalFixed += $count
        }
        
        if ($modified) {
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
            $filesModified++
            Write-Host "  Saved $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "Files modified: $filesModified" -ForegroundColor Green
Write-Host "Total URLs fixed: $totalFixed" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
