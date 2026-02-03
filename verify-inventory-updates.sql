-- ============================================================================
-- Inventory Verification Queries
-- Purpose: Verify that deliveries are properly updating inventory
-- Date: 2026-02-03
-- ============================================================================

-- Query 1: Current Inventory Stock Overview
-- Shows all items currently in inventory with their quantities
SELECT 
    cis.id,
    cis.item_master_id,
    im.item_name,
    im.item_code,
    c.category_name,
    cis.current_quantity,
    cis.last_transaction_date,
    cis.last_transaction_type,
    cis.last_updated
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
LEFT JOIN categories c ON im.category_id = c.id
ORDER BY cis.last_transaction_date DESC;

-- Query 2: Stock Acquisitions Audit Trail
-- Shows all acquisitions created from deliveries
SELECT 
    sa.id,
    sa.acquisition_number,
    sa.po_id,
    po.po_number,
    sa.delivery_id,
    d.delivery_number,
    sa.total_items,
    sa.total_quantity,
    sa.total_value,
    sa.acquisition_date,
    sa.processed_by,
    u.username as processed_by_user,
    sa.status
FROM stock_acquisitions sa
INNER JOIN purchase_orders po ON sa.po_id = po.id
INNER JOIN deliveries d ON sa.delivery_id = d.id
LEFT JOIN users u ON sa.processed_by = u.id
ORDER BY sa.acquisition_date DESC;

-- Query 3: Delivery to Inventory Trace
-- Shows which deliveries added what items to inventory
SELECT 
    d.delivery_number,
    d.delivery_date,
    d.delivery_personnel,
    d.delivery_chalan,
    d.receiving_date,
    po.po_number,
    t.tender_number,
    t.tender_type,
    im.item_name,
    im.item_code,
    di.delivery_qty,
    di.quality_status,
    CASE 
        WHEN di.quality_status = 'good' THEN 'Added to Inventory'
        WHEN di.quality_status = 'damaged' THEN 'Not Added (Damaged)'
        WHEN di.quality_status = 'rejected' THEN 'Not Added (Rejected)'
        WHEN di.quality_status = 'partial' THEN 'Partially Added'
        ELSE 'Unknown Status'
    END AS inventory_status,
    sa.acquisition_number
FROM deliveries d
INNER JOIN delivery_items di ON d.id = di.delivery_id
INNER JOIN purchase_orders po ON d.po_id = po.id
LEFT JOIN tenders t ON po.tender_id = t.id
INNER JOIN item_master im ON di.item_master_id = im.id
LEFT JOIN stock_acquisitions sa ON sa.delivery_id = d.id
WHERE d.delivery_status = 'completed'
ORDER BY d.receiving_date DESC, d.delivery_number, im.item_name;

-- Query 4: Inventory Changes by Item
-- Shows how each item's inventory has changed over time
SELECT 
    im.item_name,
    im.item_code,
    cis.current_quantity,
    COUNT(DISTINCT sa.id) as total_acquisitions,
    SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) as total_good_received,
    SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END) as total_damaged,
    SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END) as total_rejected,
    cis.last_transaction_date,
    cis.last_transaction_type
FROM item_masters im
LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
LEFT JOIN delivery_items di ON im.id = di.item_master_id
LEFT JOIN deliveries d ON di.delivery_id = d.id AND d.delivery_status = 'completed'
LEFT JOIN stock_acquisitions sa ON d.id = sa.delivery_id
GROUP BY 
    im.id,
    im.item_name,
    im.item_code,
    cis.current_quantity,
    cis.last_transaction_date,
    cis.last_transaction_type
HAVING cis.current_quantity IS NOT NULL OR COUNT(DISTINCT sa.id) > 0
ORDER BY cis.last_transaction_date DESC;

-- Query 5: Purchase Orders with Delivery and Inventory Status
-- Shows complete PO lifecycle: ordered → delivered → in inventory
SELECT 
    po.po_number,
    t.tender_number,
    t.tender_type,
    po.status as po_status,
    COUNT(DISTINCT d.id) as total_deliveries,
    COUNT(DISTINCT CASE WHEN d.delivery_status = 'completed' THEN d.id END) as completed_deliveries,
    SUM(poi.quantity) as total_ordered_qty,
    SUM(poi.received_quantity) as total_received_qty,
    SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) as total_in_inventory,
    SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END) as total_damaged_qty,
    SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END) as total_rejected_qty
FROM purchase_orders po
LEFT JOIN tenders t ON po.tender_id = t.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
LEFT JOIN deliveries d ON po.id = d.po_id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
WHERE po.status IN ('finalized', 'partial', 'completed')
GROUP BY 
    po.id,
    po.po_number,
    t.tender_number,
    t.tender_type,
    po.status
ORDER BY po.created_at DESC;

-- Query 6: Items NOT in Inventory Yet
-- Shows items from completed deliveries that might be missing from inventory
SELECT 
    im.item_name,
    im.item_code,
    po.po_number,
    d.delivery_number,
    di.delivery_qty,
    di.quality_status,
    d.receiving_date,
    CASE 
        WHEN cis.id IS NULL THEN 'Not in Inventory Table'
        WHEN cis.current_quantity = 0 THEN 'In Table but Zero Quantity'
        ELSE 'In Inventory'
    END as inventory_presence
FROM delivery_items di
INNER JOIN deliveries d ON di.delivery_id = d.id
INNER JOIN purchase_orders po ON d.po_id = po.id
INNER JOIN item_master im ON di.item_master_id = im.id
LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
WHERE d.delivery_status = 'completed'
  AND di.quality_status = 'good'
  AND (cis.id IS NULL OR cis.current_quantity = 0)
ORDER BY d.receiving_date DESC;

-- Query 7: Recent Inventory Transactions
-- Shows the most recent 50 inventory updates
SELECT TOP 50
    cis.item_master_id,
    im.item_name,
    im.item_code,
    cis.current_quantity,
    cis.last_transaction_date,
    cis.last_transaction_type,
    cis.last_updated
FROM current_inventory_stock cis
INNER JOIN item_masters im ON cis.item_master_id = im.id
ORDER BY cis.last_updated DESC;

-- ============================================================================
-- INSTRUCTIONS FOR USE:
-- ============================================================================
-- 1. Run Query 1 to see what's currently in your inventory
-- 2. Run Query 2 to see the audit trail of all stock acquisitions
-- 3. Run Query 3 to trace which deliveries added what to inventory
-- 4. Run Query 4 to see total quantities by item with good/damaged/rejected breakdown
-- 5. Run Query 5 to see complete PO → Delivery → Inventory flow
-- 6. Run Query 6 to identify any items that SHOULD be in inventory but aren't
-- 7. Run Query 7 to see the 50 most recent inventory transactions
--
-- If Query 6 returns rows, those items need investigation!
-- ============================================================================
