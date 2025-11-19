# Simple comprehensive fix for ALL hardcoded localhost URLs

$files = Get-ChildItem -Path "src" -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch '\\node_modules\\' 
}

$totalFixed = 0
$filesModified = 0
$pattern = 'http://localhost:3001/api'

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match [regex]::Escape($pattern)) {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
        
        # Check if import exists
        $hasImport = $content -match 'getApiBaseUrl'
        
        if (-not $hasImport) {
            # Add import after first import statement
            $importLine = "import { getApiBaseUrl } from '@/services/invmisApi';"
            $content = $content -replace '(import [^\r\n]+)', "`$1`r`n$importLine"
            Write-Host "  Added import" -ForegroundColor Yellow
        }
        
        # Count and replace
        $count = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
        $content = $content.Replace($pattern, '${getApiBaseUrl()}')
        
        # Save
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        
        $totalFixed += $count
        $filesModified++
        Write-Host "  Fixed $count URLs in $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "Files modified: $filesModified" -ForegroundColor Green
Write-Host "Total URLs fixed: $totalFixed" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
