# Fix ALL remaining hardcoded http://localhost:3001 URLs in TypeScript/TSX files
# This replaces hardcoded URLs with getApiBaseUrl() calls

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Where-Object { $_.FullName -notmatch 'node_modules' }

$changedFiles = @()
$stats = @{
    TotalFiles = 0
    ChangedFiles = 0
    TotalReplacements = 0
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileChanged = $false
    $fileReplacements = 0
    
    # Pattern 1: Module-level const API_BASE_URL = 'http://localhost:3001'
    # Convert to: const getApiBase = () => getApiBaseUrl().replace('/api', '')
    if ($content -match "const\s+API_BASE_URL\s*=\s*[`'\"]http://localhost:3001[`'\"]") {
        # Check if file already imports getApiBaseUrl
        if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
            # Add import at the top (after existing imports)
            if ($content -match "(import[^;]+;[\r\n]+)+") {
                $content = $content -replace "(import[^;]+;[\r\n]+)+", "$&import { getApiBaseUrl } from '@/services/invmisApi';`r`n"
            } else {
                $content = "import { getApiBaseUrl } from '@/services/invmisApi';`r`n`r`n" + $content
            }
        }
        
        # Replace the const declaration
        $content = $content -replace "const\s+API_BASE_URL\s*=\s*[`'\"]http://localhost:3001[`'\"]", "const getApiBase = () => getApiBaseUrl().replace('/api', '')"
        
        # Replace all usages of API_BASE_URL with getApiBase()
        $content = $content -replace '\$\{API_BASE_URL\}', '${getApiBase()}'
        $content = $content -replace "API_BASE_URL\s*\+", "getApiBase() +"
        $content = $content -replace "`"API_BASE_URL/", "`"`${getApiBase()}/"
        $content = $content -replace "'API_BASE_URL/", "'`${getApiBase()}/"
        $content = $content -replace "``API_BASE_URL/", "```${getApiBase()}/"
        
        $fileChanged = $true
        $fileReplacements++
    }
    
    # Pattern 2: Direct fetch with hardcoded URL
    # fetch('http://localhost:3001/api/... -> fetch(`${getApiBaseUrl()}/...
    $pattern2 = "fetch\([`'\"]http://localhost:3001/api/"
    if ($content -match $pattern2) {
        # Ensure import exists
        if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
            if ($content -match "(import[^;]+;[\r\n]+)+") {
                $content = $content -replace "(import[^;]+;[\r\n]+)+", "$&import { getApiBaseUrl } from '@/services/invmisApi';`r`n"
            } else {
                $content = "import { getApiBaseUrl } from '@/services/invmisApi';`r`n`r`n" + $content
            }
        }
        
        # Replace all fetch calls
        $content = $content -replace "fetch\([`'\"]http://localhost:3001/api/([^`'\"]+)[`'\"]", "fetch(```${getApiBaseUrl()}/`$1``"
        $fileChanged = $true
        $fileReplacements++
    }
    
    # Pattern 3: Template strings with hardcoded URL
    # `http://localhost:3001/api/... -> `${getApiBaseUrl()}/...
    $pattern3 = "``http://localhost:3001/api/"
    if ($content -match $pattern3) {
        # Ensure import exists
        if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
            if ($content -match "(import[^;]+;[\r\n]+)+") {
                $content = $content -replace "(import[^;]+;[\r\n]+)+", "$&import { getApiBaseUrl } from '@/services/invmisApi';`r`n"
            } else {
                $content = "import { getApiBaseUrl } from '@/services/invmisApi';`r`n`r`n" + $content
            }
        }
        
        # Replace template strings
        $content = $content -replace "``http://localhost:3001/api/", "```${getApiBaseUrl()}/"
        $fileChanged = $true
        $fileReplacements++
    }
    
    # Pattern 4: File upload URLs (non-API paths)
    # http://localhost:3001/uploads -> ${getApiBaseUrl().replace('/api', '')}/uploads
    $pattern4 = "[`'\"]http://localhost:3001/uploads/"
    if ($content -match $pattern4) {
        # Ensure import exists
        if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
            if ($content -match "(import[^;]+;[\r\n]+)+") {
                $content = $content -replace "(import[^;]+;[\r\n]+)+", "$&import { getApiBaseUrl } from '@/services/invmisApi';`r`n"
            } else {
                $content = "import { getApiBaseUrl } from '@/services/invmisApi';`r`n`r`n" + $content
            }
        }
        
        # Replace upload URLs
        $content = $content -replace "[`'\"]http://localhost:3001/uploads/([^`'\"]+)[`'\"]", "```${getApiBaseUrl().replace('/api', '')}/uploads/`$1``"
        $fileChanged = $true
        $fileReplacements++
    }
    
    # If content changed, write back
    if ($fileChanged -and $content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $changedFiles += $file.FullName
        $stats.ChangedFiles++
        $stats.TotalReplacements += $fileReplacements
        Write-Host "✓ Fixed $fileReplacements patterns in: $($file.FullName)" -ForegroundColor Green
    }
    
    $stats.TotalFiles++
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total files scanned: $($stats.TotalFiles)" -ForegroundColor White
Write-Host "Files changed: $($stats.ChangedFiles)" -ForegroundColor Yellow
Write-Host "Total replacements: $($stats.TotalReplacements)" -ForegroundColor Green
Write-Host "`nChanged files:" -ForegroundColor White
$changedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
