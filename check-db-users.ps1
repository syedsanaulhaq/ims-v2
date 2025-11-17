# Check Test Users in Database (PowerShell Native)
# This script uses .NET SqlClient to query the database

$Server = "172.20.151.60\MSSQLSERVER2"
$Database = "InventoryManagementDB"
$Username = "sa"
$Password = "Pakistan@786"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CHECKING TEST USERS IN DATABASE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ConnectionString = "Server=$Server;Database=$Database;User Id=$Username;Password=$Password;TrustServerCertificate=True;"

try {
    # Load SQL Server assembly
    Add-Type -AssemblyName "System.Data"
    
    $Connection = New-Object System.Data.SqlClient.SqlConnection
    $Connection.ConnectionString = $ConnectionString
    $Connection.Open()
    
    Write-Host "[INFO] Connected to database successfully`n" -ForegroundColor Green
    
    # Query for test users
    $Query = @"
SELECT 
    UserName,
    FullName,
    Email,
    Role,
    Password,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasHash,
    ISACT
FROM AspNetUsers
WHERE Id LIKE 'test-%' OR UserName LIKE 'test%'
ORDER BY UserName
"@
    
    $Command = $Connection.CreateCommand()
    $Command.CommandText = $Query
    $Adapter = New-Object System.Data.SqlClient.SqlDataAdapter $Command
    $Dataset = New-Object System.Data.DataSet
    $Adapter.Fill($Dataset) | Out-Null
    
    if ($Dataset.Tables[0].Rows.Count -gt 0) {
        Write-Host "Found $($Dataset.Tables[0].Rows.Count) test user(s):`n" -ForegroundColor Yellow
        
        $Dataset.Tables[0] | Format-Table -AutoSize
        
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "TRY THESE CREDENTIALS:" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        
        foreach ($row in $Dataset.Tables[0].Rows) {
            if ($row.Password) {
                Write-Host "Username: $($row.UserName)" -ForegroundColor White
                Write-Host "Password: $($row.Password)" -ForegroundColor White
                Write-Host "Role: $($row.Role)" -ForegroundColor Gray
                Write-Host ""
            }
        }
    } else {
        Write-Host "[WARNING] No test users found!`n" -ForegroundColor Yellow
        
        # Show first 5 regular users
        $Query2 = @"
SELECT TOP 5
    UserName,
    FullName,
    Email,
    Role,
    Password,
    ISACT
FROM AspNetUsers
WHERE ISACT = 1
ORDER BY UserName
"@
        
        $Command.CommandText = $Query2
        $Adapter2 = New-Object System.Data.SqlClient.SqlDataAdapter $Command
        $Dataset2 = New-Object System.Data.DataSet
        $Adapter2.Fill($Dataset2) | Out-Null
        
        if ($Dataset2.Tables[0].Rows.Count -gt 0) {
            Write-Host "Here are the first 5 active users:`n" -ForegroundColor Cyan
            $Dataset2.Tables[0] | Format-Table -AutoSize
        }
        
        Write-Host "`nTo create test users, run:" -ForegroundColor Yellow
        Write-Host "  C:\ims-v1\create-test-users.cjs`n" -ForegroundColor White
    }
    
    $Connection.Close()
    
} catch {
    Write-Host "[ERROR] Failed to connect or query database:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nConnection String (without password):" -ForegroundColor Yellow
    Write-Host "  Server: $Server" -ForegroundColor Gray
    Write-Host "  Database: $Database" -ForegroundColor Gray
    Write-Host "  User: $Username`n" -ForegroundColor Gray
}
