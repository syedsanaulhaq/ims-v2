-- =====================================================
-- COMPLETE TEST DATABASE SETUP - ALL IN ONE
-- =====================================================
-- This script does EVERYTHING:
-- 1. Creates empty InventoryManagementDB_TEST database
-- 2. Copies ALL table structures from InventoryManagementDB
-- 3. Copies data ONLY for organizational/reference tables
-- 4. Leaves inventory/transactions empty for clean testing
-- =====================================================

PRINT '🎯 =====================================================';
PRINT '🎯 COMPLETE TEST DATABASE SETUP STARTING';
PRINT '🎯 =====================================================';
GO

-- =====================================================
-- STEP 1: CREATE EMPTY TEST DATABASE
-- =====================================================
USE master;
GO

-- Drop existing test database if it exists
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'InventoryManagementDB_TEST')
BEGIN
    PRINT '🗑️  Dropping existing InventoryManagementDB_TEST database...';
    
    -- Kill all connections to the database
    ALTER DATABASE InventoryManagementDB_TEST SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE InventoryManagementDB_TEST;
    
    PRINT '✓ Old test database dropped';
END

-- Create new empty test database
PRINT '🏗️  Creating new InventoryManagementDB_TEST database...';
CREATE DATABASE InventoryManagementDB_TEST;
PRINT '✓ Empty test database created';
GO

-- =====================================================
-- STEP 2: COPY ALL TABLE STRUCTURES
-- =====================================================
USE InventoryManagementDB_TEST;
GO

PRINT '';
PRINT '📋 =====================================================';
PRINT '📋 COPYING ALL TABLE STRUCTURES';
PRINT '📋 =====================================================';
GO

DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @tableName NVARCHAR(128);
DECLARE @schemaName NVARCHAR(128) = 'dbo';
DECLARE @tableCount INT = 0;

-- Cursor to loop through all user tables in InventoryManagementDB
DECLARE table_cursor CURSOR FOR
SELECT TABLE_NAME
FROM InventoryManagementDB.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Generate CREATE TABLE script for each table
    SET @sql = '';
    
    -- Build column definitions
    SELECT @sql = @sql + 
        QUOTENAME(c.COLUMN_NAME) + ' ' +
        c.DATA_TYPE +
        CASE 
            WHEN c.DATA_TYPE IN ('varchar', 'char', 'nvarchar', 'nchar') THEN 
                '(' + CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                          ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) END + ')'
            WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN 
                '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(10)) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR(10)) + ')'
            WHEN c.DATA_TYPE IN ('datetime2', 'time') THEN
                CASE WHEN c.DATETIME_PRECISION IS NOT NULL 
                     THEN '(' + CAST(c.DATETIME_PRECISION AS VARCHAR(10)) + ')'
                     ELSE '' END
            ELSE ''
        END +
        CASE WHEN c.IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE ' NULL' END +
        CASE WHEN c.COLUMN_DEFAULT IS NOT NULL THEN ' DEFAULT ' + c.COLUMN_DEFAULT ELSE '' END +
        ',' + CHAR(13)
    FROM InventoryManagementDB.INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = @schemaName
      AND c.TABLE_NAME = @tableName
    ORDER BY c.ORDINAL_POSITION;

    -- Remove trailing comma
    IF LEN(@sql) > 0
        SET @sql = LEFT(@sql, LEN(@sql) - 2);

    -- Wrap in CREATE TABLE
    SET @sql = 'CREATE TABLE ' + QUOTENAME(@schemaName) + '.' + QUOTENAME(@tableName) + ' (' + CHAR(13) +
               @sql + CHAR(13) +
               ');';

    -- Execute the CREATE TABLE statement
    BEGIN TRY
        EXEC sp_executesql @sql;
        SET @tableCount = @tableCount + 1;
        PRINT '  ✓ Created table: ' + @tableName;
    END TRY
    BEGIN CATCH
        PRINT '  ✗ Error creating table ' + @tableName + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM table_cursor INTO @tableName;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

PRINT '';
PRINT '✓ Created ' + CAST(@tableCount AS VARCHAR(10)) + ' tables';
GO

-- =====================================================
-- STEP 3: COPY REFERENCE DATA ONLY
-- =====================================================
PRINT '';
PRINT '📦 =====================================================';
PRINT '📦 COPYING REFERENCE DATA (Organizational & Users)';
PRINT '📦 =====================================================';
GO

-- Copy AspNetUsers (Authentication)
IF OBJECT_ID('InventoryManagementDB.dbo.AspNetUsers', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT AspNetUsers ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.AspNetUsers 
    SELECT * FROM InventoryManagementDB.dbo.AspNetUsers;
    
    SET IDENTITY_INSERT AspNetUsers OFF;
    PRINT '  ✓ Copied AspNetUsers (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Users
IF OBJECT_ID('InventoryManagementDB.dbo.Users', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT Users ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.Users 
    SELECT * FROM InventoryManagementDB.dbo.Users;
    
    SET IDENTITY_INSERT Users OFF;
    PRINT '  ✓ Copied Users (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Offices
IF OBJECT_ID('InventoryManagementDB.dbo.Offices', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT Offices ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.Offices 
    SELECT * FROM InventoryManagementDB.dbo.Offices;
    
    SET IDENTITY_INSERT Offices OFF;
    PRINT '  ✓ Copied Offices (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Wings
IF OBJECT_ID('InventoryManagementDB.dbo.Wings', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT Wings ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.Wings 
    SELECT * FROM InventoryManagementDB.dbo.Wings;
    
    SET IDENTITY_INSERT Wings OFF;
    PRINT '  ✓ Copied Wings (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy DECs (Data Entry Centers)
IF OBJECT_ID('InventoryManagementDB.dbo.DECs', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT DECs ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.DECs 
    SELECT * FROM InventoryManagementDB.dbo.DECs;
    
    SET IDENTITY_INSERT DECs OFF;
    PRINT '  ✓ Copied DECs (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Branches
IF OBJECT_ID('InventoryManagementDB.dbo.Branches', 'U') IS NOT NULL
BEGIN
    INSERT INTO InventoryManagementDB_TEST.dbo.Branches 
    SELECT * FROM InventoryManagementDB.dbo.Branches;
    
    PRINT '  ✓ Copied Branches (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy ItemCategories
IF OBJECT_ID('InventoryManagementDB.dbo.ItemCategories', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT ItemCategories ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.ItemCategories 
    SELECT * FROM InventoryManagementDB.dbo.ItemCategories;
    
    SET IDENTITY_INSERT ItemCategories OFF;
    PRINT '  ✓ Copied ItemCategories (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Designations
IF OBJECT_ID('InventoryManagementDB.dbo.Designations', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT Designations ON;
    
    INSERT INTO InventoryManagementDB_TEST.dbo.Designations 
    SELECT * FROM InventoryManagementDB.dbo.Designations;
    
    SET IDENTITY_INSERT Designations OFF;
    PRINT '  ✓ Copied Designations (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- Copy Vendors
IF OBJECT_ID('InventoryManagementDB.dbo.Vendors', 'U') IS NOT NULL
BEGIN
    INSERT INTO InventoryManagementDB_TEST.dbo.Vendors 
    SELECT * FROM InventoryManagementDB.dbo.Vendors;
    
    PRINT '  ✓ Copied Vendors (' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows)';
END
GO

-- =====================================================
-- VERIFICATION & SUMMARY
-- =====================================================
PRINT '';
PRINT '✅ =====================================================';
PRINT '✅ TEST DATABASE SETUP COMPLETE!';
PRINT '✅ =====================================================';
PRINT '';
PRINT '📊 SUMMARY:';
PRINT '  Database: InventoryManagementDB_TEST';
PRINT '';
PRINT '  ✓ DATA COPIED (Reference/Organizational):';
PRINT '    - AspNetUsers (authentication)';
PRINT '    - Users (with passwords)';
PRINT '    - Offices, Wings, DECs, Branches';
PRINT '    - ItemCategories';
PRINT '    - Designations';
PRINT '    - Vendors';
PRINT '';
PRINT '  ⊘ EMPTY TABLES (Clean for Testing):';
PRINT '    - ItemMasters (inventory items)';
PRINT '    - Tenders, TenderItems';
PRINT '    - Deliveries, DeliveryItems';
PRINT '    - StockTransactions';
PRINT '    - StockIssuance, StockIssuanceItems';
PRINT '    - StockReturns';
PRINT '    - All other transaction tables';
PRINT '';
PRINT '🎯 NEXT STEPS:';
PRINT '  1. Update your .env or config file:';
PRINT '     DB_DATABASE=InventoryManagementDB_TEST';
PRINT '';
PRINT '  2. Restart your backend server';
PRINT '';
PRINT '  3. Login with existing credentials';
PRINT '';
PRINT '  4. Start testing from scratch with:';
PRINT '     - Empty inventory';
PRINT '     - No acquisitions/tenders';
PRINT '     - No stock transactions';
PRINT '     - But WITH all users and organizational structure!';
PRINT '';
PRINT '✅ =====================================================';
GO

-- Quick verification query
SELECT 
    'AspNetUsers' as TableName, COUNT(*) as RowCount FROM AspNetUsers
UNION ALL
SELECT 'Users', COUNT(*) FROM Users
UNION ALL
SELECT 'Offices', COUNT(*) FROM Offices
UNION ALL
SELECT 'Wings', COUNT(*) FROM Wings
UNION ALL
SELECT 'ItemCategories', COUNT(*) FROM ItemCategories
UNION ALL
SELECT 'Vendors', COUNT(*) FROM Vendors
UNION ALL
SELECT 'ItemMasters', COUNT(*) FROM ItemMasters
UNION ALL
SELECT 'Tenders', COUNT(*) FROM Tenders
UNION ALL
SELECT 'StockIssuance', COUNT(*) FROM StockIssuance;

PRINT '';
PRINT '✅ Test database is ready for testing!';
GO
