# Manual Dashboard Fix for Server
# Run this AFTER git pull on the server

Write-Host "`n[FIX] Manually fixing Dashboard.tsx..." -ForegroundColor Cyan

$dashboardFile = "src\pages\Dashboard.tsx"

if (Test-Path $dashboardFile) {
    Write-Host "  Reading file..." -ForegroundColor Gray
    $content = Get-Content $dashboardFile -Raw
    
    # Check if already fixed
    if ($content -match 'const apiBase = getApiBaseUrl\(\)') {
        Write-Host "  [SKIP] Dashboard already uses getApiBaseUrl()" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "  Applying fixes..." -ForegroundColor Yellow
    
    # Add import if not present
    if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
        $content = $content -replace "(import.*from '@/utils/dateUtils';)", "`$1`nimport { getApiBaseUrl } from '@/services/invmisApi';"
        Write-Host "    - Added getApiBaseUrl import" -ForegroundColor Gray
    }
    
    # Add const apiBase = getApiBaseUrl() before Promise.all
    $content = $content -replace "(//\s*Fetch all data in parallel\s+)(const \[)", "`$1const apiBase = getApiBaseUrl();`n        `$2"
    Write-Host "    - Added apiBase declaration" -ForegroundColor Gray
    
    # Replace all http://localhost:3001/api/ with template literals
    $content = $content -replace "fetch\('http://localhost:3001/api/([^']+)'\)", 'fetch(`${apiBase}/$1`)'
    Write-Host "    - Replaced hardcoded URLs" -ForegroundColor Gray
    
    # Save file
    Set-Content $dashboardFile -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  [OK] Dashboard.tsx fixed" -ForegroundColor Green
    
    # Verify
    $newContent = Get-Content $dashboardFile -Raw
    if ($newContent -match 'const apiBase = getApiBaseUrl\(\)') {
        Write-Host "  [VERIFY] Changes applied successfully" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Verification failed" -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] Dashboard.tsx not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n[INFO] Now run: npm run build" -ForegroundColor Cyan
Write-Host ""
