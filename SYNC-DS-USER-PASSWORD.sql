-- =====================================================
-- SYNC USER PASSWORD FOR DS SSO
-- Update user password to match Digital System
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║      SYNC USER PASSWORD FOR DS SSO                     ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- INSTRUCTIONS:
-- 1. Replace @Username with the username from Digital System (the CNIC value)
-- 2. Replace @PlainPassword with the actual password from Digital System
-- 3. Run this script on PRODUCTION database

-- =====================================================
-- CONFIGURE THESE VALUES
-- =====================================================
DECLARE @Username NVARCHAR(256) = '1730115698727'; -- Change this to actual username
DECLARE @PlainPassword NVARCHAR(100) = 'YourPasswordHere'; -- Change this to actual password
-- =====================================================

PRINT '🔍 Looking for user: ' + @Username;

-- Check if user exists
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = @Username)
BEGIN
    PRINT '❌ ERROR: User not found with username: ' + @Username;
    PRINT '';
    PRINT 'Available usernames:';
    SELECT TOP 10 UserName, FullName FROM AspNetUsers WHERE ISACT = 1 ORDER BY UserName;
    RETURN;
END

-- Show user details before update
PRINT '✅ User found';
SELECT 
    UserName,
    FullName,
    Email,
    intOfficeID,
    intWingID,
    ISACT
FROM AspNetUsers
WHERE UserName = @Username;
PRINT '';

-- Update password (storing as plain text for DS SSO compatibility)
-- Note: This is simplest approach but less secure
-- Better approach: hash password on Digital System side
UPDATE AspNetUsers
SET 
    Password = @PlainPassword,
    PasswordHash = @PlainPassword, -- Keep both fields in sync
    LastLoggedIn = NULL -- Reset so we know it's updated
WHERE UserName = @Username;

PRINT '✅ Password updated for user: ' + @Username;
PRINT '';
PRINT '⚠️ IMPORTANT: For security, consider:';
PRINT '   1. Using ASP.NET Identity password hashing';
PRINT '   2. Syncing password hashes between systems';
PRINT '   3. Using a centralized authentication service';
PRINT '';

-- Verify the update
PRINT '=== VERIFICATION ===';
SELECT 
    UserName,
    FullName,
    CASE 
        WHEN Password = @PlainPassword THEN '✅ Password matches' 
        ELSE '❌ Password does NOT match' 
    END as PasswordCheck,
    CASE 
        WHEN ISACT = 1 THEN '✅ Active' 
        ELSE '❌ Inactive' 
    END as AccountStatus
FROM AspNetUsers
WHERE UserName = @Username;

PRINT '';
PRINT '✅ Password sync complete!';
PRINT 'You can now try logging in from Digital System.';
PRINT '';
PRINT 'Test URL: http://172.20.150.34:3001/api/auth/ds-authenticate';
PRINT 'POST Body: {"UserName": "' + @Username + '", "Password": "' + @PlainPassword + '"}';
