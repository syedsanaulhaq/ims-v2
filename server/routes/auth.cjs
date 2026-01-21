// ============================================================================
// Authentication Routes
// ============================================================================
// All authentication and user management endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const aspnetIdentity = require('aspnet-identity-pw');

// Required helpers
async function getUserImsData(userId) {
  try {
    const pool = getPool();
    
    // Get IMS roles
    const rolesResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ir.id,
          ir.role_name,
          ir.display_name,
          ir.description
        FROM ims_user_roles iur
        JOIN ims_roles ir ON iur.role_id = ir.id
        WHERE iur.user_id = @userId AND iur.is_active = 1
      `);
    
    // Get IMS permissions
    const permsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT DISTINCT
          ip.id,
          ip.permission_name,
          ip.permission_key,
          ip.description
        FROM ims_user_permissions iup
        JOIN ims_permissions ip ON iup.permission_id = ip.id
        WHERE iup.user_id = @userId AND iup.is_active = 1
      `);
    
    // Check if super admin
    const adminCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT is_super_admin FROM ims_users WHERE user_id = @userId
      `);
    
    return {
      roles: rolesResult.recordset || [],
      permissions: permsResult.recordset || [],
      is_super_admin: adminCheck.recordset?.length > 0 ? adminCheck.recordset[0].is_super_admin : false
    };
  } catch (error) {
    console.error('Error fetching user IMS data:', error);
    return { roles: [], permissions: [], is_super_admin: false };
  }
}

async function assignDefaultPermissionsToSSOUser(userId) {
  try {
    const pool = getPool();
    
    // Check if user exists in ims_users
    const userCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT id FROM ims_users WHERE user_id = @userId');
    
    if (userCheck.recordset.length === 0) {
      // Create user record with default user role
      await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(`
          INSERT INTO ims_users (user_id, is_super_admin, created_at)
          VALUES (@userId, 0, GETDATE())
        `);
    }
  } catch (error) {
    console.error('Error assigning default permissions:', error);
  }
}

// ============================================================================
// POST /api/auth/login - Login with username and password
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = getPool();

    console.log(`\n📥 LOGIN REQUEST RECEIVED`);
    console.log(`   Username: ${username}`);

    if (!username || !password) {
      console.log(`❌ Missing credentials`);
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Query AspNetUsers table
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT 
          Id, FullName, UserName, Email, Role, intOfficeID, intWingID, 
          intBranchID, intDesignationID, Password, PasswordHash, ISACT
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);

    if (result.recordset.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    let isPasswordValid = false;

    // Strategy 1: Check plain text Password field
    if (user.Password && user.Password === password) {
      console.log('✅ Password matched in plain text');
      isPasswordValid = true;
    }

    // Strategy 2: Check ASP.NET Identity hash
    if (!isPasswordValid && user.PasswordHash) {
      try {
        if (user.PasswordHash.startsWith('AQA') || user.PasswordHash.length > 60) {
          isPasswordValid = aspnetIdentity.validatePassword(password, user.PasswordHash);
        }
      } catch (error) {
        console.error('ASP.NET hash comparison error:', error.message);
      }
    }

    // Strategy 3: Try bcrypt
    if (!isPasswordValid && user.PasswordHash && user.PasswordHash.startsWith('$2')) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
      } catch (error) {
        console.error('Bcrypt comparison error:', error.message);
      }
    }

    // Strategy 4: Plain text in PasswordHash
    if (!isPasswordValid && user.PasswordHash === password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      console.log(`❌ LOGIN FAILED - Invalid credentials`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ PASSWORD VALIDATION SUCCESSFUL`);

    // Store user in session
    req.session.userId = user.Id;
    req.session.user = {
      Id: user.Id,
      FullName: user.FullName,
      UserName: user.UserName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      intBranchID: user.intBranchID,
      intDesignationID: user.intDesignationID
    };

    // Get IMS roles and permissions
    const imsData = await getUserImsData(user.Id);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }

    // Update last login
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query(`UPDATE AspNetUsers SET LastLoggedIn = @lastLogin WHERE Id = @userId`);

    res.json({
      success: true,
      user: req.session.user,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/auth/logout - Destroy session
// ============================================================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// ============================================================================
// GET /api/auth/me - Get current authenticated user
// ============================================================================
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    success: true,
    user: req.session.user
  });
});

// ============================================================================
// GET /api/auth/session - Get full session data with IMS info
// ============================================================================
router.get('/session', async (req, res) => {
  try {
    const pool = getPool();

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('📊 /api/session request - Session found');

    // Get IMS data
    const imsData = await getUserImsData(req.session.userId);

    const primaryRole = imsData?.roles?.length > 0 
      ? (imsData.roles[0].display_name || imsData.roles[0].role_name || 'User')
      : 'User';

    // Get designation
    let designation = null;
    if (req.session.user?.intDesignationID) {
      try {
        const designationResult = await pool.request()
          .input('userId', sql.NVarChar, req.session.userId)
          .query('SELECT strDesignation FROM vw_User_with_designation WHERE Id = @userId');
        
        if (designationResult.recordset?.length > 0) {
          designation = designationResult.recordset[0].strDesignation;
        }
      } catch (error) {
        console.error('Error fetching designation:', error);
      }
    }

    const sessionUser = {
      user_id: req.session.userId,
      user_name: req.session.user?.FullName || req.session.user?.UserName || 'Unknown',
      email: req.session.user?.Email || '',
      role: primaryRole,
      designation: designation,
      office_id: req.session.user?.intOfficeID || 583,
      wing_id: req.session.user?.intWingID || 19,
      branch_id: req.session.user?.intBranchID || null,
      ims_roles: imsData?.roles || [],
      ims_permissions: imsData?.permissions || [],
      is_super_admin: imsData?.is_super_admin || false
    };

    res.json({
      success: true,
      session: sessionUser
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

console.log('✅ Auth Routes Loaded');

module.exports = router;
