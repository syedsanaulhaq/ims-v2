-- =====================================================
-- COPY PASSWORDS FROM DIGITAL SYSTEM DATABASE TO IMS
-- Run this to sync passwords from DS database to IMS
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   SYNC PASSWORDS FROM DIGITAL SYSTEM TO IMS            ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- IMPORTANT: This assumes Digital System uses the same database or has a linked server
-- If DS uses a different database, you need to:
-- 1. Create a linked server to DS database, OR
-- 2. Export passwords from DS and import to IMS

-- =====================================================
-- OPTION 1: If DS is in the same SQL Server instance
-- =====================================================

-- Replace 'DigitalSystemDB' with actual DS database name
DECLARE @DSDatabase NVARCHAR(128) = 'DigitalSystemDB'; -- CHANGE THIS!

PRINT '🔄 Syncing passwords from Digital System database...';
PRINT 'Source DB: ' + @DSDatabase;
PRINT 'Target DB: InventoryManagementDB';
PRINT '';

-- Show sample of what will be synced
PRINT '=== PREVIEW: First 10 users to sync ===';
EXEC('
SELECT TOP 10
    ds.UserName,
    ds.FullName,
    CASE WHEN ds.Password IS NOT NULL THEN ''Has Password'' ELSE ''No Password'' END as DS_Password,
    CASE WHEN ds.PasswordHash IS NOT NULL THEN ''Has Hash'' ELSE ''No Hash'' END as DS_PasswordHash,
    CASE WHEN ims.UserName IS NOT NULL THEN ''Exists in IMS'' ELSE ''NOT in IMS'' END as IMS_Status
FROM [' + @DSDatabase + '].dbo.AspNetUsers ds
LEFT JOIN InventoryManagementDB.dbo.AspNetUsers ims ON ds.UserName = ims.UserName
WHERE ds.ISACT = 1
ORDER BY ds.UserName
');

PRINT '';
PRINT '⚠️ REVIEW THE PREVIEW ABOVE BEFORE PROCEEDING!';
PRINT '';
PRINT 'To execute the sync, uncomment the UPDATE statement below:';
PRINT '';

-- UNCOMMENT TO EXECUTE THE SYNC:
/*
UPDATE ims
SET 
    ims.Password = ds.Password,
    ims.PasswordHash = ds.PasswordHash
FROM InventoryManagementDB.dbo.AspNetUsers ims
INNER JOIN [' + @DSDatabase + '].dbo.AspNetUsers ds ON ims.UserName = ds.UserName
WHERE ds.ISACT = 1 AND ims.ISACT = 1;

PRINT '✅ Passwords synced successfully!';

-- Show sync results
SELECT 
    COUNT(*) as UsersUpdated,
    SUM(CASE WHEN Password IS NOT NULL THEN 1 ELSE 0 END) as WithPassword,
    SUM(CASE WHEN PasswordHash IS NOT NULL THEN 1 ELSE 0 END) as WithPasswordHash
FROM InventoryManagementDB.dbo.AspNetUsers
WHERE ISACT = 1;
*/

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║   INSTRUCTIONS                                         ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '1. Update @DSDatabase variable with your Digital System database name';
PRINT '2. Review the preview results above';
PRINT '3. Uncomment the UPDATE statement (remove /* and */)';
PRINT '4. Run the script again to execute the sync';
PRINT '';
