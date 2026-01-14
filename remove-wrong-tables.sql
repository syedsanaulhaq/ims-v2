-- ========================================================================
-- MIGRATION: Remove Wrong/Legacy Tables
-- ========================================================================
-- This script removes the incorrectly created parallel table structures
-- that were created as an experimental annual-tenders system.
-- 
-- Tables to remove:
-- 1. TenderItems (capitalized) - Wrong schema with item_id instead of item_master_id
-- 2. TenderVendors - Related to TenderItems, only for annual-tenders
-- 3. AnnualTenders - Parallel to tenders table, only used by alternate system
--
-- DO NOT confuse with:
-- - tender_items (lowercase) - CORRECT & ACTIVE - kept in database
--
-- ========================================================================

BEGIN TRANSACTION

-- Step 1: Drop foreign key constraints first
IF OBJECT_ID('FK_TenderItems_TenderId', 'F') IS NOT NULL
  ALTER TABLE TenderItems DROP CONSTRAINT FK_TenderItems_TenderId;

IF OBJECT_ID('FK_TenderItems_ItemId', 'F') IS NOT NULL
  ALTER TABLE TenderItems DROP CONSTRAINT FK_TenderItems_ItemId;

IF OBJECT_ID('FK_TenderVendors_TenderId', 'F') IS NOT NULL
  ALTER TABLE TenderVendors DROP CONSTRAINT FK_TenderVendors_TenderId;

IF OBJECT_ID('FK_TenderVendors_VendorId', 'F') IS NOT NULL
  ALTER TABLE TenderVendors DROP CONSTRAINT FK_TenderVendors_VendorId;

-- Step 2: Drop indexes
IF OBJECT_ID('IDX_TenderVendors_TenderId', 'I') IS NOT NULL
  DROP INDEX IDX_TenderVendors_TenderId ON TenderVendors;

IF OBJECT_ID('IDX_TenderItems_TenderId', 'I') IS NOT NULL
  DROP INDEX IDX_TenderItems_TenderId ON TenderItems;

-- Step 3: Drop the tables
IF OBJECT_ID('[dbo].[TenderItems]', 'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[TenderItems];
  PRINT 'Dropped table: TenderItems (capitalized) - LEGACY TABLE REMOVED';
END

IF OBJECT_ID('[dbo].[TenderVendors]', 'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[TenderVendors];
  PRINT 'Dropped table: TenderVendors - LEGACY TABLE REMOVED';
END

IF OBJECT_ID('[dbo].[AnnualTenders]', 'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[AnnualTenders];
  PRINT 'Dropped table: AnnualTenders - LEGACY TABLE REMOVED';
END

-- Step 4: Verify the correct tables still exist
IF OBJECT_ID('[dbo].[tender_items]', 'U') IS NOT NULL
  PRINT '✅ Confirmed: tender_items (lowercase) table still exists - CORRECT TABLE PRESERVED';

IF OBJECT_ID('[dbo].[tenders]', 'U') IS NOT NULL
  PRINT '✅ Confirmed: tenders table still exists - CORRECT TABLE PRESERVED';

COMMIT TRANSACTION

-- Summary
PRINT '';
PRINT '========== CLEANUP COMPLETE ==========';
PRINT 'Removed legacy/experimental tables:';
PRINT '  ❌ TenderItems (capitalized)';
PRINT '  ❌ TenderVendors';
PRINT '  ❌ AnnualTenders';
PRINT '';
PRINT 'Preserved correct tables:';
PRINT '  ✅ tender_items (lowercase)';
PRINT '  ✅ tenders';
PRINT '';
PRINT 'All systems now use tender_items table exclusively.';
