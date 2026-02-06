-- =====================================================
-- QUICK TEST: Use existing plain password users
-- These 5 users already have plain passwords and can test SSO immediately
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   USERS READY FOR SSO TESTING                          ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- Show users with plain passwords (from your diagnostic results)
PRINT '=== USERS WITH PLAIN PASSWORDS (READY TO TEST) ===';
SELECT 
    UserName,
    FullName,
    Email,
    Password as PlainPassword,
    CASE WHEN ISACT = 1 THEN '✅ Active' ELSE '❌ Inactive' END as Status,
    LastLoggedIn
FROM AspNetUsers
WHERE Password IS NOT NULL 
  AND ISACT = 1
ORDER BY LastLoggedIn DESC;

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   HOW TO TEST SSO WITH THESE USERS                     ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '1. Pick a user from the list above (e.g., "3740500772543 - Muhammad Saad Ali")';
PRINT '';
PRINT '2. In Digital System .NET application, set session values:';
PRINT '   HttpContext.Session.SetString("CNIC", "3740500772543");';
PRINT '   HttpContext.Session.SetString("Pwd", "[use the Password value shown above]");';
PRINT '';
PRINT '3. Click "Go to IMS" button in Digital System';
PRINT '';
PRINT '4. It should successfully:';
PRINT '   - Authenticate via POST /api/auth/ds-authenticate';
PRINT '   - Receive a JWT token';
PRINT '   - Redirect to /sso-login?token=...';
PRINT '   - Create IMS session and open dashboard';
PRINT '';
PRINT '✅ These users can test SSO immediately!';
PRINT '';

-- For production: Show how many users need password sync
DECLARE @TotalUsers INT, @ReadyUsers INT, @NeedSync INT;
SELECT @TotalUsers = COUNT(*) FROM AspNetUsers WHERE ISACT = 1;
SELECT @ReadyUsers = COUNT(*) FROM AspNetUsers WHERE ISACT = 1 AND Password IS NOT NULL;
SET @NeedSync = @TotalUsers - @ReadyUsers;

PRINT '=== PASSWORD SYNC STATUS ===';
PRINT 'Total Active Users: ' + CAST(@TotalUsers AS VARCHAR);
PRINT 'Ready for SSO (have plain password): ' + CAST(@ReadyUsers AS VARCHAR);
PRINT 'Need Password Sync: ' + CAST(@NeedSync AS VARCHAR);
PRINT '';

IF @NeedSync > 0
BEGIN
    PRINT '⚠️ ' + CAST(@NeedSync AS VARCHAR) + ' users need passwords synced from Digital System';
    PRINT '';
    PRINT 'To sync all passwords, use: SYNC-PASSWORDS-FROM-DS-DB.sql';
END
