-- =====================================================
-- VERIFY TEST DATABASE DATA
-- =====================================================
-- Check if data was actually copied to test database
-- =====================================================

USE InventoryManagementDB_TEST;
GO

PRINT '========================================';
PRINT 'CHECKING DATA IN TEST DATABASE';
PRINT '========================================';
PRINT '';

-- Check AspNetUsers
SELECT 'AspNetUsers' as TableName, COUNT(*) as RowCount FROM AspNetUsers;
SELECT TOP 5 * FROM AspNetUsers;

-- Check users
SELECT 'users' as TableName, COUNT(*) as RowCount FROM users;
SELECT TOP 5 * FROM users;

-- Check tblOffices
SELECT 'tblOffices' as TableName, COUNT(*) as RowCount FROM tblOffices;
SELECT TOP 5 * FROM tblOffices;

-- Check WingsInformation
SELECT 'WingsInformation' as TableName, COUNT(*) as RowCount FROM WingsInformation;
SELECT TOP 5 * FROM WingsInformation;

-- Check DEC_MST
SELECT 'DEC_MST' as TableName, COUNT(*) as RowCount FROM DEC_MST;
SELECT TOP 5 * FROM DEC_MST;

-- Check categories
SELECT 'categories' as TableName, COUNT(*) as RowCount FROM categories;
SELECT TOP 5 * FROM categories;

-- Check vendors
SELECT 'vendors' as TableName, COUNT(*) as RowCount FROM vendors;
SELECT TOP 5 * FROM vendors;

PRINT '';
PRINT '========================================';
PRINT 'Now checking PRODUCTION database for comparison';
PRINT '========================================';
PRINT '';

USE InventoryManagementDB;
GO

-- Check production data counts
SELECT 'PRODUCTION: AspNetUsers' as TableName, COUNT(*) as RowCount FROM AspNetUsers;
SELECT 'PRODUCTION: users' as TableName, COUNT(*) as RowCount FROM users;
SELECT 'PRODUCTION: tblOffices' as TableName, COUNT(*) as RowCount FROM tblOffices;
SELECT 'PRODUCTION: WingsInformation' as TableName, COUNT(*) as RowCount FROM WingsInformation;
SELECT 'PRODUCTION: DEC_MST' as TableName, COUNT(*) as RowCount FROM DEC_MST;
SELECT 'PRODUCTION: categories' as TableName, COUNT(*) as RowCount FROM categories;
SELECT 'PRODUCTION: vendors' as TableName, COUNT(*) as RowCount FROM vendors;

GO
