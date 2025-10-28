# Configure Demo Backend
$sqlServerConfig = @"
# SQL Server Configuration - Demo Stage
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=5002
"@

Set-Content -Path ".env.sqlserver" -Value $sqlServerConfig
Write-Host "✅ Backend configured for DEMO (port 5002)" -ForegroundColor Green
