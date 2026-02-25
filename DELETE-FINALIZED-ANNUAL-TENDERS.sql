-- ============================================================================
-- DELETE FINALIZED ANNUAL TENDERS AND ALL RELATED DATA
-- ============================================================================
-- This script removes all finalized annual tenders from the database
-- Along with their related data: items, vendors/bidders, documents, etc.
-- Date: February 23, 2026
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'DELETE FINALIZED ANNUAL TENDERS - PRODUCTION CLEANUP';
PRINT '====================================================================';
PRINT '';

-- Declare variables for counts
DECLARE @TenderCount INT;
DECLARE @ItemCount INT;
DECLARE @VendorCount INT;

-- ============================================================================
-- STEP 1: Show what will be deleted (Preview)
-- ============================================================================
PRINT 'STEP 1: Preview - Counting records to be deleted...';
PRINT '';

-- Count finalized annual tenders
SELECT @TenderCount = COUNT(*)
FROM tenders
WHERE tender_type = 'annual-tender' 
  AND (is_finalized = 1 OR status = 'finalized');

PRINT '  Finalized Annual Tenders: ' + CAST(@TenderCount AS VARCHAR);

-- Count related items
SELECT @ItemCount = COUNT(*)
FROM tender_items ti
INNER JOIN tenders t ON ti.tender_id = t.id
WHERE t.tender_type = 'annual-tender' 
  AND (t.is_finalized = 1 OR t.status = 'finalized');

PRINT '  Related Tender Items: ' + CAST(@ItemCount AS VARCHAR);

-- Count related vendors
SELECT @VendorCount = COUNT(*)
FROM tender_vendors tv
INNER JOIN tenders t ON tv.tender_id = t.id
WHERE t.tender_type = 'annual-tender' 
  AND (t.is_finalized = 1 OR t.status = 'finalized');

PRINT '  Related Tender Vendors/Bidders: ' + CAST(@VendorCount AS VARCHAR);
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
WHERE tender_type = 'annual-tender' 
  AND (is_finalized = 1 OR status = 'finalized')
ORDER BY created_at DESC;
GO

PRINT '';
PRINT '====================================================================';
PRINT '⚠️  WARNING: The following deletion will be PERMANENT!';
PRINT '====================================================================';
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
    -- Temporary table to store tender IDs to delete
    CREATE TABLE #TendersToDelete (
        tender_id UNIQUEIDENTIFIER PRIMARY KEY
    );
    
    -- Get all finalized annual tender IDs
    INSERT INTO #TendersToDelete (tender_id)
    SELECT id
    FROM tenders
    WHERE tender_type = 'annual-tender' 
      AND (is_finalized = 1 OR status = 'finalized');
    
    DECLARE @DeletedTenderCount INT = @@ROWCOUNT;
    PRINT '  Identified ' + CAST(@DeletedTenderCount AS VARCHAR) + ' finalized annual tenders for deletion';
    
    -- ========================================================================
    -- Delete related data in correct order (child tables first)
    -- ========================================================================
    
    -- 1. Delete tender_vendors (bidders)
    PRINT '  Deleting tender vendors/bidders...';
    DELETE FROM tender_vendors
    WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender vendor records';
    
    -- 2. Delete tender_items
    PRINT '  Deleting tender items...';
    DELETE FROM tender_items
    WHERE tender_id IN (SELECT tender_id FROM #TendersToDelete);
    PRINT '    ✅ Deleted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tender item records';
    
    -- 3. Delete from any other related tables (add if needed)
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
    
    -- 4. Finally, delete the tenders themselves
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
    PRINT 'All finalized annual tenders and related data have been deleted.';
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
-- STEP 3: Verify deletion
-- ============================================================================
PRINT 'STEP 3: Verification - Checking remaining records...';
PRINT '';

-- Count remaining finalized annual tenders (should be 0)
DECLARE @RemainingTenders INT;
SELECT @RemainingTenders = COUNT(*)
FROM tenders
WHERE tender_type = 'annual-tender' 
  AND (is_finalized = 1 OR status = 'finalized');

PRINT '  Remaining Finalized Annual Tenders: ' + CAST(@RemainingTenders AS VARCHAR);

-- Show current tender counts by type and status
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
PRINT 'Next Steps:';
PRINT '  1. Review the verification results above';
PRINT '  2. Remaining tenders should only be draft/published annual tenders';
PRINT '  3. Contract and spot-purchase tenders should be unaffected';
PRINT '';
PRINT '====================================================================';
GO
