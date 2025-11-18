# Fix all duplicate "import {\nimport { getApiBaseUrl }" patterns

$files = @(
    "src\components\stockTransactions\EnhancedStockAcquisitionWithDelivery.tsx",
    "src\pages\AllInventoryItemsPage.tsx",
    "src\pages\StockQuantitiesPage.tsx",
    "src\pages\TenderAcquisitionReport.tsx",
    "src\pages\TenderReport-New.tsx",
    "src\pages\TenderReport_OLD.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..."
        $content = Get-Content $file -Raw
        
        # Pattern 1: Fix "import {\nimport { getApiBaseUrl }\n\n  SomeName," 
        # Replace with proper structure
        $content = $content -replace '(?m)^import \{\r?\n^import \{ getApiBaseUrl \} from ''@/services/invmisApi'';\r?\n\r?\n^  ([A-Z])', 'import { getApiBaseUrl } from ''@/services/invmisApi'';`nimport {`n  $1'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Fixed!"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host "`nDone! Run 'npm run build' to test."
