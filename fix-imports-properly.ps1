# Fix all duplicate imports properly with real newlines

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

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..."
        $lines = Get-Content $file
        $newLines = @()
        $skipNext = $false
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($skipNext) {
                $skipNext = $false
                continue
            }
            
            # Check if current line is "import {" and next line is "import { getApiBaseUrl }"
            if ($i -lt ($lines.Count - 1) -and 
                $lines[$i] -match '^\s*import \{$' -and 
                $lines[$i + 1] -match '^import \{ getApiBaseUrl \}') {
                
                # Skip the standalone "import {" line, keep the getApiBaseUrl line
                $newLines += $lines[$i + 1]
                
                # Skip the next line (we just added it)
                $i++
                
                # Skip the empty line if it exists
                if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s*$') {
                    $i++
                }
                
                # Now add "import {" before the component names
                if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s+[A-Z]') {
                    $newLines += "import {"
                }
                continue
            }
            
            $newLines += $lines[$i]
        }
        
        Set-Content $file -Value $newLines
        Write-Host "  Fixed!"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host "`nDone! Run 'npm run build' to test."
