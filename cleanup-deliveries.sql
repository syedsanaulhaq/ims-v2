-- ============================================================================
-- CLEANUP DELIVERY RECORDS - Choose one option below
-- ============================================================================

-- OPTION 1: DELETE A SPECIFIC DELIVERY AND ITS ITEMS
-- Change the delivery_id value to the ID you want to delete
-- ============================================================================
DECLARE @delivery_id UNIQUEIDENTIFIER = 'YOUR_DELIVERY_ID_HERE';

BEGIN TRANSACTION;

BEGIN TRY
    -- Delete serial numbers first (if table exists)
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

    -- Delete the delivery record
    DELETE FROM deliveries 
    WHERE id = @delivery_id;
    PRINT '✅ Deleted delivery record';

    COMMIT TRANSACTION;
    PRINT '✅ DELIVERY SUCCESSFULLY DELETED';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
END CATCH;

-- ============================================================================
-- OPTION 2: DELETE ALL DELIVERIES FOR A SPECIFIC PO
-- Change the po_id value to the PO ID you want to clean
-- ============================================================================
/*
DECLARE @po_id UNIQUEIDENTIFIER = 'YOUR_PO_ID_HERE';

BEGIN TRANSACTION;

BEGIN TRY
    -- Get all delivery IDs for this PO
    DECLARE @delivery_ids TABLE (id UNIQUEIDENTIFIER);
    
    INSERT INTO @delivery_ids
    SELECT id FROM deliveries WHERE po_id = @po_id;

    -- Delete serial numbers for these deliveries
    IF OBJECT_ID('delivery_item_serial_numbers', 'U') IS NOT NULL
    BEGIN
        DELETE FROM delivery_item_serial_numbers 
        WHERE delivery_id IN (SELECT id FROM @delivery_ids);
        PRINT '✅ Deleted serial numbers';
    END

    -- Delete delivery items
    DELETE FROM delivery_items 
    WHERE delivery_id IN (SELECT id FROM @delivery_ids);
    PRINT '✅ Deleted delivery items';

    -- Delete delivery records
    DELETE FROM deliveries 
    WHERE po_id = @po_id;
    PRINT '✅ Deleted all deliveries for this PO';

    COMMIT TRANSACTION;
    PRINT '✅ ALL PO DELIVERIES SUCCESSFULLY DELETED';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
END CATCH;
*/

-- ============================================================================
-- OPTION 3: VIEW ALL DELIVERIES (before deleting)
-- Run this first to see what you're deleting
-- ============================================================================
/*
SELECT 
    d.id,
    d.delivery_number,
    d.po_id,
    d.po_number,
    d.delivery_date,
    d.delivery_personnel,
    d.delivery_chalan,
    d.delivery_status,
    d.created_at,
    d.updated_at,
    COUNT(di.id) AS item_count
FROM deliveries d
LEFT JOIN delivery_items di ON d.id = di.delivery_id
GROUP BY 
    d.id, d.delivery_number, d.po_id, d.po_number, d.delivery_date,
    d.delivery_personnel, d.delivery_chalan, d.delivery_status, 
    d.created_at, d.updated_at
ORDER BY d.created_at DESC;
*/

-- ============================================================================
-- OPTION 4: UPDATE A SPECIFIC DELIVERY RECORD (alternative to delete)
-- Use this if you want to keep the record but update it
-- ============================================================================
/*
DECLARE @delivery_id UNIQUEIDENTIFIER = 'YOUR_DELIVERY_ID_HERE';

BEGIN TRANSACTION;

BEGIN TRY
    -- Update delivery record
    UPDATE deliveries
    SET
        po_id = 'YOUR_NEW_PO_ID_HERE',
        po_number = 'YOUR_NEW_PO_NUMBER_HERE',
        delivery_date = GETDATE(),
        delivery_personnel = 'NEW_PERSONNEL_NAME',
        delivery_chalan = 'NEW_CHALLAN_NUMBER',
        notes = 'Updated delivery',
        updated_at = GETDATE()
    WHERE id = @delivery_id;

    -- Delete old items
    DELETE FROM delivery_items 
    WHERE delivery_id = @delivery_id;

    -- Insert new items
    INSERT INTO delivery_items (
        id, delivery_id, item_master_id, item_name, 
        delivery_qty, unit, quality_status, created_at, updated_at
    )
    VALUES
        (NEWID(), @delivery_id, 'ITEM_ID_1', 'Item Name 1', 100, 'pieces', 'good', GETDATE(), GETDATE()),
        (NEWID(), @delivery_id, 'ITEM_ID_2', 'Item Name 2', 50, 'pieces', 'good', GETDATE(), GETDATE());

    COMMIT TRANSACTION;
    PRINT '✅ DELIVERY SUCCESSFULLY UPDATED';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
END CATCH;
*/

-- ============================================================================
-- OPTION 5: DELETE ALL DELIVERIES (CLEAN SLATE)
-- ⚠️ WARNING: This deletes ALL deliveries! Use with caution
-- ============================================================================
/*
BEGIN TRANSACTION;

BEGIN TRY
    -- Delete serial numbers
    IF OBJECT_ID('delivery_item_serial_numbers', 'U') IS NOT NULL
    BEGIN
        DELETE FROM delivery_item_serial_numbers;
        PRINT '✅ Deleted all serial numbers';
    END

    -- Delete delivery items
    DELETE FROM delivery_items;
    PRINT '✅ Deleted all delivery items';

    -- Delete deliveries
    DELETE FROM deliveries;
    PRINT '✅ Deleted all deliveries';

    COMMIT TRANSACTION;
    PRINT '✅ ALL DELIVERIES SUCCESSFULLY DELETED';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
END CATCH;
*/

-- ============================================================================
-- HOW TO USE:
-- ============================================================================
-- 1. First run OPTION 3 (commented out) to see all deliveries
-- 2. Copy the delivery_id or po_id from the results
-- 3. Uncomment OPTION 1 or 2 as needed
-- 4. Replace 'YOUR_DELIVERY_ID_HERE' or 'YOUR_PO_ID_HERE' with actual ID
-- 5. Execute the query
-- 6. Then you can add new deliveries via the API or manually
