-- ============================================================================
-- Remove Items Without Item Code
-- ============================================================================
-- This script soft-deletes all items from item_masters that don't have an item_code
-- First it checks for dependencies, then performs the soft delete

-- Step 1: Show items that will be deleted
PRINT '=== ITEMS TO BE DELETED (WITHOUT ITEM_CODE) ==='
SELECT 
  id,
  item_code,
  nomenclature,
  unit,
  category_id,
  status,
  created_at,
  is_deleted
FROM item_masters
WHERE item_code IS NULL OR item_code = '' OR TRIM(item_code) = '';

-- Step 2: Count items without item_code
PRINT ''
PRINT '=== COUNT OF ITEMS WITHOUT ITEM_CODE ==='
SELECT COUNT(*) as items_without_code
FROM item_masters
WHERE (item_code IS NULL OR item_code = '' OR TRIM(item_code) = '')
  AND is_deleted = 0;

-- Step 3: Check dependencies in other tables
PRINT ''
PRINT '=== CHECKING DEPENDENCIES IN OTHER TABLES ==='
SELECT 'purchase_order_items' as reference_table, COUNT(*) as count
FROM purchase_order_items
WHERE item_id IN (
  SELECT id FROM item_masters 
  WHERE item_code IS NULL OR item_code = '' OR TRIM(item_code) = ''
)
UNION ALL
SELECT 'stock_acquisitions', COUNT(*)
FROM stock_acquisitions
WHERE item_id IN (
  SELECT id FROM item_masters 
  WHERE item_code IS NULL OR item_code = '' OR TRIM(item_code) = ''
)
UNION ALL
SELECT 'deliveries', COUNT(*)
FROM deliveries
WHERE item_id IN (
  SELECT id FROM item_masters 
  WHERE item_code IS NULL OR item_code = '' OR TRIM(item_code) = ''
)
UNION ALL
SELECT 'tender_items', COUNT(*)
FROM tender_items
WHERE item_id IN (
  SELECT id FROM item_masters 
  WHERE item_code IS NULL OR item_code = '' OR TRIM(item_code) = ''
);

-- Step 4: Soft delete items without item_code
PRINT ''
PRINT '=== SOFT DELETING ITEMS WITHOUT ITEM_CODE ==='
UPDATE item_masters
SET is_deleted = 1, deleted_at = GETDATE()
WHERE (item_code IS NULL OR item_code = '' OR TRIM(item_code) = '')
  AND is_deleted = 0;

-- Step 5: Confirmation - show remaining active items
PRINT ''
PRINT '=== CONFIRMATION: Active items remaining ==='
SELECT COUNT(*) as active_items_remaining
FROM item_masters
WHERE is_deleted = 0;

PRINT ''
PRINT '✅ Soft delete completed successfully!'
