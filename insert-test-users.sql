-- Insert test users with bcrypt password hashes
USE InventoryManagementDB;
GO

-- Check if test users already exist
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = 'testadmin')
BEGIN
    INSERT INTO AspNetUsers (
        Id, UserName, FullName, Email, Role, 
        Password, PasswordHash, ISACT, 
        intOfficeID, intWingID, intBranchID, intDesignationID,
        CreatedDate
    )
    VALUES (
        'test-admin-001', 
        'testadmin', 
        'Test Administrator', 
        'testadmin@ecp.gov.pk', 
        'Admin',
        'admin123',  -- Plain text for fallback
        '$2b$10$viHX17Ukxb10tkTyHgNww.Mck1GUcRn03lhqqb0PjdOAiN0jB1QWa',  -- bcrypt hash of 'admin123'
        1,  -- Active
        583,  -- Office ID
        16,   -- Wing ID
        NULL, 
        NULL,
        GETDATE()
    );
    PRINT '✅ Created testadmin user';
END
ELSE
BEGIN
    PRINT '⚠️  testadmin already exists';
END

-- Test Manager
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = 'testmanager')
BEGIN
    INSERT INTO AspNetUsers (
        Id, UserName, FullName, Email, Role, 
        Password, PasswordHash, ISACT, 
        intOfficeID, intWingID, intBranchID, intDesignationID,
        CreatedDate
    )
    VALUES (
        'test-manager-001', 
        'testmanager', 
        'Test Manager', 
        'testmanager@ecp.gov.pk', 
        'Manager',
        'manager123',
        '$2b$10$m4ujtS4/U9SuNSvXW4LgfeOQijwj4vYf9HpFHUS1X7Q436P7O1ocK',  -- bcrypt hash of 'manager123'
        1,
        583,
        16,
        NULL,
        NULL,
        GETDATE()
    );
    PRINT '✅ Created testmanager user';
END
ELSE
BEGIN
    PRINT '⚠️  testmanager already exists';
END

-- Test User
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = 'testuser')
BEGIN
    INSERT INTO AspNetUsers (
        Id, UserName, FullName, Email, Role, 
        Password, PasswordHash, ISACT, 
        intOfficeID, intWingID, intBranchID, intDesignationID,
        CreatedDate
    )
    VALUES (
        'test-user-001', 
        'testuser', 
        'Test User', 
        'testuser@ecp.gov.pk', 
        'User',
        'user123',
        '$2b$10$aLgjNYv/fNYV1Lpd/Mq6he9myKHnyY5PMrF2HPu4p8iYhXrX13p3q',  -- bcrypt hash of 'user123'
        1,
        583,
        16,
        NULL,
        NULL,
        GETDATE()
    );
    PRINT '✅ Created testuser user';
END
ELSE
BEGIN
    PRINT '⚠️  testuser already exists';
END

GO

-- Verify the insertions
SELECT 
    UserName,
    FullName,
    Role,
    ISACT as Active,
    CASE WHEN Password IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPassword,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPasswordHash,
    CreatedDate
FROM AspNetUsers 
WHERE UserName IN ('testadmin', 'testmanager', 'testuser')
ORDER BY Role, UserName;

PRINT '';
PRINT '=== TEST CREDENTIALS ===';
PRINT 'testadmin / admin123 (Admin)';
PRINT 'testmanager / manager123 (Manager)';
PRINT 'testuser / user123 (User)';
