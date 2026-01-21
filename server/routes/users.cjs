// ============================================================================
// Users Routes
// ============================================================================
// All user management and metadata endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// ============================================================================
// GET /api/users - Get all active users
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        Id,
        FullName,
        FatherOrHusbandName,
        CNIC,
        UserName,
        Email,
        PhoneNumber,
        Role,
        intOfficeID,
        intWingID,
        intBranchID,
        intDesignationID,
        ISACT,
        AddedOn,
        LastLoggedIn,
        Gender,
        ProfilePhoto,
        UID
      FROM AspNetUsers 
      WHERE ISACT = 1
      ORDER BY FullName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// ============================================================================
// GET /api/users/approvers - Get users formatted for approval workflows
// ============================================================================
router.get('/approvers', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        u.Id,
        u.FullName,
        u.UserName,
        u.Email,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.intDesignationID,
        d.DesignationName as designation,
        o.strOfficeName as officeName,
        w.WingName as wingName,
        CONCAT(u.FullName, ' (', COALESCE(d.DesignationName, u.Role), ')') as displayName
      FROM AspNetUsers u
      LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
      LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
      WHERE u.ISACT = 1
      ORDER BY u.FullName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    res.status(500).json({ error: 'Failed to fetch approvers', details: error.message });
  }
});

// ============================================================================
// GET /api/users/:id - Get single user details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('userId', sql.NVarChar, id)
      .query(`
        SELECT 
          u.Id,
          u.FullName,
          u.FatherOrHusbandName,
          u.CNIC,
          u.UserName,
          u.Email,
          u.PhoneNumber,
          u.Role,
          u.intOfficeID,
          u.intWingID,
          u.intBranchID,
          u.intDesignationID,
          u.Gender,
          u.AddedOn,
          u.LastLoggedIn,
          d.DesignationName as designation,
          o.strOfficeName as officeName,
          w.WingName as wingName
        FROM AspNetUsers u
        LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
        LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
        LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
        WHERE u.Id = @userId AND u.ISACT = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// ============================================================================
// GET /api/offices/:officeId/wings - Get wings for an office
// ============================================================================
router.get('/offices/:officeId/wings', async (req, res) => {
  try {
    const { officeId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('officeId', sql.Int, officeId)
      .query(`
        SELECT 
          Id,
          Name,
          ShortName,
          FocalPerson,
          ContactNo,
          Creator,
          CreateDate,
          Modifier,
          ModifyDate,
          OfficeID,
          IS_ACT,
          HODID,
          HODName,
          WingCode,
          CreatedAt,
          UpdatedAt
        FROM WingsInformation 
        WHERE OfficeID = @officeId AND IS_ACT = 1
        ORDER BY Name
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings:', error);
    res.status(500).json({ error: 'Failed to fetch wings', details: error.message });
  }
});

// ============================================================================
// GET /api/wings/:wingId/decs - Get DECs for a wing
// ============================================================================
router.get('/wings/:wingId/decs', async (req, res) => {
  try {
    const { wingId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          intAutoID,
          WingID,
          DECName,
          DECAcronym,
          DECAddress,
          Location,
          IS_ACT,
          DateAdded,
          DECCode,
          HODID,
          HODName,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy,
          Version
        FROM DEC_MST 
        WHERE WingID = @wingId AND IS_ACT = 1
        ORDER BY DECName
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching DECs:', error);
    res.status(500).json({ error: 'Failed to fetch DECs', details: error.message });
  }
});

// ============================================================================
// GET /api/aspnet-users/active - Get active AspNet users
// ============================================================================
router.get('/aspnet/active', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        Id,
        FullName,
        UserName,
        Email,
        Role,
        intOfficeID,
        intWingID,
        intDesignationID,
        ISACT
      FROM AspNetUsers 
      WHERE ISACT = 1
      ORDER BY FullName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching active AspNet users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// ============================================================================
// GET /api/aspnet-users/filtered - Get AspNet users with detailed info
// ============================================================================
router.get('/aspnet/filtered', async (req, res) => {
  try {
    const pool = getPool();
    const { role, office_id, wing_id, search } = req.query;

    let query = `
      SELECT 
        u.Id,
        u.FullName,
        u.UserName,
        u.Email,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.intDesignationID,
        d.DesignationName as designation,
        o.strOfficeName as officeName,
        w.WingName as wingName
      FROM AspNetUsers u
      LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
      LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
      WHERE u.ISACT = 1
    `;

    let request = pool.request();
    let paramIndex = 1;

    if (role) {
      query += ` AND u.Role = @role${paramIndex}`;
      request = request.input(`role${paramIndex}`, sql.NVarChar, role);
      paramIndex++;
    }

    if (office_id) {
      query += ` AND u.intOfficeID = @officeId${paramIndex}`;
      request = request.input(`officeId${paramIndex}`, sql.Int, office_id);
      paramIndex++;
    }

    if (wing_id) {
      query += ` AND u.intWingID = @wingId${paramIndex}`;
      request = request.input(`wingId${paramIndex}`, sql.Int, wing_id);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.FullName LIKE @search${paramIndex} OR u.UserName LIKE @search${paramIndex} OR u.Email LIKE @search${paramIndex})`;
      request = request.input(`search${paramIndex}`, sql.NVarChar, `%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.FullName`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching filtered users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

console.log('✅ Users Routes Loaded');

module.exports = router;
