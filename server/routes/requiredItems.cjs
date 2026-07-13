// ============================================================================
// Required Items Routes
// POST /api/required-items        - (internal use, logged by issue endpoint)
// GET  /api/required-items        - List all pending required items
// GET  /api/required-items/summary - Grouped summary by item
// POST /api/required-items/link-tender - Link items to a tender
// PUT  /api/required-items/:id/cancel  - Cancel a required item
// ============================================================================

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// ============================================================================
// GET /api/required-items - List required items with filters
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { status = 'Pending', urgency, wing_id, limit = 100, offset = 0 } = req.query;

    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset));

    let whereClause = `WHERE ri.is_deleted = 0`;
    if (status && status !== 'all') {
      whereClause += ` AND ri.status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    if (urgency) {
      whereClause += ` AND ri.urgency_level = @urgency`;
      request.input('urgency', sql.NVarChar, urgency);
    }
    if (wing_id) {
      whereClause += ` AND ri.requested_by_wing_id = @wing_id`;
      request.input('wing_id', sql.Int, parseInt(wing_id));
    }

    const result = await request.query(`
      SELECT
        ri.id,
        ri.nomenclature,
        ri.quantity_needed,
        ri.unit,
        ri.urgency_level,
        ri.status,
        ri.source_request_id,
        ri.source_request_number,
        ri.requested_by_wing_name,
        ri.tender_id,
        ri.tender_type,
        ri.tender_reference,
        ri.notes,
        ri.created_at,
        ri.item_master_id,
        im.item_code,
        im.category_id,
        c.category_name,
        u.FullName AS created_by_name
      FROM required_items ri
      LEFT JOIN item_masters im ON ri.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN AspNetUsers u ON ri.created_by = u.Id
      ${whereClause}
      ORDER BY
        CASE ri.urgency_level
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        ri.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    // Count
    const countReq = pool.request();
    if (status && status !== 'all') countReq.input('status', sql.NVarChar, status);
    if (urgency) countReq.input('urgency', sql.NVarChar, urgency);
    if (wing_id) countReq.input('wing_id', sql.Int, parseInt(wing_id));
    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total FROM required_items ri
      ${whereClause.replace('@limit', '').replace('@offset', '')}
    `);

    res.json({
      success: true,
      data: result.recordset,
      total: countResult.recordset[0]?.total || 0
    });
  } catch (error) {
    console.error('❌ Error fetching required items:', error);
    res.status(500).json({ error: 'Failed to fetch required items', details: error.message });
  }
});

// ============================================================================
// GET /api/required-items/summary - Grouped by item name + total qty needed
// ============================================================================
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT
        COALESCE(ri.item_master_id, NEWID()) AS group_key,
        ri.item_master_id,
        ri.nomenclature,
        ri.unit,
        SUM(ri.quantity_needed) AS total_quantity_needed,
        COUNT(DISTINCT ri.source_request_id) AS request_count,
        MAX(ri.urgency_level) AS highest_urgency,
        STRING_AGG(ri.source_request_number, ', ') AS source_requests,
        MIN(ri.created_at) AS oldest_request_date,
        im.item_code,
        c.category_name
      FROM required_items ri
      LEFT JOIN item_masters im ON ri.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE ri.is_deleted = 0 AND ri.status = 'Pending'
      GROUP BY ri.item_master_id, ri.nomenclature, ri.unit, im.item_code, c.category_name
      ORDER BY
        CASE MAX(ri.urgency_level)
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        SUM(ri.quantity_needed) DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching required items summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

// ============================================================================
// GET /api/required-items/stats - Counts by status
// ============================================================================
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT
        status,
        COUNT(*) AS count,
        SUM(quantity_needed) AS total_qty
      FROM required_items
      WHERE is_deleted = 0
      GROUP BY status
    `);

    const stats = { Pending: 0, 'In Tender': 0, Procured: 0, Cancelled: 0 };
    result.recordset.forEach(r => { stats[r.status] = r.count; });
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================================
// POST /api/required-items/link-tender
// Link one or more required items to a tender (existing or newly created)
// Body: { item_ids: string[], tender_id: string, tender_type: string, tender_reference?: string }
// ============================================================================
router.post('/link-tender', requireAuth, async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { item_ids, tender_id, tender_type, tender_reference } = req.body;

    if (!item_ids?.length || !tender_id || !tender_type) {
      return res.status(400).json({ error: 'item_ids, tender_id, and tender_type are required' });
    }

    // Verify tender exists
    const tenderCheck = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, tender_id)
      .query(`SELECT id, title, reference_number FROM tenders WHERE id = @tenderId AND is_deleted = 0`);

    if (tenderCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderCheck.recordset[0];
    const tenderRef = tender_reference || tender.reference_number || tender.title;
    await transaction.begin();

    const demandItems = [];

    // Update each required item
    for (const itemId of item_ids) {
      const itemResult = await transaction.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .query(`
          SELECT id, item_master_id, nomenclature, quantity_needed, unit, notes
          FROM required_items
          WHERE id = @id
            AND is_deleted = 0
            AND status IN ('Pending', 'Planned')
        `);

      const requiredItem = itemResult.recordset[0];
      if (!requiredItem) continue;
      demandItems.push(requiredItem);

      await transaction.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('tenderId', sql.UniqueIdentifier, tender_id)
        .input('tenderType', sql.NVarChar, tender_type)
        .input('tenderRef', sql.NVarChar, tenderRef)
        .query(`
          UPDATE required_items
          SET status = 'In Tender',
              tender_id = @tenderId,
              tender_type = @tenderType,
              tender_reference = @tenderRef,
              updated_at = GETDATE()
          WHERE id = @id AND is_deleted = 0
        `);
    }

    const groupedDemand = new Map();
    for (const item of demandItems) {
      const key = item.item_master_id ? `master:${item.item_master_id}` : `custom:${item.nomenclature}`;
      const existing = groupedDemand.get(key) || {
        item_master_id: item.item_master_id,
        nomenclature: item.nomenclature,
        quantity: 0,
        unit: item.unit,
        notes: []
      };
      existing.quantity += Number(item.quantity_needed || 0);
      if (item.notes) existing.notes.push(item.notes);
      groupedDemand.set(key, existing);
    }

    for (const item of groupedDemand.values()) {
      await transaction.request()
        .input('tenderId', sql.UniqueIdentifier, tender_id)
        .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id || null)
        .input('nomenclature', sql.NVarChar(500), item.nomenclature)
        .input('quantity', sql.Int, Math.max(1, item.quantity))
        .input('remarks', sql.NVarChar(sql.MAX), item.notes.length ? item.notes.join('\n') : 'Created from required-items demand')
        .query(`
          IF EXISTS (
            SELECT 1
            FROM tender_items
            WHERE tender_id = @tenderId
              AND (
                item_master_id = @itemMasterId
                OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
              )
          )
          BEGIN
            UPDATE tender_items
            SET quantity = ISNULL(quantity, 0) + @quantity,
                remarks = @remarks,
                updated_at = GETDATE()
            WHERE tender_id = @tenderId
              AND (
                item_master_id = @itemMasterId
                OR (item_master_id IS NULL AND @itemMasterId IS NULL AND nomenclature = @nomenclature)
              );
          END
          ELSE
          BEGIN
            INSERT INTO tender_items
              (id, tender_id, item_master_id, nomenclature, quantity, remarks, status, created_at, updated_at)
            VALUES
              (NEWID(), @tenderId, @itemMasterId, @nomenclature, @quantity, @remarks, 'pending', GETDATE(), GETDATE());
          END
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `${item_ids.length} item(s) linked to tender "${tenderRef}"`,
      tender_id,
      linked_count: demandItems.length,
      tender_item_count: groupedDemand.size
    });
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error('❌ Error linking items to tender:', error);
    res.status(500).json({ error: 'Failed to link items to tender', details: error.message });
  }
});

// ============================================================================
// PUT /api/required-items/:id/cancel - Cancel a required item
// ============================================================================
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('notes', sql.NVarChar, reason || 'Cancelled by admin')
      .query(`
        UPDATE required_items
        SET status = 'Cancelled',
            notes = @notes,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Required item cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel item', details: error.message });
  }
});

// ============================================================================
// PUT /api/required-items/:id/mark-procured - Mark item as procured
// Called when stock is received via stockAcquisitions
// ============================================================================
router.put('/:id/mark-procured', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE required_items
        SET status = 'Procured',
            resolved_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Item marked as procured' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as procured', details: error.message });
  }
});

// ============================================================================
// GET /api/required-items/forwarded - List stock issuance requests that have
// been forwarded to procurement (grouped by source request)
// Query: status, wing_id, limit, offset
// ============================================================================
router.get('/forwarded', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { status = 'all', wing_id, limit = 50, offset = 0 } = req.query;

    // Base filters
    let baseWhere = `ri.is_deleted = 0 AND ri.source_request_id IS NOT NULL`;
    if (status && status !== 'all') {
      baseWhere += ` AND ri.status = @status`;
    }
    if (wing_id) {
      baseWhere += ` AND ri.requested_by_wing_id = @wing_id`;
    }

    // Count distinct source requests
    const countReq = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset));
    if (status && status !== 'all') countReq.input('status', sql.NVarChar, status);
    if (wing_id) countReq.input('wing_id', sql.Int, parseInt(wing_id));

    const countResult = await countReq.query(`
      SELECT COUNT(DISTINCT ri.source_request_id) AS total
      FROM required_items ri
      WHERE ${baseWhere}
    `);

    // Status stats for forwarded procurement items
    const statsReq = pool.request();
    if (status && status !== 'all') statsReq.input('status', sql.NVarChar, status);
    if (wing_id) statsReq.input('wing_id', sql.Int, parseInt(wing_id));

    const statsResult = await statsReq.query(`
      SELECT
        ri.status,
        COUNT(DISTINCT ri.source_request_id) AS request_count,
        COUNT(ri.id) AS item_count,
        SUM(ri.quantity_needed) AS total_qty
      FROM required_items ri
      WHERE ${baseWhere}
      GROUP BY ri.status
    `);

    const stats = {
      total_requests: countResult.recordset[0]?.total || 0,
      total_items: 0,
      Pending: 0,
      'In Tender': 0,
      Procured: 0,
      Cancelled: 0,
      Planned: 0
    };

    statsResult.recordset.forEach(row => {
      stats.total_items += Number(row.item_count || 0);
      if (row.status in stats) {
        stats[row.status] = Number(row.request_count || 0);
      }
    });

    // Paginated request headers
    const headerReq = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset));
    if (status && status !== 'all') headerReq.input('status', sql.NVarChar, status);
    if (wing_id) headerReq.input('wing_id', sql.Int, parseInt(wing_id));

    const headerResult = await headerReq.query(`
      WITH DistinctRequests AS (
        SELECT DISTINCT ri.source_request_id
        FROM required_items ri
        WHERE ${baseWhere}
      ),
      RankedRequests AS (
        SELECT
          dr.source_request_id,
          MIN(ri.created_at) AS forwarded_at,
          ROW_NUMBER() OVER (ORDER BY MIN(ri.created_at) DESC) AS rn
        FROM DistinctRequests dr
        INNER JOIN required_items ri ON dr.source_request_id = ri.source_request_id
        WHERE ri.is_deleted = 0
          AND (@status IS NULL OR @status = 'all' OR ri.status = @status)
          AND (@wing_id IS NULL OR ri.requested_by_wing_id = @wing_id)
        GROUP BY dr.source_request_id
      )
      SELECT
        sir.id AS source_request_id,
        sir.request_number AS source_request_number,
        sir.request_type,
        sir.urgency_level,
        sir.purpose,
        sir.submitted_at,
        u.FullName AS requester_name,
        w.wing_name,
        b.branch_name,
        o.office_name,
        ra.current_status AS approval_status,
        rr.forwarded_at,
        COUNT(ri.id) AS item_count
      FROM RankedRequests rr
      LEFT JOIN stock_issuance_requests sir ON rr.source_request_id = sir.id
      LEFT JOIN request_approvals ra ON sir.id = ra.request_id
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN wings w ON sir.requester_wing_id = w.id
      LEFT JOIN branches b ON sir.requester_branch_id = b.id
      LEFT JOIN offices o ON sir.requester_office_id = o.id
      LEFT JOIN required_items ri ON rr.source_request_id = ri.source_request_id
        AND ri.is_deleted = 0
        AND (@status IS NULL OR @status = 'all' OR ri.status = @status)
        AND (@wing_id IS NULL OR ri.requested_by_wing_id = @wing_id)
      WHERE rr.rn > @offset AND rr.rn <= (@offset + @limit)
      GROUP BY
        sir.id, sir.request_number, sir.request_type, sir.urgency_level, sir.purpose,
        sir.submitted_at, u.FullName, w.wing_name, b.branch_name, o.office_name,
        ra.current_status, rr.forwarded_at
      ORDER BY rr.forwarded_at DESC
    `);

    const requests = headerResult.recordset;

    if (requests.length > 0) {
      const sourceIds = requests.map(r => r.source_request_id);

      // Build parameterized IN clause
      const params = sourceIds.map((id, index) => ({ name: `id${index}`, value: id }));
      const inClause = params.map(p => `@${p.name}`).join(',');

      const itemReq = pool.request();
      params.forEach(p => itemReq.input(p.name, sql.UniqueIdentifier, p.value));
      if (status && status !== 'all') itemReq.input('status', sql.NVarChar, status);
      if (wing_id) itemReq.input('wing_id', sql.Int, parseInt(wing_id));

      const itemResult = await itemReq.query(`
        SELECT
          ri.id,
          ri.nomenclature,
          ri.quantity_needed,
          ri.unit,
          ri.status,
          ri.source_request_id,
          ri.tender_id,
          ri.tender_type,
          ri.tender_reference,
          ri.notes,
          ri.created_at,
          im.item_code
        FROM required_items ri
        LEFT JOIN item_masters im ON ri.item_master_id = im.id
        WHERE ri.is_deleted = 0
          AND ri.source_request_id IN (${inClause})
          AND (@status IS NULL OR @status = 'all' OR ri.status = @status)
          AND (@wing_id IS NULL OR ri.requested_by_wing_id = @wing_id)
        ORDER BY ri.created_at DESC
      `);

      const itemsByRequest = new Map();
      itemResult.recordset.forEach(item => {
        const list = itemsByRequest.get(item.source_request_id) || [];
        list.push(item);
        itemsByRequest.set(item.source_request_id, list);
      });

      requests.forEach(req => {
        req.items = itemsByRequest.get(req.source_request_id) || [];
      });
    }

    res.json({
      success: true,
      data: requests,
      total: stats.total_requests,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching forwarded procurement requests:', error);
    res.status(500).json({ error: 'Failed to fetch forwarded procurement requests', details: error.message });
  }
});

module.exports = router;
