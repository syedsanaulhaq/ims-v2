// ============================================================================
// Approvals Workflow Routes
// ============================================================================
// Stock issuance approval workflows with supervisor and admin levels

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
// GET /api/approvals/supervisor/pending - Get pending requests for supervisor
// ============================================================================
router.get('/supervisor/pending', requireAuth, requirePermission('stock_request.view_wing'), async (req, res) => {
  try {
    const pool = getPool();
    const supervisorId = req.query.supervisor_id || req.session.userId;
    const wingId = req.query.wing_id;

    if (!wingId) {
      return res.status(400).json({ error: 'wing_id is required' });
    }

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT * FROM vw_pending_supervisor_approvals
        WHERE requester_wing_id = @wingId
        ORDER BY is_urgent DESC, pending_hours DESC
      `);

    console.log(`📋 Found ${result.recordset.length} pending requests for wing ${wingId}`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching supervisor pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/admin/pending - Get pending requests for admin
// ============================================================================
router.get('/admin/pending', requireAuth, requirePermission('stock_request.view_all'), async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request()
      .query(`
        SELECT * FROM vw_pending_admin_approvals
        ORDER BY is_urgent DESC, pending_hours DESC
      `);

    console.log(`📋 Found ${result.recordset.length} pending requests for admin`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching admin pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/request/:requestId - Get request details with items
// ============================================================================
router.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
    const pool = getPool();

    // Get request details
    const requestResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sir.*, u.FullName AS requester_name, u.Email AS requester_email
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE sir.id = @requestId
      `);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.recordset[0];

    // Get request items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT sii.*, im.nomenclature, im.unit
        FROM stock_issuance_items sii
        LEFT JOIN item_masters im ON sii.item_master_id = im.id
        WHERE sii.request_id = @requestId
      `);

    // Check stock availability
    const itemsWithAvailability = await Promise.all(
      itemsResult.recordset.map(async (item) => {
        if (item.is_custom_item) {
          return { ...item, wing_stock_available: 'N/A', admin_stock_available: 'N/A' };
        }

        const wingStock = await pool.request()
          .input('itemId', sql.UniqueIdentifier, item.item_master_id)
          .input('wingId', sql.Int, request.requester_wing_id)
          .query(`SELECT available_quantity FROM stock_wing WHERE item_master_id = @itemId AND wing_id = @wingId`);

        const adminStock = await pool.request()
          .input('itemId', sql.UniqueIdentifier, item.item_master_id)
          .query(`SELECT available_quantity FROM stock_admin WHERE item_master_id = @itemId`);

        return {
          ...item,
          wing_stock_available: wingStock.recordset.length > 0 ? wingStock.recordset[0].available_quantity : 0,
          admin_stock_available: adminStock.recordset.length > 0 ? adminStock.recordset[0].available_quantity : 0
        };
      })
    );

    // Get approval history
    const historyResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT * FROM stock_issuance_approval_history
        WHERE request_id = @requestId
        ORDER BY action_date DESC
      `);

    res.json({
      request,
      items: itemsWithAvailability,
      history: historyResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/approve - Supervisor approve request
// ============================================================================
router.post('/supervisor/approve', requireAuth, requirePermission('stock_request.approve_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments, itemApprovals } = req.body;
    const pool = getPool();

    if (!requestId || !supervisorId) {
      return res.status(400).json({ error: 'requestId and supervisorId are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Approved',
              source_store_type = 'Wing'
          WHERE id = @requestId
        `);

      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Wing'
              WHERE id = @itemId
            `);
        }
      }

      // Log approval history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/forward - Supervisor forward to admin
// ============================================================================
router.post('/supervisor/forward', requireAuth, requirePermission('stock_request.forward_to_admin'), async (req, res) => {
  try {
    const { requestId, supervisorId, forwardingReason, comments } = req.body;
    const pool = getPool();

    if (!requestId || !supervisorId || !forwardingReason) {
      return res.status(400).json({ error: 'requestId, supervisorId, and forwardingReason are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('forwardingReason', sql.NVarChar(sql.MAX), forwardingReason)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Forwarded to Admin',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Forwarded',
              forwarding_reason = @forwardingReason
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Forwarded')
        .input('newStatus', sql.NVarChar(30), 'Forwarded to Admin')
        .input('reason', sql.NVarChar(sql.MAX), forwardingReason)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, forwarding_reason)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @reason
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor forwarded request ${requestId} to admin`);
      res.json({ success: true, message: 'Request forwarded to admin successfully', action: 'forwarded' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/supervisor/reject - Supervisor reject request
// ============================================================================
router.post('/supervisor/reject', requireAuth, requirePermission('stock_request.reject_supervisor'), async (req, res) => {
  try {
    const { requestId, supervisorId, comments } = req.body;
    const pool = getPool();

    if (!requestId || !supervisorId || !comments) {
      return res.status(400).json({ error: 'requestId, supervisorId, and comments are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('supervisorId', sql.NVarChar(450), supervisorId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Supervisor',
              supervisor_id = @supervisorId,
              supervisor_reviewed_at = GETDATE(),
              supervisor_comments = @comments,
              supervisor_action = 'Rejected'
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), supervisorId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Supervisor')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Supervisor rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/admin/approve - Admin approve request
// ============================================================================
router.post('/admin/approve', requireAuth, requirePermission('stock_request.approve_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments, itemApprovals } = req.body;
    const pool = getPool();

    if (!requestId || !adminId) {
      return res.status(400).json({ error: 'requestId and adminId are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Approved by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Approved',
              source_store_type = 'Admin'
          WHERE id = @requestId
        `);

      // Update item statuses if provided
      if (itemApprovals && Array.isArray(itemApprovals)) {
        for (const item of itemApprovals) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.itemId)
            .input('approvedQty', sql.Int, item.approvedQuantity)
            .input('status', sql.NVarChar(20), item.status)
            .query(`
              UPDATE stock_issuance_items
              SET approved_quantity = @approvedQty,
                  item_status = @status,
                  source_store_type = 'Admin'
              WHERE id = @itemId
            `);
        }
      }

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Approved')
        .input('newStatus', sql.NVarChar(30), 'Approved by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Admin approved request ${requestId}`);
      res.json({ success: true, message: 'Request approved successfully', action: 'approved' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// ============================================================================
// POST /api/approvals/admin/reject - Admin reject request
// ============================================================================
router.post('/admin/reject', requireAuth, requirePermission('stock_request.reject_admin'), async (req, res) => {
  try {
    const { requestId, adminId, comments } = req.body;
    const pool = getPool();

    if (!requestId || !adminId || !comments) {
      return res.status(400).json({ error: 'requestId, adminId, and comments are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update request status
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('adminId', sql.NVarChar(450), adminId)
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          UPDATE stock_issuance_requests
          SET approval_status = 'Rejected by Admin',
              admin_id = @adminId,
              admin_reviewed_at = GETDATE(),
              admin_comments = @comments,
              admin_action = 'Rejected'
          WHERE id = @requestId
        `);

      // Log history
      await transaction.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('actorId', sql.NVarChar(450), adminId)
        .input('action', sql.NVarChar(30), 'Rejected')
        .input('newStatus', sql.NVarChar(30), 'Rejected by Admin')
        .input('comments', sql.NVarChar(sql.MAX), comments)
        .query(`
          INSERT INTO stock_issuance_approval_history 
          (request_id, actor_id, actor_name, actor_role, action, new_status, comments)
          SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @comments
          FROM AspNetUsers WHERE Id = @actorId
        `);

      await transaction.commit();
      console.log(`✅ Admin rejected request ${requestId}`);
      res.json({ success: true, message: 'Request rejected', action: 'rejected' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-requests/:userId - Get user's requests
// ============================================================================
router.get('/my-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT * FROM vw_my_issuance_requests
        WHERE requester_user_id = @userId
        ORDER BY submitted_at DESC
      `);

    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/history/:issuanceId - Get approval history
// ============================================================================
router.get('/history/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('issuanceId', sql.UniqueIdentifier, issuanceId)
      .query(`
        SELECT * FROM stock_issuance_approval_history
        WHERE request_id = @issuanceId
        ORDER BY action_date DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history', details: error.message });
  }
});

console.log('✅ Approvals Routes Loaded');

module.exports = router;
