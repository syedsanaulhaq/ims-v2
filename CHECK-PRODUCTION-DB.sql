-- =====================================================
-- PRODUCTION DATABASE VERIFICATION
-- Check database state after restoration
-- Run this on: ECP-DS-DB\MSSQLSERVER2
-- =====================================================

USE [InventoryManagementDB];
GO

PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║     PRODUCTION DATABASE VERIFICATION                   ║';
PRINT '╚════════════════════════════════════════════════════════╝';
PRINT '';

-- 1. Check if AspNetUsers table exists and has data
PRINT '=== 1. USER ACCOUNTS (AspNetUsers) ===';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AspNetUsers')
BEGIN
    DECLARE @UserCount INT;
    SELECT @UserCount = COUNT(*) FROM AspNetUsers;
    PRINT '✅ AspNetUsers table exists';
    PRINT '   Total Users: ' + CAST(@UserCount AS VARCHAR);
    PRINT '';
    
    -- Show all usernames
    PRINT 'Current Users:';
    SELECT 
        Id,
        UserName,
        Email,
        PhoneNumber,
        EmailConfirmed,
        LockoutEnabled,
        AccessFailedCount
    FROM AspNetUsers
    ORDER BY UserName;
END
ELSE
BEGIN
    PRINT '❌ AspNetUsers table MISSING - This will cause login failures!';
END
PRINT '';

-- 2. Check table row counts
PRINT '=== 2. TABLE ROW COUNTS ===';
SELECT 
    SCHEMA_NAME(schema_id) as [Schema],
    name as [Table],
    (SELECT COUNT(*) FROM sys.partitions p WHERE p.object_id = t.object_id AND p.index_id IN (0,1)) as [Rows]
FROM sys.tables t
WHERE name IN (
    'categories', 
    'vendors', 
    'item_masters', 
    'current_inventory_stock',
    'tenders', 
    'tender_items',
    'stock_issuance_requests', 
    'stock_issuance_items',
    'deliveries', 
    'delivery_items',
    'stock_returns',
    'AspNetUsers',
    'AspNetRoles',
    'AspNetUserRoles'
)
ORDER BY name;
PRINT '';

-- 3. Check for sample/test users
PRINT '=== 3. SAMPLE USER CREDENTIALS (for testing) ===';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AspNetUsers')
BEGIN
    SELECT TOP 5
        UserName as [Username],
        Email,
        PhoneNumber,
        CASE WHEN LockoutEnabled = 1 THEN '⚠️ Locked' ELSE '✅ Active' END as [Status]
    FROM AspNetUsers
    ORDER BY UserName;
    
    PRINT '';
    PRINT 'NOTE: Check if these usernames match what you are trying to log in with!';
END
PRINT '';

-- 4. Check user roles
PRINT '=== 4. USER ROLES ASSIGNMENT ===';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AspNetUserRoles')
BEGIN
    SELECT 
        u.UserName,
        r.Name as RoleName
    FROM AspNetUserRoles ur
    INNER JOIN AspNetUsers u ON ur.UserId = u.Id
    INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
    ORDER BY u.UserName, r.Name;
END
PRINT '';

-- 5. Check inventory data
PRINT '=== 5. KEY INVENTORY DATA ===';
SELECT 'Categories' as [Data], COUNT(*) as [Count] FROM categories
UNION ALL
SELECT 'Items', COUNT(*) FROM item_masters
UNION ALL
SELECT 'Stock', COUNT(*) FROM current_inventory_stock
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'Tenders', COUNT(*) FROM tenders
UNION ALL
SELECT 'Issuance Requests', COUNT(*) FROM stock_issuance_requests;
PRINT '';

-- 6. Check for common login issues
PRINT '=== 6. DIAGNOSIS ===';
PRINT 'Checking for common login issues...';
PRINT '';

-- Check if the username being used exists
DECLARE @TestUsername VARCHAR(100) = '1730115698727'; -- From your error log
IF EXISTS (SELECT 1 FROM AspNetUsers WHERE UserName = @TestUsername)
BEGIN
    PRINT '✅ Username "' + @TestUsername + '" exists in database';
    SELECT 
        'User Details:',
        UserName,
        Email,
        EmailConfirmed as EmailVerified,
        LockoutEnabled,
        LockoutEnd,
        AccessFailedCount
    FROM AspNetUsers 
    WHERE UserName = @TestUsername;
END
ELSE
BEGIN
    PRINT '❌ Username "' + @TestUsername + '" NOT FOUND in database';
    PRINT '   This is why login is failing!';
    PRINT '';
    PRINT 'Available usernames:';
    SELECT TOP 10 UserName FROM AspNetUsers ORDER BY UserName;
END

PRINT '';
PRINT '╔════════════════════════════════════════════════════════╗';
PRINT '║     VERIFICATION COMPLETE                              ║';
PRINT '╚════════════════════════════════════════════════════════╝';
