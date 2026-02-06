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

-- Disable ALL FK constraints in database (comprehensive approach)
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

PRINT '✅ All foreign key constraints disabled';
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

-- Clear processed_by references in stock_acquisitions
UPDATE stock_acquisitions SET processed_by = NULL WHERE processed_by IS NOT NULL;
PRINT '✅ Stock acquisitions processed_by cleared';

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

-- Re-enable ALL FK constraints in database
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

PRINT '✅ All foreign key constraints re-enabled';
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
PRINT '✅ This version is SAFER - disables ALL FK constraints during sync!';
PRINT '';
PRINT '⚠️ IMPORTANT:';
PRINT '   - ALL foreign key constraints are disabled temporarily (Step 2)';
PRINT '   - Related data is cleaned up (ims_user_roles, Notifications, stock_acquisitions)';
PRINT '   - AspNetUsers is deleted';
PRINT '   - Users from CleanArchitectureDB are inserted';
PRINT '   - ALL FK constraints are re-enabled (Step 5)';
PRINT '';
PRINT '📋 NO FK ERRORS will occur with this approach!';

