-- Check if vendor_id values are stored in tender_items for the specific tender
SELECT 
    ti.id,
    ti.tender_id,
    ti.item_master_id,
    ti.nomenclature,
    ti.quantity,
    ti.vendor_id,
    ti.created_at,
    ti.updated_at
FROM tender_items ti
WHERE ti.tender_id = '291A2F29-C959-4B8A-8953-98588C6E6EDB'
ORDER BY ti.created_at;

-- Also check all tender_items with non-null vendor_id
PRINT '--- All tender_items with vendor_id values ---';
SELECT TOP 10
    ti.tender_id,
    ti.nomenclature,
    ti.vendor_id,
    v.vendor_name
FROM tender_items ti
LEFT JOIN vendors v ON ti.vendor_id = v.id
WHERE ti.vendor_id IS NOT NULL AND ti.vendor_id != ''
ORDER BY ti.created_at DESC;

-- Check the vendor_id column data type
PRINT '--- vendor_id column info ---';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tender_items' AND COLUMN_NAME = 'vendor_id';

-- Count total tender_items for that tender
PRINT '--- Count of items for tender 291A2F29-C959-4B8A-8953-98588C6E6EDB ---';
SELECT COUNT(*) as total_items FROM tender_items WHERE tender_id = '291A2F29-C959-4B8A-8953-98588C6E6EDB';
