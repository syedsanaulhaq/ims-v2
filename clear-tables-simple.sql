-- ============================================================================
-- Clear Tables for Fresh Data Import - SIMPLE VERSION
-- ============================================================================
-- This script clears item_masters, tenders, and related tables
-- Run this before importing fresh CSV data
-- Created: 2026-01-27

USE InventoryManagementDB;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT 'Starting table cleanup...';

-- Clear in correct order (children before parents)
PRINT 'Clearing delivery_items...';
DELETE FROM delivery_items;

PRINT 'Clearing deliveries...';
DELETE FROM deliveries;

PRINT 'Clearing purchase_order_items...';
DELETE FROM purchase_order_items;

PRINT 'Clearing purchase_orders...';
DELETE FROM purchase_orders;

PRINT 'Clearing tender_items...';
DELETE FROM tender_items;

PRINT 'Clearing tenders...';
DELETE FROM tenders;

PRINT 'Clearing stock_issuance_items...';
DELETE FROM stock_issuance_items WHERE 1=1;

PRINT 'Clearing inventory_verification_requests...';
DELETE FROM inventory_verification_requests WHERE 1=1;

PRINT 'Clearing item_masters...';
DELETE FROM item_masters;

PRINT 'Table cleanup completed!';
PRINT '';
PRINT 'Verification - Record counts:';

SELECT 'item_masters' AS TableName, COUNT(*) AS RecordCount FROM item_masters;
SELECT 'tenders' AS TableName, COUNT(*) AS RecordCount FROM tenders;
SELECT 'tender_items' AS TableName, COUNT(*) AS RecordCount FROM tender_items;
SELECT 'purchase_orders' AS TableName, COUNT(*) AS RecordCount FROM purchase_orders;
SELECT 'deliveries' AS TableName, COUNT(*) AS RecordCount FROM deliveries;

PRINT '';
PRINT 'All tables cleared successfully! You can now import your CSV data.';
GO
