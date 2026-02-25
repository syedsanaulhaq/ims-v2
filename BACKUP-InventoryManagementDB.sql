-- ============================================================================
-- BACKUP InventoryManagementDB BEFORE SOFT DELETE ROLLOUT
-- ============================================================================
-- Run this on the SQL Server BEFORE applying schema or code changes.
-- This uses SQL Server's default backup directory.
-- ============================================================================

-- Option 1: Backup to SQL Server default backup directory
DECLARE @BackupPath NVARCHAR(4000);
DECLARE @DefaultDir NVARCHAR(4000);

-- Get SQL Server default backup directory
EXEC master.dbo.xp_instance_regread 
  N'HKEY_LOCAL_MACHINE',
  N'Software\Microsoft\MSSQLServer\MSSQLServer',
  N'BackupDirectory',
  @DefaultDir OUTPUT;

-- Build backup filename with timestamp
SET @BackupPath = @DefaultDir + '\InventoryManagementDB_BeforeSoftDelete_' 
  + CONVERT(NVARCHAR(8), GETDATE(), 112) + '_' 
  + REPLACE(CONVERT(NVARCHAR(8), GETDATE(), 108), ':', '') + '.bak';

PRINT 'Backing up to: ' + @BackupPath;

BACKUP DATABASE [InventoryManagementDB]
TO DISK = @BackupPath
WITH INIT, COMPRESSION, STATS = 5;

PRINT '✓ Backup completed successfully!';
PRINT 'Backup location: ' + @BackupPath;

-- ============================================================================
-- ALTERNATIVE: If the above fails, uncomment this simple version:
-- ============================================================================
/*
BACKUP DATABASE [InventoryManagementDB]
TO DISK = N'C:\Temp\InventoryManagementDB_Backup.bak'
WITH INIT, COMPRESSION, STATS = 5;
PRINT '✓ Backup saved to C:\Temp\InventoryManagementDB_Backup.bak';
*/
