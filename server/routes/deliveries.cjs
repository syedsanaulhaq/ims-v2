const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection');

// GET /api/deliveries - List all deliveries
router.get('/', async (req, res) => {
  try {
    const { status, tenderId, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT 
        d.*,
        t.title as tender_title,
        COUNT(di.id) as item_count
      FROM deliveries d
      LEFT JOIN tenders t ON d.tender_id = t.id
      LEFT JOIN delivery_items di ON d.id = di.delivery_id
      WHERE 1=1
    `;
    const request = getPool().request();

    if (status) {
      query += ` AND d.is_finalized = @finalized`;
      request.input('finalized', sql.Bit, status === 'finalized' ? 1 : 0);
    }
    if (tenderId) {
      query += ` AND d.tender_id = @tenderId`;
      request.input('tenderId', sql.UniqueIdentifier, tenderId);
    }

    query += ` GROUP BY d.id, d.tender_id, d.po_id, d.delivery_date, d.received_qty, 
                       d.is_finalized, d.created_at, d.updated_at, t.title
               ORDER BY d.delivery_date DESC
               OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    request.input('limit', sql.Int, parseInt(limit));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// GET /api/deliveries/:id - Get delivery details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get delivery
    const deliveryResult = await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM deliveries WHERE id = @id`);

    if (deliveryResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Get delivery items
    const itemsResult = await getPool().request()
      .input('deliveryId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          di.*,
          im.nomenclature,
          im.item_code
        FROM delivery_items di
        LEFT JOIN item_masters im ON di.item_master_id = im.id
        WHERE di.delivery_id = @deliveryId
        ORDER BY im.nomenclature
      `);

    res.json({
      ...deliveryResult.recordset[0],
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching delivery details:', error);
    res.status(500).json({ error: 'Failed to fetch delivery details' });
  }
});

// POST /api/deliveries - Create new delivery
router.post('/', async (req, res) => {
  try {
    const { tender_id, po_id, delivery_items, delivery_date } = req.body;

    if (!tender_id || !delivery_items || delivery_items.length === 0) {
      return res.status(400).json({ error: 'Tender ID and delivery items are required' });
    }

    const id = require('uuid').v4();
    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Create delivery
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('tender_id', sql.UniqueIdentifier, tender_id)
        .input('po_id', sql.UniqueIdentifier, po_id || null)
        .input('delivery_date', sql.DateTime2, delivery_date || new Date())
        .query(`
          INSERT INTO deliveries (id, tender_id, po_id, delivery_date, created_at, updated_at)
          VALUES (@id, @tender_id, @po_id, @delivery_date, GETDATE(), GETDATE())
        `);

      // Add delivery items
      for (const item of delivery_items) {
        const itemId = require('uuid').v4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, itemId)
          .input('delivery_id', sql.UniqueIdentifier, id)
          .input('item_master_id', sql.Int, item.item_master_id)
          .input('delivery_qty', sql.Decimal(18, 2), item.delivery_qty)
          .input('quantity_delivered', sql.Decimal(18, 2), item.delivery_qty)
          .query(`
            INSERT INTO delivery_items (id, delivery_id, item_master_id, delivery_qty, quantity_delivered, created_at)
            VALUES (@id, @delivery_id, @item_master_id, @delivery_qty, @quantity_delivered, GETDATE())
          `);
      }

      await transaction.commit();
      res.json({ success: true, id, message: 'Delivery created successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
});

// PUT /api/deliveries/:id - Update delivery
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_date, delivery_items } = req.body;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Update delivery
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('delivery_date', sql.DateTime2, delivery_date || new Date())
        .query(`
          UPDATE deliveries 
          SET delivery_date = @delivery_date, updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update delivery items if provided
      if (delivery_items && Array.isArray(delivery_items)) {
        for (const item of delivery_items) {
          await transaction.request()
            .input('id', sql.UniqueIdentifier, item.id)
            .input('delivery_qty', sql.Decimal(18, 2), item.delivery_qty)
            .query(`
              UPDATE delivery_items 
              SET delivery_qty = @delivery_qty, quantity_delivered = @delivery_qty
              WHERE id = @id
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Delivery updated successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({ error: 'Failed to update delivery' });
  }
});

// DELETE /api/deliveries/:id - Delete delivery
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = new sql.Transaction(getPool());
    await transaction.begin();

    try {
      // Delete delivery items
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`DELETE FROM delivery_items WHERE delivery_id = @id`);

      // Delete delivery
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`DELETE FROM deliveries WHERE id = @id`);

      await transaction.commit();
      res.json({ success: true, message: 'Delivery deleted successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ error: 'Failed to delete delivery' });
  }
});

// PUT /api/deliveries/:id/finalize - Finalize delivery
router.put('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;

    await getPool().request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE deliveries 
        SET is_finalized = 1, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Delivery finalized successfully' });
  } catch (error) {
    console.error('Error finalizing delivery:', error);
    res.status(500).json({ error: 'Failed to finalize delivery' });
  }
});

// GET /api/deliveries/by-tender/:tenderId - Get deliveries by tender
router.get('/by-tender/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;

    const result = await getPool().request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          d.*,
          t.title as tender_title,
          COUNT(di.id) as item_count
        FROM deliveries d
        LEFT JOIN tenders t ON d.tender_id = t.id
        LEFT JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.tender_id = @tenderId
        GROUP BY d.id, d.tender_id, d.po_id, d.delivery_date, d.received_qty, 
                 d.is_finalized, d.created_at, d.updated_at, t.title
        ORDER BY d.delivery_date DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching tender deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

module.exports = router;
