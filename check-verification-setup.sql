-- Check verification requests and user wing assignments
-- User: 3730207514595 (Asad ur Rehman)

PRINT '=== CHECKING USER WING SUPERVISOR ASSIGNMENT ===';
SELECT 
  ur.user_id,
  u.UserName,
  u.FullName,
  r.role_name,
  ur.scope_type,
  ur.scope_wing_id,
  w.wing_name
FROM ims_user_roles ur
LEFT JOIN AspNetUsers u ON ur.user_id = u.Id
LEFT JOIN ims_roles r ON ur.role_id = r.id
LEFT JOIN wings w ON ur.scope_wing_id = w.id
WHERE u.UserName = '3730207514595'
  OR ur.user_id = (SELECT Id FROM AspNetUsers WHERE UserName = '3730207514595')
ORDER BY r.role_name, ur.scope_wing_id;

PRINT '';
PRINT '=== ALL PENDING VERIFICATION REQUESTS ===';
SELECT 
  ivr.id,
  ivr.stock_issuance_id,
  ivr.item_master_id,
  ivr.item_nomenclature,
  ivr.requested_quantity,
  ivr.requested_by_name,
  ivr.wing_id,
  ivr.wing_name,
  ivr.verification_status,
  ivr.created_at
FROM inventory_verification_requests ivr
WHERE ivr.verification_status = 'pending'
ORDER BY ivr.created_at DESC;

PRINT '';
PRINT '=== CHECKING VIEW_PENDING_INVENTORY_VERIFICATIONS ===';
SELECT * FROM View_Pending_Inventory_Verifications;

PRINT '';
PRINT '=== CHECKING WINGS TABLE ===';
SELECT id, wing_name FROM wings ORDER BY id;

PRINT '';
PRINT '=== USER ID FOR 3730207514595 ===';
SELECT Id, UserName, FullName FROM AspNetUsers WHERE UserName = '3730207514595';
