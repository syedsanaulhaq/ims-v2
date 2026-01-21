// ============================================================================
// Inventory Management Routes
// ============================================================================
// Inventory verification workflows and inventory tracking

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/inventory/verification - Get inventory verification list
// ============================================================================
router.get('/verification', async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, search } = req.query;

    let query = `
      SELECT 
        iv.id,
        iv.verification_code,
        iv.wing_id,
        iv.status,
        iv.start_date,
        iv.end_date,
        iv.total_items,
        iv.verified_items,
        iv.discrepancy_items,
        iv.created_by,
        iv.created_at,
        w.Name as wing_name,
        u.FullName as created_by_name
      FROM inventory_verifications iv
      LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
      LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND iv.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND iv.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (search) {
      query += ` AND (iv.verification_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY iv.created_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching inventory verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verifications', details: error.message });
  }
});

// ============================================================================
// GET /api/inventory/verification/:id - Get verification details
// ============================================================================
router.get('/verification/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          iv.*,
          w.Name as wing_name,
          u.FullName as created_by_name
        FROM inventory_verifications iv
        LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
        LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
        WHERE iv.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    const verification = result.recordset[0];

    // Get verification items
    const itemsResult = await pool.request()
      .input('verificationId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ivi.*,
          im.nomenclature,
          im.unit
        FROM inventory_verification_items ivi
        LEFT JOIN item_masters im ON ivi.item_master_id = im.id
        WHERE ivi.verification_id = @verificationId
      `);

    res.json({
      verification,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({ error: 'Failed to fetch verification details' });
  }
});

// ============================================================================
// POST /api/inventory/verification - Create new inventory verification
// ============================================================================
router.post('/verification', requireAuth, async (req, res) => {
  try {
    const { wing_id, items } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const verificationId = require('uuid').v4();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create verification record
      await transaction.request()
        .input('id', sql.UniqueIdentifier, verificationId)
        .input('wingId', sql.Int, wing_id)
        .input('totalItems', sql.Int, items.length)
        .input('createdBy', sql.NVarChar(450), req.session.userId)
        .query(`
          INSERT INTO inventory_verifications 
          (id, wing_id, status, total_items, verified_items, discrepancy_items, created_by, created_at)
          VALUES (@id, @wingId, 'In Progress', @totalItems, 0, 0, @createdBy, GETDATE())
        `);

      // Add verification items
      for (const item of items) {
        await transaction.request()
          .input('verificationId', sql.UniqueIdentifier, verificationId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('systemQty', sql.Int, item.system_quantity)
          .input('physicalQty', sql.Int, item.physical_quantity)
          .input('status', sql.NVarChar(20), 'Pending')
          .query(`
            INSERT INTO inventory_verification_items 
            (verification_id, item_master_id, system_quantity, physical_quantity, status)
            VALUES (@verificationId, @itemId, @systemQty, @physicalQty, @status)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, verification_id: verificationId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: 'Failed to create verification' });
  }
});

// ============================================================================
// PUT /api/inventory/verification/:id - Update verification status
// ============================================================================
router.put('/verification/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;
    const pool = getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update verification status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar(50), status)
        .query(`
          UPDATE inventory_verifications
          SET status = @status,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('physicalQty', sql.Int, item.physical_quantity)
            .input('itemStatus', sql.NVarChar(20), item.status)
            .query(`
              UPDATE inventory_verification_items
              SET physical_quantity = @physicalQty,
                  status = @itemStatus
              WHERE id = @itemId
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Verification updated' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ============================================================================
// GET /api/inventory/stock - Get current stock levels
// ============================================================================
router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sw.id,
        sw.item_master_id,
        sw.wing_id,
        sw.available_quantity,
        sw.reserved_quantity,
        sw.damaged_quantity,
        im.nomenclature,
        im.unit,
        w.Name as wing_name
      FROM stock_wing sw
      JOIN item_masters im ON sw.item_master_id = im.id
      JOIN WingsInformation w ON sw.wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (wing_id) {
      query += ` AND sw.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (item_id) {
      query += ` AND sw.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sw.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
});

// ============================================================================
// GET /api/inventory/stock/admin - Get admin stock levels
// ============================================================================
router.get('/stock/admin', async (req, res) => {
  try {
    const pool = getPool();
    const { item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.item_master_id,
        sa.available_quantity,
        sa.reserved_quantity,
        sa.damaged_quantity,
        im.nomenclature,
        im.unit
      FROM stock_admin sa
      JOIN item_masters im ON sa.item_master_id = im.id
      WHERE 1=1
    `;

    let request = pool.request();

    if (item_id) {
      query += ` AND sa.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sa.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching admin stock:', error);
    res.status(500).json({ error: 'Failed to fetch admin stock' });
  }
});

console.log('✅ Inventory Routes Loaded');

module.exports = router;
