-- Test Script: Create Sample Tenders for All Three Types
-- This script creates test data for Contract, Spot Purchase, and Annual Tender types
-- Run this to verify the unified tender system is working correctly

PRINT '==========================================';
PRINT 'Creating Test Data for All Tender Types';
PRINT '==========================================';
PRINT '';

-- Get some existing vendors to use for testing
DECLARE @VendorA UNIQUEIDENTIFIER, @VendorB UNIQUEIDENTIFIER, @VendorC UNIQUEIDENTIFIER;

-- Get first 3 vendors
SELECT TOP 1 @VendorA = id FROM [dbo].[vendors] ORDER BY created_at;
SELECT TOP 1 @VendorB = id FROM [dbo].[vendors] WHERE id != @VendorA ORDER BY created_at;
SELECT TOP 1 @VendorC = id FROM [dbo].[vendors] WHERE id != @VendorA AND id != @VendorB ORDER BY created_at;

IF @VendorA IS NULL OR @VendorB IS NULL OR @VendorC IS NULL
BEGIN
    PRINT '❌ ERROR: Need at least 3 active vendors for testing';
    PRINT 'Please create sample vendors first, then run this script again';
    RETURN;
END

PRINT '✅ Using vendors for testing:';
PRINT '   Vendor A: ' + CAST(@VendorA AS VARCHAR(36));
PRINT '   Vendor B: ' + CAST(@VendorB AS VARCHAR(36));
PRINT '   Vendor C: ' + CAST(@VendorC AS VARCHAR(36));
PRINT '';

-- Get some existing items for testing
DECLARE @Item1 UNIQUEIDENTIFIER, @Item2 UNIQUEIDENTIFIER, @Item3 UNIQUEIDENTIFIER, @Item4 UNIQUEIDENTIFIER;

SELECT TOP 1 @Item1 = id FROM [dbo].[item_masters] ORDER BY created_at;
SELECT TOP 1 @Item2 = id FROM [dbo].[item_masters] WHERE id != @Item1 ORDER BY created_at;
SELECT TOP 1 @Item3 = id FROM [dbo].[item_masters] WHERE id != @Item1 AND id != @Item2 ORDER BY created_at;
SELECT TOP 1 @Item4 = id FROM [dbo].[item_masters] WHERE id != @Item1 AND id != @Item2 AND id != @Item3 ORDER BY created_at;

IF @Item1 IS NULL OR @Item2 IS NULL OR @Item3 IS NULL OR @Item4 IS NULL
BEGIN
    PRINT '❌ ERROR: Need at least 4 items for testing';
    PRINT 'Please create sample items first, then run this script again';
    RETURN;
END

PRINT '✅ Using items for testing';
PRINT '';

-- ===== TEST 1: CONTRACT TENDER (Single Vendor) =====
DECLARE @ContractTenderId UNIQUEIDENTIFIER = NEWID();

PRINT '';
PRINT '========== TEST 1: CONTRACT TENDER ==========';
PRINT 'Creating contract tender with single vendor for all items...';
PRINT '';

INSERT INTO [dbo].[tenders] (
    id, tender_type, reference_number, title, description, 
    submission_deadline, estimated_value, status, is_finalized, 
    created_at, created_by
)
VALUES (
    @ContractTenderId,
    'contract',
    'TEST-CONTRACT-' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'),
    'Test Contract Tender - Office Equipment',
    'Sample contract tender for testing unified system',
    DATEADD(day, 30, GETDATE()),
    50000.00,
    'draft',
    0,
    GETDATE(),
    'test-user'
);

-- Add items to contract tender (all with same vendor)
INSERT INTO [dbo].[TenderItems] (
    tender_id, item_id, vendor_id, quantity, 
    estimated_unit_price, total_amount, created_at
)
VALUES
(@ContractTenderId, @Item1, @VendorA, 5, 1000.00, 5000.00, GETDATE()),
(@ContractTenderId, @Item2, @VendorA, 3, 500.00, 1500.00, GETDATE()),
(@ContractTenderId, @Item3, @VendorA, 10, 200.00, 2000.00, GETDATE());

PRINT '✅ Contract Tender Created';
PRINT '   ID: ' + CAST(@ContractTenderId AS VARCHAR(36));
PRINT '   Type: contract';
PRINT '   Vendor: Single (all items from Vendor A)';
PRINT '   Items: 3 items with pricing';
PRINT '';

-- ===== TEST 2: SPOT PURCHASE TENDER (Single Vendor) =====
DECLARE @SpotPurchaseTenderId UNIQUEIDENTIFIER = NEWID();

PRINT '========== TEST 2: SPOT PURCHASE TENDER ==========';
PRINT 'Creating spot purchase with single vendor...';
PRINT '';

INSERT INTO [dbo].[tenders] (
    id, tender_type, reference_number, title, description, 
    submission_deadline, estimated_value, status, is_finalized, 
    created_at, created_by
)
VALUES (
    @SpotPurchaseTenderId,
    'spot-purchase',
    'TEST-SPOT-' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'),
    'Test Spot Purchase - Urgent Supplies',
    'Sample spot purchase for testing',
    DATEADD(day, 7, GETDATE()),
    15000.00,
    'draft',
    0,
    GETDATE(),
    'test-user'
);

-- Add items to spot purchase (all with same vendor - different from contract)
INSERT INTO [dbo].[TenderItems] (
    tender_id, item_id, vendor_id, quantity, 
    estimated_unit_price, total_amount, created_at
)
VALUES
(@SpotPurchaseTenderId, @Item1, @VendorB, 2, 950.00, 1900.00, GETDATE()),
(@SpotPurchaseTenderId, @Item4, @VendorB, 7, 250.00, 1750.00, GETDATE());

PRINT '✅ Spot Purchase Tender Created';
PRINT '   ID: ' + CAST(@SpotPurchaseTenderId AS VARCHAR(36));
PRINT '   Type: spot-purchase';
PRINT '   Vendor: Single (all items from Vendor B)';
PRINT '   Items: 2 items with pricing';
PRINT '';

-- ===== TEST 3: ANNUAL TENDER (Multiple Vendors, Per-Item) =====
DECLARE @AnnualTenderId UNIQUEIDENTIFIER = NEWID();

PRINT '========== TEST 3: ANNUAL TENDER ==========';
PRINT 'Creating annual tender with different vendor per item...';
PRINT '';

INSERT INTO [dbo].[tenders] (
    id, tender_type, reference_number, title, description, 
    submission_deadline, estimated_value, status, is_finalized, 
    created_at, created_by
)
VALUES (
    @AnnualTenderId,
    'annual-tender',
    'TEST-ANNUAL-' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'),
    'Test Annual Tender - Standing Arrangement',
    'Sample annual tender with vendor-per-item assignment',
    DATEADD(day, 365, GETDATE()),
    100000.00,
    'draft',
    0,
    GETDATE(),
    'test-user'
);

-- Add items to annual tender (DIFFERENT vendor per item)
INSERT INTO [dbo].[TenderItems] (
    tender_id, item_id, vendor_id, quantity, 
    estimated_unit_price, total_amount, created_at
)
VALUES
(@AnnualTenderId, @Item1, @VendorA, 10, 950.00, 9500.00, GETDATE()),  -- Vendor A
(@AnnualTenderId, @Item2, @VendorB, 20, 480.00, 9600.00, GETDATE()),  -- Vendor B
(@AnnualTenderId, @Item3, @VendorC, 15, 180.00, 2700.00, GETDATE()),  -- Vendor C
(@AnnualTenderId, @Item4, @VendorA, 50, 240.00, 12000.00, GETDATE()); -- Vendor A (different item)

PRINT '✅ Annual Tender Created';
PRINT '   ID: ' + CAST(@AnnualTenderId AS VARCHAR(36));
PRINT '   Type: annual-tender';
PRINT '   Vendors: Multiple (different vendor per item)';
PRINT '   Items: 4 items with vendor-per-item assignment';
PRINT '';

-- ===== VERIFICATION QUERIES =====
PRINT '';
PRINT '===========================================';
PRINT 'VERIFICATION: Query Test Data';
PRINT '===========================================';
PRINT '';

-- Show all test tenders
PRINT '--- All Test Tenders ---';
SELECT 
    reference_number,
    title,
    tender_type,
    status,
    created_at
FROM [dbo].[tenders]
WHERE reference_number LIKE 'TEST-%'
ORDER BY created_at DESC;

PRINT '';

-- Show contract tender items
PRINT '--- Contract Tender Items (All Same Vendor) ---';
SELECT 
    t.reference_number,
    im.nomenclature,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount,
    v.vendor_name,
    t.tender_type
FROM [dbo].[TenderItems] ti
INNER JOIN [dbo].[tenders] t ON ti.tender_id = t.id
INNER JOIN [dbo].[item_masters] im ON ti.item_id = im.id
INNER JOIN [dbo].[vendors] v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-CONTRACT-%'
ORDER BY im.nomenclature;

PRINT '';

-- Show spot purchase items
PRINT '--- Spot Purchase Items (All Same Vendor) ---';
SELECT 
    t.reference_number,
    im.nomenclature,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount,
    v.vendor_name,
    t.tender_type
FROM [dbo].[TenderItems] ti
INNER JOIN [dbo].[tenders] t ON ti.tender_id = t.id
INNER JOIN [dbo].[item_masters] im ON ti.item_id = im.id
INNER JOIN [dbo].[vendors] v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-SPOT-%'
ORDER BY im.nomenclature;

PRINT '';

-- Show annual tender items with vendor assignment
PRINT '--- Annual Tender Items (Different Vendor Per Item) ---';
SELECT 
    t.reference_number,
    im.nomenclature,
    v.vendor_name,
    ti.quantity,
    ti.estimated_unit_price,
    ti.total_amount,
    t.tender_type
FROM [dbo].[TenderItems] ti
INNER JOIN [dbo].[tenders] t ON ti.tender_id = t.id
INNER JOIN [dbo].[item_masters] im ON ti.item_id = im.id
INNER JOIN [dbo].[vendors] v ON ti.vendor_id = v.id
WHERE t.reference_number LIKE 'TEST-ANNUAL-%'
ORDER BY im.nomenclature;

PRINT '';
PRINT '===========================================';
PRINT '✅ TEST DATA CREATED SUCCESSFULLY';
PRINT '===========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Go to the application at http://localhost:8080';
PRINT '2. Navigate to Procurement Menu';
PRINT '3. Test Contract/Tender - Should show CONTRACT tender';
PRINT '4. Test Annual Tenders - Should show ANNUAL TENDER with vendor assignments';
PRINT '5. Test Spot Purchase - Should show SPOT PURCHASE tender';
PRINT '6. Verify vendor_id and pricing are correctly displayed';
PRINT '';
