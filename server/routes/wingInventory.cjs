// ============================================================================
// Wing Inventory Routes
// ============================================================================

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
// GET /api/wing-inventory/requests - All stock issuance requests for caller's wing
// ============================================================================
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const pool = getPool();

    // Resolve the current user's wing
    const userRes = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(`
        SELECT u.intWingID, w.Name as wing_name
        FROM AspNetUsers u
        LEFT JOIN WingsInformation w ON u.intWingID = w.Id
        WHERE u.Id = @userId
      `);

    const wingId = userRes.recordset[0]?.intWingID;
    const wingName = userRes.recordset[0]?.wing_name || 'Your Wing';

    if (!wingId) {
      return res.json({ success: true, wing_name: wingName, requests: [] });
    }

    // Fetch all requests from wing members
    const reqResult = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT
          sir.id,
          sir.request_number,
          sir.request_type,
          COALESCE(sir.purpose, 'Stock Issuance Request') AS title,
          COALESCE(sir.justification, sir.purpose, '') AS description,
          sir.created_at AS requested_date,
          sir.submitted_at AS submitted_date,
          u.FullName AS requester_name,
          COALESCE(sir.request_status, 'pending') AS current_status,
          COALESCE(sir.approval_status, sir.request_status, 'pending') AS final_status,
          COALESCE(sir.urgency_level, 'Medium') AS priority
        FROM stock_issuance_requests sir
        INNER JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE u.intWingID = @wingId
        ORDER BY sir.submitted_at DESC
      `);

    const requests = reqResult.recordset;

    if (requests.length === 0) {
      return res.json({ success: true, wing_name: wingName, requests: [] });
    }

    // Fetch items for all requests in a single query
    const requestIds = requests.map(r => `'${r.id}'`).join(',');
    const itemsResult = await pool.request().query(`
      SELECT
        sii.id,
        sii.request_id,
        COALESCE(im.nomenclature, sii.nomenclature, 'Unknown Item') AS item_name,
        sii.requested_quantity,
        sii.approved_quantity,
        COALESCE(im.unit, 'units') AS unit
      FROM stock_issuance_items sii
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      WHERE sii.request_id IN (${requestIds})
    `);

    // Map items to requests
    const itemsByRequest = {};
    itemsResult.recordset.forEach(item => {
      if (!itemsByRequest[item.request_id]) {
        itemsByRequest[item.request_id] = [];
      }
      itemsByRequest[item.request_id].push(item);
    });

    const enriched = requests.map(r => ({
      ...r,
      items: itemsByRequest[r.id] || [],
      total_items: (itemsByRequest[r.id] || []).length
    }));

    res.json({ success: true, wing_name: wingName, requests: enriched });
  } catch (error) {
    console.error('❌ Error fetching wing request history:', error);
    res.status(500).json({ error: 'Failed to fetch wing request history', details: error.message });
  }
});

// ============================================================================
// GET /api/wing-inventory/:wingId - All issued items for a wing
// ============================================================================
router.get('/:wingId', requireAuth, async (req, res) => {
  try {
    const { wingId } = req.params;
    const pool = getPool();

    const itemsQuery = `
      SELECT
        sii.id AS ledger_id,
        sir.request_number,
        COALESCE(im.nomenclature, sii.nomenclature, 'Unknown Item') AS nomenclature,
        c.category_name,
        COALESCE(
          NULLIF(sii.issued_quantity, 0),
          NULLIF(sii.approved_quantity, 0),
          sii.requested_quantity,
          0
        ) AS issued_quantity,
        0 AS unit_price,
        sir.submitted_at AS issued_at,
        approver.FullName AS issued_by_name,
        u.FullName AS issued_to_name,
        u.Id AS issued_to_id,
        sir.request_type AS purpose,
        COALESCE(sir.is_returnable, 0) AS is_returnable,
        sir.expected_return_date,
        NULL AS actual_return_date,
        'Not Returned' AS return_status,
        CASE
          WHEN sir.is_returnable = 1
            AND sir.expected_return_date IS NOT NULL
            AND sir.expected_return_date < GETDATE()
          THEN 'Overdue'
          ELSE 'Not Returned'
        END AS current_return_status,
        COALESCE(sir.approval_status, 'Issued') AS status,
        '' AS issuance_notes
      FROM stock_issuance_items sii
      INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
      INNER JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN item_masters im ON sii.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN AspNetUsers approver ON sir.approved_by_user_id = approver.Id
      WHERE u.intWingID = @wingId
        AND UPPER(COALESCE(sir.approval_status, '')) IN ('ISSUED', 'COMPLETED')
      ORDER BY sir.submitted_at DESC
    `;

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(itemsQuery);

    const items = result.recordset;

    const summary = {
      total_items: items.length,
      unique_users: new Set(items.map(i => i.issued_to_id)).size,
      returnable_items: items.filter(i => i.is_returnable).length,
      not_returned: items.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: items.filter(i => i.current_return_status === 'Overdue').length
    };

    const userMap = new Map();
    items.forEach(item => {
      const uid = item.issued_to_id;
      if (!userMap.has(uid)) {
        userMap.set(uid, { user_id: uid, user_name: item.issued_to_name, items_count: 0, overdue_count: 0 });
      }
      const s = userMap.get(uid);
      s.items_count++;
      if (item.current_return_status === 'Overdue') s.overdue_count++;
    });

    const userBreakdown = Array.from(userMap.values()).sort((a, b) => b.items_count - a.items_count);

    res.json({ items, summary, userBreakdown });
  } catch (error) {
    console.error('❌ Error fetching wing inventory:', error);
    res.status(500).json({ error: 'Failed to fetch wing inventory', details: error.message });
  }
});

module.exports = router;
