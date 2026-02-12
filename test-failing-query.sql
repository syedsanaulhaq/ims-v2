-- ============================================================================
-- TEST THE EXACT FAILING QUERY MANUALLY
-- ============================================================================
-- Replace with the PO ID that's failing: E02763E8-3CA6-4890-A210-3FB7094FF59A

DECLARE @poId UNIQUEIDENTIFIER = 'E02763E8-3CA6-4890-A210-3FB7094FF59A';

SELECT 
  d.id,
  d.delivery_number,
  d.po_id,
  d.po_number,
  d.delivery_date,
  d.delivery_status,
  ISNULL(d.delivery_personnel, '') AS delivery_personnel,
  ISNULL(d.delivery_chalan, '') AS delivery_chalan,
  d.received_by,
  d.receiving_date,
  d.notes,
  d.created_at,
  ISNULL(po.po_number, '') AS po_ref,
  ISNULL(v.vendor_name, '') AS vendor_name,
  ISNULL(u.UserName, '') AS received_by_name,
  ISNULL(COUNT(di.id), 0) AS item_count,
  ISNULL(SUM(di.delivery_qty), 0) AS total_quantity,
  ISNULL(SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END), 0) AS good_quantity,
  ISNULL(SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END), 0) AS damaged_quantity,
  ISNULL(SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END), 0) AS rejected_quantity
FROM deliveries d
LEFT JOIN purchase_orders po ON d.po_id = po.id
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN AspNetUsers u ON d.received_by = u.Id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
WHERE d.po_id = @poId
GROUP BY 
  d.id, d.delivery_number, d.po_id, d.po_number, d.delivery_date,
  d.delivery_status, d.delivery_personnel, d.delivery_chalan, d.received_by, 
  d.receiving_date, d.notes, d.created_at,
  po.po_number, v.vendor_name, u.UserName
ORDER BY d.delivery_date DESC, d.created_at DESC;
