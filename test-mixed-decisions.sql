-- Test: Create 1 request with 3 items marked with different decision types
-- This request should appear in Approved, Rejected, and Returned cards

DECLARE @requestId UNIQUEIDENTIFIER = NEWID();
DECLARE @approvalId UNIQUEIDENTIFIER = NEWID();
DECLARE @item1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @item2Id UNIQUEIDENTIFIER = NEWID();
DECLARE @item3Id UNIQUEIDENTIFIER = NEWID();

DECLARE @approverId NVARCHAR(450) = '869dd81b-a782-494d-b8c2-695369b5ebb6'; -- Syed Sana ul Haq Fazli
DECLARE @requesterId NVARCHAR(450) = 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p'; -- Test user

-- Get first 3 items
DECLARE @itemId1 UNIQUEIDENTIFIER;
DECLARE @itemId2 UNIQUEIDENTIFIER;
DECLARE @itemId3 UNIQUEIDENTIFIER;
DECLARE @itemName1 NVARCHAR(255);
DECLARE @itemName2 NVARCHAR(255);
DECLARE @itemName3 NVARCHAR(255);

SELECT TOP 1 @itemId1 = id, @itemName1 = nomenclature FROM item_masters ORDER BY nomenclature;
SELECT TOP 1 @itemId2 = id, @itemName2 = nomenclature FROM item_masters WHERE id != @itemId1 ORDER BY nomenclature;
SELECT TOP 1 @itemId3 = id, @itemName3 = nomenclature FROM item_masters WHERE id != @itemId1 AND id != @itemId2 ORDER BY nomenclature;

PRINT '📦 Items:';
PRINT '  1. ' + @itemName1;
PRINT '  2. ' + @itemName2;
PRINT '  3. ' + @itemName3;

-- 1. Create stock issuance request
INSERT INTO stock_issuance_requests 
(id, requester_user_id, request_type, justification, purpose, created_at, submitted_at)
VALUES 
(@requestId, @requesterId, 'stock_issuance', 
'Testing multi-decision approval', 
'Test request with 3 items - 1 approved, 1 rejected, 1 returned',
GETDATE(), GETDATE());

PRINT '📋 Created request: ' + CAST(@requestId AS NVARCHAR(36));

-- 2. Create stock issuance items with decision types
INSERT INTO stock_issuance_items 
(id, request_id, item_master_id, requested_quantity, approved_quantity, nomenclature, item_type, decision_type)
VALUES 
(@item1Id, @requestId, @itemId1, 10, 10, @itemName1, 'standard', 'APPROVE_FROM_STOCK'),
(@item2Id, @requestId, @itemId2, 10, 10, @itemName2, 'standard', 'REJECT'),
(@item3Id, @requestId, @itemId3, 10, 10, @itemName3, 'standard', 'RETURN');

PRINT '📦 Created 3 stock issuance items';

-- 3. Create approval record (overall status is 'returned' because one item is returned)
INSERT INTO request_approvals 
(id, request_id, request_type, submitted_by, current_approver_id, current_status, submitted_date, updated_date)
VALUES 
(@approvalId, @requestId, 'stock_issuance', @requesterId, @approverId, 'returned', GETDATE(), GETDATE());

PRINT '✅ Created approval: ' + CAST(@approvalId AS NVARCHAR(36));

-- 4. Create approval items (one for each decision)
INSERT INTO approval_items 
(id, request_approval_id, stock_issuance_item_id, item_name, decision_type)
VALUES 
(NEWID(), @approvalId, @item1Id, @itemName1, 'APPROVE_FROM_STOCK'),
(NEWID(), @approvalId, @item2Id, @itemName2, 'REJECT'),
(NEWID(), @approvalId, @item3Id, @itemName3, 'RETURN');

PRINT '📝 Created 3 approval items';

PRINT '';
PRINT '✅ Test data created successfully!';
PRINT '';
PRINT '📊 Summary:';
PRINT '   Request ID: ' + CAST(@requestId AS NVARCHAR(36));
PRINT '   Approval ID: ' + CAST(@approvalId AS NVARCHAR(36));
PRINT '   Approver: ' + @approverId;
PRINT '   Overall Status: returned (because item 3 is RETURN)';
PRINT '';
PRINT '🧪 Expected behavior:';
PRINT '   • Click "Approved" card → should show 1 request with 1 item (' + @itemName1 + ')';
PRINT '   • Click "Rejected" card → should show 1 request with 1 item (' + @itemName2 + ')';
PRINT '   • Click "Returned" card → should show 1 request with 1 item (' + @itemName3 + ')';
PRINT '   • Click "Pending" card → should show 0 requests (all items decided)';
