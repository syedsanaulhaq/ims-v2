-- Simple test user with plain text password for development
-- Username: testadmin, Password: admin123

USE InventoryManagementDB;
GO

-- Check if user exists
IF EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = 'testadmin')
BEGIN
    PRINT 'User testadmin already exists. Updating password...';
    UPDATE AspNetUsers 
    SET Password = 'admin123',
        ISACT = 1
    WHERE UserName = 'testadmin';
END
ELSE
BEGIN
    PRINT 'Creating new user testadmin...';
    INSERT INTO AspNetUsers (
        Id, UserName, NormalizedUserName, Email, NormalizedEmail,
        EmailConfirmed, SecurityStamp, ConcurrencyStamp,
        PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount,
        FullName, Role, CNIC, Password, ISACT,
        intOfficeID, intWingID, intBranchID, intDesignationID
    ) VALUES (
        NEWID(), 'testadmin', 'TESTADMIN',
        'testadmin@test.com', 'TESTADMIN@TEST.COM',
        1, NEWID(), NEWID(),
        0, 0, 0, 0,
        'Test Administrator', 'Admin', '1111111111111', 'admin123', 1,
        583, 19, 1, 1
    );
END

-- Verify
SELECT Id, UserName, FullName, Password, ISACT, Role 
FROM AspNetUsers 
WHERE UserName = 'testadmin';

PRINT 'Test user ready! Login with: testadmin / admin123';
