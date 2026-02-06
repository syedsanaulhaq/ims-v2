-- =====================================================
-- SET USER PASSWORD FOR IMMEDIATE SSO TESTING
-- Use this to quickly set a known password for a specific user
-- =====================================================

USE [InventoryManagementDB];
GO

-- =====================================================
-- CONFIGURE THESE VALUES FOR YOUR TEST USER
-- =====================================================
DECLARE @Username NVARCHAR(256) = '3740500772543'; -- Change to your test username (CNIC from DS)
DECLARE @TestPassword NVARCHAR(100) = 'Test@123'; -- Change to a test password
-- =====================================================

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   SET USER PASSWORD FOR SSO TESTING                    ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- Check if user exists
IF NOT EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = @Username)
BEGIN
    PRINT '❌ ERROR: User not found: ' + @Username;
    PRINT '';
    PRINT 'Available active users:';
    SELECT TOP 20 UserName, FullName, Email 
    FROM AspNetUsers 
    WHERE ISACT = 1 
    ORDER BY UserName;
    RETURN;
END

-- Show user before update
PRINT '=== USER DETAILS (BEFORE UPDATE) ===';
SELECT 
    UserName,
    FullName,
    Email,
    intOfficeID,
    intWingID,
    intDesignationID,
    CASE WHEN Password IS NOT NULL THEN 'Has Password' ELSE 'NULL' END as CurrentPassword,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Has Hash (' + 
        CASE 
            WHEN PasswordHash LIKE 'AQA%' THEN 'ASP.NET Identity)'
            WHEN PasswordHash LIKE '$2%' THEN 'Bcrypt)'
            ELSE 'Unknown)'
        END
    ELSE 'NULL' END as CurrentPasswordHash,
    ISACT as IsActive,
    LastLoggedIn
FROM AspNetUsers
WHERE UserName = @Username;
PRINT '';

-- Update the password (store in both Password and PasswordHash fields for compatibility)
UPDATE AspNetUsers
SET 
    Password = @TestPassword,           -- Plain text for quick testing
    PasswordHash = @TestPassword,       -- Also store here for backup
    LastLoggedIn = NULL                 -- Reset to track when they next login
WHERE UserName = @Username;

PRINT '✅ Password updated successfully!';
PRINT '';

-- Show user after update
PRINT '=== USER DETAILS (AFTER UPDATE) ===';
SELECT 
    UserName,
    FullName,
    Email,
    Password as NewPassword,
    '✅ Password Set' as Status
FROM AspNetUsers
WHERE UserName = @Username;
PRINT '';

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   NEXT STEPS TO TEST SSO                               ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '1. In Digital System .NET application, update session:';
PRINT '   HttpContext.Session.SetString("CNIC", "' + @Username + '");';
PRINT '   HttpContext.Session.SetString("Pwd", "' + @TestPassword + '");';
PRINT '';
PRINT '2. Click "Go to IMS" button';
PRINT '';
PRINT '3. Expected flow:';
PRINT '   → .NET calls: POST http://172.20.150.34:3001/api/auth/ds-authenticate';
PRINT '   → IMS responds with JWT token';
PRINT '   → .NET redirects to: http://172.20.150.34:3001/sso-login?token=...';
PRINT '   → IMS creates session and redirects to dashboard';
PRINT '';
PRINT '4. You should see in IMS console:';
PRINT '   🔐 DS Authentication Request Received';
PRINT '   🔍 Authenticating user: ' + @Username;
PRINT '   ✅ User found: [Full Name]';
PRINT '   ✅ Password matched (plain text)';
PRINT '   ✅ Token generated and session created';
PRINT '';
PRINT '✅ User ready for SSO testing!';
PRINT '';

PRINT '⚠️ SECURITY NOTE:';
PRINT 'Plain text passwords are used for TESTING ONLY!';
PRINT 'For production, sync ASP.NET Identity hashes from Digital System database.';
