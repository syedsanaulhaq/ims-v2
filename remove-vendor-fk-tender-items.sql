-- ========================================================================
-- REMOVE FOREIGN KEY CONSTRAINT FROM vendor_id IN tender_items
-- ========================================================================
-- REASON: vendor_id needs to store comma-separated vendor IDs for annual tenders
-- The FK constraint prevents this, so we remove it
-- ========================================================================

ALTER TABLE [dbo].[tender_items] 
DROP CONSTRAINT [FK_tender_items_vendor_id];

PRINT '✅ Removed foreign key constraint from vendor_id';
