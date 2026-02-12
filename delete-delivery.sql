-- ============================================================================
-- DELETE DELIVERY RECORDS FROM DATABASE
-- ============================================================================

-- STEP 1: VIEW ALL DELIVERIES (RUN THIS FIRST TO GET THE ID)
-- ============================================================================
SELECT 
    d.id,
    d.delivery_number,
    d.po_id,
    d.po_number,
    d.delivery_date,
    d.delivery_personnel,
    d.delivery_chalan,
    d.created_at,
    COUNT(di.id) AS item_count
FROM deliveries d
LEFT JOIN delivery_items di ON d.id = di.delivery_id
GROUP BY d.id, d.delivery_number, d.po_id, d.po_number, 
         d.delivery_date, d.delivery_personnel, d.delivery_chalan,
         d.created_at
ORDER BY d.created_at DESC;

-- ============================================================================
-- STEP 2: COPY THE ID FROM RESULTS ABOVE AND PASTE IT BELOW
-- Then uncomment and run the DELETE query
-- ============================================================================

/*
-- Uncomment this and replace 'PASTE_ID_HERE' with the actual ID from STEP 1
DECLARE @delivery_id UNIQUEIDENTIFIER = 'PASTE_ID_HERE';

BEGIN TRANSACTION;
BEGIN TRY
    -- Delete serial numbers
    IF OBJECT_ID('delivery_item_serial_numbers', 'U') IS NOT NULL
    BEGIN
        DELETE FROM delivery_item_serial_numbers 
        WHERE delivery_id = @delivery_id;
        PRINT '✅ Deleted serial numbers';
    END

    -- Delete delivery items
    DELETE FROM delivery_items 
    WHERE delivery_id = @delivery_id;
    PRINT '✅ Deleted delivery items';

    -- Delete delivery
    DELETE FROM deliveries 
    WHERE id = @delivery_id;
    PRINT '✅ Deleted delivery';

    COMMIT TRANSACTION;
    PRINT '✅✅✅ DELIVERY SUCCESSFULLY DELETED ✅✅✅';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
END CATCH;
*/

-- ============================================================================
-- EXAMPLE: If your ID from STEP 1 is 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
-- It would look like:
-- ============================================================================
/*
DECLARE @delivery_id UNIQUEIDENTIFIER = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
... rest of the DELETE query above
*/
