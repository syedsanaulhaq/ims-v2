const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

// GET /api/stock-returns - List all stock returns
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        sr.*,
        u.FullName as returned_by_name
      FROM stock_returns sr
      LEFT JOIN AspNetUsers u ON sr.returned_by = u.Id
      WHERE 1=1
    `;

    const request = getPool().request();

    if (status && status !== 'all') {
      query += ` AND sr.status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    query += ` ORDER BY sr.return_date DESC
               OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    request.input('limit', sql.Int, parseInt(limit));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock returns:', error);
    res.status(500).json({ error: 'Failed to fetch stock returns' });
  }
});

// GET /api/stock-returns/:id - Get stock return details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get return header
    const returnResult = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sr.*,
          u.FullName as returned_by_name,
          a.FullName as approved_by_name
        FROM stock_returns sr
        LEFT JOIN AspNetUsers u ON sr.returned_by = u.Id
        LEFT JOIN AspNetUsers a ON sr.approved_by = a.Id
        WHERE sr.id = @id
      `);

    if (returnResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    // Get return items
    const itemsResult = await getPool().request()
      .input('return_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sri.*,
          im.nomenclature as item_name,
          im.item_code,
          im.unit
        FROM stock_return_items sri
        LEFT JOIN item_masters im ON sri.item_master_id = im.id
        WHERE sri.return_id = @return_id
        ORDER BY im.nomenclature
      `);

    res.json({
      ...returnResult.recordset[0],
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching stock return details:', error);
    res.status(500).json({ error: 'Failed to fetch stock return details' });
  }
});

// POST /api/stock-returns - Create stock return
router.post('/', async (req, res) => {
  try {
    const { return_items, reason, returned_by, remarks } = req.body;

    if (!return_items || return_items.length === 0) {
      return res.status(400).json({ error: 'Return items are required' });
    }

    const id = require('uuid').v4();
    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Create stock return
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('return_date', sql.DateTime2, new Date())
        .input('reason', sql.NVarChar, reason || null)
        .input('returned_by', sql.NVarChar, returned_by)
        .input('remarks', sql.NVarChar, remarks || null)
        .input('status', sql.NVarChar, 'Pending')
        .query(`
          INSERT INTO stock_returns (id, return_date, reason, returned_by, remarks, status, created_at, updated_at)
          VALUES (@id, @return_date, @reason, @returned_by, @remarks, @status, GETDATE(), GETDATE())
        `);

      // Add return items
      for (const item of return_items) {
        const itemId = require('uuid').v4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, itemId)
          .input('return_id', sql.UniqueIdentifier, id)
          .input('item_master_id', sql.Int, item.item_master_id)
          .input('returned_quantity', sql.Decimal(18, 2), item.returned_quantity)
          .input('item_condition', sql.NVarChar, item.item_condition || 'Good')
          .query(`
            INSERT INTO stock_return_items (id, return_id, item_master_id, returned_quantity, item_condition, created_at)
            VALUES (@id, @return_id, @item_master_id, @returned_quantity, @item_condition, GETDATE())
          `);
      }

      await transaction.commit();
      res.json({ success: true, id, message: 'Stock return created successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating stock return:', error);
    res.status(500).json({ error: 'Failed to create stock return' });
  }
});

// PUT /api/stock-returns/:id/approve - Approve stock return
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by, approval_remarks } = req.body;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Update stock return
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approved_by', sql.NVarChar, approved_by)
        .input('approval_remarks', sql.NVarChar, approval_remarks || null)
        .query(`
          UPDATE stock_returns 
          SET status = 'Approved',
              approved_by = @approved_by,
              approval_remarks = @approval_remarks,
              approval_date = GETDATE(),
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Get return items and add back to inventory
      const itemsResult = await transaction.request()
        .input('return_id', sql.UniqueIdentifier, id)
        .query(`SELECT * FROM stock_return_items WHERE return_id = @return_id`);

      for (const item of itemsResult.recordset) {
        // Update inventory stock
        await transaction.request()
          .input('item_master_id', sql.Int, item.item_master_id)
          .input('quantity', sql.Decimal(18, 2), item.returned_quantity)
          .query(`
            UPDATE inventory_stock 
            SET quantity_on_hand = quantity_on_hand + @quantity
            WHERE item_master_id = @item_master_id
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Stock return approved successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error approving stock return:', error);
    res.status(500).json({ error: 'Failed to approve stock return' });
  }
});

// PUT /api/stock-returns/:id/reject - Reject stock return
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .input('rejection_reason', sql.NVarChar, rejection_reason)
      .query(`
        UPDATE stock_returns 
        SET status = 'Rejected',
            rejection_reason = @rejection_reason,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Stock return rejected' });
  } catch (error) {
    console.error('Error rejecting stock return:', error);
    res.status(500).json({ error: 'Failed to reject stock return' });
  }
});

// DELETE /api/stock-returns/:id - Delete stock return (only if pending)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;

    // Check status first
    const checkResult = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT status FROM stock_returns WHERE id = @id AND is_deleted = 0`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    if (checkResult.recordset[0].status !== 'Pending') {
      return res.status(400).json({ error: 'Can only delete pending stock returns' });
    }

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Soft delete items
      await transaction.request()
        .input('return_id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_return_items
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE return_id = @return_id
        `);

      // Soft delete return
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('deletedBy', sql.UniqueIdentifier, deletedBy)
        .query(`
          UPDATE stock_returns
          SET is_deleted = 1,
              deleted_at = GETDATE(),
              deleted_by = @deletedBy
          WHERE id = @id
        `);

      await transaction.commit();
      res.json({ success: true, message: 'Stock return deleted' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting stock return:', error);
    res.status(500).json({ error: 'Failed to delete stock return' });
  }
});

// ============================================================================
// POST /api/stock-returns/:id/restore - Restore deleted stock return
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
          UPDATE stock_returns
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 1
        `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Deleted stock return not found' });
      }

      // Restore return items
      await transaction.request()
        .input('returnId', sql.UniqueIdentifier, id)
        .query(`
          UPDATE stock_return_items
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE return_id = @returnId AND is_deleted = 1
        `);

      await transaction.commit();
      res.json({ success: true, message: '✅ Stock return restored', stockReturn: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error restoring stock return:', error);
    res.status(500).json({ error: 'Failed to restore stock return' });
  }
});

module.exports = router;
