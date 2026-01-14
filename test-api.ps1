$tenderId = "8EE90FB6-9EF4-4832-A208-1277B39AD475"
$url = "http://localhost:3001/api/tender/$tenderId/items"

Write-Host "Testing endpoint: $url"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $items = $response.Content | ConvertFrom-Json
    Write-Host "✅ Items found: $($items.Count)"
    Write-Host ""
    
    if ($items.Count -gt 0) {
        Write-Host "First 3 items:" -ForegroundColor Cyan
        $items | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - ID: $($_.id), Item ID: $($_.item_id), Qty: $($_.quantity), Nomenclature: $($_.nomenclature)"
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Exception details:"
    $_.Exception
}
