-- ============================================================================
-- COMPLETE INVENTORY CLEANUP SCRIPT
-- Clears all inventory, tenders, deliveries, and related data
-- WARNING: This will delete all historical data!
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '🗑️  STARTING COMPLETE CLEANUP...';
PRINT '';

-- ============================================================================
-- STEP 1: Disable Foreign Key Constraints
-- ============================================================================

PRINT '1️⃣  Disabling foreign key constraints...';

-- Disable all foreign keys temporarily
EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

PRINT '   ✅ All constraints disabled';
PRINT '';

-- ============================================================================
-- STEP 2: Clear Personal Stock (Level 3)
-- ============================================================================

PRINT '2️⃣  Clearing stock_personal (Personal/User Inventory)...';

DELETE FROM stock_personal;
DBCC CHECKIDENT ('stock_personal', RESEED, 0);

PRINT '   ✅ Deleted all personal inventory records';
PRINT '';

-- ============================================================================
-- STEP 3: Clear Wing Stock (Level 2)
-- ============================================================================

PRINT '3️⃣  Clearing stock_wing (Wing/Department Inventory)...';

DELETE FROM stock_wing;
DBCC CHECKIDENT ('stock_wing', RESEED, 0);

PRINT '   ✅ Deleted all wing inventory records';
PRINT '';

-- ============================================================================
-- STEP 4: Clear Admin Stock (Level 1)
-- ============================================================================

PRINT '4️⃣  Clearing stock_admin (Admin/Central Inventory)...';

DELETE FROM stock_admin;
DBCC CHECKIDENT ('stock_admin', RESEED, 0);

PRINT '   ✅ Deleted all admin inventory records';
PRINT '';

-- ============================================================================
-- STEP 5: Clear Stock Transfer Logs
-- ============================================================================

PRINT '5️⃣  Clearing stock transfer history...';

IF OBJECT_ID('dbo.stock_transfer_log', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_transfer_log;
    DBCC CHECKIDENT ('stock_transfer_log', RESEED, 0);
    PRINT '   ✅ Deleted all transfer logs';
END
ELSE
BEGIN
    PRINT '   ⚠️  stock_transfer_log table does not exist';
END

PRINT '';

-- ============================================================================
-- STEP 6: Clear Stock Issuance Data
-- ============================================================================

PRINT '6️⃣  Clearing stock issuance requests and items...';

-- Clear stock_issuance_items first (child table)
IF OBJECT_ID('dbo.stock_issuance_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_issuance_items;
    DBCC CHECKIDENT ('stock_issuance_items', RESEED, 0);
    PRINT '   ✅ Deleted all issuance items';
END

-- Clear stock_issuance_requests (parent table)
IF OBJECT_ID('dbo.stock_issuance_requests', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_issuance_requests;
    DBCC CHECKIDENT ('stock_issuance_requests', RESEED, 0);
    PRINT '   ✅ Deleted all issuance requests';
END

PRINT '';

-- ============================================================================
-- STEP 7: Clear Delivery Data
-- ============================================================================

PRINT '7️⃣  Clearing delivery data...';

-- Clear delivery_items first (child)
IF OBJECT_ID('dbo.delivery_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM delivery_items;
    DBCC CHECKIDENT ('delivery_items', RESEED, 0);
    PRINT '   ✅ Deleted all delivery items';
END

-- Clear deliveries (parent)
IF OBJECT_ID('dbo.deliveries', 'U') IS NOT NULL
BEGIN
    DELETE FROM deliveries;
    DBCC CHECKIDENT ('deliveries', RESEED, 0);
    PRINT '   ✅ Deleted all deliveries';
END

PRINT '';

-- ============================================================================
-- STEP 8: Clear Stock Transactions
-- ============================================================================

PRINT '8️⃣  Clearing stock transactions...';

IF OBJECT_ID('dbo.stock_transactions', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_transactions;
    DBCC CHECKIDENT ('stock_transactions', RESEED, 0);
    PRINT '   ✅ Deleted all stock transactions';
END

IF OBJECT_ID('dbo.stock_transactions_clean', 'U') IS NOT NULL
BEGIN
    DELETE FROM stock_transactions_clean;
    DBCC CHECKIDENT ('stock_transactions_clean', RESEED, 0);
    PRINT '   ✅ Deleted all clean stock transactions';
END

PRINT '';

-- ============================================================================
-- STEP 9: Clear Tender Data
-- ============================================================================

PRINT '9️⃣  Clearing tender data...';

-- Clear tender_bid_items (child)
IF OBJECT_ID('dbo.tender_bid_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM tender_bid_items;
    PRINT '   ✅ Deleted all tender bid items';
END

-- Clear tender_bids (child)
IF OBJECT_ID('dbo.tender_bids', 'U') IS NOT NULL
BEGIN
    DELETE FROM tender_bids;
    PRINT '   ✅ Deleted all tender bids';
END

-- Clear tender_items (child)
IF OBJECT_ID('dbo.tender_items', 'U') IS NOT NULL
BEGIN
    DELETE FROM tender_items;
    PRINT '   ✅ Deleted all tender items';
END

-- Clear tenders (parent)
IF OBJECT_ID('dbo.tenders', 'U') IS NOT NULL
BEGIN
    DELETE FROM tenders;
    DBCC CHECKIDENT ('tenders', RESEED, 0);
    PRINT '   ✅ Deleted all tenders';
END

PRINT '';

-- ============================================================================
-- STEP 10: Clear Award Data
-- ============================================================================

PRINT '🔟 Clearing tender award data...';

-- Clear AwardItems (child)
IF OBJECT_ID('dbo.AwardItems', 'U') IS NOT NULL
BEGIN
    DELETE FROM AwardItems;
    DBCC CHECKIDENT ('AwardItems', RESEED, 0);
    PRINT '   ✅ Deleted all award items';
END

-- Clear TenderAwards (parent)
IF OBJECT_ID('dbo.TenderAwards', 'U') IS NOT NULL
BEGIN
    DELETE FROM TenderAwards;
    DBCC CHECKIDENT ('TenderAwards', RESEED, 0);
    PRINT '   ✅ Deleted all tender awards';
END

PRINT '';

-- ============================================================================
-- STEP 11: Clear Vendor Data (Optional)
-- ============================================================================

PRINT '1️⃣ 1️⃣  Clearing vendor data...';

IF OBJECT_ID('dbo.vendors', 'U') IS NOT NULL
BEGIN
    DELETE FROM vendors;
    DBCC CHECKIDENT ('vendors', RESEED, 0);
    PRINT '   ✅ Deleted all vendors';
END

PRINT '';

-- ============================================================================
-- STEP 12: Re-enable Foreign Key Constraints
-- ============================================================================

PRINT '1️⃣ 2️⃣  Re-enabling foreign key constraints...';

EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

PRINT '   ✅ All constraints re-enabled';
PRINT '';

-- ============================================================================
-- STEP 13: Verify Cleanup
-- ============================================================================

PRINT '1️⃣ 3️⃣  Verifying cleanup...';
PRINT '';

SELECT 'stock_admin' as TableName, COUNT(*) as RecordCount FROM stock_admin
UNION ALL
SELECT 'stock_wing', COUNT(*) FROM stock_wing
UNION ALL
SELECT 'stock_personal', COUNT(*) FROM stock_personal
UNION ALL
SELECT 'tenders', COUNT(*) FROM tenders
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'stock_issuance_requests', COUNT(*) FROM stock_issuance_requests
ORDER BY TableName;

PRINT '';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

PRINT '✅ CLEANUP COMPLETE!';
PRINT '';
PRINT '📊 System Status:';
PRINT '   ✅ All inventory cleared (admin, wing, personal)';
PRINT '   ✅ All tenders deleted';
PRINT '   ✅ All deliveries deleted';
PRINT '   ✅ All stock transactions deleted';
PRINT '   ✅ All issuance requests deleted';
PRINT '';
PRINT '🚀 Ready to start fresh!';
PRINT '';
PRINT 'Next Steps:';
PRINT '   1. Create new Item Masters (if needed)';
PRINT '   2. Create Vendors';
PRINT '   3. Create Tenders';
PRINT '   4. Add Tender Items';
PRINT '   5. Create Awards';
PRINT '   6. Record Deliveries';
PRINT '   7. Finalize Delivery → Auto-add to Admin Stock';
PRINT '   8. Wing requests from Admin → Stock transfers begin';
PRINT '   9. Users request from Wing → Items issued';
PRINT '';

GO
