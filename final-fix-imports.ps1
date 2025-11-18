# Final comprehensive fix for all duplicate imports
# This script reads line by line and removes the standalone "import {" line
# that appears before "import { getApiBaseUrl }"

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
    if (-not (Test-Path $file)) {
        Write-Host "File not found: $file"
        continue
    }
    
    Write-Host "Processing: $file"
    $lines = Get-Content $file
    $output = New-Object System.Collections.ArrayList
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $currentLine = $lines[$i]
        $nextLine = if ($i + 1 -lt $lines.Count) { $lines[$i + 1] } else { "" }
        
        # Check if this is the standalone "import {" followed by "import { getApiBaseUrl"
        if ($currentLine -match '^\s*import\s*\{\s*$' -and $nextLine -match '^import\s*\{\s*getApiBaseUrl\s*\}') {
            # Skip this line (the standalone "import {")
            Write-Host "  Removing standalone 'import {' at line $($i + 1)"
            continue
        }
        
        # Check if this line is "import { getApiBaseUrl }" and previous line was standalone "import {"
        # In this case, keep this line
        # Check if next line is empty and line after that starts with whitespace + capital letter
        if ($currentLine -match '^import\s*\{\s*getApiBaseUrl\s*\}' -and 
            $i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s*$' -and
            $i + 2 -lt $lines.Count -and $lines[$i + 2] -match '^\s+[A-Z]') {
            
            # Add the getApiBaseUrl line
            [void]$output.Add($currentLine)
            
            # Skip the empty line
            $i++
            
            # Add "import {" before the component names
            [void]$output.Add("import {")
            Write-Host "  Adding 'import {' for lucide-react components"
            continue
        }
        
        [void]$output.Add($currentLine)
    }
    
    $output | Set-Content $file -Encoding UTF8
    Write-Host "  Fixed!"
}

Write-Host "`nAll files processed! Run 'npm run build' to verify."
