-- =====================================================
-- RESTORE AspNetUsers - SAFE VERSION WITH FK DISABLE
-- Temporarily disables FK constraints for clean sync
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   RESTORE AspNetUsers (SAFE FK DISABLE VERSION)        ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- =====================================================
-- STEP 1: BACKUP CURRENT IMS AspNetUsers (SAFETY)
-- =====================================================
PRINT '=== STEP 1: BACKUP CURRENT IMS USERS (SAFETY) ===';

DECLARE @BackupTable NVARCHAR(128) = 'AspNetUsers_Backup_' + REPLACE(REPLACE(REPLACE(CONVERT(VARCHAR(20), GETDATE(), 120), '-', ''), ':', ''), ' ', '_');
EXEC('SELECT * INTO ' + @BackupTable + ' FROM AspNetUsers');
PRINT '✅ Backed up current AspNetUsers to: ' + @BackupTable;
PRINT '';

-- Backup IMS role assignments
DECLARE @RolesBackupTable NVARCHAR(128) = 'ims_user_roles_Backup_' + REPLACE(REPLACE(REPLACE(CONVERT(VARCHAR(20), GETDATE(), 120), '-', ''), ':', ''), ' ', '_');
EXEC('SELECT * INTO ' + @RolesBackupTable + ' FROM ims_user_roles');
PRINT '✅ Backed up ims_user_roles to: ' + @RolesBackupTable;
PRINT '';

-- =====================================================
-- STEP 2: DISABLE FOREIGN KEY CONSTRAINTS
-- =====================================================
PRINT '=== STEP 2: DISABLE FOREIGN KEY CONSTRAINTS ===';

-- Disable all FK constraints referencing AspNetUsers
ALTER TABLE ims_user_roles NOCHECK CONSTRAINT FK_ims_user_roles_user;
ALTER TABLE Notifications NOCHECK CONSTRAINT FK_Notifications_User;

PRINT '✅ Foreign key constraints disabled';
PRINT '';

-- =====================================================
-- STEP 3: DELETE CURRENT IMS USERS
-- =====================================================
PRINT '=== STEP 3: CLEAR CURRENT IMS USERS ===';

DECLARE @CurrentCount INT;
SELECT @CurrentCount = COUNT(*) FROM AspNetUsers;
PRINT 'Current user count: ' + CAST(@CurrentCount AS VARCHAR);

-- Delete IMS role assignments (will be re-assigned later if needed)
DELETE FROM ims_user_roles;
PRINT '✅ IMS role assignments cleared';

-- Delete user notifications (will be recreated as needed)
DELETE FROM Notifications WHERE UserId IS NOT NULL;
PRINT '✅ User notifications cleared';

-- Delete all users
DELETE FROM AspNetUsers;
PRINT '✅ Deleted all users from IMS database';
PRINT '';

-- =====================================================
-- STEP 4: COPY USERS FROM DIGITAL SYSTEM DATABASE
-- =====================================================
PRINT '=== STEP 4: COPY USERS FROM DIGITAL SYSTEM ===';
PRINT '';
PRINT 'Source database: CleanArchitectureDB';
PRINT 'Target database: InventoryManagementDB';
PRINT '';
PRINT '👉 Ready to copy users from CleanArchitectureDB';
PRINT '   Uncomment the INSERT statement below to execute:';
PRINT '';

-- UNCOMMENT TO EXECUTE:
/*
INSERT INTO InventoryManagementDB.dbo.AspNetUsers
SELECT * FROM [CleanArchitectureDB].dbo.AspNetUsers
WHERE ISACT = 1;

DECLARE @NewCount INT;
SELECT @NewCount = COUNT(*) FROM AspNetUsers;
PRINT '✅ Copied ' + CAST(@NewCount AS VARCHAR) + ' users from Digital System';
PRINT '';
*/

-- =====================================================
-- STEP 5: RE-ENABLE FOREIGN KEY CONSTRAINTS
-- =====================================================
PRINT '=== STEP 5: RE-ENABLE FOREIGN KEY CONSTRAINTS ===';

ALTER TABLE ims_user_roles WITH CHECK CHECK CONSTRAINT FK_ims_user_roles_user;
ALTER TABLE Notifications WITH CHECK CHECK CONSTRAINT FK_Notifications_User;

PRINT '✅ Foreign key constraints re-enabled';
PRINT '';

-- =====================================================
-- VERIFICATION
-- =====================================================
PRINT '=== VERIFICATION ===';
SELECT 
    'AspNetUsers' as TableName,
    COUNT(*) as TotalUsers,
    SUM(CASE WHEN Password IS NOT NULL THEN 1 ELSE 0 END) as WithPassword,
    SUM(CASE WHEN PasswordHash IS NOT NULL THEN 1 ELSE 0 END) as WithPasswordHash
FROM AspNetUsers;

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   INSTRUCTIONS                                         ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '✅ Script configured for: CleanArchitectureDB → InventoryManagementDB';
PRINT '';
PRINT '1. Review the backup table names above';
PRINT '   - AspNetUsers backup: ' + @BackupTable;
PRINT '   - ims_user_roles backup: ' + @RolesBackupTable;
PRINT '';
PRINT '2. Uncomment the INSERT statement in STEP 4 (remove /* and */)';
PRINT '';
PRINT '3. Run this script again to copy users from CleanArchitectureDB';
PRINT '';
PRINT '4. FK constraints will be re-enabled automatically';
PRINT '';
PRINT '5. After sync, test SSO login from Digital System';
PRINT '';
PRINT '🛡️ RECOVERY: If something goes wrong, restore from backups:';
PRINT 'DELETE FROM AspNetUsers;';
PRINT 'INSERT INTO AspNetUsers SELECT * FROM ' + @BackupTable + ';';
PRINT 'DELETE FROM ims_user_roles;';
PRINT 'INSERT INTO ims_user_roles SELECT * FROM ' + @RolesBackupTable + ';';
PRINT '';
PRINT '✅ This version is SAFER - disables FK constraints during sync!';
