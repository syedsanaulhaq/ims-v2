-- CLEANUP SCRIPT: Remove all stock issuance requests
-- Run this in SQL Server Management Studio

-- Step 1: Delete approval_history entries
DELETE FROM approval_history
WHERE request_approval_id IN (
  SELECT id FROM request_approvals 
  WHERE request_id IN (SELECT id FROM stock_issuance_requests)
);
PRINT '✓ Deleted approval_history';

-- Step 2: Delete approval_items
DELETE FROM approval_items
WHERE request_approval_id IN (
  SELECT id FROM request_approvals 
  WHERE request_id IN (SELECT id FROM stock_issuance_requests)
);
PRINT '✓ Deleted approval_items';

-- Step 3: Delete request_approvals
DELETE FROM request_approvals
WHERE request_id IN (SELECT id FROM stock_issuance_requests);
PRINT '✓ Deleted request_approvals';

-- Step 4: Delete stock_issuance_items
DELETE FROM stock_issuance_items;
PRINT '✓ Deleted stock_issuance_items';

-- Step 5: Delete stock_issuance_requests
DELETE FROM stock_issuance_requests;
PRINT '✓ Deleted stock_issuance_requests';

-- Verify all cleaned up
SELECT 'stock_issuance_requests' as TableName, COUNT(*) as RecordCount FROM stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items' as TableName, COUNT(*) as RecordCount FROM stock_issuance_items
UNION ALL
SELECT 'request_approvals' as TableName, COUNT(*) as RecordCount FROM request_approvals
UNION ALL
SELECT 'approval_items' as TableName, COUNT(*) as RecordCount FROM approval_items
UNION ALL
SELECT 'approval_history' as TableName, COUNT(*) as RecordCount FROM approval_history;

PRINT '✅ CLEANUP COMPLETE - All tables cleared!';
