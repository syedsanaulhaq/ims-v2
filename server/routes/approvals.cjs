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
    let wingId = req.query.wing_id;

    // If no wing_id provided, get user's wing from database
    if (!wingId) {
      const userWingResult = await pool.request()
        .input('userId', sql.NVarChar(450), req.session.userId)
        .query(`
          SELECT u.intWingID as WingId 
          FROM AspNetUsers u
          WHERE u.Id = @userId
        `);
      
      if (userWingResult.recordset.length > 0) {
        wingId = userWingResult.recordset[0].WingId;
      }
    }

    if (!wingId) {
      // Return empty instead of error if no wing found
      console.log('⚠️ No wing_id provided or found for user');
      return res.json({ requests: [], total: 0 });
    }

    // Use inline query instead of view for better compatibility
    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          sir.id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.approval_status,
          sir.submitted_at,
          sir.requester_user_id,
          sir.requester_wing_id,
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 1 ELSE 0 END as is_urgent,
          DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours,
          u.FullName as requester_name,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
        WHERE sir.requester_wing_id = @wingId
          AND sir.approval_status IN ('Pending', 'pending', 'Submitted', 'Pending Supervisor Review')
          AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
        ORDER BY 
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 0 ELSE 1 END,
          sir.submitted_at ASC
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

    // Use inline query instead of view for better compatibility
    const result = await pool.request()
      .query(`
        SELECT 
          sir.id as request_id,
          sir.id,
          sir.request_number,
          sir.request_type,
          sir.purpose,
          sir.urgency_level,
          sir.approval_status,
          sir.submitted_at,
          sir.requester_user_id,
          sir.requester_wing_id,
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 1 ELSE 0 END as is_urgent,
          DATEDIFF(HOUR, sir.submitted_at, GETDATE()) as pending_hours,
          u.FullName as requester_name,
          w.Name as wing_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id
        WHERE sir.approval_status IN ('Forwarded to Admin', 'Approved by Supervisor', 'Pending Admin Approval')
          AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
        ORDER BY 
          CASE WHEN sir.urgency_level IN ('High', 'Critical') THEN 0 ELSE 1 END,
          sir.submitted_at ASC
      `);

    console.log(`📋 Found ${result.recordset.length} pending requests for admin`);
    res.json({ requests: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('❌ Error fetching admin pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/my-pending - Get pending approvals for current user
// ============================================================================
router.get('/my-pending', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session.userId;

    // Check if user is a supervisor (has view_wing permission)
    const userResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT u.Id, u.intWingID as wing_id
        FROM AspNetUsers u
        WHERE u.Id = @userId
      `);

    if (userResult.recordset.length === 0) {
      return res.json({ requests: [], data: [] });
    }

    const user = userResult.recordset[0];
    if (!user.wing_id) {
      return res.json({ requests: [], data: [] });
    }

    // Get pending supervisory approvals for this user's wing
    const result = await pool.request()
      .input('wingId', sql.Int, user.wing_id)
      .query(`
        SELECT * FROM vw_pending_supervisor_approvals
        WHERE requester_wing_id = @wingId
        ORDER BY is_urgent DESC, pending_hours DESC
      `);

    console.log(`📋 Found ${result.recordset.length} pending approvals for user ${userId}`);
    res.json({ 
      requests: result.recordset, 
      data: result.recordset,
      total: result.recordset.length 
    });
  } catch (error) {
    console.error('❌ Error fetching my pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
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
      .input('requestId', sql.UniqueIdentifier, request.request_id)
      .query(`
        SELECT * FROM issuance_approval_history
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

// ============================================================================
// GET /api/approvals/my-approvals - Get pending approvals for current user
// Uses request_approvals table with fallback to stock_issuance_requests
// ============================================================================
router.get('/my-approvals', async (req, res) => {
  try {
    let userId = req.query.userId || req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in first.'
      });
    }

    const status = req.query.status || 'pending';
    const pool = getPool();

    // First try request_approvals table (workflow-based approach)
    let decisionFilter = '';
    if (status === 'pending') {
      decisionFilter = "ai.decision_type = 'PENDING'";
    } else if (status === 'approved') {
      decisionFilter = "ai.decision_type = 'APPROVE_FROM_STOCK'";
    } else if (status === 'rejected') {
      decisionFilter = "ai.decision_type = 'REJECT'";
    } else if (status === 'returned') {
      decisionFilter = "ai.decision_type = 'RETURN'";
    } else if (status === 'forwarded') {
      decisionFilter = "ai.decision_type IN ('FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN')";
    }

    const approvalsResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          sir.request_type as scope_type,
          sir.request_number,
          ra.submitted_date,
          ra.current_status,
          ra.submitted_by,
          ra.current_approver_id,
          u_requester.FullName as requester_name,
          u_current_approver.FullName as current_approver_name,
          sir.justification as title,
          sir.purpose as description,
          sir.expected_return_date as requested_date,
          COALESCE(item_counts.item_count, 0) as total_items
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
        LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
        LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
        LEFT JOIN (
          SELECT request_id, COUNT(*) as item_count
          FROM stock_issuance_items
          GROUP BY request_id
        ) item_counts ON item_counts.request_id = ra.request_id
        WHERE ra.current_approver_id = @userId
        AND sir.id IS NOT NULL
        ${decisionFilter ? `AND (
          ra.request_id IN (
            SELECT DISTINCT ra2.request_id FROM request_approvals ra2
            INNER JOIN approval_items ai ON ai.request_approval_id = ra2.id
            WHERE ${decisionFilter}
          )
          ${status === 'pending' ? `OR (ra.current_status = 'pending' AND NOT EXISTS (
            SELECT 1 FROM approval_items ai2 WHERE ai2.request_approval_id = ra.id
          ))` : ''}
        )` : ''}
        ORDER BY ra.submitted_date DESC
      `);

    // Build response
    const approvals = [];
    for (const approval of approvalsResult.recordset) {
      // Load items for this approval
      let items = [];
      try {
        const itemsResult = await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approval.id)
          .query(`
            SELECT
              ai.id as item_id,
              ai.nomenclature as item_name,
              ai.custom_item_name,
              ai.requested_quantity,
              ai.allocated_quantity as approved_quantity,
              COALESCE(ai.unit, 'units') as unit,
              ai.decision_type,
              ai.rejection_reason
            FROM approval_items ai
            WHERE ai.request_approval_id = @approvalId
            ORDER BY ai.nomenclature
          `);
        items = itemsResult.recordset || [];
      } catch (itemError) {
        console.log('Could not load items for approval', approval.id, ':', itemError.message);
      }

      approvals.push({
        id: approval.id,
        request_id: approval.request_id,
        request_number: approval.request_number,
        request_type: approval.request_type || 'stock_issuance',
        scope_type: approval.scope_type || 'Individual',
        title: approval.title || 'Stock Issuance Request',
        description: approval.description || 'Request for inventory items',
        requested_date: approval.requested_date || approval.submitted_date,
        submitted_date: approval.submitted_date,
        requester_name: approval.requester_name || 'Unknown User',
        submitted_by_name: approval.requester_name || 'Unknown User',
        current_approver_name: approval.current_approver_name,
        current_status: approval.current_status || 'pending',
        items: items,
        total_items: approval.total_items || 0,
        priority: 'Medium'
      });
    }

    console.log(`📋 Found ${approvals.length} ${status} approvals for user ${userId}`);
    res.json({
      success: true,
      data: approvals,
      total: approvals.length,
      message: `Found ${approvals.length} ${status} approvals`
    });

  } catch (error) {
    console.error('❌ Error fetching my approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals: ' + error.message
    });
  }
});

// ============================================================================
// POST /api/approvals/:approvalId/approve - Per-item approval decisions
// ============================================================================
router.post('/:approvalId/approve', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_allocations
    } = req.body;

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const pool = getPool();

    // Get approver info from DB
    let actualApproverName = approver_name || 'System';
    let actualApproverDesignation = approver_designation || 'Approver';
    try {
      const userInfoResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(`
          SELECT FullName, 
                 COALESCE(tblUserDesignations.designation_name, 'Supervisor') as designation_name
          FROM AspNetUsers 
          LEFT JOIN tblUserDesignations ON AspNetUsers.intDesignationID = tblUserDesignations.intDesignationID
          WHERE Id = @userId
        `);
      if (userInfoResult.recordset.length > 0) {
        actualApproverName = userInfoResult.recordset[0].FullName;
        actualApproverDesignation = userInfoResult.recordset[0].designation_name;
      }
    } catch (e) {
      console.log('⚠️ Could not get user info, using request body values');
    }

    console.log('✅ Processing per-item approval by user:', userId, 'items:', item_allocations?.length);

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Determine overall status
      const hasReturnActions = item_allocations?.some(a =>
        a.decision_type === 'RETURN' ||
        (a.decision_type === 'REJECT' && a.rejection_reason?.toLowerCase().includes('returned to requester'))
      );

      let overallStatus = 'pending';
      const hasForwardToAdmin = item_allocations?.some(a => a.decision_type === 'FORWARD_TO_ADMIN');
      const hasForwardToSupervisor = item_allocations?.some(a => a.decision_type === 'FORWARD_TO_SUPERVISOR');
      const hasForwardActions = hasForwardToAdmin || hasForwardToSupervisor;

      if (hasReturnActions) {
        overallStatus = 'returned';
      } else if (hasForwardActions) {
        overallStatus = hasForwardToAdmin ? 'forwarded_to_admin' : 'forwarded_to_supervisor';
      } else if (item_allocations?.every(a => a.decision_type === 'REJECT')) {
        overallStatus = 'rejected';
      } else if (item_allocations?.every(a =>
        a.decision_type === 'APPROVE_FROM_STOCK' ||
        a.decision_type === 'REJECT'
      )) {
        overallStatus = 'approved';
      }

      // Update approval record
      // If forwarding, find the target user to reassign current_approver_id
      let newApproverId = null;
      if (hasForwardToAdmin) {
        // Find an IMS_ADMIN user (preferably in the same wing)
        const adminResult = await transaction.request()
          .query(`
            SELECT TOP 1 ur.user_id 
            FROM ims_user_roles ur
            INNER JOIN ims_roles r ON r.id = ur.role_id
            WHERE r.role_name = 'IMS_ADMIN'
            ORDER BY ur.user_id
          `);
        if (adminResult.recordset.length > 0) {
          newApproverId = adminResult.recordset[0].user_id;
        }
      } else if (hasForwardToSupervisor) {
        // Find a WING_SUPERVISOR user
        const supResult = await transaction.request()
          .query(`
            SELECT TOP 1 ur.user_id
            FROM ims_user_roles ur
            INNER JOIN ims_roles r ON r.id = ur.role_id
            WHERE r.role_name = 'WING_SUPERVISOR'
            AND ur.user_id != '${userId}'
            ORDER BY ur.user_id
          `);
        if (supResult.recordset.length > 0) {
          newApproverId = supResult.recordset[0].user_id;
        }
      }

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('status', sql.NVarChar, overallStatus)
        .input('approver_name', sql.NVarChar, actualApproverName)
        .input('approver_designation', sql.NVarChar, actualApproverDesignation)
        .input('approval_comments', sql.NVarChar, approval_comments || '')
        .input('newApproverId', sql.NVarChar, newApproverId)
        .query(`
          UPDATE request_approvals
          SET current_status = @status,
              updated_date = GETDATE(),
              approver_name = @approver_name,
              approver_designation = @approver_designation,
              approval_comments = @approval_comments
              ${newApproverId ? ', current_approver_id = @newApproverId' : ''}
          WHERE id = @approvalId
        `);

      // Process each item allocation
      if (item_allocations && Array.isArray(item_allocations)) {
        for (const allocation of item_allocations) {
          await transaction.request()
            .input('itemId', sql.NVarChar, allocation.requested_item_id)
            .input('allocated_quantity', sql.Int, allocation.allocated_quantity || 0)
            .input('decision_type', sql.NVarChar, allocation.decision_type)
            .input('rejection_reason', sql.NVarChar, allocation.rejection_reason || '')
            .input('forwarding_reason', sql.NVarChar, allocation.forwarding_reason || '')
            .query(`
              UPDATE approval_items
              SET allocated_quantity = @allocated_quantity,
                  decision_type = @decision_type,
                  rejection_reason = @rejection_reason,
                  forwarding_reason = @forwarding_reason,
                  updated_at = GETDATE()
              WHERE id = @itemId
            `);
        }
      }

      // Add history entry
      const stepResult = await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
          FROM approval_history
          WHERE request_approval_id = @approvalId
        `);
      const nextStep = stepResult.recordset[0].next_step;

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .query(`
          UPDATE approval_history
          SET is_current_step = 0
          WHERE request_approval_id = @approvalId
        `);

      // Determine a meaningful comment for the history entry
      const historyActionType = hasReturnActions ? 'returned' : overallStatus;
      let historyComment = approval_comments || '';
      if (!historyComment) {
        if (historyActionType === 'forwarded_to_admin') historyComment = 'Forwarded request to Admin for approval';
        else if (historyActionType === 'forwarded_to_supervisor') historyComment = 'Forwarded request to Wing Supervisor';
        else if (historyActionType === 'approved') historyComment = 'Request approved';
        else if (historyActionType === 'rejected') historyComment = 'Request rejected';
        else if (historyActionType === 'returned') historyComment = 'Request returned for revision';
        else historyComment = 'Decision submitted';
      }

      await transaction.request()
        .input('approvalId', sql.NVarChar, approvalId)
        .input('action_by', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, historyComment)
        .input('step_number', sql.Int, nextStep)
        .input('action_type', sql.NVarChar, historyActionType)
        .input('forwarded_to', sql.NVarChar, newApproverId || null)
        .query(`
          INSERT INTO approval_history
          (request_approval_id, action_type, action_by, comments, step_number, is_current_step, forwarded_to)
          VALUES (@approvalId, @action_type, @action_by, @comments, @step_number, 1, @forwarded_to)
        `);

      // ====================================================================
      // STOCK DEDUCTION & ISSUANCE - When request is approved
      // ====================================================================
      if (overallStatus === 'approved' && item_allocations && Array.isArray(item_allocations)) {
        // Get the request_id from request_approvals
        const reqIdResult = await transaction.request()
          .input('approvalId', sql.NVarChar, approvalId)
          .query(`SELECT request_id FROM request_approvals WHERE id = @approvalId`);
        
        const requestId = reqIdResult.recordset[0]?.request_id;
        
        if (requestId) {
          for (const allocation of item_allocations) {
            if (allocation.decision_type === 'APPROVE_FROM_STOCK' && allocation.allocated_quantity > 0) {
              // Get item_master_id from approval_items
              const itemResult = await transaction.request()
                .input('aiId', sql.NVarChar, allocation.requested_item_id)
                .query(`SELECT item_master_id FROM approval_items WHERE id = @aiId`);
              
              const itemMasterId = itemResult.recordset[0]?.item_master_id;
              if (!itemMasterId) continue;

              // 1. Deduct from stock_admin
              await transaction.request()
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('qty', sql.Int, allocation.allocated_quantity)
                .query(`
                  UPDATE stock_admin 
                  SET available_quantity = available_quantity - @qty,
                      updated_at = GETDATE(),
                      updated_by = '${userId}'
                  WHERE item_master_id = @itemMasterId
                    AND available_quantity >= @qty
                `);

              // 2. Update stock_issuance_items
              await transaction.request()
                .input('requestId', sql.UniqueIdentifier, requestId)
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('approvedQty', sql.Int, allocation.allocated_quantity)
                .query(`
                  UPDATE stock_issuance_items 
                  SET approved_quantity = @approvedQty,
                      item_status = 'approved',
                      source_store_type = 'admin',
                      updated_at = GETDATE()
                  WHERE request_id = @requestId 
                    AND item_master_id = @itemMasterId
                `);

              // 3. Create stock_transaction for audit trail
              await transaction.request()
                .input('itemMasterId', sql.UniqueIdentifier, itemMasterId)
                .input('qty', sql.Decimal(18, 2), allocation.allocated_quantity)
                .input('refId', sql.UniqueIdentifier, requestId)
                .input('createdBy', sql.UniqueIdentifier, userId)
                .query(`
                  INSERT INTO stock_transactions 
                  (id, transaction_number, item_master_id, transaction_type, quantity, 
                   unit_price, total_value, reference_type, reference_id, reference_number,
                   transaction_date, created_by, status, created_at)
                  VALUES (
                    NEWID(),
                    'TXN-ISS-' + FORMAT(GETDATE(), 'yyyyMMdd-HHmmss'),
                    @itemMasterId,
                    'ISSUANCE',
                    @qty,
                    0, 0,
                    'stock_issuance_request',
                    @refId,
                    '${approvalId}',
                    GETDATE(),
                    @createdBy,
                    'completed',
                    GETDATE()
                  )
                `);
            }
          }

          // 4. Update stock_issuance_requests status
          await transaction.request()
            .input('requestId', sql.UniqueIdentifier, requestId)
            .input('approvedBy', sql.NVarChar, userId)
            .query(`
              UPDATE stock_issuance_requests 
              SET request_status = 'Approved',
                  approval_status = 'Approved by Admin',
                  approved_at = GETDATE(),
                  approved_by = @approvedBy,
                  issuance_source = 'admin_store',
                  updated_at = GETDATE()
              WHERE id = @requestId
            `);

          console.log('✅ Stock deducted from admin stock and issuance records updated for request:', requestId);
        }
      }

      await transaction.commit();

      res.json({
        success: true,
        message: hasReturnActions
          ? 'Request returned to requester for editing'
          : 'Per-item approval decisions processed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error processing per-item approval:', error);
    res.status(500).json({ error: 'Failed to process approval', details: error.message });
  }
});

// ============================================================================
// GET /api/approvals/:approvalId - Get approval details by ID
// MUST be placed AFTER all static routes to avoid catching /my-approvals etc.
// ============================================================================
router.get('/:approvalId', async (req, res, next) => {
  try {
    const { approvalId } = req.params;

    // Only handle GUID params — skip for named routes that somehow reach here
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!guidRegex.test(approvalId)) {
      return next();
    }

    const pool = getPool();

    const approvalResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          sir.request_type as scope_type,
          sir.request_number,
          sir.requester_user_id,
          requester.FullName as requester_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id
        LEFT JOIN AspNetUsers requester ON sir.requester_user_id = requester.Id
        WHERE ra.id = @approvalId
      `);

    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = approvalResult.recordset[0];

    // Get approval items
    let itemsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT 
          ai.*,
          im.item_code,
          im.description as item_description
        FROM approval_items ai
        LEFT JOIN item_masters im ON ai.item_master_id = im.id
        WHERE ai.request_approval_id = @approvalId
        ORDER BY ai.created_at
      `);

    // Self-healing: if no approval_items exist, create them from stock_issuance_items
    if (itemsResult.recordset.length === 0 && approval.request_id) {
      console.log(`⚠️ Self-healing: No approval_items for approval ${approvalId}, creating from stock_issuance_items`);
      const stockItems = await pool.request()
        .input('requestId', sql.UniqueIdentifier, approval.request_id)
        .query(`SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity FROM stock_issuance_items WHERE request_id = @requestId`);

      for (const item of stockItems.recordset) {
        try {
          await pool.request()
            .input('approvalId', sql.UniqueIdentifier, approvalId)
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
            .input('nomenclature', sql.NVarChar(sql.MAX), item.nomenclature)
            .input('customName', sql.NVarChar(sql.MAX), item.custom_item_name)
            .input('qty', sql.Int, item.requested_quantity)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM approval_items WHERE id = @itemId)
              INSERT INTO approval_items 
                (id, request_approval_id, item_master_id, nomenclature, custom_item_name, requested_quantity, decision_type, created_at, updated_at)
              VALUES 
                (@itemId, @approvalId, @itemMasterId, @nomenclature, @customName, @qty, 'PENDING', GETDATE(), GETDATE())
            `);
        } catch (itemErr) {
          console.error(`❌ Self-healing failed for item ${item.nomenclature}:`, itemErr.message);
        }
      }

      // Re-query after self-healing
      if (stockItems.recordset.length > 0) {
        itemsResult = await pool.request()
          .input('approvalId', sql.UniqueIdentifier, approvalId)
          .query(`
            SELECT 
              ai.*,
              im.item_code,
              im.description as item_description
            FROM approval_items ai
            LEFT JOIN item_masters im ON ai.item_master_id = im.id
            WHERE ai.request_approval_id = @approvalId
            ORDER BY ai.created_at
          `);
      }
    }

    const approvalData = {
      ...approval,
      items: itemsResult.recordset,
      approval_items: itemsResult.recordset,
      request_items: itemsResult.recordset
    };

    res.json({ success: true, data: approvalData });
  } catch (error) {
    console.error('❌ Error fetching approval details:', error);
    res.status(500).json({ error: 'Failed to fetch approval details', details: error.message });
  }
});

console.log('✅ Approvals Routes Loaded');

module.exports = router;
