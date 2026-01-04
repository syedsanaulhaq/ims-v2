-- Add Store Keeper permission to the database
-- This permission will be assigned to users with WING_STORE_KEEPER role

-- Check if permission already exists
IF NOT EXISTS (SELECT 1 FROM ims_permissions WHERE permission_key = 'inventory.manage_store_keeper')
BEGIN
  INSERT INTO ims_permissions (permission_key, module_name, action_name)
  VALUES ('inventory.manage_store_keeper', 'Inventory', 'Manage Store')
END

PRINT '✅ Store Keeper permission setup complete'

-- Assign permission to WING_STORE_KEEPER role
-- First, find the role ID for WING_STORE_KEEPER
DECLARE @storeKeeperRoleId NVARCHAR(MAX)
SELECT TOP 1 @storeKeeperRoleId = role_id 
FROM ims_roles 
WHERE role_name = 'WING_STORE_KEEPER'

IF @storeKeeperRoleId IS NOT NULL
BEGIN
  -- Get the permission ID
  DECLARE @permissionId NVARCHAR(MAX)
  SELECT TOP 1 @permissionId = permission_id 
  FROM ims_permissions 
  WHERE permission_key = 'inventory.manage_store_keeper'

  IF @permissionId IS NOT NULL
  BEGIN
    -- Check if this permission is already assigned to the role
    IF NOT EXISTS (
      SELECT 1 FROM ims_role_permissions 
      WHERE role_id = @storeKeeperRoleId AND permission_id = @permissionId
    )
    BEGIN
      INSERT INTO ims_role_permissions (role_id, permission_id)
      VALUES (@storeKeeperRoleId, @permissionId)
      PRINT '✅ Permission assigned to WING_STORE_KEEPER role'
    END
    ELSE
    BEGIN
      PRINT '⚠️ Permission already assigned to WING_STORE_KEEPER role'
    END
  END
END
ELSE
BEGIN
  PRINT '⚠️ WING_STORE_KEEPER role not found in database'
END
