# Check Test Users in Database
# This script queries the database to see what test users exist

$Server = "172.20.151.60\MSSQLSERVER2"
$Database = "InventoryManagementDB"
$Username = "sa"
$Password = "Pakistan@786"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CHECKING TEST USERS IN DATABASE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$Query = @"
-- Check all test users
SELECT 
    Id,
    UserName,
    FullName,
    Email,
    Role,
    CNIC,
    Password,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPasswordHash,
    ISACT
FROM AspNetUsers
WHERE Id LIKE 'test-%' OR UserName LIKE 'test%'
ORDER BY UserName;

-- If no test users, show first 5 users
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE Id LIKE 'test-%' OR UserName LIKE 'test%')
BEGIN
    PRINT '';
    PRINT 'No test users found. Here are the first 5 users:';
    PRINT '';
    SELECT TOP 5
        Id,
        UserName,
        FullName,
        Email,
        Role,
        CNIC,
        Password,
        CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPasswordHash,
        ISACT
    FROM AspNetUsers
    WHERE ISACT = 1
    ORDER BY UserName;
END
"@

try {
    # Use sqlcmd to query
    $result = sqlcmd -S $Server -U $Username -P $Password -d $Database -Q $Query -W -w 500
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "QUERY COMPLETED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        
        Write-Host "If test users exist, try these credentials:" -ForegroundColor Yellow
        Write-Host "  testadmin / admin123" -ForegroundColor White
        Write-Host "  testmanager / manager123" -ForegroundColor White
        Write-Host "  testuser / user123`n" -ForegroundColor White
        
        Write-Host "If no test users found, run this to create them:" -ForegroundColor Yellow
        Write-Host "  sqlcmd -S $Server -U $Username -P $Password -d $Database -i C:\ims-v1\create-test-users.sql`n" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Failed to query database" -ForegroundColor Red
        Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Exception occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nMake sure sqlcmd is installed and database is accessible." -ForegroundColor Yellow
}
