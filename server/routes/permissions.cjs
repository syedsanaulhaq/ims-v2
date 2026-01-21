// ============================================================================
// IMS Roles & Permissions Routes
// ============================================================================
// Role management, permission checking, and user role assignment

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// ============================================================================
// Middleware: Authentication and Permission Checking
// ============================================================================
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Check if user has permission in session
      const hasPermission = req.session.user?.ims_permissions?.some(p => p.permission_key === permission);
      if (hasPermission) {
        return next();
      }
      // Fallback to database check
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .input('permissionKey', sql.NVarChar(100), permission)
        .query('SELECT dbo.fn_HasPermission(@userId, @permissionKey) as hasPermission');
      const rawValue = result.recordset[0]?.hasPermission;
      if (rawValue === 1 || rawValue === true) {
        return next();
      }
      res.status(403).json({ error: 'Insufficient permissions', required: permission });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// ============================================================================
// GET /api/permissions/check - Check if user has specific permission
// ============================================================================
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { permission } = req.query;
    const pool = getPool();

    if (!permission) {
      return res.status(400).json({ error: 'Permission key is required' });
    }

    console.log('🔐 Permission check for:', permission, 'userId:', req.session.userId);

    const result = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .input('permissionKey', sql.NVarChar(100), permission)
      .query('SELECT dbo.fn_HasPermission(@userId, @permissionKey) as hasPermission');

    const rawValue = result.recordset[0]?.hasPermission;
    const hasPermission = rawValue === 1 || rawValue === true;

    res.json({ 
      hasPermission: hasPermission,
      permission: permission
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
});

// ============================================================================
// GET /api/permissions/my-roles - Get current user's IMS roles
// ============================================================================
router.get('/my-roles', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    // If already in session, return quickly
    if (req.session.user?.ims_roles && req.session.user?.ims_permissions) {
      return res.json({
        roles: req.session.user.ims_roles,
        permissions: req.session.user.ims_permissions,
        is_super_admin: req.session.user.is_super_admin || false
      });
    }

    // Fetch from database
    const rolesResult = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .query(`
        SELECT 
          r.id as role_id,
          r.role_name,
          r.display_name,
          r.description,
          ur.scope_type,
          ur.scope_wing_id
        FROM ims_user_roles ur
        INNER JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = @userId AND ur.is_active = 1
        ORDER BY r.display_name
      `);

    const permsResult = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .query(`
        SELECT DISTINCT
          p.id as permission_id,
          p.permission_key,
          p.module_name,
          p.action_name,
          p.description
        FROM ims_user_roles ur
        INNER JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = @userId AND ur.is_active = 1
        ORDER BY p.module_name, p.action_name
      `);

    const isSuperAdmin = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .query(`SELECT dbo.fn_IsSuperAdmin(@userId) as is_super_admin`);

    const superAdminValue = isSuperAdmin.recordset[0]?.is_super_admin;
    const is_super_admin = superAdminValue === 1 || superAdminValue === true;

    res.json({
      roles: rolesResult.recordset,
      permissions: permsResult.recordset,
      is_super_admin: is_super_admin
    });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});

// ============================================================================
// GET /api/permissions/roles - Get all available IMS roles
// ============================================================================
router.get('/roles', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    console.log('📋 Fetching IMS roles...');

    const result = await pool.request().query(`
      SELECT 
        id as role_id,
        role_name,
        display_name,
        description,
        is_system_role,
        created_at,
        (SELECT COUNT(*) FROM ims_user_roles WHERE role_id = r.id) as user_count,
        (SELECT COUNT(*) FROM ims_role_permissions WHERE role_id = r.id) as permission_count
      FROM ims_roles r
      ORDER BY 
        CASE 
          WHEN role_name = 'IMS_SUPER_ADMIN' THEN 1
          WHEN role_name = 'IMS_ADMIN' THEN 2
          WHEN role_name = 'WING_SUPERVISOR' THEN 3
          WHEN role_name = 'GENERAL_USER' THEN 4
          ELSE 5
        END,
        display_name
    `);

    console.log(`✅ Found ${result.recordset.length} roles`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});

// ============================================================================
// POST /api/permissions/roles - Create new custom role
// ============================================================================
router.post('/roles', requireAuth, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { display_name, description, permission_keys } = req.body;
    const pool = getPool();

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Generate role name from display name
    const role_name = 'CUSTOM_' + display_name.toUpperCase().replace(/\s+/g, '_');

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Check if role name already exists
      const existing = await transaction.request()
        .input('roleName', sql.NVarChar(100), role_name)
        .query('SELECT id FROM dbo.ims_roles WHERE role_name = @roleName');

      if (existing.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'A role with this name already exists' });
      }

      // Insert new role
      const insertResult = await transaction.request()
        .input('roleName', sql.NVarChar(100), role_name)
        .input('displayName', sql.NVarChar(255), display_name)
        .input('description', sql.NVarChar(500), description || null)
        .input('isSystemRole', sql.Bit, 0)
        .query(`
          INSERT INTO dbo.ims_roles (id, role_name, display_name, description, is_system_role, created_at)
          VALUES (NEWID(), @roleName, @displayName, @description, @isSystemRole, GETDATE());
          SELECT id FROM dbo.ims_roles WHERE role_name = @roleName
        `);

      const roleId = insertResult.recordset[0]?.id;
      if (!roleId) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Failed to retrieve created role ID' });
      }

      // Add permissions if provided
      if (permission_keys && Array.isArray(permission_keys) && permission_keys.length > 0) {
        for (const permKey of permission_keys) {
          await transaction.request()
            .input('roleId', sql.UniqueIdentifier, roleId)
            .input('permKey', sql.NVarChar(100), permKey)
            .query(`
              INSERT INTO dbo.ims_role_permissions (role_id, permission_id)
              SELECT @roleId, id
              FROM dbo.ims_permissions
              WHERE permission_key = @permKey
            `);
        }
      }

      await transaction.commit();
      res.json({
        success: true,
        message: 'Role created successfully',
        role_id: roleId,
        role_name: role_name,
        display_name: display_name
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating role:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create role' });
  }
});

// ============================================================================
// GET /api/permissions/roles/:roleId - Get role details with permissions
// ============================================================================
router.get('/roles/:roleId', requireAuth, async (req, res) => {
  try {
    const { roleId } = req.params;
    const pool = getPool();

    // Get role details
    const roleResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          id as role_id,
          role_name,
          display_name,
          description,
          is_system_role,
          created_at,
          (SELECT COUNT(*) FROM ims_user_roles WHERE role_id = @roleId) as user_count
        FROM ims_roles
        WHERE id = @roleId
      `);

    if (roleResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get role permissions
    const permsResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          p.id as permission_id,
          p.permission_key,
          p.module_name,
          p.action_name,
          p.description
        FROM ims_role_permissions rp
        INNER JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = @roleId
        ORDER BY p.module_name, p.action_name
      `);

    // Get users with this role
    const usersResult = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query(`
        SELECT 
          u.Id as user_id,
          u.FullName as full_name,
          u.Email,
          u.CNIC,
          ur.scope_type,
          ur.assigned_at,
          ur.assigned_by,
          assignedBy.FullName as assigned_by_name
        FROM ims_user_roles ur
        INNER JOIN AspNetUsers u ON ur.user_id = u.Id
        LEFT JOIN AspNetUsers assignedBy ON ur.assigned_by = assignedBy.Id
        WHERE ur.role_id = @roleId AND ur.is_active = 1
        ORDER BY u.FullName
      `);

    res.json({
      ...roleResult.recordset[0],
      permissions: permsResult.recordset,
      users: usersResult.recordset
    });
  } catch (error) {
    console.error('Error getting role details:', error);
    res.status(500).json({ error: 'Failed to retrieve role details' });
  }
});

// ============================================================================
// PUT /api/permissions/roles/:roleId/permissions - Update role permissions
// ============================================================================
router.put('/roles/:roleId/permissions', requireAuth, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_keys } = req.body;
    const pool = getPool();

    if (!permission_keys || !Array.isArray(permission_keys)) {
      return res.status(400).json({ error: 'permission_keys array is required' });
    }

    // Check if role is protected
    const roleCheck = await pool.request()
      .input('roleId', sql.UniqueIdentifier, roleId)
      .query('SELECT role_name FROM ims_roles WHERE id = @roleId');

    if (roleCheck.recordset[0]?.role_name === 'IMS_SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify IMS_SUPER_ADMIN role permissions' });
    }

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Delete existing permissions
      await transaction.request()
        .input('roleId', sql.UniqueIdentifier, roleId)
        .query('DELETE FROM ims_role_permissions WHERE role_id = @roleId');

      // Insert new permissions
      for (const permKey of permission_keys) {
        await transaction.request()
          .input('roleId', sql.UniqueIdentifier, roleId)
          .input('permKey', sql.NVarChar(100), permKey)
          .query(`
            INSERT INTO ims_role_permissions (role_id, permission_id)
            SELECT @roleId, id
            FROM ims_permissions
            WHERE permission_key = @permKey
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// ============================================================================
// GET /api/permissions/all - Get all available permissions
// ============================================================================
router.get('/all', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        id as permission_id,
        permission_key,
        module_name,
        action_name,
        description,
        created_at
      FROM ims_permissions
      ORDER BY module_name, action_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ error: 'Failed to retrieve permissions' });
  }
});

// ============================================================================
// GET /api/permissions/users - Get all users with roles
// ============================================================================
router.get('/users', requireAuth, async (req, res) => {
  try {
    const { search, office_id, wing_id, role_name } = req.query;
    const pool = getPool();

    let query = `
      SELECT DISTINCT
        u.Id as user_id,
        u.FullName as full_name,
        u.Email,
        u.CNIC as cnic,
        u.intOfficeID as office_id,
        u.intWingID as wing_id,
        u.intDesignationID as designation_id,
        o.strOfficeName as office_name,
        w.Name as wing_name,
        COALESCE(d.strDesignation, 'Not Assigned') as designation_name,
        dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
      FROM AspNetUsers u
      LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN WingsInformation w ON u.intWingID = w.Id
      LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
      WHERE u.ISACT = 1
    `;

    let request = pool.request();

    if (search) {
      query += ` AND (u.FullName LIKE @search OR u.Email LIKE @search OR u.CNIC LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (wing_id) {
      query += ` AND u.intWingID = @wingId AND u.intWingID > 0`;
      request = request.input('wingId', sql.Int, parseInt(wing_id));
    } else {
      query += ` AND (u.intWingID > 0 OR u.intWingID IS NULL)`;
    }

    if (role_name) {
      query += ` AND EXISTS (
        SELECT 1 FROM ims_user_roles ur
        INNER JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.Id AND r.role_name = @roleName AND ur.is_active = 1
      )`;
      request = request.input('roleName', sql.NVarChar, role_name);
    }

    query += ` ORDER BY u.FullName`;

    const result = await request.query(query);

    // Fetch roles for each user
    const users = await Promise.all(
      result.recordset.map(async (user) => {
        const rolesResult = await pool.request()
          .input('userId', sql.NVarChar(450), user.user_id)
          .query(`
            SELECT 
              ur.id as user_role_id,
              r.role_name,
              r.display_name,
              ur.scope_type,
              ur.scope_wing_id
            FROM ims_user_roles ur
            INNER JOIN ims_roles r ON ur.role_id = r.id
            WHERE ur.user_id = @userId AND ur.is_active = 1
          `);
        return {
          ...user,
          roles: rolesResult.recordset
        };
      })
    );

    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// ============================================================================
// POST /api/permissions/users/:userId/roles - Assign role to user
// ============================================================================
router.post('/users/:userId/roles', requireAuth, requirePermission('users.manage'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id, scope_type, scope_wing_id, notes } = req.body;
    const pool = getPool();

    if (!role_id) {
      return res.status(400).json({ error: 'Role ID is required' });
    }

    // Check if user exists
    const userCheck = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query('SELECT Id FROM AspNetUsers WHERE Id = @userId AND ISACT = 1');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role exists
    const roleCheck = await pool.request()
      .input('roleId', sql.UniqueIdentifier, role_id)
      .query('SELECT id, role_name FROM ims_roles WHERE id = @roleId');

    if (roleCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user already has this role with same scope
    const existingCheck = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, role_id)
      .input('scopeType', sql.NVarChar(50), scope_type || 'Global')
      .input('scopeWingId', sql.Int, scope_wing_id || null)
      .query(`
        SELECT id FROM ims_user_roles
        WHERE user_id = @userId 
        AND role_id = @roleId
        AND scope_type = @scopeType
        AND (scope_wing_id = @scopeWingId OR (scope_wing_id IS NULL AND @scopeWingId IS NULL))
      `);

    if (existingCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'User already has this role with the same scope' });
    }

    // Assign role
    await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('roleId', sql.UniqueIdentifier, role_id)
      .input('scopeType', sql.NVarChar(50), scope_type || 'Global')
      .input('scopeWingId', sql.Int, scope_wing_id || null)
      .input('assignedBy', sql.NVarChar(450), req.session.userId)
      .input('notes', sql.NVarChar(sql.MAX), notes || null)
      .query(`
        INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_wing_id, assigned_by, notes)
        VALUES (@userId, @roleId, @scopeType, @scopeWingId, @assignedBy, @notes)
      `);

    res.json({ success: true, message: 'Role assigned successfully' });
  } catch (error) {
    console.error('❌ Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role', details: error.message });
  }
});

console.log('✅ Permissions Routes Loaded');

module.exports = router;
