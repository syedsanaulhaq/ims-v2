-- ============================================================================
-- Clear Categories and Sub-Categories
-- ============================================================================

USE InventoryManagementDB;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT 'Starting categories cleanup...';

-- Must clear item_masters first due to foreign key constraints
PRINT 'Clearing item_masters (due to FK constraints)...';
DELETE FROM item_masters;

-- Clear sub_categories (child table)
PRINT 'Clearing sub_categories...';
DELETE FROM sub_categories;

-- Clear categories (parent table)
PRINT 'Clearing categories...';
DELETE FROM categories;

PRINT 'Categories cleanup completed!';
PRINT '';
PRINT 'Verification - Record counts:';

SELECT 'item_masters' AS TableName, COUNT(*) AS RecordCount FROM item_masters;
SELECT 'categories' AS TableName, COUNT(*) AS RecordCount FROM categories;
SELECT 'sub_categories' AS TableName, COUNT(*) AS RecordCount FROM sub_categories;

PRINT '';
PRINT 'All categories cleared successfully!';
GO
