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

async function assignDefaultPermissionsToSSOUser(userId) {
  try {
    const pool = getPool();
    
    // Check if user already has any IMS roles assigned
    const roleCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT id FROM ims_user_roles WHERE user_id = @userId');
    
    if (roleCheck.recordset.length === 0) {
      // Get the GENERAL_USER role ID
      const roleResult = await pool.request()
        .query("SELECT id FROM ims_roles WHERE role_name = 'GENERAL_USER'");
      
      if (roleResult.recordset.length > 0) {
        const roleId = roleResult.recordset[0].id;
        
        // Assign GENERAL_USER role to the user
        await pool.request()
          .input('userId', sql.NVarChar, userId)
          .input('roleId', sql.UniqueIdentifier, roleId)
          .query(`
            INSERT INTO ims_user_roles (user_id, role_id, scope_type, is_active, assigned_at)
            VALUES (@userId, @roleId, 'GLOBAL', 1, GETDATE())
          `);
        
        console.log(`✅ Assigned GENERAL_USER role to user: ${userId}`);
      }
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

// ============================================================================
// POST /api/auth/ds-authenticate - Digital System SSO Authentication
// ============================================================================
// This endpoint is called by the .NET Digital System application for SSO
router.post('/ds-authenticate', async (req, res) => {
  console.log('🔐 DS Authentication Request Received');
  try {
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
        isPasswordValid = aspnetIdentity.validatePassword(Password, passwordToCheck);
        console.log(`ASP.NET Identity verification: ${isPasswordValid ? '✅' : '❌'}`);
      } catch (err) {
        console.log(`⚠️ ASP.NET verification error: ${err.message}`);
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

    // Generate JWT token
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
      {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
        expiresIn: '24h'
      }
    );

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

    console.log('✅ Token generated and session created');

    // Return token (Capital 'T' matches .NET TokenResponse class)
    res.status(200).json({
      Token: token,
      success: true,
      message: 'Authentication successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ DS Authentication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
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
      return res.status(400).send(`
        <html>
          <head><title>SSO Login Failed</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: #dc2626;">❌ Login Failed</h1>
            <p>No authentication token provided.</p>
            <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
          </body>
        </html>
      `);
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE
      });
      console.log('✅ JWT token verified successfully');
      console.log('👤 User from token:', decoded.full_name);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).send(`
        <html>
          <head><title>SSO Login Failed</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: #dc2626;">❌ Authentication Failed</h1>
            <p>Invalid or expired token.</p>
            <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
          </body>
        </html>
      `);
    }

    // Extract user info from token
    const userId = decoded.sub;
    
    // Verify user in database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT Id, FullName, Email, Role, ISACT FROM AspNetUsers WHERE Id = @userId');

    if (result.recordset.length === 0 || !result.recordset[0].ISACT) {
      console.error('❌ User not found or inactive');
      return res.status(403).send(`
        <html>
          <head><title>Account Inactive</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: #dc2626;">❌ Account Inactive</h1>
            <p>Your account has been deactivated.</p>
            <p>Please contact your administrator.</p>
          </body>
        </html>
      `);
    }

    const dbUser = result.recordset[0];
    
    // Create session
    req.session.userId = userId;
    req.session.user = {
      Id: dbUser.Id,
      FullName: dbUser.FullName,
      UserName: decoded.unique_name,
      Email: dbUser.Email,
      Role: dbUser.Role,
      intOfficeID: decoded.office_id,
      intWingID: decoded.wing_id,
      intBranchID: decoded.branch_id,
      intDesignationID: decoded.designation_id
    };

    // Assign default permissions if needed
    await assignDefaultPermissionsToSSOUser(userId);
    
    // Get IMS roles and permissions
    const imsData = await getUserImsData(userId);
    if (imsData) {
      req.session.user.ims_roles = imsData.roles;
      req.session.user.ims_permissions = imsData.permissions;
      req.session.user.is_super_admin = imsData.is_super_admin;
    }

    console.log('✅ SSO Session created for:', dbUser.FullName);

    // Redirect to IMS frontend
    res.redirect('/');
  } catch (error) {
    console.error('❌ SSO Login Error:', error);
    res.status(500).send(`
      <html>
        <head><title>SSO Login Error</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1 style="color: #dc2626;">❌ Login Error</h1>
          <p>An error occurred during login.</p>
          <p><a href="http://172.20.150.34/Account/Login">Return to Digital System Login</a></p>
        </body>
      </html>
    `);
  }
});

console.log('✅ Auth Routes Loaded');

module.exports = router;
