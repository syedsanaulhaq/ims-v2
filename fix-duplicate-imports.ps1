# Fix duplicate import statements in all affected files
$files = @(
    "src\components\stockTransactions\EnhancedStockAcquisitionWithDelivery.tsx",
    "src\components\stockTransactions\NewStockAcquisitionDashboard.tsx",
    "src\components\stockTransactions\StockAcquisitionDashboard.tsx",
    "src\pages\AllInventoryItemsPage.tsx",
    "src\pages\StockQuantitiesPage.tsx",
    "src\pages\TenderAcquisitionReport.tsx",
    "src\pages\TenderReport-New.tsx",
    "src\pages\TenderReport_OLD.tsx",
    "src\pages\UnifiedTenderManagement.tsx"
)

$fixed = 0

foreach ($file in $files) {
    $fullPath = "e:\ECP-Projects\inventory-management-system-ims\ims-v1\$file"
    
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $original = $content
        
        # Fix: "import {\nimport { getApiBaseUrl" -> just "import { getApiBaseUrl"  
        $content = $content -replace "import \{\s*\r?\n\s*import \{ getApiBaseUrl \} from '@/services/invmisApi';", "import { getApiBaseUrl } from '@/services/invmisApi';"
        
        if ($content -ne $original) {
            Set-Content $fullPath $content -NoNewline
            $fixed++
            Write-Host "[OK] Fixed: $file" -ForegroundColor Green
        } else {
            Write-Host "[SKIP] No issues: $file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n[SUMMARY] Fixed $fixed files" -ForegroundColor Cyan
