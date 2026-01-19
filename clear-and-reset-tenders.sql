-- ==============================================
-- 🗑️ CLEAR AND RESET TENDERS DATA
-- ==============================================
-- This script clears all tenders and related data
-- to start fresh with proper test data
-- ==============================================

USE InventoryManagementDB;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Disable constraints temporarily
ALTER TABLE tender_items NOCHECK CONSTRAINT ALL;
ALTER TABLE tenders NOCHECK CONSTRAINT ALL;
GO

-- Delete all tender_items
DELETE FROM tender_items;
PRINT '✅ Cleared tender_items table';

-- Delete all tenders
DELETE FROM tenders;
PRINT '✅ Cleared tenders table';

-- Delete all purchase_orders and related data
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
PRINT '✅ Cleared purchase orders data';

-- Re-enable constraints
ALTER TABLE tender_items CHECK CONSTRAINT ALL;
ALTER TABLE tenders CHECK CONSTRAINT ALL;
GO

-- ==============================================
-- INSERT NEW ANNUAL TENDER WITH TEST DATA
-- ==============================================

DECLARE @TenderId UNIQUEIDENTIFIER = NEWID();
DECLARE @UserId NVARCHAR(100) = '3ff04743-1c84-4502-8a8c-4f1064300d05'; -- Logged-in user

-- Insert Annual Tender
INSERT INTO tenders (
    id, title, reference_number, tender_type, description,
    publication_date, submission_deadline, status, tender_status,
    created_by, created_at, updated_at, is_finalized
)
VALUES (
    @TenderId,
    'Annual Stationery Supply 2026',
    'TEND-2026-001',
    'annual-tender',
    'Annual tender for office stationery supplies including pens, paper, folders, and office equipment',
    GETDATE(),
    DATEADD(DAY, 30, GETDATE()),
    'finalized',
    'finalized',
    @UserId,
    GETDATE(),
    GETDATE(),
    1
);
PRINT '✅ Created annual tender: ' + CAST(@TenderId AS NVARCHAR(50));

-- Insert Item 1: Pens
INSERT INTO tender_items (
    id, tender_id, item_master_id, nomenclature, quantity, 
    estimated_unit_price, vendor_ids
)
VALUES (
    NEWID(),
    @TenderId,
    'ITEM-001',
    'Ballpoint Pens (Box of 50)',
    500,
    25,
    'VENDOR-001,VENDOR-002,VENDOR-003'
);
PRINT '✅ Added item: Ballpoint Pens';

-- Insert Item 2: A4 Paper
INSERT INTO tender_items (
    id, tender_id, item_master_id, nomenclature, quantity,
    estimated_unit_price, vendor_ids
)
VALUES (
    NEWID(),
    @TenderId,
    'ITEM-002',
    'A4 Paper (Ream - 500 sheets)',
    200,
    150,
    'VENDOR-002,VENDOR-003'
);
PRINT '✅ Added item: A4 Paper';

-- Insert Item 3: Folders
INSERT INTO tender_items (
    id, tender_id, item_master_id, nomenclature, quantity,
    estimated_unit_price, vendor_ids
)
VALUES (
    NEWID(),
    @TenderId,
    'ITEM-003',
    'Folders (Pack of 100)',
    150,
    450,
    'VENDOR-001,VENDOR-003'
);
PRINT '✅ Added item: Folders';

-- Insert Item 4: Desk Organizer
INSERT INTO tender_items (
    id, tender_id, item_master_id, nomenclature, quantity,
    estimated_unit_price, vendor_ids
)
VALUES (
    NEWID(),
    @TenderId,
    'ITEM-004',
    'Desk Organizers',
    100,
    350,
    'VENDOR-001,VENDOR-002'
);
PRINT '✅ Added item: Desk Organizer';

PRINT '';
PRINT '═══════════════════════════════════════════════';
PRINT '✅ TENDER DATA RESET COMPLETE';
PRINT '═══════════════════════════════════════════════';
PRINT 'Annual Tender created with 4 items';
PRINT 'Status: Finalized (ready for PO creation)';
PRINT 'Items: 4 items with multiple vendor options';
PRINT '';
PRINT 'Test Flow:';
PRINT '1. Navigate to Annual Tender Dashboard';
PRINT '2. Click "Manage PO" on the finalized tender';
PRINT '3. Click "Create PO" button';
PRINT '4. Verify tender is auto-selected';
PRINT '5. Select items and verify vendor dropdowns work';
PRINT '6. Complete PO creation';
GO
