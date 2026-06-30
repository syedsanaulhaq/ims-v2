// ============================================================================
// Users Routes
// ============================================================================
// All user management and metadata endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

async function resolveBranchIdFromLoggedInUserCnic(pool, req) {
  let cnic = req.session?.user?.CNIC || req.session?.user?.cnic || null;

  if (!cnic && req.session?.userId) {
    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), req.session.userId)
      .query('SELECT TOP 1 CNIC FROM AspNetUsers WHERE Id = @userId');
    cnic = userResult.recordset[0]?.CNIC || null;
  }

  if (!cnic) {
    return null;
  }

  const normalizedCnic = String(cnic).replace(/-/g, '').trim();
  const exactBranchResult = await pool.request()
    .input('cnic', sql.NVarChar(30), String(cnic).trim())
    .query(`
      SELECT TOP 1 BranchID
      FROM vw_employee_branch
      WHERE CNIC = @cnic
    `);

  if (exactBranchResult.recordset[0]?.BranchID) {
    return exactBranchResult.recordset[0].BranchID;
  }

  const normalizedBranchResult = await pool.request()
    .input('normalizedCnic', sql.NVarChar(30), normalizedCnic)
    .query(`
      SELECT TOP 1 BranchID
      FROM vw_employee_branch
      WHERE REPLACE(CNIC, '-', '') = @normalizedCnic
    `);

  return normalizedBranchResult.recordset[0]?.BranchID || null;
}

// ============================================================================
// GET /api/users - Get all active users
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id } = req.query;

    let query = `
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
    `;

    const request = pool.request();

    if (wing_id) {
      query += ` AND intWingID = @wingId`;
      request.input('wingId', sql.Int, Number(wing_id));
    }

    query += ` ORDER BY FullName`;

    const result = await request.query(query);

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
        COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') as designation,
        o.strOfficeName as officeName,
        w.WingName as wingName,
        CONCAT(u.FullName, ' (', COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), u.Role), ')') as displayName
      FROM AspNetUsers u
      LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), u.Id)
      LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
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
          COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') as designation,
          o.strOfficeName as officeName,
          w.WingName as wingName
        FROM AspNetUsers u
        LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), u.Id)
        LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
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
    const { role, office_id, wing_id, branch_id, search } = req.query;
    const hasBranchFilter = branch_id !== undefined && branch_id !== null && String(branch_id).trim() !== '';
    const effectiveBranchId = hasBranchFilter
      ? String(branch_id).toLowerCase() === 'me'
        ? await resolveBranchIdFromLoggedInUserCnic(pool, req)
        : Number(branch_id)
      : null;

    if (hasBranchFilter) {
      if (!effectiveBranchId || Number.isNaN(Number(effectiveBranchId))) {
        return res.json([]);
      }

      const request = pool.request().input('branchId', sql.Int, Number(effectiveBranchId));
      let query = `
        SELECT DISTINCT
          COALESCE(CONVERT(NVARCHAR(450), eb.ID), eb.CNIC, eb.EMAIL, eb.NAME) as Id,
          COALESCE(NULLIF(eb.NAME, ''), '-') as FullName,
          COALESCE(NULLIF(eb.CNIC, ''), NULLIF(eb.EMAIL, ''), eb.NAME) as UserName,
          COALESCE(NULLIF(eb.EMAIL, ''), '') as Email,
          'Member' as Role,
          CAST(NULL AS INT) as intOfficeID,
          CAST(NULL AS INT) as intWingID,
          eb.BranchID as intBranchID,
          CAST(NULL AS INT) as intDesignationID,
          '-' as designation,
          CAST(NULL AS NVARCHAR(200)) as officeName,
          CAST(NULL AS NVARCHAR(200)) as wingName,
          CAST(NULL AS NVARCHAR(200)) as wing_name,
          eb.BranchName as branchName,
          eb.BranchName as branch_name,
          eb.CNIC,
          eb.FATHER_NAME as FatherOrHusbandName,
          eb.CONTACT as PhoneNumber
        FROM vw_employee_branch eb
        WHERE eb.BranchID = @branchId
      `;

      if (search) {
        query += ` AND (eb.NAME LIKE @search OR eb.CNIC LIKE @search OR eb.EMAIL LIKE @search OR eb.BranchName LIKE @search)`;
        request.input('search', sql.NVarChar, `%${search}%`);
      }

      query += ` ORDER BY FullName`;

      const result = await request.query(query);
      return res.json(result.recordset);
    }

    let query = `
      SELECT 
        u.Id,
        u.FullName,
        u.UserName,
        u.Email,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.intBranchID,
        u.intDesignationID,
        COALESCE(NULLIF(vud.strDesignation, ''), NULLIF(d.strDesignation, ''), '-') as designation,
        CAST(NULL AS NVARCHAR(200)) as officeName,
        w.Name as wingName,
        w.Name as wing_name
      FROM AspNetUsers u
      LEFT JOIN vw_User_with_designation vud ON CONVERT(NVARCHAR(450), vud.Id) = CONVERT(NVARCHAR(450), u.Id)
      LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
      LEFT JOIN WingsInformation w ON u.intWingID = w.Id
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

    if (hasBranchFilter && effectiveBranchId && !Number.isNaN(Number(effectiveBranchId))) {
      query += ` AND u.intBranchID = @branchId${paramIndex}`;
      request = request.input(`branchId${paramIndex}`, sql.Int, Number(effectiveBranchId));
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
