-- Add vendor_id column to TenderItems table for vendor-specific item assignment
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TenderItems' AND COLUMN_NAME = 'vendor_id'
)
BEGIN
    ALTER TABLE [dbo].[TenderItems] 
    ADD [vendor_id] [uniqueidentifier] NOT NULL DEFAULT NEWID();
    
    -- Add foreign key constraint
    ALTER TABLE [dbo].[TenderItems]
    ADD CONSTRAINT [FK_TenderItems_VendorId] 
    FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[vendors]([id]) ON DELETE CASCADE;
    
    PRINT 'Column vendor_id added to TenderItems successfully';
END
ELSE
BEGIN
    PRINT 'vendor_id column already exists in TenderItems';
END

-- Add index for better query performance
CREATE INDEX [IDX_TenderItems_VendorId] ON [dbo].[TenderItems]([vendor_id]);
CREATE INDEX [IDX_TenderItems_TenderId_VendorId] ON [dbo].[TenderItems]([tender_id], [vendor_id]);

PRINT 'TenderItems schema update completed';
