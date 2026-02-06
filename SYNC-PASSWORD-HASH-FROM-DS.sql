-- =====================================================
-- SYNC PASSWORD HASH FROM DS TO IMS FOR SPECIFIC USER
-- Copy PasswordHash from CleanArchitectureDB to InventoryManagementDB
-- =====================================================

DECLARE @Username NVARCHAR(256) = '1730115698727';

PRINT 'Syncing password hash for user: ' + @Username;
PRINT '';

-- Step 1: Get the PasswordHash from Digital System
DECLARE @DSPasswordHash NVARCHAR(MAX);

SELECT @DSPasswordHash = PasswordHash 
FROM CleanArchitectureDB.dbo.AspNetUsers
WHERE UserName = @Username;

IF @DSPasswordHash IS NULL
BEGIN
    PRINT '❌ ERROR: User not found in Digital System (CleanArchitectureDB)';
    RETURN;
END

PRINT '✅ Found PasswordHash in Digital System';
PRINT '   Hash (first 30 chars): ' + SUBSTRING(@DSPasswordHash, 1, 30) + '...';
PRINT '';

-- Step 2: Update the PasswordHash in IMS
USE [InventoryManagementDB];

UPDATE AspNetUsers
SET PasswordHash = @DSPasswordHash
WHERE UserName = @Username;

PRINT '✅ Updated PasswordHash in InventoryManagementDB';
PRINT '';

-- Step 3: Verify the update
SELECT 
    UserName,
    FullName,
    PasswordHash,
    LEN(PasswordHash) as HashLength
FROM AspNetUsers
WHERE UserName = @Username;

PRINT '';
PRINT 'Now try logging in with the password from Digital System';
