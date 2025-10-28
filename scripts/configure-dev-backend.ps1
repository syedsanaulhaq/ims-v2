# Configure Development Backend
$sqlServerConfig = @"
# SQL Server Configuration - Development Environment
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=5000
"@

Set-Content -Path ".env.sqlserver" -Value $sqlServerConfig
Write-Host "✅ Backend configured for DEVELOPMENT (port 5000)" -ForegroundColor Green
