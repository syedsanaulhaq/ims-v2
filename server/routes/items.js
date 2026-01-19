// ============================================================================
// Item Master Routes
// ============================================================================
// All item master management endpoints

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection');

// ============================================================================
// GET /api/items-master - Get all active items with optional category filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const categoryId = req.query.category_id;
    const searchTerm = req.query.search;

    console.log(`🔄 GET /api/items-master called with categoryId:`, categoryId);

    let request = pool.request();
    let query = `
      SELECT 
        im.id,
        im.item_code,
        im.nomenclature,
        im.unit,
        im.specifications,
        im.category_id,
        im.sub_category_id,
        c.category_name,
        im.status,
        im.created_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.status = 'Active'
    `;

    if (categoryId) {
      console.log(`📌 Filtering by category_id: ${categoryId}`);
      query += ` AND (im.category_id = @categoryId OR CAST(im.category_id AS VARCHAR(MAX)) = @categoryId)`;
      request = request.input('categoryId', sql.VarChar, categoryId);
    }

    if (searchTerm) {
      query += ` AND (im.nomenclature LIKE @searchTerm OR im.item_code LIKE @searchTerm)`;
      request = request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }

    query += ` ORDER BY im.nomenclature`;

    console.log('📋 Executing query for items');
    const result = await request.query(query);
    const items = result.recordset;

    console.log(`✅ Found ${items.length} items`);

    res.json({
      success: true,
      items: items,
      count: items.length
    });
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      error: 'Failed to fetch items',
      details: error.message
    });
  }
});

// ============================================================================
// GET /api/items-master/:id - Get single item details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          im.id,
          im.item_code,
          im.nomenclature,
          im.unit,
          im.specifications,
          im.category_id,
          im.sub_category_id,
          c.category_name,
          im.status,
          im.created_at,
          im.updated_at
        FROM item_masters im
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE im.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// ============================================================================
// POST /api/items-master - Create new item
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      item_code,
      nomenclature,
      unit,
      specifications,
      category_id,
      sub_category_id,
      status
    } = req.body;

    if (!nomenclature) {
      return res.status(400).json({ error: 'Item nomenclature is required' });
    }

    const itemId = uuidv4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('item_code', sql.NVarChar, item_code || null)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('unit', sql.NVarChar, unit || null)
      .input('specifications', sql.NVarChar, specifications || null)
      .input('category_id', sql.UniqueIdentifier, category_id || null)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id || null)
      .input('status', sql.NVarChar, status || 'Active')
      .input('created_at', sql.DateTime, new Date())
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        INSERT INTO item_masters (id, item_code, nomenclature, unit, specifications, category_id, sub_category_id, status, created_at, updated_at)
        VALUES (@id, @item_code, @nomenclature, @unit, @specifications, @category_id, @sub_category_id, @status, @created_at, @updated_at)
      `);

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      itemId
    });
  } catch (error) {
    console.error('❌ Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// ============================================================================
// PUT /api/items-master/:id - Update item
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_code,
      nomenclature,
      unit,
      specifications,
      category_id,
      sub_category_id,
      status
    } = req.body;

    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_code', sql.NVarChar, item_code || null)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('unit', sql.NVarChar, unit || null)
      .input('specifications', sql.NVarChar, specifications || null)
      .input('category_id', sql.UniqueIdentifier, category_id || null)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id || null)
      .input('status', sql.NVarChar, status || 'Active')
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE item_masters
        SET item_code = @item_code,
            nomenclature = @nomenclature,
            unit = @unit,
            specifications = @specifications,
            category_id = @category_id,
            sub_category_id = @sub_category_id,
            status = @status,
            updated_at = @updated_at
        WHERE id = @id
      `);

    res.json({ message: '✅ Item updated successfully' });
  } catch (error) {
    console.error('❌ Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ============================================================================
// DELETE /api/items-master/:id - Delete item
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Check if item is used in any tender items or PO items
    const usageCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT COUNT(*) as count FROM tender_items WHERE item_master_id = @id
        UNION ALL
        SELECT COUNT(*) as count FROM purchase_order_items WHERE item_master_id = @id
      `);

    if (usageCheck.recordset.some(r => r.count > 0)) {
      return res.status(400).json({
        error: 'Cannot delete item - currently used in tenders or purchase orders'
      });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM item_masters WHERE id = @id');

    res.json({ message: '✅ Item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

console.log('✅ Item Master Routes Loaded');

module.exports = router;
