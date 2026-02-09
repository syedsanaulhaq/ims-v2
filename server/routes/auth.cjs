// ============================================================================
// Authentication Routes
// ============================================================================
// All authentication and user management endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const aspnetHasher = require('../utils/aspnetPasswordHasher.cjs');

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
          permission_key,
          module_name,
          action_name
        FROM vw_ims_user_permissions
        WHERE user_id = @userId
      `);
    
    // Check if super admin by role
    const adminCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT COUNT(*) as is_admin
        FROM ims_user_roles iur
        JOIN ims_roles ir ON iur.role_id = ir.id
        WHERE iur.user_id = @userId 
          AND ir.role_name = 'IMS_SUPER_ADMIN'
          AND iur.is_active = 1
      `);
    
    return {
      roles: rolesResult.recordset || [],
      permissions: permsResult.recordset || [],
      is_super_admin: adminCheck.recordset?.length > 0 ? adminCheck.recordset[0].is_admin > 0 : false
    };
  } catch (error) {
    console.error('Error fetching user IMS data:', error);
    return { roles: [], permissions: [], is_super_admin: false };
  }
}

// ============================================================================
// Map DS Role to IMS Sub-Roles
// ============================================================================
// Converts Digital System roles to IMS-specific roles
function mapDSRoleToImsRoles(dsRole) {
  const roleMap = {
    'Administrator': ['IMS_SUPER_ADMIN'],
    'Admin': ['IMS_ADMIN'],
    'Supervisor': ['WING_SUPERVISOR'],
    'StoreKeeper': ['WING_STORE_KEEPER', 'CUSTOM_WING_STORE_KEEPER'],
    'Store Keeper': ['WING_STORE_KEEPER'],
    'Wing Store Keeper': ['WING_STORE_KEEPER'],
    'Procurement': ['PROCUREMENT_OFFICER'],
    'Auditor': ['AUDITOR'],
    'User': ['GENERAL_USER']
  };
  
  // Check for exact match first
  if (roleMap[dsRole]) {
    return roleMap[dsRole];
  }
  
  // Check for case-insensitive match
  const lowerRole = dsRole?.toLowerCase() || '';
  for (const [key, value] of Object.entries(roleMap)) {
    if (key.toLowerCase() === lowerRole) {
      return value;
    }
  }
  
  // Default to GENERAL_USER
  console.log(`⚠️  No DS→IMS role mapping found for "${dsRole}", defaulting to GENERAL_USER`);
  return ['GENERAL_USER'];
}

async function assignDefaultPermissionsToSSOUser(userId, dsRole) {
  try {
    const pool = getPool();
    
    // Check if user already has any IMS roles assigned
    const roleCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT id FROM ims_user_roles WHERE user_id = @userId AND is_active = 1');
    
    if (roleCheck.recordset.length === 0) {
      // Map DS role to IMS role(s)
      const imsRoleNames = mapDSRoleToImsRoles(dsRole);
      
      console.log(`🔄 Mapping DS Role "${dsRole}" → IMS Roles: ${imsRoleNames.join(', ')}`);
      
      // Get IMS role IDs
      for (const roleName of imsRoleNames) {
        try {
          const roleResult = await pool.request()
            .query(`SELECT id FROM ims_roles WHERE role_name = '${roleName}' AND is_active = 1`);
          
          if (roleResult.recordset.length > 0) {
            const roleId = roleResult.recordset[0].id;
            
            // Assign IMS role to user
            await pool.request()
              .input('userId', sql.NVarChar, userId)
              .input('roleId', sql.UniqueIdentifier, roleId)
              .query(`
                INSERT INTO ims_user_roles (id, user_id, role_id, scope_type, is_active, assigned_at)
                VALUES (NEWID(), @userId, @roleId, 'GLOBAL', 1, GETDATE())
              `);
            
            console.log(`✅ Assigned IMS role "${roleName}" to user: ${userId}`);
          }
        } catch (error) {
          console.error(`Error assigning IMS role "${roleName}":`, error);
        }
      }
    } else {
      console.log(`ℹ️  User ${userId} already has ${roleCheck.recordset.length} active IMS role(s), skipping auto-assignment`);
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

    // Strategy 1: Check ASP.NET Identity hash (prefer hash over plain text)
    if (user.PasswordHash && (user.PasswordHash.startsWith('AQA') || user.PasswordHash.length > 60)) {
      try {
        isPasswordValid = aspnetHasher.verifyPassword(password, user.PasswordHash);
      } catch (error) {
        console.error('ASP.NET hash comparison error:', error.message);
      }
    }

    // Strategy 2: Try bcrypt
    if (!isPasswordValid && user.PasswordHash && user.PasswordHash.startsWith('$2')) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
      } catch (error) {
        console.error('Bcrypt comparison error:', error.message);
      }
    }

    // Strategy 3: Plain text in PasswordHash
    if (!isPasswordValid && user.PasswordHash === password) {
      isPasswordValid = true;
    }

    // Strategy 4: Plain text Password field (legacy fallback)
    if (!isPasswordValid && user.Password && user.Password === password) {
      console.log('✅ Password matched in plain text');
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

// ============================================================================
// POST /api/auth/ds-authenticate - Digital System SSO Authentication
// ============================================================================
// This endpoint is called by the .NET Digital System application for SSO
router.post('/ds-authenticate', async (req, res) => {
  console.log('🔐 DS Authentication Request Received');
  
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Ensure Content-Type is application/json'
      });
    }

    const { UserName, Password } = req.body;
    const pool = getPool();

    if (!UserName || !Password) {
      console.log('❌ Missing UserName or Password');
      return res.status(400).json({
        success: false,
        message: 'Missing username or password'
      });
    }

    console.log(`🔍 Authenticating user: ${UserName}`);

    // Query user from AspNetUsers
    const userResult = await pool.request()
      .input('username', sql.NVarChar, UserName)
      .query(`
        SELECT 
          Id, FullName, CNIC, UserName, Email, PhoneNumber,
          Password, PasswordHash,
          intOfficeID, intWingID, intProvinceID, intDivisionID,
          intDistrictID, intBranchID, intDesignationID,
          Role, UID, ISACT, Gender, ProfilePhoto, LastLoggedIn
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);

    if (userResult.recordset.length === 0) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = userResult.recordset[0];
    console.log(`✅ User found: ${user.FullName} (${user.UserName})`);

    // Password verification with multiple strategies
    let isPasswordValid = false;
    const passwordToCheck = user.PasswordHash || user.Password;

    if (!passwordToCheck) {
      console.log('❌ No password hash found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Strategy 1: Check plain text Password field
    if (user.Password && user.Password === Password) {
      console.log('✅ Password matched (plain text)');
      isPasswordValid = true;
    }

    // Strategy 2: ASP.NET Identity hash
    if (!isPasswordValid && (passwordToCheck.startsWith('AQA') || passwordToCheck.length > 60)) {
      try {
        console.log('🔍 Attempting ASP.NET Identity verification...');
        console.log(`   Hash length: ${passwordToCheck.length}`);
        console.log(`   Hash full value: ${passwordToCheck}`);
        console.log(`   Password: ${Password}`);
        console.log(`   Password length: ${Password.length}`);
        console.log(`   Calling custom hasher...'`);
        
        // Try custom ASP.NET Identity V3 hasher (supports both UTF-8 and UTF-16LE)
        isPasswordValid = aspnetHasher.verifyPassword(Password, passwordToCheck);
        console.log(`   Custom hasher result: ${isPasswordValid ? '✅ Password matched!' : '❌ Password did not match'}`);
        
        // If library fails, try alternative: check if Password field matches
        if (!isPasswordValid && user.Password) {
          if (user.Password === Password) {
            console.log(`   ✅ Plain Password field matched!`);
            isPasswordValid = true;
          }
        }
      } catch (err) {
        console.error(`❌ ASP.NET verification error: ${err.message}`);
        console.error(`   Error stack: ${err.stack}`);
      }
    }

    // Strategy 3: Bcrypt hash
    if (!isPasswordValid && passwordToCheck.startsWith('$2')) {
      try {
        isPasswordValid = await bcrypt.compare(Password, passwordToCheck);
        console.log(`Bcrypt verification: ${isPasswordValid ? '✅' : '❌'}`);
      } catch (err) {
        console.log(`⚠️ Bcrypt error: ${err.message}`);
      }
    }

    // Strategy 4: Plain text in PasswordHash
    if (!isPasswordValid && passwordToCheck === Password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      console.log('❌ Invalid password - verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    console.log('✅ Password verified successfully');

    // Update last login
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query('UPDATE AspNetUsers SET LastLoggedIn = @lastLogin WHERE Id = @userId');

    // Generate JWT token (legacy: secret only, no issuer/audience validation)
    const config = require('../config/env.cjs');
    const token = jwt.sign(
      {
        sub: user.Id,
        unique_name: user.UserName,
        email: user.Email,
        full_name: user.FullName,
        cnic: user.CNIC,
        office_id: user.intOfficeID,
        wing_id: user.intWingID,
        province_id: user.intProvinceID,
        division_id: user.intDivisionID,
        district_id: user.intDistrictID,
        branch_id: user.intBranchID,
        designation_id: user.intDesignationID,
        role: user.Role,
        uid: user.UID,
        is_active: user.ISACT,
        gender: user.Gender
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Token generated (legacy JWT)');

    // Return token (Capital 'T' matches .NET TokenResponse class)
    res.status(200).json({
      Token: token,
      success: true,
      message: 'Authentication successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ DS Authentication Error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   Error name:', error.name);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// GET /sso-login - SSO Login Handler (receives token from Digital System)
// ============================================================================
// This endpoint receives the JWT token from DS and creates an IMS session
router.get('/sso-login', async (req, res) => {
  try {
    const { token } = req.query;
    console.log('🔐 SSO Login attempt received');
    const pool = getPool();
    const config = require('../config/env.cjs');

    if (!token) {
      console.error('❌ SSO Login failed: No token provided');
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('✅ JWT token verified successfully');
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract user info from token
    const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
      || decoded.sub
      || decoded.userId
      || decoded.uid;
    const userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      || decoded.full_name
      || decoded.name
      || decoded.unique_name
      || decoded.user_name;
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      || decoded.email;
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || decoded.role
      || 'User';

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Verify user in database (allow token-only if not found)
    let dbUser = null;
    try {
      const result = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT Id, FullName, Email, Role, ISACT FROM AspNetUsers WHERE Id = @userId');

      if (result.recordset.length > 0) {
        dbUser = result.recordset[0];
        if (!dbUser.ISACT) {
          console.error('❌ User account is inactive');
          return res.status(403).json({ error: 'Account inactive' });
        }
      } else if (userName) {
        const byNameResult = await pool.request()
          .input('username', sql.NVarChar, userName)
          .query('SELECT Id, FullName, Email, Role, ISACT FROM AspNetUsers WHERE UserName = @username');
        if (byNameResult.recordset.length > 0) {
          dbUser = byNameResult.recordset[0];
          if (!dbUser.ISACT) {
            console.error('❌ User account is inactive');
            return res.status(403).json({ error: 'Account inactive' });
          }
        }
      }
    } catch (dbError) {
      console.error('⚠️ Database verification error:', dbError.message);
    }
    
    // Create session
    req.session.userId = dbUser?.Id || userId;
    req.session.authenticated = true;
    req.session.user = {
      Id: dbUser?.Id || userId,
      FullName: dbUser?.FullName || userName || 'Unknown',
      UserName: userName || decoded.unique_name || decoded.user_name || 'Unknown',
      Email: dbUser?.Email || email || '',
      Role: dbUser?.Role || role,
      intOfficeID: decoded.office_id || null,
      intWingID: decoded.wing_id || null,
      intBranchID: decoded.branch_id || null,
      intDesignationID: decoded.designation_id || null
    };

    // Assign default permissions if needed (map DS role to IMS roles)
    const dsRole = dbUser?.Role || role || 'User';
    console.log(`🔐 SSO User DS Role: "${dsRole}"`);
    await assignDefaultPermissionsToSSOUser(userId, dsRole);
    
    // Get IMS roles and permissions
    const imsData = await getUserImsData(userId);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }

    console.log('✅ SSO Session created for:', req.session.user.FullName);

    // Redirect to IMS dashboard (legacy behavior)
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ SSO Login Error:', error);
    res.status(500).json({ error: 'SSO authentication failed', details: error.message });
  }
});

console.log('✅ Auth Routes Loaded');

module.exports = router;
