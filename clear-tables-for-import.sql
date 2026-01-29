-- ============================================================================
-- Clear Tables for Fresh Data Import
-- ============================================================================
-- This script clears item_masters, tenders, and related tables
-- Run this before importing fresh CSV data
-- Created: 2026-01-27

USE InventoryManagementDB;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '🔄 Starting table cleanup...';

-- Disable foreign key constraints temporarily (if tables exist)
IF OBJECT_ID('tender_items', 'U') IS NOT NULL
    ALTER TABLE tender_items NOCHECK CONSTRAINT ALL;
IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
    ALTER TABLE purchase_order_items NOCHECK CONSTRAINT ALL;
IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
    ALTER TABLE purchase_orders NOCHECK CONSTRAINT ALL;
IF OBJECT_ID('delivery_items', 'U') IS NOT NULL
    ALTER TABLE delivery_items NOCHECK CONSTRAINT ALL;
IF OBJECT_ID('stock_issuance_items', 'U') IS NOT NULL
    ALTER TABLE stock_issuance_items NOCHECK CONSTRAINT ALL;
GO

-- Clear tender-related tables (in order of dependencies)
PRINT '🗑️ Clearing tender-related tables...';

IF OBJECT_ID('delivery_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM delivery_items;
    PRINT '   ✅ delivery_items cleared';
END

IF OBJECT_ID('deliveries', 'U') IS NOT NULL
BEGIN
    DELETE FROM deliveries;
    PRINT '   ✅ deliveries cleared';
END

IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM purchase_order_items;
    PRINT '   ✅ purchase_order_items cleared';
END

IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
BEGIN
    DELETE FROM purchase_orders;
    PRINT '   ✅ purchase_orders cleared';
END

IF OBJECT_ID('tender_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM tender_items;
IF OBJECT_ID('stock_issuance_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_issuance_items;
    PRINT '   ✅ stock_issuance_items cleared';
END

IF OBJECT_ID('stock_issuance', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_issuance;
    PRINT '   ✅ stock_issuance cleared';
END

IF OBJECT_ID('inventory_transactions', 'U') IS NOT NULL
BEGIN
    DELETE FROM inventory_transactions;
    PRINT '   ✅ inventory_transactions cleared';
END

IF OBJECT_ID('inventory', 'U') IS NOT NULL
BEGIN
    DELETE FROM inventory;
    PRINT '   ✅ inventory cleared';
END

IF OBJECT_ID('item_masters', 'U') IS NOT NULL
BEGIN
    DELETE FROM item_masters;
    PRINT '   ✅ item_masters cleared';
END

-- Clear item_masters and related tables
PRINT '🗑️ Clearing item_masters and related tables...';

DELETE FROM stock_issuance_items;
IF OBJECT_ID('tender_items', 'U') IS NOT NULL
    ALTER TABLE tender_items CHECK CONSTRAINT ALL;
IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
    ALTER TABLE purchase_order_items CHECK CONSTRAINT ALL;
IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
    ALTER TABLE purchase_orders CHECK CONSTRAINT ALL;
IF OBJECT_ID('delivery_items', 'U') IS NOT NULL
    ALTER TABLE delivery_items CHECK CONSTRAINT ALL;
IF OBJECT_ID('stock_issuance_items', 'U') IS NOT NULL
    ALTER TABLE stock_issuance_items CHECK CONSTRAINT ALL;
GO

-- Show counts to verify
PRINT '';
PRINT '📊 Verification - Record counts after cleanup:';

IF OBJECT_ID('item_masters', 'U') IS NOT NULL
    SELECT 'item_masters' AS TableName, COUNT(*) AS RecordCount FROM item_masters
ELSE
    SELECT 'item_masters' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('tenders', 'U') IS NOT NULL
    SELECT 'tenders' AS TableName, COUNT(*) AS RecordCount FROM tenders
ELSE
    SELECT 'tenders' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('tender_items', 'U') IS NOT NULL
    SELECT 'tender_items' AS TableName, COUNT(*) AS RecordCount FROM tender_items
ELSE
    SELECT 'tender_items' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('purchase_orders', 'U') IS NOT NULL
    SELECT 'purchase_orders' AS TableName, COUNT(*) AS RecordCount FROM purchase_orders
ELSE
    SELECT 'purchase_orders' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('purchase_order_items', 'U') IS NOT NULL
    SELECT 'purchase_order_items' AS TableName, COUNT(*) AS RecordCount FROM purchase_order_items
ELSE
    SELECT 'purchase_order_items' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('deliveries', 'U') IS NOT NULL
    SELECT 'deliveries' AS TableName, COUNT(*) AS RecordCount FROM deliveries
ELSE
    SELECT 'deliveries' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('inventory', 'U') IS NOT NULL
    SELECT 'inventory' AS TableName, COUNT(*) AS RecordCount FROM inventory
ELSE
    SELECT 'inventory' AS TableName, -1 AS RecordCount;

IF OBJECT_ID('stock_issuance', 'U') IS NOT NULL
    SELECT 'stock_issuance' AS TableName, COUNT(*) AS RecordCount FROM stock_issuance
ELSE
    SELECT 'stock_issuance' AS TableName, -1 AS RecordCount
SELECT 'tenders', COUNT(*) FROM tenders
UNION ALL
SELECT 'tender_items', COUNT(*) FROM tender_items
UNION ALL
SELECT 'tender_submissions', COUNT(*) FROM tender_submissions
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'purchase_order_items', COUNT(*) FROM purchase_order_items
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'stock_issuance', COUNT(*) FROM stock_issuance;

PRINT '';
PRINT '✅ Table cleanup completed successfully!';
PRINT '📤 You can now import your CSV data.';
GO
