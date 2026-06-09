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
  try {
    const { item_ids, tender_id, tender_type, tender_reference } = req.body;
    const pool = getPool();

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

    // Update each required item
    for (const itemId of item_ids) {
      await pool.request()
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

    res.json({
      success: true,
      message: `${item_ids.length} item(s) linked to tender "${tenderRef}"`,
      tender_id,
      linked_count: item_ids.length
    });
  } catch (error) {
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

module.exports = router;
