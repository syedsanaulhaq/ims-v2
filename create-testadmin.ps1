# Create Test Admin User
# This script creates a test admin user with username: testadmin, password: admin123

$Server = "172.20.151.60\MSSQLSERVER2"
$Database = "InventoryManagementDB"
$Username = "sa"
$Password = "Pakistan@786"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CREATE TEST ADMIN USER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ConnectionString = "Server=$Server;Database=$Database;User Id=$Username;Password=$Password;TrustServerCertificate=True;"

try {
    Add-Type -AssemblyName "System.Data"
    
    $Connection = New-Object System.Data.SqlClient.SqlConnection
    $Connection.ConnectionString = $ConnectionString
    $Connection.Open()
    
    Write-Host "[INFO] Connected to database`n" -ForegroundColor Green
    
    # First, check if user already exists
    $CheckQuery = "SELECT COUNT(*) FROM AspNetUsers WHERE UserName = 'testadmin'"
    $CheckCommand = $Connection.CreateCommand()
    $CheckCommand.CommandText = $CheckQuery
    $UserExists = $CheckCommand.ExecuteScalar()
    
    if ($UserExists -gt 0) {
        Write-Host "[WARNING] User 'testadmin' already exists. Updating..." -ForegroundColor Yellow
        
        # Update existing user
        $UpdateQuery = @"
UPDATE AspNetUsers 
SET 
    Password = 'admin123',
    PasswordHash = NULL,
    ISACT = 1,
    FullName = 'Test Administrator',
    Role = 'Admin',
    Email = 'testadmin@ecp.gov.pk'
WHERE UserName = 'testadmin'
"@
        $UpdateCommand = $Connection.CreateCommand()
        $UpdateCommand.CommandText = $UpdateQuery
        $UpdateCommand.ExecuteNonQuery() | Out-Null
        
        Write-Host "[OK] User 'testadmin' updated successfully`n" -ForegroundColor Green
        
    } else {
        Write-Host "[INFO] Creating new user 'testadmin'..." -ForegroundColor Cyan
        
        # Create new user
        $InsertQuery = @"
INSERT INTO AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail,
    EmailConfirmed, SecurityStamp, ConcurrencyStamp,
    PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
    FullName, Role, CNIC, Password, ISACT,
    intOfficeID, intWingID, intBranchID, intDesignationID
) VALUES (
    'test-admin-001', 'testadmin', 'TESTADMIN',
    'testadmin@ecp.gov.pk', 'TESTADMIN@ECP.GOV.PK',
    1, NEWID(), NEWID(),
    0, 0, 0, 0,
    'Test Administrator', 'Admin', '1234567890123', 'admin123', 1,
    583, 19, 1, 1
)
"@
        $InsertCommand = $Connection.CreateCommand()
        $InsertCommand.CommandText = $InsertQuery
        $InsertCommand.ExecuteNonQuery() | Out-Null
        
        Write-Host "[OK] User 'testadmin' created successfully`n" -ForegroundColor Green
    }
    
    # Verify the user
    $VerifyQuery = @"
SELECT 
    UserName, FullName, Email, Role, Password, ISACT
FROM AspNetUsers 
WHERE UserName = 'testadmin'
"@
    
    $VerifyCommand = $Connection.CreateCommand()
    $VerifyCommand.CommandText = $VerifyQuery
    $Adapter = New-Object System.Data.SqlClient.SqlDataAdapter $VerifyCommand
    $Dataset = New-Object System.Data.DataSet
    $Adapter.Fill($Dataset) | Out-Null
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "USER CREATED/UPDATED:" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    $Dataset.Tables[0] | Format-Table -AutoSize
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "LOGIN CREDENTIALS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Username: testadmin" -ForegroundColor White
    Write-Host "Password: admin123" -ForegroundColor White
    Write-Host "`nYou can now login at: http://localhost/ims/login`n" -ForegroundColor Yellow
    
    $Connection.Close()
    
} catch {
    Write-Host "[ERROR] Failed to create user:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
