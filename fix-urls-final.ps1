# ======================================================================
# Final Comprehensive API URL Fix - Simple String Replacement
# ======================================================================

Write-Host "[INFO] Starting comprehensive URL replacement..." -ForegroundColor Cyan

$filesChanged = 0
$totalFiles = 0

# Get all .ts and .tsx files
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | Where-Object {
    $_.FullName -notmatch 'node_modules'
}

Write-Host "[INFO] Found $($files.Count) TypeScript files to process`n" -ForegroundColor Cyan

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (!$content) { continue }
    
    # Skip if file doesn't contain localhost:3001
    if ($content -notlike "*localhost:3001/api*") {
        continue
    }
    
    # Skip invmisApi.ts itself
    if ($file.Name -eq "invmisApi.ts") {
        continue
    }
    
    $originalContent = $content
    $changed = $false
    
    # Step 1: Add import if needed
    if ($content -notmatch "getApiBaseUrl") {
        $importLine = "import { getApiBaseUrl } from '@/services/invmisApi';`n"
        
        # Find the last import statement
        if ($content -match "(?ms)(^import .+\n)+") {
            $lastImportPos = $Matches[0].Length
            $content = $content.Insert($lastImportPos, $importLine)
            $changed = $true
        }
    }
    
    # Step 2: Add const apiBase declaration if needed
    if ($content -notmatch "const apiBase = getApiBaseUrl\(\)") {
        # Try to add after first function/component declaration
        if ($content -match "(?m)^(export\s+(default\s+)?function\s+\w+.+?\{)\s*$") {
            $content = $content -replace "(export\s+(default\s+)?function\s+\w+.+?\{)\s*`$", "`$1`n  const apiBase = getApiBaseUrl();`n"
            $changed = $true
        }
        elseif ($content -match "(?m)^(const\s+\w+\s*[:=]\s*\([^\)]*\)\s*=>\s*\{)\s*`$") {
            $content = $content -replace "(const\s+\w+\s*[:=]\s*\([^\)]*\)\s*=>\s*\{)\s*`$", "`$1`n  const apiBase = getApiBaseUrl();`n"
            $changed = $true
        }
    }
    
    # Step 3: Replace URL patterns
    # Simple literal replacements
    $patterns = @(
        @{ Old = "'http://localhost:3001/api/"; New = "'`${apiBase}/" },
        @{ Old = '"http://localhost:3001/api/'; New = '"${apiBase}/' },
        @{ Old = '`http://localhost:3001/api/'; New = '`${apiBase}/' }
    )
    
    foreach ($pattern in $patterns) {
        if ($content -like "*$($pattern.Old)*") {
            $content = $content.Replace($pattern.Old, $pattern.New)
            $changed = $true
        }
    }
    
    # Write back if changed
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesChanged++
        $relativePath = $file.FullName.Replace("$PWD\", "")
        Write-Host "[OK] Fixed: $relativePath" -ForegroundColor Green
    }
}

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "[SUMMARY] Processed $totalFiles files" -ForegroundColor White
Write-Host "[SUMMARY] Changed $filesChanged files" -ForegroundColor Green
Write-Host "======================================================================`n" -ForegroundColor Cyan
