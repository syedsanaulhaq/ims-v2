# ======================================================================
# Fix ALL API URL References in the Codebase
# ======================================================================
# This script replaces all hardcoded localhost:3001/api URLs with 
# getApiBaseUrl() to support production proxy deployment
# ======================================================================

Write-Host "[OK] Starting comprehensive API URL fix..." -ForegroundColor Green

$replacements = @()
$errors = @()

# ======================================================================
# Step 1: Fix Service Files with BASE_URL constants
# ======================================================================

Write-Host "`n[INFO] Fixing service files with BASE_URL constants..." -ForegroundColor Cyan

$serviceFiles = @(
    "src\services\inventoryServiceSqlServer.ts",
    "src\services\stockIssuanceService.ts",
    "src\services\approvalService.ts",
    "src\services\inventoryLocalService.ts",
    "src\services\storesLocalService.ts",
    "src\services\deliveriesLocalService.ts",
    "src\services\deliveryItemsLocalService.ts",
    "src\services\deliveryLocalService.ts",
    "src\services\stockReturnService.ts",
    "src\services\vendorsLocalService.ts",
    "src\services\stockTransactionsLocalService.ts",
    "src\services\reorderLocalService.ts",
    "src\services\approvalForwardingService.ts"
)

foreach ($file in $serviceFiles) {
    $fullPath = "e:\ECP-Projects\inventory-management-system-ims\ims-v1\$file"
    
    if (Test-Path $fullPath) {
        try {
            $content = Get-Content $fullPath -Raw
            $originalContent = $content
            
            # Add import at the top if not present
            if ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi") {
                # Find the last import statement
                $lastImportIndex = [regex]::Matches($content, "(?m)^import .*$") | 
                    Select-Object -Last 1 | 
                    ForEach-Object { $_.Index + $_.Length }
                
                if ($lastImportIndex -gt 0) {
                    $importStatement = "`nimport { getApiBaseUrl } from './invmisApi';`n"
                    $content = $content.Insert($lastImportIndex, $importStatement)
                }
            }
            
            # Replace various BASE_URL constant patterns
            $content = $content -replace "(?m)^const (BASE_URL|API_BASE_URL) = 'http://localhost:3001/api';?\s*$", 
                "const `$1 = getApiBaseUrl();"
            
            # Replace class property baseUrl patterns
            $content = $content -replace "(?m)^\s*private (static )?baseUrl = 'http://localhost:3001/api(/[\w-]+)?';?\s*$",
                "  private `$1baseUrl = getApiBaseUrl() + '`$2';"
            
            if ($content -ne $originalContent) {
                Set-Content -Path $fullPath -Value $content -NoNewline
                $replacements += $file
                Write-Host "[OK] Fixed: $file" -ForegroundColor Green
            }
        }
        catch {
            $errors += "Error fixing $file : $_"
            Write-Host "[ERROR] Failed: $file - $_" -ForegroundColor Red
        }
    }
}

# ======================================================================
# Step 2: Fix Page and Component Files with inline fetch() calls
# ======================================================================

Write-Host "`n[INFO] Fixing page and component files..." -ForegroundColor Cyan

$pageComponentFiles = @(
    "src\pages\InventoryDetails.tsx",
    "src\pages\ItemDetailsPage.tsx",
    "src\pages\AllInventoryItemsPage.tsx",
    "src\pages\ContractTender.tsx",
    "src\pages\MyRequestsPage.tsx",
    "src\pages\SubCategories.tsx",
    "src\pages\StockIssuanceDashboard.tsx",
    "src\pages\EditTender.tsx",
    "src\pages\TenderManagement.tsx",
    "src\pages\RequestDetailsPage.tsx",
    "src\pages\StockOperationRequestDetails.tsx",
    "src\pages\ReportsAnalytics.tsx",
    "src\pages\StockQuantitiesPage.tsx",
    "src\pages\ItemMaster.tsx",
    "src\pages\Categories.tsx",
    "src\pages\CreateTender.tsx",
    "src\pages\RequestHistoryPage.tsx",
    "src\pages\StockOperations.tsx",
    "src\pages\TenderDetails.tsx",
    "src\pages\VendorManagementEnhanced.tsx",
    "src\pages\VendorManagement.tsx",
    "src\pages\Dashboard_New.tsx",
    "src\pages\UnifiedTenderManagement.tsx",
    "src\pages\CategoriesManagement.tsx",
    "src\pages\RequestTrackingPage.tsx",
    "src\pages\TenderAcquisitionReport.tsx",
    "src\pages\TenderReportEnhanced.tsx",
    "src\pages\TenderReport.tsx",
    "src\pages\TenderReport-New.tsx",
    "src\pages\TenderReport_OLD.tsx",
    "src\pages\StockIssuanceProcessing.tsx",
    "src\pages\SSOLogin.tsx",
    "src\components\ApprovalForwarding.tsx",
    "src\components\ApprovalTracking.tsx",
    "src\components\stockTransactions\NewStockAcquisitionDashboard.tsx",
    "src\components\stockTransactions\EnhancedStockAcquisitionDashboard.tsx",
    "src\components\stockTransactions\EnhancedStockAcquisitionWithDelivery.tsx",
    "src\components\stockTransactions\StockAcquisitionDashboard.tsx",
    "src\components\setup\InitialInventorySetup.tsx",
    "src\components\setup\InitialSetupFresh.tsx",
    "src\components\setup\CurrentInventoryStockSetup.tsx",
    "src\components\setup\InitialSetupFromScratch.tsx",
    "src\components\tenders\TenderDashboard.tsx",
    "src\components\tenders\EnhancedTenderDashboard.tsx",
    "src\components\tenders\TenderVendorManagement.tsx",
    "src\services\erpDatabaseService.ts",
    "src\services\auditLogService.ts"
)

foreach ($file in $pageComponentFiles) {
    $fullPath = "e:\ECP-Projects\inventory-management-system-ims\ims-v1\$file"
    
    if (Test-Path $fullPath) {
        try {
            $content = Get-Content $fullPath -Raw
            $originalContent = $content
            
            # Add import at the top if not present AND file has localhost:3001
            if (($content -match "localhost:3001") -and ($content -notmatch "import.*getApiBaseUrl.*from.*invmisApi")) {
                # Find the last import statement
                $lastImportIndex = [regex]::Matches($content, "(?m)^import .*$") | 
                    Select-Object -Last 1 | 
                    ForEach-Object { $_.Index + $_.Length }
                
                if ($lastImportIndex -gt 0) {
                    $importStatement = "`nimport { getApiBaseUrl } from '@/services/invmisApi';`n"
                    $content = $content.Insert($lastImportIndex, $importStatement)
                }
            }
            
            # Add const apiBase at the beginning of components/pages if has localhost:3001
            if ($content -match "localhost:3001/api") {
                # Find the function component or useEffect
                if ($content -match "(?ms)export (default )?function \w+.*?\{") {
                    $functionStart = $Matches[0]
                    if ($content -notmatch "const apiBase = getApiBaseUrl\(\)") {
                        $content = $content -replace "(export (default )?function \w+.*?\{)", 
                            "`$1`n  const apiBase = getApiBaseUrl();`n"
                    }
                }
            }
            
            # Replace all fetch('http://localhost:3001/api/...') with fetch(`${apiBase}/...`)
            $content = $content -replace "fetch\('http://localhost:3001/api/([^']+)'\)", 'fetch(`${apiBase}/$1`)'
            
            # Replace all fetch("http://localhost:3001/api/...") with fetch(`${apiBase}/...`)
            $content = $content -replace 'fetch\("http://localhost:3001/api/([^"]+)"\)', 'fetch(`${apiBase}/$1`)'
            
            # Replace fetch(`http://localhost:3001/api/...`) with fetch(`${apiBase}/...`)
            $content = $content -replace 'fetch\(`http://localhost:3001/api/([^`]+)`\)', 'fetch(`${apiBase}/$1`)'
            
            # Replace template literal URLs: `http://localhost:3001/api/...`
            $content = $content -replace '`http://localhost:3001/api/([^`]+)`', '`${apiBase}/$1`'
            
            # Replace string URLs in variables
            $content = $content -replace "'http://localhost:3001/api/([^']+)'", '`${apiBase}/$1`'
            
            $content = $content -replace '"http://localhost:3001/api/([^"]+)"', '`${apiBase}/$1`'
            
            if ($content -ne $originalContent) {
                Set-Content -Path $fullPath -Value $content -NoNewline
                $replacements += $file
                Write-Host "[OK] Fixed: $file" -ForegroundColor Green
            }
        }
        catch {
            $errors += "Error fixing $file : $_"
            Write-Host "[ERROR] Failed: $file - $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[WARN] File not found: $file" -ForegroundColor Yellow
    }
}

# ======================================================================
# Summary
# ======================================================================

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "[SUMMARY] API URL Fix Complete!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Files successfully fixed: $($replacements.Count)" -ForegroundColor Green
Write-Host "Errors encountered: $($errors.Count)" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Red" })

if ($errors.Count -gt 0) {
    Write-Host "`n[ERROR] Issues encountered:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

Write-Host "`n[INFO] Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review changes: git diff" -ForegroundColor White
Write-Host "  2. Test locally: npm run dev" -ForegroundColor White
Write-Host "  3. Commit: git add . && git commit -m 'fix: Replace all hardcoded API URLs with getApiBaseUrl()'" -ForegroundColor White
Write-Host "  4. Push: git push origin invmisdb-rebuild-sept14-2025" -ForegroundColor White
Write-Host "  5. Deploy to server: .\rebuild-and-deploy.ps1" -ForegroundColor White
Write-Host ""
