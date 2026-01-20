// ============================================================================
// Stock Issuance Routes
// ============================================================================
// Stock request and issuance management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/stock-issuance - Get all stock issuance requests
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, requester_id } = req.query;

    let query = `
      SELECT 
        sir.*,
        u.FullName as requester_name,
        w.Name as wing_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND sir.approval_status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND sir.requester_wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (requester_id) {
      query += ` AND sir.requester_user_id = @requesterId`;
      request = request.input('requesterId', sql.NVarChar(450), requester_id);
    }

    query += ` ORDER BY sir.submitted_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock issuance requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/:id - Get request details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sir.*,
          u.FullName as requester_name,
          u.Email as requester_email,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
        WHERE sir.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = result.recordset[0];

    // Get items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sii.*,
          im.nomenclature,
          im.unit
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @requestId
      `);

    res.json({
      request,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
});

// ============================================================================
// POST /api/stock-issuance - Create new stock issuance request
// ============================================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { wing_id, items, is_urgent, comments } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const requestId = uuidv4();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create request
      await transaction.request()
        .input('id', sql.UniqueIdentifier, requestId)
        .input('wingId', sql.Int, wing_id)
        .input('requesterId', sql.NVarChar(450), req.session.userId)
        .input('isUrgent', sql.Bit, is_urgent ? 1 : 0)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_requests 
          (id, requester_wing_id, requester_user_id, approval_status, is_urgent, comments, submitted_at)
          VALUES (@id, @wingId, @requesterId, 'Pending', @isUrgent, @comments, GETDATE())
        `);

      // Add items
      for (const item of items) {
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('qty', sql.Int, item.quantity)
          .input('isCustom', sql.Bit, item.is_custom_item ? 1 : 0)
          .query(`
            INSERT INTO stock_issuance_items 
            (request_id, item_master_id, requested_quantity, is_custom_item, item_status)
            VALUES (@requestId, @itemId, @qty, @isCustom, 'Pending')
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, request_id: requestId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// ============================================================================
// PUT /api/stock-issuance/:id - Update request
// ============================================================================
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;
    const pool = getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (status) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('status', sql.NVarChar(50), status)
          .query(`
            UPDATE stock_issuance_requests
            SET approval_status = @status,
                updated_at = GETDATE()
            WHERE id = @id
          `);
      }

      if (items && Array.isArray(items)) {
        for (const item of items) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('approvedQty', sql.Int, item.approved_quantity)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty
              WHERE id = @itemId
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Request updated' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ============================================================================
// DELETE /api/stock-issuance/:id - Delete request (only pending)
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT approval_status FROM stock_issuance_requests WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (checkResult.recordset[0].approval_status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM stock_issuance_requests WHERE id = @id');

    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// ============================================================================
// GET /api/stock-issuance/pending-approvals - Get pending approvals count
// ============================================================================
router.get('/pending/count', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(CASE WHEN approval_status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN approval_status = 'Forwarded to Admin' THEN 1 END) as forwarded,
          COUNT(CASE WHEN approval_status = 'Approved by Supervisor' THEN 1 END) as supervisor_approved
        FROM stock_issuance_requests
      `);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error counting pending:', error);
    res.status(500).json({ error: 'Failed to count pending' });
  }
});

console.log('✅ Stock Issuance Routes Loaded');

module.exports = router;
