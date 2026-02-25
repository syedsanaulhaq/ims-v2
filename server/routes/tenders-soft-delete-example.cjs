/**
 * EXAMPLE: Tenders Route with Soft Delete Implementation
 * 
 * This file shows how to implement soft delete for tenders.
 * Use this as a template for other routes.
 * 
 * Key Changes:
 * 1. DELETE endpoint now does UPDATE instead of DELETE
 * 2. All SELECT queries include WHERE is_deleted = 0
 * 3. Added restore endpoint
 * 4. Added trash endpoint
 * 5. Added permanent delete endpoint (admin only)
 */

const express = require('express');
const sql = require('mssql');

const router = express.Router();

// ============================================================================
// GET /api/tenders - Get all active (non-deleted) tenders
// ============================================================================
router.get('/api/tenders', async (req, res) => {
  try {
    const pool = await sql.connect();
    
    // ✅ Added WHERE is_deleted = 0 to filter out soft-deleted records
    const result = await pool.request()
      .query(`
        SELECT 
          t.*,
          COUNT(ti.id) as item_count
        FROM tenders t
        LEFT JOIN tender_items ti ON ti.tender_id = t.id AND ti.is_deleted = 0
        WHERE t.is_deleted = 0
        GROUP BY t.id, t.reference_number, t.title, t.tender_type, 
                 t.status, t.is_finalized, t.created_at
        ORDER BY t.created_at DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// ============================================================================
// GET /api/tenders/:id - Get single tender (only if not deleted)
// ============================================================================
router.get('/api/tenders/:id', async (req, res) => {
  try {
    const pool = await sql.connect();
    
    // ✅ Check is_deleted = 0
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT t.*
        FROM tenders t
        WHERE t.id = @id AND t.is_deleted = 0
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'Tender not found or has been deleted' 
      });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching tender:', error);
    res.status(500).json({ error: 'Failed to fetch tender' });
  }
});

// ============================================================================
// DELETE /api/tenders/:id - Soft delete a tender
// ============================================================================
router.delete('/api/tenders/:id', async (req, res) => {
  try {
    const pool = await sql.connect();
    const { id } = req.params;
    const userId = req.user?.id; // Assumes auth middleware sets req.user
    
    // ✅ UPDATE instead of DELETE
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE tenders 
        SET 
          is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @userId
        OUTPUT DELETED.*
        WHERE id = @id AND is_deleted = 0
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'Tender not found or already deleted' 
      });
    }
    
    // ✅ Also soft delete related items (cascade)
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE tender_items 
        SET 
          is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @userId
        WHERE tender_id = @id AND is_deleted = 0
      `);
    
    // ✅ Soft delete related vendors
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE tender_vendors 
        SET 
          is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @userId
        WHERE tender_id = @id AND is_deleted = 0
      `);
    
    res.json({ 
      success: true, 
      message: 'Tender moved to trash successfully',
      tender: result.recordset[0]
    });
  } catch (error) {
    console.error('Error soft deleting tender:', error);
    res.status(500).json({ error: 'Failed to delete tender' });
  }
});

// ============================================================================
// GET /api/tenders/trash - Get all soft-deleted tenders
// ============================================================================
router.get('/api/tenders/trash', async (req, res) => {
  try {
    const pool = await sql.connect();
    
    // ✅ Only show deleted records
    const result = await pool.request()
      .query(`
        SELECT 
          t.*,
          u.username as deleted_by_name,
          COUNT(ti.id) as deleted_items_count
        FROM tenders t
        LEFT JOIN users u ON t.deleted_by = u.id
        LEFT JOIN tender_items ti ON ti.tender_id = t.id AND ti.is_deleted = 1
        WHERE t.is_deleted = 1
        GROUP BY 
          t.id, t.reference_number, t.title, t.tender_type, 
          t.status, t.is_finalized, t.created_at, 
          t.deleted_at, t.deleted_by, u.username
        ORDER BY t.deleted_at DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching deleted tenders:', error);
    res.status(500).json({ error: 'Failed to fetch deleted tenders' });
  }
});

// ============================================================================
// POST /api/tenders/:id/restore - Restore a soft-deleted tender
// ============================================================================
router.post('/api/tenders/:id/restore', async (req, res) => {
  try {
    const pool = await sql.connect();
    const { id } = req.params;
    
    // ✅ Restore the tender
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE tenders 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 1
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'Tender not found in trash' 
      });
    }
    
    // ✅ Also restore related items
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE tender_items 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL
        WHERE tender_id = @id AND is_deleted = 1
      `);
    
    // ✅ Restore related vendors
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE tender_vendors 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL
        WHERE tender_id = @id AND is_deleted = 1
      `);
    
    res.json({ 
      success: true, 
      message: 'Tender restored successfully',
      tender: result.recordset[0]
    });
  } catch (error) {
    console.error('Error restoring tender:', error);
    res.status(500).json({ error: 'Failed to restore tender' });
  }
});

// ============================================================================
// DELETE /api/tenders/:id/permanent - Permanently delete (admin only)
// ============================================================================
router.delete('/api/tenders/:id/permanent', requireAdmin, async (req, res) => {
  try {
    const pool = await sql.connect();
    const { id } = req.params;
    
    // ✅ Verify it's already soft deleted
    const check = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_deleted FROM tenders WHERE id = @id');
    
    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    if (!check.recordset[0].is_deleted) {
      return res.status(400).json({ 
        error: 'Tender must be soft deleted first. Move to trash before permanent deletion.' 
      });
    }
    
    // ✅ Start transaction for permanent deletion
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Delete in correct order (respecting FK constraints)
      
      // 1. Delete tender vendors
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tender_vendors WHERE tender_id = @id');
      
      // 2. Delete tender items
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tender_items WHERE tender_id = @id');
      
      // 3. Delete tender documents (if table exists)
      try {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .query('DELETE FROM tender_documents WHERE tender_id = @id');
      } catch (err) {
        // Table might not exist, ignore
      }
      
      // 4. Finally delete the tender
      const result = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tenders OUTPUT DELETED.* WHERE id = @id');
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        message: 'Tender permanently deleted',
        tender: result.recordset[0]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error permanently deleting tender:', error);
    res.status(500).json({ error: 'Failed to permanently delete tender' });
  }
});

// ============================================================================
// Middleware: Require admin role
// ============================================================================
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden. Admin access required.' 
    });
  }
  next();
}

// ============================================================================
// BONUS: Bulk restore/delete
// ============================================================================

// Bulk restore multiple tenders
router.post('/api/tenders/bulk-restore', async (req, res) => {
  try {
    const pool = await sql.connect();
    const { ids } = req.body; // Array of tender IDs
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid IDs array' });
    }
    
    // Create comma-separated list for IN clause
    const idsString = ids.map(id => `'${id}'`).join(',');
    
    const result = await pool.request()
      .query(`
        UPDATE tenders 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL
        WHERE id IN (${idsString}) AND is_deleted = 1
      `);
    
    res.json({ 
      success: true, 
      message: `Restored ${result.rowsAffected[0]} tender(s)`,
      count: result.rowsAffected[0]
    });
  } catch (error) {
    console.error('Error bulk restoring tenders:', error);
    res.status(500).json({ error: 'Failed to bulk restore tenders' });
  }
});

// Bulk permanent delete (admin only)
router.delete('/api/tenders/bulk-permanent', requireAdmin, async (req, res) => {
  try {
    const pool = await sql.connect();
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid IDs array' });
    }
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const idsString = ids.map(id => `'${id}'`).join(',');
      
      // Delete related data first
      await transaction.request()
        .query(`DELETE FROM tender_vendors WHERE tender_id IN (${idsString})`);
      
      await transaction.request()
        .query(`DELETE FROM tender_items WHERE tender_id IN (${idsString})`);
      
      const result = await transaction.request()
        .query(`DELETE FROM tenders WHERE id IN (${idsString}) AND is_deleted = 1`);
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        message: `Permanently deleted ${result.rowsAffected[0]} tender(s)`,
        count: result.rowsAffected[0]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error bulk permanent deleting tenders:', error);
    res.status(500).json({ error: 'Failed to bulk permanent delete tenders' });
  }
});

module.exports = router;

/*
 * TESTING CHECKLIST:
 * 
 * [ ] Test soft delete - record moves to trash
 * [ ] Test GET /api/tenders - deleted record not shown
 * [ ] Test GET /api/tenders/:id - 404 for deleted record
 * [ ] Test GET /api/tenders/trash - shows deleted records
 * [ ] Test restore - record comes back
 * [ ] Test permanent delete - record truly gone
 * [ ] Test cascading - items also deleted/restored
 * [ ] Test admin-only endpoints with non-admin user
 * [ ] Test bulk operations
 * 
 */
