-- Add vendor_id to TenderItems table for vendor-specific item assignment
-- This allows each vendor to be assigned to specific items in a tender

-- Step 1: Add vendor_id column to TenderItems
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'vendor_id')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD [vendor_id] [uniqueidentifier] NOT NULL DEFAULT CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier);
    
    -- Add foreign key constraint
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [FK_TenderItems_VendorId] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE CASCADE;
    
    PRINT 'vendor_id column added to TenderItems table';
END
ELSE
BEGIN
    PRINT 'vendor_id column already exists in TenderItems table';
END

-- Step 2: Update the unique constraint to include vendor_id
-- Drop old constraint if exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'TenderItems' AND CONSTRAINT_NAME = 'UQ_TenderItems')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    DROP CONSTRAINT [UQ_TenderItems];
    PRINT 'Old unique constraint removed';
END

-- Step 3: Create new unique constraint on tender_id, vendor_id, item_id
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'TenderItems' AND CONSTRAINT_NAME = 'UQ_TenderItems_VendorItem')
BEGIN
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [UQ_TenderItems_VendorItem] UNIQUE ([tender_id], [vendor_id], [item_id]);
    
    PRINT 'New unique constraint created for vendor-specific items';
END
ELSE
BEGIN
    PRINT 'Unique constraint for vendor-specific items already exists';
END

-- Step 4: Create index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_TenderItems_VendorId')
BEGIN
    CREATE INDEX [IDX_TenderItems_VendorId] ON [dbo].[TenderItems]([vendor_id]);
    PRINT 'Index created on vendor_id';
END

PRINT 'Migration completed successfully';
