-- Check the request and approval details
DECLARE @requestId UNIQUEIDENTIFIER = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

-- 1. Check if request exists
SELECT 'Request Details:' as '---';
SELECT id, requester_user_id, request_type, justification, purpose, created_at, submitted_at
FROM stock_issuance_requests
WHERE id = @requestId;

-- 2. Check items
SELECT 'Items:' as '---';
SELECT id, request_id, item_master_id, nomenclature, requested_quantity, approved_quantity, decision_type, item_type
FROM stock_issuance_items
WHERE request_id = @requestId;

-- 3. Check approvals
SELECT 'Approvals:' as '---';
SELECT ra.id, ra.request_id, ra.request_type, ra.submitted_by, ra.current_approver_id, ra.current_status, ra.submitted_date
FROM request_approvals ra
WHERE ra.request_id = @requestId;

-- 4. Check approval items
SELECT 'Approval Items:' as '---';
SELECT ai.id, ai.request_approval_id, ai.stock_issuance_item_id, ai.item_name, ai.decision_type
FROM approval_items ai
WHERE ai.request_approval_id IN (
  SELECT id FROM request_approvals WHERE request_id = @requestId
);

-- 5. Check counts
SELECT 'Summary:' as '---';
SELECT 
  (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = @requestId) as total_items,
  (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = @requestId AND (decision_type IS NULL OR decision_type = '')) as pending_items,
  (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = @requestId AND decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')) as approved_items,
  (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = @requestId AND decision_type = 'REJECT') as rejected_items,
  (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = @requestId AND decision_type = 'RETURN') as returned_items;
