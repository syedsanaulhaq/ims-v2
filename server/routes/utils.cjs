// ============================================================================
// Disposals and Utility Routes
// ============================================================================
// Disposals, locations, stores, and other miscellaneous endpoints

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/disposals - Get all disposals
// ============================================================================
router.get('/disposals', async (req, res) => {
  try {
    const pool = getPool();
    const { status } = req.query;

    let query = `
      SELECT 
        d.id,
        d.disposal_code,
        d.wing_id,
        d.status,
        d.submitted_at,
        d.approved_at,
        COUNT(di.id) as item_count,
        w.Name as wing_name
      FROM disposals d
      LEFT JOIN disposal_items di ON d.id = di.disposal_id
      LEFT JOIN WingsInformation w ON d.wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND d.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    query += ` GROUP BY d.id, d.disposal_code, d.wing_id, d.status, d.submitted_at, d.approved_at, w.Name
             ORDER BY d.submitted_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    // Return empty array if table doesn't exist (error 208)
    if (error.number === 208) {
      console.log('⚠️  Disposals table does not exist - returning empty array');
      return res.json([]);
    }
    console.error('Error fetching disposals:', error);
    res.status(500).json({ error: 'Failed to fetch disposals' });
  }
});

// ============================================================================
// POST /api/disposals - Create disposal
// ============================================================================
router.post('/disposals', requireAuth, async (req, res) => {
  try {
    const { wing_id, items, reason } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const disposalId = uuidv4();
    const disposalCode = `DISP-${Date.now()}`;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('id', sql.UniqueIdentifier, disposalId)
        .input('code', sql.NVarChar(50), disposalCode)
        .input('wingId', sql.Int, wing_id)
        .input('reason', sql.NVarChar(sql.MAX), reason)
        .input('createdBy', sql.NVarChar(450), req.session.userId)
        .query(`
          INSERT INTO disposals (id, disposal_code, wing_id, status, reason, created_by, submitted_at)
          VALUES (@id, @code, @wingId, 'Pending', @reason, @createdBy, GETDATE())
        `);

      for (const item of items) {
        await transaction.request()
          .input('disposalId', sql.UniqueIdentifier, disposalId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('qty', sql.Int, item.quantity)
          .input('reason', sql.NVarChar(500), item.reason)
          .query(`
            INSERT INTO disposal_items (disposal_id, item_master_id, quantity, reason)
            VALUES (@disposalId, @itemId, @qty, @reason)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, disposal_id: disposalId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    // Return 501 Not Implemented if table doesn't exist (error 208)
    if (error.number === 208) {
      console.log('⚠️  Disposals table does not exist - feature not implemented');
      return res.status(501).json({ error: 'Disposals feature not yet implemented' });
    }
    console.error('Error creating disposal:', error);
    res.status(500).json({ error: 'Failed to create disposal' });
  }
});

// ============================================================================
// GET /api/stores - Get all stores/locations
// ============================================================================
router.get('/stores', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        id,
        store_name,
        location,
        wing_id,
        store_type,
        is_active,
        created_at,
        w.Name as wing_name
      FROM stores s
      LEFT JOIN WingsInformation w ON s.wing_id = w.Id
      WHERE is_active = 1
      ORDER BY store_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ============================================================================
// POST /api/stores - Create store
// ============================================================================
router.post('/stores', requireAuth, async (req, res) => {
  try {
    const { store_name, location, wing_id, store_type } = req.body;
    const pool = getPool();

    if (!store_name || !location) {
      return res.status(400).json({ error: 'store_name and location are required' });
    }

    const storeId = uuidv4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, storeId)
      .input('name', sql.NVarChar(255), store_name)
      .input('location', sql.NVarChar(500), location)
      .input('wingId', sql.Int, wing_id)
      .input('type', sql.NVarChar(50), store_type || 'General')
      .input('createdBy', sql.NVarChar(450), req.session.userId)
      .query(`
        INSERT INTO stores (id, store_name, location, wing_id, store_type, is_active, created_by, created_at)
        VALUES (@id, @name, @location, @wingId, @type, 1, @createdBy, GETDATE())
      `);

    res.status(201).json({ success: true, store_id: storeId });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// ============================================================================
// GET /api/offices - Get all offices
// ============================================================================
router.get('/offices', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName,
        strOfficeDescription,
        intProvinceID,
        OfficeCode
      FROM tblOffices
      WHERE IS_ACT = 1
      ORDER BY strOfficeName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching offices:', error);
    res.status(500).json({ error: 'Failed to fetch offices' });
  }
});

// ============================================================================
// GET /api/wings - Get all wings
// ============================================================================
router.get('/wings', async (req, res) => {
  try {
    const pool = getPool();
    const { office_id } = req.query;

    let query = `
      SELECT 
        Id,
        Name,
        ShortName,
        OfficeID,
        IS_ACT,
        FocalPerson,
        ContactNo
      FROM WingsInformation
      WHERE IS_ACT = 1
    `;

    let request = pool.request();

    if (office_id) {
      query += ` AND OfficeID = @officeId`;
      request = request.input('officeId', sql.Int, office_id);
    }

    query += ` ORDER BY Name`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings:', error);
    res.status(500).json({ error: 'Failed to fetch wings' });
  }
});

// ============================================================================
// GET /api/designations - Get all designations
// ============================================================================
router.get('/designations', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        intDesignationID,
        strDesignation,
        intDepartmentID
      FROM tblUserDesignations
      ORDER BY strDesignation
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// ============================================================================
// GET /api/offices/:officeId/wings - Get wings for a specific office
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

    console.log(`✅ Fetched ${result.recordset.length} wings for office ${officeId}`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching wings for office:', error);
    res.status(500).json({ error: 'Failed to fetch wings', details: error.message });
  }
});

// ============================================================================
// GET /api/wings/:wingId/decs - Get DECs for a specific wing
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

    console.log(`✅ Fetched ${result.recordset.length} DECs for wing ${wingId}`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching DECs for wing:', error);
    res.status(500).json({ error: 'Failed to fetch DECs', details: error.message });
  }
});

// ============================================================================
// GET /api/health - Health check
// ============================================================================
router.get('/health', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query('SELECT 1 as test');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

console.log('✅ Disposals and Utility Routes Loaded');

module.exports = router;
