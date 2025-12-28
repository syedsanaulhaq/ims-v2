-- Clear Stock Issuance Test Data
-- This script removes all stock issuance requests and related data to test from scratch

-- First, disable foreign key constraints temporarily
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'

-- Delete from approval_items related to stock issuance
DELETE FROM approval_items 
WHERE approval_id IN (
    SELECT a.approval_id 
    FROM approvals a
    WHERE a.module = 'stock_issuance'
)

-- Delete from stock_issuance_items
DELETE FROM stock_issuance_items

-- Delete from stock_issuance_requests
DELETE FROM stock_issuance_requests

-- Delete from approvals related to stock issuance
DELETE FROM approvals
WHERE module = 'stock_issuance'

-- Re-enable foreign key constraints
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'

-- Verify deletion
SELECT 'stock_issuance_requests' as TableName, COUNT(*) as RecordCount FROM stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items', COUNT(*) FROM stock_issuance_items
UNION ALL
SELECT 'approvals (stock_issuance)', COUNT(*) FROM approvals WHERE module = 'stock_issuance'
UNION ALL
SELECT 'approval_items (stock_issuance)', COUNT(*) FROM approval_items 
WHERE approval_id IN (SELECT approval_id FROM approvals WHERE module = 'stock_issuance')

-- Result should show 0 records for all
PRINT 'Database cleaned - ready for fresh testing'
