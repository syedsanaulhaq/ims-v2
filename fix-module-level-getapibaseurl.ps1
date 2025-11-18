# Fix module-level getApiBaseUrl() calls - these fail at module initialization
# We need to change them to functions that are called when needed

$files = @(
    "src\services\inventoryLocalService.ts",
    "src\services\storesLocalService.ts",
    "src\services\deliveriesLocalService.ts",
    "src\services\deliveryItemsLocalService.ts",
    "src\services\deliveryLocalService.ts",
    "src\services\vendorsLocalService.ts",
    "src\services\stockTransactionsLocalService.ts",
    "src\services\reorderLocalService.ts",
    "src\services\approvalForwardingService.ts",
    "src\services\invmisApi.ts"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        $content = Get-Content $fullPath -Raw
        
        # Replace module-level const BASE_URL = getApiBaseUrl(); with function
        $content = $content -replace 'const BASE_URL = getApiBaseUrl\(\);', 'const getBaseUrl = () => getApiBaseUrl();'
        
        # Replace module-level const API_BASE_URL = getApiBaseUrl(); with function
        $content = $content -replace 'const API_BASE_URL = getApiBaseUrl\(\);', 'const getBaseUrl = () => getApiBaseUrl();'
        
        # Now replace all usages of BASE_URL with getBaseUrl()
        $content = $content -replace '\$\{BASE_URL\}', '${getBaseUrl()}'
        $content = $content -replace '`\$\{BASE_URL\}', '`${getBaseUrl()}'
        
        # Replace all usages of API_BASE_URL with getBaseUrl()
        $content = $content -replace '\$\{API_BASE_URL\}', '${getBaseUrl()}'
        $content = $content -replace '`\$\{API_BASE_URL\}', '`${getBaseUrl()}'
        
        # Save the file
        Set-Content -Path $fullPath -Value $content -NoNewline
        Write-Host "  ✓ Fixed: $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nDone! All service files have been updated." -ForegroundColor Cyan
Write-Host "Now run: npm run build" -ForegroundColor Yellow
