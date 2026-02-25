-- ============================================================================
-- CHECK VENDORS STATUS - Debug Script
-- ============================================================================
-- This script checks the current state of vendors in the database
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'VENDOR DATABASE STATUS CHECK';
PRINT '====================================================================';
PRINT '';

-- Check if vendors table exists and has soft delete columns
PRINT 'Step 1: Table Structure Check';
PRINT '========================================';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'vendors'
ORDER BY ORDINAL_POSITION;
PRINT '';

-- Check total vendor count
PRINT 'Step 2: Vendor Count Summary';
PRINT '========================================';
DECLARE @TotalVendors INT;
DECLARE @ActiveVendors INT;
DECLARE @DeletedVendors INT;

SELECT @TotalVendors = COUNT(*) FROM vendors;
SELECT @ActiveVendors = COUNT(*) FROM vendors WHERE is_deleted = 0;
SELECT @DeletedVendors = COUNT(*) FROM vendors WHERE is_deleted = 1;

PRINT 'Total Vendors: ' + CAST(@TotalVendors AS VARCHAR);
PRINT 'Active Vendors: ' + CAST(@ActiveVendors AS VARCHAR);
PRINT 'Deleted Vendors: ' + CAST(@DeletedVendors AS VARCHAR);
PRINT '';

-- Show all vendors with their status
PRINT 'Step 3: All Vendors List';
PRINT '========================================';
IF @TotalVendors = 0
BEGIN
    PRINT '❌ NO VENDORS FOUND IN DATABASE';
    PRINT 'You need to add vendors first!';
END
ELSE
BEGIN
    SELECT 
        vendor_id,
        vendor_name,
        contact_person,
        status,
        is_deleted,
        deleted_at,
        CASE 
            WHEN is_deleted = 1 THEN '🗑️ DELETED'
            WHEN is_deleted = 0 THEN '✅ ACTIVE'
            ELSE '❓ UNKNOWN'
        END as vendor_status
    FROM vendors
    ORDER BY is_deleted, vendor_name;
END
PRINT '';

-- Check if all vendors are soft deleted by mistake
PRINT 'Step 4: Diagnosis';
PRINT '========================================';
IF @TotalVendors = 0
BEGIN
    PRINT '❌ ISSUE: No vendors exist in the database';
    PRINT '   SOLUTION: Add vendors through the UI or insert sample data';
END
ELSE IF @ActiveVendors = 0 AND @DeletedVendors > 0
BEGIN
    PRINT '❌ ISSUE: All vendors are soft-deleted (is_deleted = 1)';
    PRINT '   SOLUTION: Either restore them or toggle "Show Deleted" in UI';
    PRINT '';
    PRINT '   To restore all vendors, run:';
    PRINT '   UPDATE vendors SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL;';
END
ELSE IF @ActiveVendors > 0
BEGIN
    PRINT '✅ GOOD: There are ' + CAST(@ActiveVendors AS VARCHAR) + ' active vendor(s)';
    PRINT '   If they are not showing in UI, check:';
    PRINT '   1. Backend API is running (http://localhost:3000/api/vendors)';
    PRINT '   2. Frontend is fetching correctly';
    PRINT '   3. Browser console for errors';
END

PRINT '';
PRINT '====================================================================';
PRINT 'END OF DIAGNOSIS';
PRINT '====================================================================';
GO
