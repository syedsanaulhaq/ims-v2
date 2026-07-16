-- =====================================================
-- FIX: Convert workflow roles to proper system roles
-- and remove custom duplicate roles
-- Run this on PRODUCTION after backing up the database
-- =====================================================

USE InventoryManagementDB;
GO

SET NOCOUNT ON;

PRINT '==================================================';
PRINT 'Fixing IMS system roles and cleaning custom roles';
PRINT '==================================================';
GO

-- =====================================================
-- 1. ENSURE REQUIRED PERMISSIONS EXIST
-- =====================================================
PRINT '';
PRINT 'Step 1: Ensuring required permissions exist...';

INSERT INTO ims_permissions (permission_key, module_name, action_name, description, is_active)
SELECT permission_key, module_name, action_name, description, 1
FROM (VALUES
    ('inventory.view',           'Inventory', 'View',           'View inventory (generic)'),
    ('inventory.manage',         'Inventory', 'Manage',         'Manage inventory (generic)'),
    ('inventory.manage_store_keeper', 'Inventory', 'Manage Store', 'Manage store keeper operations'),
    ('issuance.request',         'Issuance',  'Request',        'Request item issuance'),
    ('issuance.process',         'Issuance',  'Process',        'Process issuance requests'),
    ('issuance.view',            'Issuance',  'View',           'View issuance records'),
    ('approval.approve',         'Approval',  'Approve',        'Approve requests'),
    ('approval.manage',          'Approval',  'Manage',         'Manage approval workflows'),
    ('reports.view',             'Reports',   'View',           'View reports'),
    ('procurement.view',         'Procurement','View',          'View procurement data'),
    ('procurement.manage',       'Procurement','Manage',        'Manage procurement processes')
) AS v(permission_key, module_name, action_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM ims_permissions p WHERE p.permission_key = v.permission_key
);

PRINT '✅ Required permissions ensured';
GO

-- =====================================================
-- 2. CONVERT EXISTING WORKFLOW ROLES TO SYSTEM ROLES
-- =====================================================
PRINT '';
PRINT 'Step 2: Converting existing workflow roles to system roles...';

UPDATE ims_roles
SET is_system_role = 1,
    description = CASE
        WHEN role_name = 'AD Admin-I' THEN 'Workflow approval role - AD Admin-I'
        WHEN role_name = 'AD Admin-II' THEN 'Workflow approval role - AD Admin-II'
        WHEN role_name = 'DD Admin' THEN 'Workflow approval role - DD Admin'
        WHEN role_name = 'DG Admin' THEN 'Workflow approval role - DG Admin'
        WHEN role_name = 'Storekeeper' THEN 'Workflow approval role - Storekeeper'
        WHEN role_name = 'Transport Supervisor' THEN 'Workflow approval role - Transport Supervisor'
        WHEN role_name = 'WING_STORE_KEEPER' THEN 'Wing Store Keeper - manage wing store operations'
        ELSE description
    END
WHERE role_name IN (
    'AD Admin-I',
    'AD Admin-II',
    'DD Admin',
    'DG Admin',
    'Storekeeper',
    'Transport Supervisor',
    'WING_STORE_KEEPER'
);

PRINT CAST(@@ROWCOUNT AS NVARCHAR) + ' existing roles converted to system roles';
GO

-- =====================================================
-- 3. INSERT MISSING SYSTEM ROLES
-- =====================================================
PRINT '';
PRINT 'Step 3: Inserting missing system roles...';

INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active)
SELECT NEWID(), role_name, display_name, description, 1, 1
FROM (VALUES
    ('AD Admin-I',          'AD Admin-I',          'Workflow approval role - AD Admin-I'),
    ('AD Admin-II',         'AD Admin-II',         'Workflow approval role - AD Admin-II'),
    ('DD Admin',            'DD Admin',            'Workflow approval role - DD Admin'),
    ('DG Admin',            'DG Admin',            'Workflow approval role - DG Admin'),
    ('Storekeeper',         'Storekeeper',         'Workflow approval role - Storekeeper'),
    ('Transport Supervisor','Transport Supervisor','Workflow approval role - Transport Supervisor'),
    ('WING_STORE_KEEPER',   'Wing Store Keeper',   'Wing Store Keeper - manage wing store operations')
) AS v(role_name, display_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM ims_roles r WHERE r.role_name = v.role_name
);

PRINT CAST(@@ROWCOUNT AS NVARCHAR) + ' missing system roles inserted';
GO

-- =====================================================
-- 4. MERGE CUSTOM_WING_STORE_KEEPER INTO WING_STORE_KEEPER
-- =====================================================
PRINT '';
PRINT 'Step 4: Merging CUSTOM_WING_STORE_KEEPER into WING_STORE_KEEPER...';

DECLARE @SystemWingStoreKeeperId UNIQUEIDENTIFIER;
DECLARE @CustomWingStoreKeeperId UNIQUEIDENTIFIER;

SELECT @SystemWingStoreKeeperId = id FROM ims_roles WHERE role_name = 'WING_STORE_KEEPER' AND is_active = 1;
SELECT @CustomWingStoreKeeperId = id FROM ims_roles WHERE role_name = 'CUSTOM_WING_STORE_KEEPER' AND is_active = 1;

IF @SystemWingStoreKeeperId IS NULL
BEGIN
    SET @SystemWingStoreKeeperId = NEWID();
    INSERT INTO ims_roles (id, role_name, display_name, description, is_system_role, is_active)
    VALUES (@SystemWingStoreKeeperId, 'WING_STORE_KEEPER', 'Wing Store Keeper', 'Wing Store Keeper - manage wing store operations', 1, 1);
    PRINT '✅ Created WING_STORE_KEEPER system role';
END
ELSE
BEGIN
    PRINT '✅ WING_STORE_KEEPER system role already exists';
END

IF @CustomWingStoreKeeperId IS NOT NULL
BEGIN
    -- Move users from custom to system role (avoid duplicate scope assignments)
    UPDATE ur
    SET role_id = @SystemWingStoreKeeperId
    FROM ims_user_roles ur
    WHERE ur.role_id = @CustomWingStoreKeeperId
      AND NOT EXISTS (
          SELECT 1 FROM ims_user_roles existing
          WHERE existing.user_id = ur.user_id
            AND existing.role_id = @SystemWingStoreKeeperId
            AND existing.scope_type = ur.scope_type
            AND ISNULL(existing.scope_office_id, 0) = ISNULL(ur.scope_office_id, 0)
            AND ISNULL(existing.scope_wing_id, 0) = ISNULL(ur.scope_wing_id, 0)
            AND ISNULL(existing.scope_branch_id, 0) = ISNULL(ur.scope_branch_id, 0)
      );

    PRINT CAST(@@ROWCOUNT AS NVARCHAR) + ' user assignments migrated from CUSTOM_WING_STORE_KEEPER to WING_STORE_KEEPER';

    -- Delete any remaining duplicate custom assignments
    DELETE FROM ims_user_roles WHERE role_id = @CustomWingStoreKeeperId;

    -- Delete custom role permissions (cascade will handle FK)
    DELETE FROM ims_role_permissions WHERE role_id = @CustomWingStoreKeeperId;

    -- Delete the custom role
    DELETE FROM ims_roles WHERE id = @CustomWingStoreKeeperId;

    PRINT '✅ CUSTOM_WING_STORE_KEEPER role removed';
END
ELSE
BEGIN
    PRINT '✅ CUSTOM_WING_STORE_KEEPER role did not exist';
END
GO

-- =====================================================
-- 5. ASSIGN PERMISSIONS TO WORKFLOW ROLES
-- =====================================================
PRINT '';
PRINT 'Step 5: Assigning permissions to workflow roles...';

-- Helper: clear previous workflow role permissions to avoid stale grants
DELETE FROM ims_role_permissions
WHERE role_id IN (
    SELECT id FROM ims_roles
    WHERE role_name IN ('AD Admin-I','AD Admin-II','DD Admin','DG Admin','Storekeeper','Transport Supervisor','WING_STORE_KEEPER')
);

-- Admin chain approval roles: DD Admin, AD Admin-I, AD Admin-II, DG Admin
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name IN ('DD Admin', 'AD Admin-I', 'AD Admin-II', 'DG Admin')
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view',
      'issuance.process',
      'approval.approve',
      'reports.view'
  );

-- Storekeeper
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'Storekeeper'
  AND p.permission_key IN (
      'inventory.view',
      'inventory.manage_store_keeper',
      'issuance.view',
      'issuance.process',
      'reports.view'
  );

-- Wing Store Keeper
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'WING_STORE_KEEPER'
  AND p.permission_key IN (
      'inventory.view',
      'inventory.manage_store_keeper',
      'issuance.view',
      'issuance.process',
      'reports.view'
  );

-- Transport Supervisor
INSERT INTO ims_role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 'SYSTEM_RESEED'
FROM ims_roles r
CROSS JOIN ims_permissions p
WHERE r.role_name = 'Transport Supervisor'
  AND p.permission_key IN (
      'inventory.view',
      'issuance.view',
      'issuance.process',
      'approval.approve',
      'reports.view'
  );

PRINT '✅ Permissions assigned to workflow roles';
GO

-- =====================================================
-- 6. CLEANUP ANY OTHER UNWANTED CUSTOM ROLES
-- =====================================================
-- Uncomment and edit the block below if you have additional custom roles to remove.
-- Make sure to migrate users first if the role has assignments.
/*
DECLARE @UnwantedRoleId UNIQUEIDENTIFIER;
SELECT @UnwantedRoleId = id FROM ims_roles WHERE role_name = 'ROLE_NAME_HERE' AND is_system_role = 0;

IF @UnwantedRoleId IS NOT NULL
BEGIN
    DELETE FROM ims_user_roles WHERE role_id = @UnwantedRoleId;
    DELETE FROM ims_role_permissions WHERE role_id = @UnwantedRoleId;
    DELETE FROM ims_roles WHERE id = @UnwantedRoleId;
    PRINT 'Removed custom role: ROLE_NAME_HERE';
END
*/
GO

-- =====================================================
-- 7. VERIFICATION
-- =====================================================
PRINT '';
PRINT '==================================================';
PRINT 'Verification Summary';
PRINT '==================================================';

SELECT
    role_name,
    display_name,
    is_system_role,
    is_active,
    (SELECT COUNT(*) FROM ims_user_roles ur WHERE ur.role_id = r.id AND ur.is_active = 1) AS active_users,
    (SELECT COUNT(*) FROM ims_role_permissions rp WHERE rp.role_id = r.id) AS permissions
FROM ims_roles r
WHERE r.role_name IN (
    'IMS_SUPER_ADMIN','IMS_ADMIN','WING_SUPERVISOR','BRANCH_SUPERVISOR',
    'BRANCH_STORE_KEEPER','GENERAL_USER','PROCUREMENT_OFFICER','AUDITOR',
    'AD Admin-I','AD Admin-II','DD Admin','DG Admin','Storekeeper',
    'Transport Supervisor','WING_STORE_KEEPER'
)
ORDER BY
    CASE WHEN is_system_role = 1 THEN 0 ELSE 1 END,
    role_name;
GO

PRINT '';
PRINT '✅ Role cleanup complete. Review the summary above before committing.';
PRINT '   If this was run inside a transaction, run COMMIT to apply changes.';
GO
