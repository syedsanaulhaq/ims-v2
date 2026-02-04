-- =====================================================
-- RESTORE DATABASE ON PRODUCTION
-- Restore InventoryManagementDB from full backup
-- Run this on: ECP-DS-DB\MSSQLSERVER2
-- =====================================================

-- Step 1: Drop existing database (if you want to remove old data completely)
-- UNCOMMENT BELOW IF YOU WANT TO DROP THE OLD DATABASE FIRST
/*
USE master;
GO

-- Kill all connections to the database
ALTER DATABASE [InventoryManagementDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Drop the database
DROP DATABASE [InventoryManagementDB];
GO

PRINT '✅ Old database dropped';
*/

-- Step 2: Restore from backup
-- PREREQUISITE: Copy the backup files to the production server backup location first!
-- Files needed:
--   - InventoryManagementDB_FULL.bak (place in C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\)
--   - InventoryManagementDB_LOG.trn (place in same location)

USE master;
GO

PRINT 'Starting database restore...';
PRINT '';

-- Restore database from full backup
RESTORE DATABASE [InventoryManagementDB]
FROM DISK = 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\InventoryManagementDB_FULL.bak'
WITH 
    REPLACE,
    RECOVERY;

PRINT '✅ Database restored from full backup';

-- Optional: Restore transaction log if you want up-to-the-minute recovery
-- RESTORE LOG [InventoryManagementDB]
-- FROM DISK = 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER2\BACKUP\InventoryManagementDB_LOG.trn'
-- WITH RECOVERY;

-- Step 3: Verify restoration
PRINT '';
PRINT '=== RESTORE VERIFICATION ===';

-- Check database exists
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'InventoryManagementDB')
BEGIN
    PRINT '✅ Database InventoryManagementDB exists';
END
ELSE
BEGIN
    PRINT '❌ ERROR: Database InventoryManagementDB not found';
END

-- Check table counts
USE [InventoryManagementDB];
GO

PRINT '';
PRINT '=== TABLE ROW COUNTS ===';
SELECT 'categories' as [TABLE], COUNT(*) as [ROWS] FROM categories
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'item_masters', COUNT(*) FROM item_masters
UNION ALL
SELECT 'current_inventory_stock', COUNT(*) FROM current_inventory_stock
UNION ALL
SELECT 'tenders', COUNT(*) FROM tenders
UNION ALL
SELECT 'tender_items', COUNT(*) FROM tender_items
UNION ALL
SELECT 'stock_issuance_requests', COUNT(*) FROM stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items', COUNT(*) FROM stock_issuance_items
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'delivery_items', COUNT(*) FROM delivery_items
UNION ALL
SELECT 'stock_returns', COUNT(*) FROM stock_returns
ORDER BY [TABLE];

PRINT '';
PRINT '✅ RESTORE PROCESS COMPLETE';
PRINT 'Database is ready for use!';
