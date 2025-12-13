-- =============================================
-- CHECK: General User Role Permissions
-- =============================================

PRINT '================================================';
PRINT '🔍 CHECKING GENERAL USER ROLE PERMISSIONS';
PRINT '================================================';
PRINT '';

-- 1. Check if General User role exists
PRINT '1️⃣ CHECKING IF GENERAL USER ROLE EXISTS...';
SELECT 
    r.id as role_id,
    r.role_name,
    r.display_name,
    r.is_active,
    r.scope_type,
    r.created_at
FROM ims_roles r
WHERE r.role_name = 'General User';

PRINT '';

-- 2. Check permissions assigned to General User role
PRINT '2️⃣ CHECKING PERMISSIONS ASSIGNED TO GENERAL USER ROLE...';
DECLARE @GeneralUserRoleId UNIQUEIDENTIFIER;
SELECT @GeneralUserRoleId = id FROM ims_roles WHERE role_name = 'General User' AND is_active = 1;

IF @GeneralUserRoleId IS NOT NULL
BEGIN
    PRINT CONCAT('   General User Role ID: ', @GeneralUserRoleId);
    PRINT '';
    
    SELECT 
        rp.role_id,
        rp.permission_id,
        p.permission_key,
        p.module_name,
        p.action_name,
        p.description,
        p.is_active,
        CASE WHEN p.is_active = 1 THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END as status
    FROM ims_role_permissions rp
    INNER JOIN ims_permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = @GeneralUserRoleId
    ORDER BY p.module_name, p.action_name;
    
    PRINT '';
    DECLARE @PermCount INT = (SELECT COUNT(*) FROM ims_role_permissions WHERE role_id = @GeneralUserRoleId);
    PRINT CONCAT('   Total permissions for General User: ', @PermCount);
END
ELSE
BEGIN
    PRINT '   ❌ General User role not found or is inactive!';
END

PRINT '';
PRINT '3️⃣ CHECKING ALL AVAILABLE PERMISSIONS IN SYSTEM...';
SELECT 
    p.id,
    p.permission_key,
    p.module_name,
    p.action_name,
    p.description,
    p.is_active
FROM ims_permissions p
WHERE p.is_active = 1
ORDER BY p.module_name, p.action_name;

PRINT '';
PRINT '4️⃣ CHECKING A TEST USER WITH GENERAL USER ROLE...';
-- Find a user with General User role
SELECT TOP 1
    u.Id as user_id,
    u.FullName,
    u.UserName,
    ur.role_id,
    r.role_name,
    r.display_name,
    ur.scope_type,
    ur.is_active
FROM ims_user_roles ur
INNER JOIN AspNetUsers u ON ur.user_id = u.Id
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'General User'
  AND ur.is_active = 1
  AND r.is_active = 1;

PRINT '';
PRINT '5️⃣ CHECKING PERMISSIONS VIA VIEW FOR A GENERAL USER...';
-- If we found a user, check what permissions show in the view
DECLARE @TestUserId NVARCHAR(450);
SELECT TOP 1 @TestUserId = ur.user_id 
FROM ims_user_roles ur
INNER JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'General User' AND ur.is_active = 1 AND r.is_active = 1;

IF @TestUserId IS NOT NULL
BEGIN
    PRINT CONCAT('   Testing user: ', @TestUserId);
    PRINT '';
    
    SELECT 
        permission_key,
        module_name,
        action_name,
        description,
        role_name
    FROM vw_ims_user_permissions
    WHERE user_id = @TestUserId
    ORDER BY module_name, action_name;
    
    DECLARE @ViewPermCount INT = (SELECT COUNT(*) FROM vw_ims_user_permissions WHERE user_id = @TestUserId);
    PRINT '';
    PRINT CONCAT('   Permissions visible in view: ', @ViewPermCount);
END
ELSE
BEGIN
    PRINT '   No users found with General User role yet.';
END

PRINT '';
PRINT '================================================';
PRINT '✅ DIAGNOSIS COMPLETE';
PRINT '================================================';
