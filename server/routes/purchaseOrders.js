// ============================================================================
// Purchase Orders Routes
// ============================================================================
// All purchase order related endpoints

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection');

// ============================================================================
// GET /api/purchase-orders - List all POs with filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { tenderId, vendorId, status, startDate, endDate } = req.query;
    const pool = getPool();
    
    // Debug: Log incoming parameters
    console.log('🔍 GET /api/purchase-orders params:', { tenderId, vendorId, status, startDate, endDate });
    
    // Validate UUID format
    const isValidUUID = (uuid) => {
      if (!uuid || typeof uuid !== 'string') return false;
      const trimmed = String(uuid).trim();
      if (!trimmed) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(trimmed);
    };

    let query = `
      SELECT 
        po.id,
        po.po_number,
        po.tender_id,
        po.vendor_id,
        po.po_date,
        po.total_amount,
        po.status,
        po.remarks,
        po.created_at,
        t.title as tender_title,
        t.tender_type,
        v.vendor_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) as item_count
      FROM purchase_orders po
      LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
      LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
      WHERE 1=1
    `;

    const request = pool.request();

    if (tenderId && isValidUUID(tenderId)) {
      query += ' AND po.tender_id = @tenderId';
      request.input('tenderId', sql.UniqueIdentifier, tenderId.trim());
    }

    if (vendorId && isValidUUID(vendorId)) {
      query += ' AND po.vendor_id = @vendorId';
      request.input('vendorId', sql.UniqueIdentifier, vendorId.trim());
    }

    if (status && typeof status === 'string' && status.trim() && status.trim() !== 'undefined') {
      query += ' AND po.status = @status';
      request.input('status', sql.NVarChar, status.trim());
    }

    if (startDate && typeof startDate === 'string' && startDate.trim() && startDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(startDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date >= @startDate';
          request.input('startDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        console.warn('⚠️ Invalid startDate format:', startDate);
      }
    }

    if (endDate && typeof endDate === 'string' && endDate.trim() && endDate.trim() !== 'undefined') {
      try {
        const parsedDate = new Date(endDate.trim());
        if (!isNaN(parsedDate.getTime())) {
          query += ' AND po.po_date <= @endDate';
          request.input('endDate', sql.DateTime, parsedDate);
        }
      } catch (e) {
        console.warn('⚠️ Invalid endDate format:', endDate);
      }
    }

    query += ' ORDER BY po.created_at DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching POs:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      state: error.state
    });

    // If table doesn't exist or there's a schema issue, return empty array
    if (error.message && (error.message.includes('Invalid object name') || error.message.includes('purchase_orders'))) {
      console.warn('⚠️ Purchase orders table may not exist or has schema issues. Returning empty array.');
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to fetch purchase orders', details: error.message });
    }
  }
});

// ============================================================================
// GET /api/purchase-orders/:id - Get specific PO with items
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get PO details
    const poResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          po.id,
          po.po_number,
          po.tender_id,
          po.vendor_id,
          po.po_date,
          po.total_amount,
          po.status,
          po.remarks,
          po.created_at,
          po.updated_at,
          t.title as tender_title,
          t.tender_type,
          v.vendor_name,
          v.vendor_code,
          v.contact_person,
          v.phone,
          v.email
        FROM purchase_orders po
        LEFT JOIN tenders t ON TRY_CAST(po.tender_id AS UNIQUEIDENTIFIER) = t.id
        LEFT JOIN vendors v ON TRY_CAST(po.vendor_id AS UNIQUEIDENTIFIER) = v.id
        WHERE po.id = @id
      `);

    if (poResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const po = poResult.recordset[0];

    // Get PO items
    const itemsResult = await pool.request()
      .input('poId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          poi.id,
          poi.po_id,
          poi.item_master_id,
          poi.quantity,
          poi.unit_price,
          poi.total_price,
          poi.specifications,
          im.nomenclature,
          im.unit,
          im.category_id,
          c.category_name
        FROM purchase_order_items poi
        INNER JOIN item_masters im ON poi.item_master_id = im.id
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE poi.po_id = @poId
        ORDER BY im.nomenclature
      `);

    res.json({
      ...po,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching PO details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});

// ============================================================================
// POST /api/purchase-orders - Create POs from tender items
// ============================================================================
router.post('/', async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const { tenderId, selectedItems, poDate, itemVendors, itemPrices, itemQuantities } = req.body;

    console.log('📦 PO CREATION REQUEST RECEIVED:');
    console.log('   - tenderId:', tenderId);
    console.log('   - selectedItems count:', selectedItems?.length);
    console.log('   - poDate:', poDate);

    if (!tenderId || !selectedItems || selectedItems.length === 0 || !poDate) {
      return res.status(400).json({ error: 'Missing required fields: tenderId, selectedItems, poDate' });
    }

    // First, get tender info to know its type
    const tenderRequest = await transaction.request()
      .input('tenderId', sql.UniqueIdentifier, tenderId)
      .query(`SELECT tender_type, vendor_id FROM tenders WHERE id = @tenderId`);

    if (tenderRequest.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderRequest.recordset[0];
    const isSingleVendorType = ['contract', 'spot-purchase']
      .includes(tender.tender_type?.toLowerCase());

    // Get the latest PO number to generate new ones
    const lastPoRequest = transaction.request();
    const lastPoResult = await lastPoRequest.query(`
      SELECT MAX(CAST(SUBSTRING(po_number, PATINDEX('%[0-9]%', po_number), LEN(po_number)) AS INT)) as max_number
      FROM purchase_orders
      WHERE po_number LIKE 'PO%'
    `);

    const lastNumber = lastPoResult.recordset[0]?.max_number || 0;
    let poCounter = lastNumber + 1;

    // Get all items from tender_items
    const allItems = [];
    const itemPricesMap = itemPrices || {};
    const itemVendorsMap = itemVendors || {};
    const itemQuantitiesMap = itemQuantities || {};

    for (const itemId of selectedItems) {
      // Fetch tender_items with all details
      const itemResult = await transaction.request()
        .input('itemId', sql.UniqueIdentifier, itemId)
        .input('tenderId', sql.UniqueIdentifier, tenderId)
        .query(`
          SELECT 
            ti.id,
            ti.item_master_id,
            ti.quantity,
            ti.nomenclature,
            ti.vendor_id,
            ti.estimated_unit_price,
            im.id as item_master_id_lookup
          FROM tender_items ti
          LEFT JOIN item_masters im ON ti.item_master_id = im.id
          WHERE ti.id = @itemId AND ti.tender_id = @tenderId
        `);

      if (itemResult.recordset.length > 0) {
        const item = itemResult.recordset[0];
        const unitPrice = itemPricesMap[itemId] || item.estimated_unit_price || 0;
        const quantity = itemQuantitiesMap[itemId] || item.quantity || 1;

        let itemVendorId;
        if (isSingleVendorType) {
          // For contract/spot: use tender's vendor
          itemVendorId = tender.vendor_id;
        } else {
          // For annual-tender: use vendor_id from tender_items
          itemVendorId = item.vendor_id || itemVendorsMap[itemId];
        }

        if (!itemVendorId) {
          console.warn(`⚠️ No vendor_id found for item ${itemId}`);
          await transaction.rollback();
          return res.status(400).json({ error: `No vendor selected for item ${itemId}` });
        }

        allItems.push({
          ...item,
          unit_price: unitPrice,
          quantity: quantity,
          vendor_id: itemVendorId
        });
      }
    }

    if (allItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No valid items found for the selected tender' });
    }

    // GROUP ITEMS BY VENDOR_ID
    const itemsByVendor = {};
    for (const item of allItems) {
      const vendorId = item.vendor_id;
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(item);
    }

    // CREATE SEPARATE PO FOR EACH VENDOR
    const createdPos = [];
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;
      for (const item of vendorItems) {
        vendorTotal += (item.unit_price || 0) * (item.quantity || 1);
      }

      const poNumber = `PO${String(poCounter).padStart(6, '0')}`;
      poCounter++;

      // Insert PO
      const poInsert = transaction.request()
        .input('po_number', sql.NVarChar, poNumber)
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId)
        .input('po_date', sql.DateTime, new Date(poDate))
        .input('total_amount', sql.Decimal(15, 2), vendorTotal)
        .input('status', sql.NVarChar, 'draft')
        .input('created_at', sql.DateTime, new Date());

      const poResult = await poInsert.query(`
        INSERT INTO purchase_orders (po_number, tender_id, vendor_id, po_date, total_amount, status, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@po_number, @tender_id, @vendor_id, @po_date, @total_amount, @status, @created_at, GETDATE())
      `);

      const poId = poResult.recordset[0].id;

      // Insert PO items for this vendor
      for (const item of vendorItems) {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        await transaction.request()
          .input('po_id', sql.UniqueIdentifier, poId)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id_lookup || item.item_master_id)
          .input('quantity', sql.Decimal(10, 2), item.quantity || 1)
          .input('unit_price', sql.Decimal(15, 2), item.unit_price || 0)
          .input('total_price', sql.Decimal(15, 2), itemTotal)
          .input('specifications', sql.NVarChar, item.specifications || null)
          .input('created_at', sql.DateTime, new Date())
          .query(`
            INSERT INTO purchase_order_items (po_id, item_master_id, quantity, unit_price, total_price, specifications, created_at)
            VALUES (@po_id, @item_master_id, @quantity, @unit_price, @total_price, @specifications, @created_at)
          `);
      }

      createdPos.push({
        id: poId,
        po_number: poNumber,
        vendor_id: vendorId,
        item_count: vendorItems.length,
        total_amount: vendorTotal
      });

      console.log(`✅ Created PO ${poNumber} for vendor ${vendorId} with ${vendorItems.length} items`);
    }

    await transaction.commit();
    res.json({
      message: `✅ ${createdPos.length} Purchase Order(s) created successfully${createdPos.length > 1 ? ' (grouped by vendor)' : ''}`,
      pos: createdPos
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating POs:', error);
    res.status(500).json({ error: 'Failed to create purchase orders', details: error.message });
  }
});

// ============================================================================
// PUT /api/purchase-orders/:id - Update PO status
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const pool = getPool();

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE purchase_orders
        SET status = @status,
            remarks = @remarks,
            updated_at = @updated_at
        WHERE id = @id
      `);

    res.json({ message: '✅ Purchase order updated successfully' });
  } catch (error) {
    console.error('❌ Error updating PO:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// ============================================================================
// PUT /api/purchase-orders/:id/finalize - Finalize PO
// ============================================================================
router.put('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Check if PO exists and is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id');

    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only finalize draft purchase orders' });
    }

    // Update status to finalized
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE purchase_orders 
        SET status = 'finalized', updated_at = GETDATE()
        WHERE id = @id
      `);

    console.log(`✅ Purchase order ${id} finalized`);
    res.json({ message: '✅ Purchase order finalized successfully', status: 'finalized' });
  } catch (error) {
    console.error('❌ Error finalizing PO:', error);
    res.status(500).json({ error: 'Failed to finalize purchase order' });
  }
});

// ============================================================================
// DELETE /api/purchase-orders/:id - Delete PO (only if draft)
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Check if PO is draft
    const poCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT status FROM purchase_orders WHERE id = @id');

    if (poCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (poCheck.recordset[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft purchase orders' });
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM purchase_orders WHERE id = @id');

    res.json({ message: '✅ Purchase order deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting PO:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

console.log('✅ Purchase Orders Routes Loaded');

module.exports = router;
