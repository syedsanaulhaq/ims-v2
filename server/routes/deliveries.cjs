const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

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

    query += ` GROUP BY d.id, d.delivery_number, d.tender_id, d.delivery_date, d.delivery_personnel,
                       d.delivery_notes, d.delivery_chalan, d.chalan_file_path,
                       d.is_finalized, d.finalized_at, d.finalized_by, d.created_at, d.updated_at,
                       d.po_id, d.po_number, d.received_by, d.receiving_date, d.delivery_status, d.notes, t.title
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
          .query(`
            INSERT INTO delivery_items (id, delivery_id, item_master_id, delivery_qty, created_at)
            VALUES (@id, @delivery_id, @item_master_id, @delivery_qty, GETDATE())
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
              SET delivery_qty = @delivery_qty
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

// ============================================================================
// PO-BASED DELIVERY ENDPOINTS
// ============================================================================

// GET /api/purchase-orders/:poId/deliveries - Get all deliveries for a PO
router.get('/by-po/:poId', async (req, res) => {
  try {
    const { poId } = req.params;

    const result = await getPool().request()
      .input('poId', sql.UniqueIdentifier, poId)
      .query(`
        SELECT 
          d.id,
          d.delivery_number,
          d.po_id,
          d.po_number,
          d.delivery_date,
          d.delivery_status,
          d.received_by,
          d.receiving_date,
          d.notes,
          d.created_at,
          po.po_number AS po_ref,
          v.vendor_name,
          u.UserName AS received_by_name,
          COUNT(di.id) AS item_count,
          SUM(di.delivery_qty) AS total_quantity,
          SUM(CASE WHEN di.quality_status = 'good' THEN di.delivery_qty ELSE 0 END) AS good_quantity,
          SUM(CASE WHEN di.quality_status = 'damaged' THEN di.delivery_qty ELSE 0 END) AS damaged_quantity,
          SUM(CASE WHEN di.quality_status = 'rejected' THEN di.delivery_qty ELSE 0 END) AS rejected_quantity
        FROM deliveries d
        LEFT JOIN purchase_orders po ON d.po_id = po.id
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN AspNetUsers u ON d.received_by = u.Id
        LEFT JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.po_id = @poId
        GROUP BY 
          d.id, d.delivery_number, d.po_id, d.po_number, d.delivery_date,
          d.delivery_status, d.received_by, d.receiving_date, d.notes, d.created_at,
          po.po_number, v.vendor_name, u.UserName
        ORDER BY d.delivery_date DESC, d.created_at DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching PO deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch PO deliveries', details: error.message });
  }
});

// POST /api/purchase-orders/:poId/deliveries - Create delivery against a PO
router.post('/for-po/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    const { 
      delivery_date,
      delivery_personnel,
      delivery_chalan,
      delivered_by,
      receiving_location,
      notes,
      items // [{ po_item_id, item_master_id, quantity_delivered, quality_status, remarks }]
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Delivery items are required' });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Get PO details
      const poResult = await transaction.request()
        .input('poId', sql.UniqueIdentifier, poId)
        .query(`SELECT po_number, tender_id FROM purchase_orders WHERE id = @poId`);

      if (poResult.recordset.length === 0) {
        throw new Error('Purchase Order not found');
      }

      const { po_number, tender_id } = poResult.recordset[0];

      // Generate delivery number
      const lastDeliveryResult = await transaction.request()
        .query(`
          SELECT MAX(CAST(RIGHT(delivery_number, 6) AS INT)) AS max_number
          FROM deliveries
          WHERE delivery_number LIKE 'DEL-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-%'
        `);

      const lastNumber = lastDeliveryResult.recordset[0]?.max_number || 0;
      const deliveryNumber = `DEL-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(6, '0')}`;

      // Create delivery
      const deliveryId = require('uuid').v4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, deliveryId)
        .input('delivery_number', sql.NVarChar, deliveryNumber)
        .input('po_id', sql.UniqueIdentifier, poId)
        .input('po_number', sql.NVarChar, po_number)
        .input('tender_id', sql.UniqueIdentifier, tender_id)
        .input('delivery_date', sql.DateTime2, delivery_date || new Date())
        .input('delivery_personnel', sql.NVarChar, delivery_personnel || null)
        .input('delivery_chalan', sql.NVarChar, delivery_chalan || null)
        .input('delivery_status', sql.VarChar, 'pending')
        .input('notes', sql.NVarChar, notes || null)
        .query(`
          INSERT INTO deliveries (
            id, delivery_number, po_id, po_number, tender_id, 
            delivery_date, delivery_personnel, delivery_chalan, 
            delivery_status, notes, created_at, updated_at
          )
          VALUES (
            @id, @delivery_number, @po_id, @po_number, @tender_id,
            @delivery_date, @delivery_personnel, @delivery_chalan,
            @delivery_status, @notes, GETDATE(), GETDATE()
          )
        `);

      // Add delivery items
      for (const item of items) {
        const itemId = require('uuid').v4();
        await transaction.request()
          .input('id', sql.UniqueIdentifier, itemId)
          .input('delivery_id', sql.UniqueIdentifier, deliveryId)
          .input('po_item_id', sql.UniqueIdentifier, item.po_item_id)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('delivery_qty', sql.Decimal(18, 2), item.quantity_delivered)
          .input('quality_status', sql.VarChar, item.quality_status || 'good')
          .input('remarks', sql.NVarChar, item.remarks || null)
          .query(`
            INSERT INTO delivery_items (
              id, delivery_id, po_item_id, item_master_id, 
              delivery_qty, quality_status, remarks, created_at
            )
            VALUES (
              @id, @delivery_id, @po_item_id, @item_master_id,
              @delivery_qty, @quality_status, @remarks, GETDATE()
            )
          `);

        // Add serial numbers if provided
        if (item.serial_numbers && Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0) {
          for (const serialNumber of item.serial_numbers) {
            if (serialNumber && serialNumber.trim().length > 0) {
              await transaction.request()
                .input('id', sql.UniqueIdentifier, require('uuid').v4())
                .input('delivery_id', sql.UniqueIdentifier, deliveryId)
                .input('delivery_item_id', sql.UniqueIdentifier, itemId)
                .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
                .input('serial_number', sql.NVarChar, serialNumber.trim())
                .input('notes', sql.NVarChar, item.remarks || null)
                .query(`
                  INSERT INTO delivery_item_serial_numbers (
                    id, delivery_id, delivery_item_id, item_master_id, 
                    serial_number, notes, created_at
                  )
                  VALUES (
                    @id, @delivery_id, @delivery_item_id, @item_master_id,
                    @serial_number, @notes, GETDATE()
                  )
                `);
            }
          }
        }
      }

      await transaction.commit();
      
      res.json({ 
        success: true, 
        id: deliveryId,
        delivery_number: deliveryNumber,
        message: 'Delivery created successfully' 
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating PO delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery', details: error.message });
  }
});

// POST /api/deliveries/:id/receive - Confirm delivery and create stock transactions
router.post('/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    const { received_by, receiving_date, notes } = req.body;

    if (!received_by) {
      return res.status(400).json({ error: 'received_by is required' });
    }

    const pool = getPool();
    
    // Check if delivery exists and is not already received
    const deliveryCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT delivery_status, po_id 
        FROM deliveries 
        WHERE id = @id
      `);

    if (deliveryCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (deliveryCheck.recordset[0].delivery_status === 'completed') {
      return res.status(400).json({ error: 'Delivery already received and processed' });
    }

    if (!deliveryCheck.recordset[0].po_id) {
      return res.status(400).json({ error: 'Delivery not linked to a Purchase Order' });
    }

    // Call stored procedure to create stock transactions
    try {
      const result = await pool.request()
        .input('DeliveryId', sql.UniqueIdentifier, id)
        .input('ReceivedBy', sql.UniqueIdentifier, received_by)
        .output('AcquisitionId', sql.UniqueIdentifier)
        .execute('sp_CreateStockTransactionFromDelivery');

      const acquisitionId = result.output.AcquisitionId;
      const resultData = result.recordset[0];

      // Update delivery status to completed
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('received_by', sql.UniqueIdentifier, received_by)
        .input('receiving_date', sql.DateTime2, receiving_date || new Date())
        .query(`
          UPDATE deliveries 
          SET 
            delivery_status = 'completed',
            received_by = @received_by,
            receiving_date = @receiving_date,
            updated_at = GETDATE()
          WHERE id = @id
        `);

      res.json({ 
        success: true,
        acquisition_id: acquisitionId,
        acquisition_number: resultData?.acquisition_number,
        total_items: resultData?.total_items,
        total_quantity: resultData?.total_quantity,
        total_value: resultData?.total_value,
        message: resultData?.message || 'Delivery received and stock updated successfully'
      });
    } catch (spError) {
      console.error('Stored procedure error:', spError);
      res.status(500).json({ 
        error: 'Failed to process delivery', 
        details: spError.message 
      });
    }
  } catch (error) {
    console.error('Error receiving delivery:', error);
    res.status(500).json({ error: 'Failed to receive delivery', details: error.message });
  }
});

// GET /api/deliveries/:id/items - Get delivery items with details
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getPool().request()
      .input('deliveryId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          di.id,
          di.delivery_id,
          di.po_item_id,
          di.item_master_id,
          di.delivery_qty,
          di.quality_status,
          di.remarks,
          im.nomenclature AS item_name,
          im.item_code,
          im.unit,
          poi.quantity AS po_quantity,
          poi.unit_price,
          (di.delivery_qty * poi.unit_price) AS total_value
        FROM delivery_items di
        INNER JOIN item_masters im ON di.item_master_id = im.id
        LEFT JOIN purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = @deliveryId
        ORDER BY im.nomenclature
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching delivery items:', error);
    res.status(500).json({ error: 'Failed to fetch delivery items', details: error.message });
  }
});

// GET /api/deliveries/:id/serial-numbers - Get serial numbers for a delivery
router.get('/:id/serial-numbers', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getPool().request()
      .input('deliveryId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          disn.id,
          disn.delivery_id,
          disn.delivery_item_id,
          disn.item_master_id,
          disn.serial_number,
          disn.notes,
          disn.created_at,
          im.nomenclature AS item_name,
          im.item_code
        FROM delivery_item_serial_numbers disn
        INNER JOIN item_masters im ON disn.item_master_id = im.id
        WHERE disn.delivery_id = @deliveryId
        ORDER BY im.nomenclature, disn.serial_number
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching serial numbers:', error);
    res.status(500).json({ error: 'Failed to fetch serial numbers', details: error.message });
  }
});

module.exports = router;
