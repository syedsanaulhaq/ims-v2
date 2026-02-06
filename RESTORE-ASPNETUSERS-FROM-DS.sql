-- =====================================================
-- RESTORE AspNetUsers FROM DIGITAL SYSTEM DATABASE
-- Simple 3-step process to sync user accounts
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   RESTORE AspNetUsers FROM DIGITAL SYSTEM              ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- =====================================================
-- STEP 1: BACKUP CURRENT IMS AspNetUsers (SAFETY)
-- =====================================================
PRINT '=== STEP 1: BACKUP CURRENT IMS USERS (SAFETY) ===';

-- Create backup table with timestamp
DECLARE @BackupTable NVARCHAR(128) = 'AspNetUsers_Backup_' + REPLACE(REPLACE(REPLACE(CONVERT(VARCHAR(20), GETDATE(), 120), '-', ''), ':', ''), ' ', '_');

EXEC('SELECT * INTO ' + @BackupTable + ' FROM AspNetUsers');

PRINT '✅ Backed up current AspNetUsers to: ' + @BackupTable;
PRINT '';

-- =====================================================
-- STEP 2: DELETE CURRENT IMS USERS
-- =====================================================
PRINT '=== STEP 2: CLEAR CURRENT IMS USERS ===';

DECLARE @CurrentCount INT;
SELECT @CurrentCount = COUNT(*) FROM AspNetUsers;
PRINT 'Current user count: ' + CAST(@CurrentCount AS VARCHAR);

-- Delete all users (backup was made in Step 1)
DELETE FROM AspNetUsers;

PRINT '✅ Deleted all users from IMS database';
PRINT '';

-- =====================================================
-- STEP 3: COPY USERS FROM DIGITAL SYSTEM DATABASE
-- =====================================================
PRINT '=== STEP 3: COPY USERS FROM DIGITAL SYSTEM ===';
PRINT '';

-- CONFIGURE THIS: Set your Digital System database name
DECLARE @DSDatabase NVARCHAR(128) = 'DigitalSystemDB'; -- ⚠️ CHANGE THIS TO YOUR DS DATABASE NAME!

PRINT '⚠️ IMPORTANT: Update @DSDatabase variable above to your actual DS database name!';
PRINT 'Current value: ' + @DSDatabase;
PRINT '';
PRINT '👉 If DS database is on same server, uncomment and run the INSERT below:';
PRINT '';

-- UNCOMMENT TO EXECUTE:
/*
EXEC('
INSERT INTO InventoryManagementDB.dbo.AspNetUsers
SELECT * FROM [' + @DSDatabase + '].dbo.AspNetUsers
WHERE ISACT = 1
');

DECLARE @NewCount INT;
SELECT @NewCount = COUNT(*) FROM AspNetUsers;

PRINT '✅ Copied ' + CAST(@NewCount AS VARCHAR) + ' users from Digital System';
PRINT '';
PRINT '=== VERIFICATION ===';
SELECT 
    COUNT(*) as TotalUsers,
    SUM(CASE WHEN Password IS NOT NULL THEN 1 ELSE 0 END) as WithPassword,
    SUM(CASE WHEN PasswordHash IS NOT NULL THEN 1 ELSE 0 END) as WithPasswordHash,
    MIN(LastLoggedIn) as OldestLogin,
    MAX(LastLoggedIn) as NewestLogin
FROM AspNetUsers;

PRINT '';
PRINT '✅ AspNetUsers sync complete!';
PRINT 'All usernames and passwords now match Digital System database.';
*/

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   INSTRUCTIONS                                         ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '1. Update @DSDatabase variable with your Digital System database name';
 PRINT '   (Line 38: DECLARE @DSDatabase NVARCHAR(128) = ''YourDSDatabase'';)';
PRINT '';
PRINT '2. Review the backup table name above (safety backup created)';
PRINT '';
PRINT '3. Uncomment the INSERT statement (remove /* and */)';
PRINT '';
PRINT '4. Run this script again to copy users from DS database';
PRINT '';
PRINT '5. After sync, test SSO login from Digital System';
PRINT '';
PRINT '📍 If DS database is on a DIFFERENT server:';
PRINT '   - Create a linked server first, OR';
PRINT '   - Export AspNetUsers from DS and import to IMS manually';
PRINT '';

-- Show backup table for recovery if needed
PRINT '🛡️ RECOVERY: If something goes wrong, restore from backup:';
PRINT 'INSERT INTO AspNetUsers SELECT * FROM ' + @BackupTable;
