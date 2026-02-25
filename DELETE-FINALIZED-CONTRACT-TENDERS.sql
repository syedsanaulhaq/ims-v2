-- ============================================================================
-- DELETE FINALIZED CONTRACT TENDERS (EXCEPT ONE SPECIFIC TENDER)
-- ============================================================================
-- This script removes all finalized contract tenders from the database
-- EXCEPT: B927821B-8263-4C6F-869F-855ECC40E901 (preserved)
-- Along with their related data: stock acquisitions, deliveries, POs, items, vendors, documents, etc.
-- ⚠️  WARNING: This will DELETE stock acquisitions, deliveries, and purchase orders for these tenders!
-- Date: February 23, 2026
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'DELETE FINALIZED CONTRACT TENDERS - PRODUCTION CLEANUP';
PRINT '====================================================================';
PRINT '';

-- Declare variables for counts
DECLARE @TenderCount INT;
DECLARE @ItemCount INT;
DECLARE @VendorCount INT;
DECLARE @PreservedTenderId UNIQUEIDENTIFIER = 'B927821B-8263-4C6F-869F-855ECC40E901';

-- ============================================================================
-- STEP 1: Show what will be deleted (Preview)
-- ============================================================================
PRINT 'STEP 1: Preview - Counting records to be deleted...';
PRINT '';

-- Show the preserved tender
PRINT '🔒 PRESERVED TENDER (will NOT be deleted):';
SELECT 
    id,
    reference_number,
    title,
    tender_type,
    status,
    is_finalized,
    created_at
FROM tenders
WHERE id = @PreservedTenderId;
PRINT '';
GO

DECLARE @PreservedTenderId UNIQUEIDENTIFIER = 'B927821B-8263-4C6F-869F-855ECC40E901';

-- Count finalized contract tenders (excluding preserved one)
DECLARE @TenderCount INT;
SELECT @TenderCount = COUNT(*)
FROM tenders
WHERE tender_type = 'contract' 
  AND (is_finalized = 1 OR status = 'finalized')
  AND id != @PreservedTenderId;

PRINT '  Finalized Contract Tenders to DELETE: ' + CAST(@TenderCount AS VARCHAR);

-- Count related items
DECLARE @ItemCount INT;
SELECT @ItemCount = COUNT(*)
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Related Tender Items: ' + CAST(@ItemCount AS VARCHAR);

-- Count related vendors
DECLARE @VendorCount INT;
SELECT @VendorCount = COUNT(*)
FROM tender_vendors tv
INNER JOIN tenders t ON tv.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Related Tender Vendors/Bidders: ' + CAST(@VendorCount AS VARCHAR);

-- Count related purchase orders
DECLARE @POCount INT;
SELECT @POCount = COUNT(*)
FROM purchase_orders po
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Related Purchase Orders: ' + CAST(@POCount AS VARCHAR);

-- Count related deliveries
DECLARE @DeliveryCount INT;
SELECT @DeliveryCount = COUNT(*)
FROM deliveries d
INNER JOIN purchase_orders po ON d.po_id = po.id
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Related Deliveries: ' + CAST(@DeliveryCount AS VARCHAR);

-- Count related stock acquisitions
DECLARE @StockAcqCount INT;
SELECT @StockAcqCount = COUNT(*)
FROM stock_acquisitions sa
INNER JOIN deliveries d ON sa.delivery_id = d.id
INNER JOIN purchase_orders po ON d.po_id = po.id
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Related Stock Acquisitions: ' + CAST(@StockAcqCount AS VARCHAR);
PRINT '';

-- Show tender details
PRINT 'Tenders to be deleted:';
SELECT 
    id,
    reference_number,
    title,
    tender_type,
    status,
    is_finalized,
    finalized_at,
    created_at
FROM tenders
WHERE tender_type = 'contract' 
  AND (is_finalized = 1 OR status = 'finalized')
  AND id != @PreservedTenderId
ORDER BY created_at DESC;
GO

PRINT '';
PRINT '====================================================================';
PRINT '⚠️  WARNING: The following deletion will be PERMANENT!';
PRINT '====================================================================';
PRINT '';
PRINT '✅ One tender will be PRESERVED: B927821B-8263-4C6F-869F-855ECC40E901';
PRINT '❌ All other finalized contract tenders will be DELETED';
PRINT '❌ All related stock acquisitions will be DELETED';
PRINT '❌ All related deliveries will be DELETED';
PRINT '❌ All related purchase orders will be DELETED';
PRINT '❌ All related items, vendors, documents will be DELETED';
PRINT '';
PRINT 'Press Ctrl+C to cancel, or continue to execute deletion...';
PRINT '';
GO

-- ============================================================================
-- STEP 2: BEGIN DELETION TRANSACTION
-- ============================================================================
PRINT 'STEP 2: Beginning deletion transaction...';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    DECLARE @PreservedTenderId UNIQUEIDENTIFIER = 'B927821B-8263-4C6F-869F-855ECC40E901';
    
    -- Temporary table to store tender IDs to delete
    CREATE TABLE #TendersToDelete (
        tender_id UNIQUEIDENTIFIER PRIMARY KEY
    );
    
    -- Get all finalized contract tender IDs (EXCEPT the preserved one)
    INSERT INTO #TendersToDelete (tender_id)
    SELECT id
    FROM tenders
    WHERE tender_type = 'contract' 
      AND (is_finalized = 1 OR status = 'finalized')
      AND id != @PreservedTenderId;
    
    DECLARE @DeletedTenderCount INT = @@ROWCOUNT;
    
    PRINT '  Identified ' + CAST(@DeletedTenderCount AS VARCHAR) + ' finalized contract tenders for deletion';
    PRINT '  Preserved tender: B927821B-8263-4C6F-869F-855ECC40E901 (excluded)';
    PRINT '';
    
    -- ========================================================================
    -- Delete related data in correct order (child tables first)
    -- ========================================================================
    
    -- 0. Delete stock_acquisitions FIRST (they reference deliveries)
    PRINT '  Deleting stock acquisitions...';
    DELETE FROM stock_acquisitions
    WHERE delivery_id IN (
        SELECT d.id 
        FROM deliveries d
        INNER JOIN purchase_orders po ON d.po_id = po.id
        WHERE po.tender_id IN (SELECT tender_id FROM #TendersToDelete)
    );
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' stock acquisition records';
    
    -- 1. Delete deliveries (they reference purchase_orders)
    PRINT '  Deleting deliveries...';
    DELETE FROM deliveries
    WHERE po_id IN (
        SELECT po.id 
        FROM purchase_orders po
        WHERE po.tender_id IN (SELECT tender_id FROM #TendersToDelete)
    );
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' delivery records';
    
    -- 2. Delete purchase orders (they reference tenders)
    PRINT '  Deleting purchase orders...';
    DELETE FROM purchase_orders
    WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' purchase order records';
    
    -- 3. Delete tender_vendors (bidders)
    PRINT '  Deleting tender vendors/bidders...';
    DELETE FROM tender_vendors
    WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender vendor records';
    
    -- 4. Delete tender_items
    PRINT '  Deleting tender items...';
    DELETE FROM tender_items
    WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender item records';
    
    -- 5. Delete from any other related tables (add if needed)
    -- Check if tender_documents table exists
    IF OBJECT_ID('tender_documents', 'U') IS NOT NULL
    BEGIN
        PRINT '  Deleting tender documents...';
        DELETE FROM tender_documents
        WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
        PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender document records';
    END
    
    -- Check if tender_attachments table exists
    IF OBJECT_ID('tender_attachments', 'U') IS NOT NULL
    BEGIN
        PRINT '  Deleting tender attachments...';
        DELETE FROM tender_attachments
        WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
        PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender attachment records';
    END
    
    -- 6. Finally, delete the tenders themselves
    PRINT '  Deleting tenders...';
    DELETE FROM tenders
    WHERE id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender records';
    
    -- Clean up temp table
    DROP TABLE #TendersToDelete;
    
    -- Commit the transaction
    COMMIT TRANSACTION;
    
    PRINT '';
    PRINT '====================================================================';
    PRINT '✅ DELETION COMPLETED SUCCESSFULLY';
    PRINT '====================================================================';
    PRINT '';
    PRINT 'All finalized contract tenders (except the preserved one) have been deleted.';
PRINT 'This includes stock acquisitions, deliveries, purchase orders, items, vendors, documents, and attachments.';
    PRINT 'Preserved tender: B927821B-8263-4C6F-869F-855ECC40E901';
    PRINT '';

END TRY
BEGIN CATCH
    -- Rollback on error
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    -- Clean up temp table if exists
    IF OBJECT_ID('tempdb..#TendersToDelete') IS NOT NULL
        DROP TABLE #TendersToDelete;
    
    PRINT '';
    PRINT '====================================================================';
    PRINT '❌ ERROR OCCURRED - TRANSACTION ROLLED BACK';
    PRINT '====================================================================';
    PRINT '';
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR);
    PRINT '';
    PRINT 'No data was deleted. Database is unchanged.';
    PRINT '';
    
    -- Re-throw the error
    THROW;
END CATCH
GO

-- ============================================================================
-- STEP 3: Verify deletion and preservation
-- ============================================================================
PRINT 'STEP 3: Verification - Checking remaining records...';
PRINT '';

DECLARE @PreservedTenderId UNIQUEIDENTIFIER = 'B927821B-8263-4C6F-869F-855ECC40E901';

-- Count remaining finalized contract tenders
DECLARE @RemainingFinalized INT;
SELECT @RemainingFinalized = COUNT(*)
FROM tenders
WHERE tender_type = 'contract' 
  AND (is_finalized = 1 OR status = 'finalized');

PRINT '  Remaining Finalized Contract Tenders: ' + CAST(@RemainingFinalized AS VARCHAR) + ' (should be 1 - the preserved one)';

-- Verify the preserved tender still exists
DECLARE @PreservedExists INT;
SELECT @PreservedExists = COUNT(*)
FROM tenders
WHERE id = @PreservedTenderId;

IF @PreservedExists = 1
    PRINT '  ✅ Preserved tender still exists: B927821B-8263-4C6F-869F-855ECC40E901';
ELSE
    PRINT '  ❌ ERROR: Preserved tender was accidentally deleted!';

-- Check for any remaining purchase orders linked to deleted finalized contract tenders
DECLARE @RemainingPOs INT;
SELECT @RemainingPOs = COUNT(*)
FROM purchase_orders po
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Purchase Orders for deleted tenders: ' + CAST(@RemainingPOs AS VARCHAR) + ' (should be 0)';

-- Check for any remaining deliveries linked to deleted tenders' POs
DECLARE @RemainingDeliveries INT;
SELECT @RemainingDeliveries = COUNT(*)
FROM deliveries d
INNER JOIN purchase_orders po ON d.po_id = po.id
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Deliveries for deleted tenders: ' + CAST(@RemainingDeliveries AS VARCHAR) + ' (should be 0)';

-- Check for any remaining stock acquisitions linked to deleted tenders' deliveries
DECLARE @RemainingStockAcq INT;
SELECT @RemainingStockAcq = COUNT(*)
FROM stock_acquisitions sa
INNER JOIN deliveries d ON sa.delivery_id = d.id
INNER JOIN purchase_orders po ON d.po_id = po.id
INNER JOIN tenders t ON po.tender_id = t.id
WHERE t.tender_type = 'contract' 
  AND (t.is_finalized = 1 OR t.status = 'finalized')
  AND t.id != @PreservedTenderId;

PRINT '  Stock Acquisitions for deleted tenders: ' + CAST(@RemainingStockAcq AS VARCHAR) + ' (should be 0)';

-- Check for POs linked to preserved tender (if any)
DECLARE @PreservedPOs INT;
SELECT @PreservedPOs = COUNT(*)
FROM purchase_orders po
WHERE po.tender_id = @PreservedTenderId;

IF @PreservedPOs > 0
    PRINT '  ℹ️  Preserved tender has ' + CAST(@PreservedPOs AS VARCHAR) + ' purchase order(s) (preserved as expected)';

PRINT '';
PRINT 'Preserved Tender Details:';
SELECT 
    id,
    reference_number,
    title,
    tender_type,
    status,
    is_finalized,
    created_at
FROM tenders
WHERE id = @PreservedTenderId;
GO

PRINT '';
PRINT 'Current Tender Counts by Type and Status:';
SELECT 
    tender_type,
    status,
    is_finalized,
    COUNT(*) as tender_count
FROM tenders
GROUP BY tender_type, status, is_finalized
ORDER BY tender_type, status;
GO

PRINT '';
PRINT '====================================================================';
PRINT '🎯 CLEANUP COMPLETE';
PRINT '====================================================================';
PRINT '';
PRINT 'Summary:';
PRINT '  ✅ All finalized contract tenders deleted (except preserved one)';
PRINT '  ✅ All related stock acquisitions deleted';
PRINT '  ✅ All related deliveries deleted';
PRINT '  ✅ All related purchase orders deleted';
PRINT '  ✅ All related items, vendors, documents, attachments deleted';
PRINT '  ✅ Preserved tender B927821B-8263-4C6F-869F-855ECC40E901 remains intact';
PRINT '  ℹ️  Annual and spot-purchase tenders are unaffected';
PRINT '';
PRINT 'Review the verification results above to confirm:';
PRINT '  - Only 1 finalized contract tender remains (the preserved one)';
PRINT '  - 0 stock acquisitions remain for deleted tenders';
PRINT '  - 0 deliveries remain for deleted tenders';
PRINT '  - 0 purchase orders remain for deleted tenders';
PRINT '  - Preserved tender and its data remain intact (if it had any)';
PRINT '';
PRINT '====================================================================';
GO
