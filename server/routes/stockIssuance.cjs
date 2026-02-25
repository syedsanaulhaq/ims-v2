// ============================================================================
// Stock Issuance Routes
// ============================================================================
// Stock request and issuance management

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
// GET /api/stock-issuance/pending/count - Get pending approvals count
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

// ============================================================================
// GET /api/stock-issuance/issued-items - Get issued items (all or by user)
// ============================================================================
router.get('/issued-items', async (req, res) => {
  try {
    const pool = getPool();
    const { user_id } = req.query;

    let query = `
      SELECT 
        sii.id,
        sii.request_id,
        sir.request_number,
        sii.item_master_id,
        COALESCE(im.nomenclature, sii.nomenclature) as nomenclature,
        sii.requested_quantity as issued_quantity,
        sii.approved_quantity,
        im.unit,
        sir.expected_return_date,
        sir.is_returnable,
        u.FullName as requester_name,
        sir.submitted_at as created_at,
        sir.request_type as purpose
      FROM stock_issuance_items sii
      INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      WHERE sir.approval_status = 'Approved' OR sir.approval_status = 'Issued'
    `;

    let request = pool.request();

    if (user_id) {
      query += ` AND sir.requester_user_id = @userId`;
      request = request.input('userId', sql.NVarChar(450), user_id);
    }

    query += ` ORDER BY sir.submitted_at DESC`;

    const result = await request.query(query);
    
    // Calculate summary
    const summary = {
      total_items: result.recordset.length,
      total_value: 0,
      returnable_items: result.recordset.filter(i => i.is_returnable).length,
      not_returned: result.recordset.length,
      overdue: 0
    };

    res.json({ 
      success: true,
      data: result.recordset,
      items: result.recordset,
      summary
    });
  } catch (error) {
    console.error('Error fetching issued items:', error);
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});

// ============================================================================
// GET /api/stock-issuance/:id - Get request details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
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
    const deletedBy = req.user?.id || null;

    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT approval_status FROM stock_issuance_requests WHERE id = @id AND is_deleted = 0');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (checkResult.recordset[0].approval_status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Soft delete issuance items
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_issuance_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE request_id = @requestId
        `);

      // Soft delete request
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_issuance_requests
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Request deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// ============================================================================
// POST /api/stock-issuance/historical - Create historical issuance (admin only)
// ============================================================================
// Creates a complete issuance record for past/historical transactions
// Bypasses the normal approval workflow
router.post('/historical', async (req, res) => {
  const transaction = pool.request();
  
  try {
    const pool = getPool();
    const {
      request_type,
      requested_by_id,
      requested_for_wing_id,
      request_date,
      approval_date,
      issuance_date,
      purpose,
      remarks,
      items,
    } = req.body;

    // Validation
    if (!request_type || !purpose || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (request_type === 'personal' && !requested_by_id) {
      return res.status(400).json({ error: 'Person is required for personal requests' });
    }

    if (request_type === 'wing' && !requested_for_wing_id) {
      return res.status(400).json({ error: 'Wing is required for wing requests' });
    }

    // Begin transaction
    const requestId = uuidv4();
    const issuanceId = uuidv4();
    const currentUserId = req.session?.userId || null; // Admin who is creating this record

    // Step 1: Create the issuance request (already approved)
    await pool.request()
      .input('id', sql.UniqueIdentifier, requestId)
      .input('request_number', sql.NVarChar, `HIST-${Date.now()}`)
      .input('requester_user_id', sql.NVarChar(450), request_type === 'personal' ? requested_by_id : null)
      .input('requester_wing_id', sql.Int, request_type === 'wing' ? parseInt(requested_for_wing_id) : null)
      .input('request_type', sql.NVarChar(50), request_type)
      .input('purpose', sql.NVarChar, purpose)
      .input('approval_status', sql.NVarChar(50), 'approved')
      .input('approval_date', sql.DateTime, new Date(approval_date))
      .input('approved_by', sql.NVarChar(450), currentUserId)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('created_at', sql.DateTime, new Date(request_date))
      .input('updated_at', sql.DateTime, new Date(approval_date))
      .query(`
        INSERT INTO stock_issuance_requests (
          id, request_number, requester_user_id, requester_wing_id, 
          request_type, purpose, approval_status, approval_date, 
          approved_by, remarks, created_at, updated_at
        )
        VALUES (
          @id, @request_number, @requester_user_id, @requester_wing_id,
          @request_type, @purpose, @approval_status, @approval_date,
          @approved_by, @remarks, @created_at, @updated_at
        )
      `);

    // Step 2: Insert request items
    for (const item of items) {
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('request_id', sql.UniqueIdentifier, requestId)
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('quantity_requested', sql.Int, item.quantity_requested)
        .input('quantity_approved', sql.Int, item.quantity_approved)
        .input('remarks', sql.NVarChar, item.remarks || null)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, item_master_id, quantity_requested, 
            quantity_approved, remarks
          )
          VALUES (
            @id, @request_id, @item_master_id, @quantity_requested,
            @quantity_approved, @remarks
          )
        `);
    }

    // Step 3: Create the issuance record
    await pool.request()
      .input('id', sql.UniqueIdentifier, issuanceId)
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('issuance_number', sql.NVarChar, `ISS-HIST-${Date.now()}`)
      .input('issued_by', sql.NVarChar(450), currentUserId)
      .input('issued_to_user_id', sql.NVarChar(450), request_type === 'personal' ? requested_by_id : null)
      .input('issued_to_wing_id', sql.Int, request_type === 'wing' ? parseInt(requested_for_wing_id) : null)
      .input('issuance_date', sql.DateTime, new Date(issuance_date))
      .input('status', sql.NVarChar(50), 'issued')
      .input('remarks', sql.NVarChar, `Historical entry: ${remarks || purpose}`)
      .input('created_at', sql.DateTime, new Date(issuance_date))
      .query(`
        INSERT INTO stock_issuances (
          id, request_id, issuance_number, issued_by, issued_to_user_id,
          issued_to_wing_id, issuance_date, status, remarks, created_at
        )
        VALUES (
          @id, @request_id, @issuance_number, @issued_by, @issued_to_user_id,
          @issued_to_wing_id, @issuance_date, @status, @remarks, @created_at
        )
      `);

    // Step 4: Insert issuance items and update stock
    for (const item of items) {
      const issuanceItemId = uuidv4();
      
      // Insert issuance item
      await pool.request()
        .input('id', sql.UniqueIdentifier, issuanceItemId)
        .input('issuance_id', sql.UniqueIdentifier, issuanceId)
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('quantity_issued', sql.Int, item.quantity_issued)
        .input('remarks', sql.NVarChar, item.remarks || null)
        .query(`
          INSERT INTO stock_issuance_issued_items (
            id, issuance_id, item_master_id, quantity_issued, remarks
          )
          VALUES (
            @id, @issuance_id, @item_master_id, @quantity_issued, @remarks
          )
        `);

      // Deduct from stock (FIFO)
      let remainingQty = item.quantity_issued;
      const stockResult = await pool.request()
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .query(`
          SELECT id, quantity_available
          FROM stock_acquisitions
          WHERE item_master_id = @item_master_id
            AND quantity_available > 0
          ORDER BY delivery_date ASC
        `);

      for (const stock of stockResult.recordset) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, stock.quantity_available);
        
        await pool.request()
          .input('id', sql.UniqueIdentifier, stock.id)
          .input('deduct', sql.Int, deductQty)
          .query(`
            UPDATE stock_acquisitions
            SET quantity_available = quantity_available - @deduct
            WHERE id = @id
          `);

        remainingQty -= deductQty;
      }

      if (remainingQty > 0) {
        throw new Error(`Insufficient stock for item: ${item.item_master_id}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Historical issuance created successfully',
      requestId,
      issuanceId,
    });

  } catch (error) {
    console.error('❌ Error creating historical issuance:', error);
    res.status(500).json({ 
      error: 'Failed to create historical issuance',
      details: error.message 
    });
  }
});

console.log('✅ Stock Issuance Routes Loaded');

// ============================================================================
// POST /api/stock-issuance/:id/restore - Restore deleted stock issuance
// ============================================================================
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const result = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_issuance_requests
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted issuance request not found' });
      }

      // Restore issuance items
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_issuance_items
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE request_id = @requestId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Issuance request restored', request: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring issuance request:', error);
    res.status(500).json({ error: 'Failed to restore issuance request' });
  }
});

module.exports = router;
