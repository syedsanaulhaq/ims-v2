-- Debug: Check CUSTOM_WING_STORE_KEEPER role permissions

PRINT '========================================='
PRINT 'DEBUG: CUSTOM_WING_STORE_KEEPER Permissions'
PRINT '========================================='

-- Find the role ID
DECLARE @roleId UNIQUEIDENTIFIER
SELECT @roleId = id FROM ims_roles WHERE role_name = 'CUSTOM_WING_STORE_KEEPER'

IF @roleId IS NULL
BEGIN
  PRINT '❌ Role CUSTOM_WING_STORE_KEEPER not found'
  PRINT ''
  PRINT 'Available roles:'
  SELECT role_name FROM ims_roles WHERE is_active = 1
  RETURN
END

PRINT '✅ Found role: CUSTOM_WING_STORE_KEEPER'
PRINT ''

-- Check what permissions are assigned to this role
PRINT '📋 Permissions currently assigned to CUSTOM_WING_STORE_KEEPER:'
SELECT 
  p.permission_key,
  p.module_name,
  p.action_name
FROM ims_role_permissions rp
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE rp.role_id = @roleId
ORDER BY p.permission_key

-- Check if inventory.manage_store_keeper permission exists
PRINT ''
PRINT '🔍 Checking for inventory.manage_store_keeper permission:'
SELECT 
  id as permission_id,
  permission_key,
  is_active
FROM ims_permissions
WHERE permission_key = 'inventory.manage_store_keeper'

-- Check user 3740506012171
PRINT ''
PRINT '👤 User 3740506012171 permissions from vw_ims_user_permissions:'
SELECT DISTINCT permission_key FROM vw_ims_user_permissions
WHERE user_id = '3740506012171'
ORDER BY permission_key
