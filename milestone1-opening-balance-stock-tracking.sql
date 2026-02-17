-- ============================================================================
-- MILESTONE-1: OPENING BALANCE STOCK TRACKING
-- ============================================================================
-- Quick implementation for tracking existing stock with tender sources
-- Supports: tender reference + received qty + already issued qty
-- Date range: Stock from 2020 onwards
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'MILESTONE-1: Opening Balance Stock Tracking Setup';
PRINT '====================================================================';

-- ============================================================================
-- STEP 1: Fix stock_acquisitions table for quantity tracking
-- ============================================================================
PRINT '';
PRINT 'STEP 1: Updating stock_acquisitions table for quantity tracking...';

-- Add columns if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'item_master_id')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD item_master_id UNIQUEIDENTIFIER NULL;
    PRINT '  ✓ Added item_master_id column';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_received')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD quantity_received DECIMAL(15,2) NOT NULL DEFAULT 0;
    PRINT '  ✓ Added quantity_received column';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_issued')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD quantity_issued DECIMAL(15,2) NOT NULL DEFAULT 0;
    PRINT '  ✓ Added quantity_issued column';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'quantity_available')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD quantity_available AS (quantity_received - quantity_issued) PERSISTED;
    PRINT '  ✓ Added quantity_available computed column';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'delivery_date')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD delivery_date DATE NULL;
    PRINT '  ✓ Added delivery_date column';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stock_acquisitions') AND name = 'unit_cost')
BEGIN
    ALTER TABLE stock_acquisitions 
    ADD unit_cost DECIMAL(15,2) NULL;
    PRINT '  ✓ Added unit_cost column';
END

-- Add foreign key constraint if not exists
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StockAcq_ItemMaster')
BEGIN
    ALTER TABLE stock_acquisitions
    ADD CONSTRAINT FK_StockAcq_ItemMaster 
    FOREIGN KEY (item_master_id) REFERENCES item_masters(id);
    PRINT '  ✓ Added foreign key constraint to item_masters';
END

-- Add index for FIFO queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StockAcq_ItemMaster_Date')
BEGIN
    CREATE INDEX IX_StockAcq_ItemMaster_Date 
    ON stock_acquisitions(item_master_id, delivery_date)
    WHERE quantity_available > 0;
    PRINT '  ✓ Added index for FIFO queries';
END

PRINT '  ✅ stock_acquisitions table updated successfully';

-- ============================================================================
-- STEP 2: Create opening_balance_entries table
-- ============================================================================
PRINT '';
PRINT 'STEP 2: Creating opening_balance_entries table...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'opening_balance_entries')
BEGIN
    CREATE TABLE opening_balance_entries (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        
        -- Tender/Source Information
        tender_id UNIQUEIDENTIFIER NULL,              -- Link to tender if exists
        tender_reference NVARCHAR(100),               -- Manual tender number/reference
        tender_title NVARCHAR(500),                   -- Description of source
        
        -- Item Information
        item_master_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Quantity Tracking
        quantity_received INT NOT NULL,               -- Total originally purchased
        quantity_already_issued INT NOT NULL DEFAULT 0, -- Already given out before system
        quantity_available AS (quantity_received - quantity_already_issued) PERSISTED,
        
        -- Financial
        unit_cost DECIMAL(15,2),                      -- Cost per unit
        total_cost AS (quantity_received * unit_cost) PERSISTED,
        
        -- Source Details
        source_type NVARCHAR(50) DEFAULT 'TENDER',    -- 'TENDER', 'PURCHASE', 'DONATION', 'OTHER'
        acquisition_date DATE,                        -- Original purchase date (can be backdated to 2020)
        
        -- Audit Trail
        entry_date DATETIME2 DEFAULT GETDATE(),
        entered_by UNIQUEIDENTIFIER NOT NULL,
        remarks NVARCHAR(1000),
        
        -- Status
        status NVARCHAR(30) DEFAULT 'ACTIVE',         -- 'ACTIVE', 'DEPLETED', 'CANCELLED'
        processed_to_stock BIT DEFAULT 0,             -- Has this been added to stock_acquisitions?
        
        -- Indexes
        INDEX IX_OpeningBalance_Item (item_master_id),
        INDEX IX_OpeningBalance_Tender (tender_id),
        INDEX IX_OpeningBalance_Date (acquisition_date),
        INDEX IX_OpeningBalance_Status (status),
        
        -- Foreign Keys
        FOREIGN KEY (item_master_id) REFERENCES item_masters(id),
        FOREIGN KEY (entered_by) REFERENCES AspNetUsers(Id)
    );
    
    PRINT '  ✓ Created opening_balance_entries table';
END
ELSE
    PRINT '  ℹ opening_balance_entries table already exists';

-- ============================================================================
-- STEP 3: Create stored procedure to process opening balance to stock
-- ============================================================================
PRINT '';
PRINT 'STEP 3: Creating stored procedure sp_ProcessOpeningBalanceToStock...';
GO

IF OBJECT_ID('dbo.sp_ProcessOpeningBalanceToStock', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ProcessOpeningBalanceToStock;
GO

CREATE PROCEDURE dbo.sp_ProcessOpeningBalanceToStock
    @OpeningBalanceId UNIQUEIDENTIFIER,
    @ProcessedBy UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ItemMasterId UNIQUEIDENTIFIER;
    DECLARE @QuantityReceived INT;
    DECLARE @QuantityIssued INT;
    DECLARE @UnitCost DECIMAL(15,2);
    DECLARE @AcquisitionDate DATE;
    DECLARE @TenderReference NVARCHAR(100);
    DECLARE @AcquisitionNumber NVARCHAR(50);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Get opening balance details
        SELECT 
            @ItemMasterId = item_master_id,
            @QuantityReceived = quantity_received,
            @QuantityIssued = quantity_already_issued,
            @UnitCost = unit_cost,
            @AcquisitionDate = acquisition_date,
            @TenderReference = tender_reference
        FROM opening_balance_entries
        WHERE id = @OpeningBalanceId AND processed_to_stock = 0;
        
        IF @ItemMasterId IS NULL
        BEGIN
            THROW 50001, 'Opening balance entry not found or already processed', 1;
        END
        
        -- Generate acquisition number
        DECLARE @MaxAcqNum INT;
        SELECT @MaxAcqNum = ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0)
        FROM stock_acquisitions
        WHERE acquisition_number LIKE 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%';
        
        SET @AcquisitionNumber = 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-' + 
                                 RIGHT('000000' + CAST(@MaxAcqNum + 1 AS VARCHAR), 6);
        
        -- Create stock acquisition record
        INSERT INTO stock_acquisitions (
            id, acquisition_number, item_master_id,
            quantity_received, quantity_issued, 
            unit_cost, delivery_date,
            processed_by, status, notes
        )
        VALUES (
            NEWID(), @AcquisitionNumber, @ItemMasterId,
            @QuantityReceived, @QuantityIssued,
            @UnitCost, @AcquisitionDate,
            @ProcessedBy, 'completed', 
            'Opening Balance: ' + ISNULL(@TenderReference, 'No tender reference')
        );
        
        -- Mark opening balance as processed
        UPDATE opening_balance_entries
        SET processed_to_stock = 1
        WHERE id = @OpeningBalanceId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @AcquisitionNumber as AcquisitionNumber,
            'SUCCESS' as Status,
            'Opening balance processed to stock successfully' as Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50000, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '  ✅ Created sp_ProcessOpeningBalanceToStock procedure';

-- ============================================================================
-- STEP 4: Create view for opening balance summary
-- ============================================================================
PRINT '';
PRINT 'STEP 4: Creating view vw_opening_balance_summary...';
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_opening_balance_summary')
    DROP VIEW vw_opening_balance_summary;
GO

CREATE VIEW vw_opening_balance_summary AS
SELECT 
    obe.id,
    obe.tender_reference,
    obe.tender_title,
    obe.source_type,
    obe.acquisition_date,
    
    -- Item Details
    im.id as item_master_id,
    im.nomenclature,
    im.item_code,
    c.category_name,
    sc.sub_category_name,
    im.unit,
    
    -- Quantities
    obe.quantity_received,
    obe.quantity_already_issued,
    obe.quantity_available,
    
    -- Financial
    obe.unit_cost,
    obe.total_cost,
    
    -- Status
    obe.status,
    obe.processed_to_stock,
    
    -- Audit
    obe.entry_date,
    u.UserName as entered_by_name,
    obe.remarks
    
FROM opening_balance_entries obe
INNER JOIN item_masters im ON obe.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
LEFT JOIN AspNetUsers u ON obe.entered_by = u.Id;

GO

PRINT '  ✅ Created vw_opening_balance_summary view';

-- ============================================================================
-- COMPLETION
-- ============================================================================
PRINT '';
PRINT '====================================================================';
PRINT '✅ MILESTONE-1 COMPLETE: Opening Balance Stock Tracking';
PRINT '====================================================================';
PRINT '';
PRINT '📋 What was created:';
PRINT '   ✓ Updated stock_acquisitions table with quantity tracking';
PRINT '   ✓ Created opening_balance_entries table';
PRINT '   ✓ Created sp_ProcessOpeningBalanceToStock procedure';
PRINT '   ✓ Created vw_opening_balance_summary view';
PRINT '';
PRINT '🎯 Next Steps:';
PRINT '   1. Create frontend Opening Balance Entry form';
PRINT '   2. Create API endpoint for opening balance entries';
PRINT '   3. Add to admin menu';
PRINT '   4. Start entering stock from 2020 onwards';
PRINT '';
PRINT '====================================================================';

GO
