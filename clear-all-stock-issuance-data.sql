-- ============================================================================
-- Clear Stock Issuance Test Data
-- ============================================================================
-- This script removes all stock issuance requests, items, and approvals
-- to prepare for fresh testing from scratch.
-- 
-- IMPORTANT: Run this on a TEST database first!
-- ============================================================================

USE InvMISDB;
GO

PRINT '========================================';
PRINT 'CLEARING STOCK ISSUANCE TEST DATA';
PRINT '========================================';
PRINT '';
PRINT 'Step 1: Checking current data counts...';
PRINT '';

-- Show before counts
SELECT 
    'stock_issuance_requests' as [Table],
    COUNT(*) as [Record Count]
FROM stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items', COUNT(*) FROM stock_issuance_items
UNION ALL
SELECT 'ApprovalWorkflow (all)', COUNT(*) FROM ApprovalWorkflow
UNION ALL
SELECT 'StockTransactions (all)', COUNT(*) FROM StockTransactions;

PRINT '';
PRINT 'Step 2: Disabling foreign key constraints...';
PRINT '';

-- Disable all foreign key constraints temporarily
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

PRINT '';
PRINT 'Step 3: Deleting stock issuance items...';

-- Delete from stock_issuance_items
DELETE FROM stock_issuance_items;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' items deleted from stock_issuance_items';

PRINT '';
PRINT 'Step 4: Deleting stock issuance requests...';

-- Delete from stock_issuance_requests
DELETE FROM stock_issuance_requests;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' requests deleted from stock_issuance_requests';

PRINT '';
PRINT 'Step 5: Re-enabling foreign key constraints...';
PRINT '';

-- Re-enable all foreign key constraints
EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

PRINT '';
PRINT 'Step 6: Verifying deletion...';
PRINT '';

-- Verify deletion
SELECT 
    'stock_issuance_requests' as [Table],
    COUNT(*) as [Remaining Records]
FROM stock_issuance_requests
UNION ALL
SELECT 'stock_issuance_items', COUNT(*) FROM stock_issuance_items;

PRINT '';
PRINT '========================================';
PRINT 'CLEANUP COMPLETE';
PRINT '========================================';
PRINT '';
PRINT 'Database is now ready for fresh stock issuance testing!';
PRINT '';
