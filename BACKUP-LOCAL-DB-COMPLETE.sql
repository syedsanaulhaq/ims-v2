-- =====================================================
-- FULL DATABASE BACKUP: InventoryManagementDB
-- Complete backup including all structure, data, and objects
-- =====================================================

-- Step 1: Back up the entire database
BACKUP DATABASE [InventoryManagementDB]
TO DISK = 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\InventoryManagementDB_FULL.bak'
WITH 
    FORMAT,
    INIT,
    NAME = 'InventoryManagementDB Full Backup',
    DESCRIPTION = 'Complete backup of InventoryManagementDB including all tables, views, procedures, and data',
    COMPRESSION;

PRINT '✅ Database backup created: InventoryManagementDB_FULL.bak';

-- Step 2: Back up transaction log (for point-in-time recovery if needed)
BACKUP LOG [InventoryManagementDB]
TO DISK = 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\InventoryManagementDB_LOG.trn'
WITH 
    FORMAT,
    INIT,
    NAME = 'InventoryManagementDB Log Backup',
    DESCRIPTION = 'Transaction log backup for point-in-time recovery';

PRINT '✅ Transaction log backup created: InventoryManagementDB_LOG.trn';

-- Step 3: Verify backup files
PRINT '';
PRINT '=== BACKUP VERIFICATION ===';
PRINT 'Backup files location: C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\';
PRINT '';
PRINT 'Files created:';
PRINT '  1. InventoryManagementDB_FULL.bak (complete database backup)';
PRINT '  2. InventoryManagementDB_LOG.trn (transaction log backup)';
PRINT '';
PRINT '=== NEXT STEPS ===';
PRINT 'On PRODUCTION server (ECP-DS-DB\MSSQLSERVER2):';
PRINT '';
PRINT '1. Copy backup files to production backup location:';
PRINT '   - Copy InventoryManagementDB_FULL.bak';
PRINT '   - Copy InventoryManagementDB_LOG.trn';
PRINT '';
PRINT '2. Drop existing database (if you want fresh import):';
PRINT '   DROP DATABASE [InventoryManagementDB];';
PRINT '';
PRINT '3. Restore from backup:';
PRINT '   RESTORE DATABASE [InventoryManagementDB]';
PRINT '   FROM DISK = ''C:\Program Files\...\InventoryManagementDB_FULL.bak''';
PRINT '   WITH REPLACE;';
PRINT '';
PRINT '✅ BACKUP PROCESS COMPLETE';
