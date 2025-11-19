# Simple line-by-line fix for hardcoded URLs

$filesWithIssues = @(
    "src\services\tendersLocalService.ts",
    "src\services\categoriesLocalService.ts",
    "src\services\usersLocalService.ts",
    "src\services\officeApi.ts",
    "src\services\officeApiReal.ts",
    "src\services\officeApiClean.ts"
)

$totalFixed = 0

foreach ($filePath in $filesWithIssues) {
    $fullPath = Join-Path $PSScriptRoot $filePath
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $filePath" -ForegroundColor Cyan
        
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        $changed = $false
        
        # Check if file has const API_BASE_URL = 'http://localhost:3001'
        if ($content -match "const API_BASE_URL = 'http://localhost:3001'") {
            # Add import if missing
            if ($content -notmatch "getApiBaseUrl") {
                # Find the last import line and add after it
                $lines = $content -split "`n"
                $lastImportIndex = -1
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match "^import ") {
                        $lastImportIndex = $i
                    }
                }
                
                if ($lastImportIndex -ge 0) {
                    $lines = @($lines[0..$lastImportIndex]) + @("import { getApiBaseUrl } from '@/services/invmisApi';", "") + @($lines[($lastImportIndex+1)..($lines.Count-1)])
                } else {
                    $lines = @("import { getApiBaseUrl } from '@/services/invmisApi';", "") + $lines
                }
                
                $content = $lines -join "`n"
            }
            
            # Replace const declaration
            $content = $content -replace "const API_BASE_URL = 'http://localhost:3001';", "const getApiBase = () => getApiBaseUrl().replace('/api', '');"
            
            # Replace usages
            $content = $content -replace '\$\{API_BASE_URL\}', '${getApiBase()}'
            $content = $content -replace 'API_BASE_URL \+', 'getApiBase() +'
            
            $changed = $true
        }
        
        if ($changed) {
            Set-Content -Path $fullPath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  ✓ Fixed!" -ForegroundColor Green
            $totalFixed++
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ! File not found: $fullPath" -ForegroundColor Yellow
    }
}

Write-Host "`nTotal files fixed: $totalFixed" -ForegroundColor Green
