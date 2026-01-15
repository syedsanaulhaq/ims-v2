-- Check the most recent tender items with vendor_ids
SELECT TOP 10
    ti.id,
    ti.tender_id,
    ti.nomenclature,
    ti.quantity,
    ti.estimated_unit_price,
    ti.vendor_id,
    ti.vendor_ids,
    ti.created_at
FROM tender_items ti
ORDER BY ti.created_at DESC;

-- Also check a specific tender with its items
PRINT '--- Checking most recent annual tender ---';

DECLARE @tenderId NVARCHAR(MAX);
SELECT TOP 1 @tenderId = id FROM tenders WHERE tender_type = 'annual-tender' ORDER BY created_at DESC;

PRINT 'Recent Annual Tender Items:';
SELECT 
    ti.id,
    ti.nomenclature,
    ti.vendor_id,
    ti.vendor_ids,
    ti.created_at
FROM tender_items ti
WHERE ti.tender_id = @tenderId
ORDER BY ti.created_at DESC;
