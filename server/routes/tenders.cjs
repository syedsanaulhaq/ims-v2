// ============================================================================
// Tender Routes
// ============================================================================
// All tender related endpoints including creation, listing, updates, and vendor management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection');
const upload = require('../middleware/fileUpload');

// ============================================================================
// POST /api/tenders - Create new tender with items and documents
// ============================================================================
router.post('/', upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'loi_file', maxCount: 1 },
  { name: 'noting_file', maxCount: 1 },
  { name: 'po_file', maxCount: 1 },
  { name: 'rfp_file', maxCount: 1 }
]), async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    // Parse tender data from FormData or JSON
    let tenderData, items;
    if (req.body.tenderData) {
      const parsedData = JSON.parse(req.body.tenderData);
      items = parsedData.items;
      tenderData = { ...parsedData };
      delete tenderData.items;
    } else {
      const { items: itemsFromBody, ...tenderDataFromBody } = req.body;
      items = itemsFromBody;
      tenderData = tenderDataFromBody;
    }

    console.log('✅ POST /api/tenders - Creating new tender');
    console.log('📊 Tender type:', tenderData.tender_type);
    console.log('📋 Total items to create:', items?.length || 0);

    if (items && items.length > 0) {
      console.log('📦 Items received:');
      items.forEach((item, idx) => {
        console.log(`  Item ${idx}: ${item.nomenclature}`);
      });
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.contract_file) {
        tenderData.contract_file_path = req.files.contract_file[0].filename;
      }
      if (req.files.loi_file) {
        tenderData.loi_file_path = req.files.loi_file[0].filename;
      }
      if (req.files.noting_file) {
        tenderData.noting_file_path = req.files.noting_file[0].filename;
      }
      if (req.files.po_file) {
        tenderData.po_file_path = req.files.po_file[0].filename;
      }
      if (req.files.rfp_file) {
        tenderData.rfp_file_path = req.files.rfp_file[0].filename;
      }
    }

    // Insert into tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.UniqueIdentifier, tenderId);

    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];

    let insertQuery = 'INSERT INTO tenders (id, created_at, updated_at, is_finalized';
    let valuesQuery = 'VALUES (@id, @created_at, @updated_at, 0';
    
    tenderRequest.input('created_at', sql.DateTime, now);
    tenderRequest.input('updated_at', sql.DateTime, now);

    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        insertQuery += `, ${field}`;
        valuesQuery += `, @${field}`;
        let value = tenderData[field];
        let sqlType = sql.NVarChar;

        if (field.endsWith('_date') || field.endsWith('_deadline')) {
          sqlType = sql.DateTime;
          value = value ? new Date(value) : null;
        } else if (field.endsWith('_value') || field.endsWith('_total') || field === 'quantity') {
          sqlType = sql.Decimal(15, 2);
          value = value ? parseFloat(value) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.UniqueIdentifier;
        }
        tenderRequest.input(field, sqlType, value);
      }
    }

    insertQuery += ') ' + valuesQuery + ')';
    await tenderRequest.query(insertQuery);

    // Insert tender items
    if (items && Array.isArray(items) && items.length > 0) {
      const tender_type = tenderData.tender_type || 'contract';
      const awardedVendorId = tenderData.vendor_id || tenderData.awarded_vendor_id;

      console.log('📦 Processing items for tender type:', tender_type);

      for (const item of items) {
        console.log(`📝 Processing item: ${item.nomenclature}`);
        const itemRequest = transaction.request();
        itemRequest.input('id', sql.UniqueIdentifier, uuidv4());
        itemRequest.input('tender_id', sql.UniqueIdentifier, tenderId);
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);

        let itemVendorId = null;
        if (tender_type === 'annual-tender') {
          itemVendorId = item.vendor_id || null;
        } else if (['contract', 'spot-purchase'].includes(tender_type)) {
          itemVendorId = awardedVendorId || item.vendor_id;
        }

        itemRequest.input('vendor_id', sql.UniqueIdentifier, itemVendorId || null);

        let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at, vendor_id';
        let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at, @vendor_id';

        const itemFields = [
          'item_master_id', 'nomenclature', 'quantity', 'quantity_received',
          'estimated_unit_price', 'actual_unit_price', 'total_amount',
          'specifications', 'remarks', 'status'
        ];

        for (const field of itemFields) {
          if (item[field] !== undefined) {
            itemInsertQuery += `, ${field}`;
            itemValuesQuery += `, @${field}`;
            let value = item[field];
            let sqlType = sql.NVarChar;

            if (['quantity', 'quantity_received', 'estimated_unit_price', 'actual_unit_price', 'total_amount'].includes(field)) {
              if (field === 'quantity' || field === 'quantity_received') {
                sqlType = sql.Int;
                value = value ? parseInt(value, 10) : null;
              } else {
                sqlType = sql.Decimal(15, 2);
                value = value ? parseFloat(value) : null;
              }
            } else if (field === 'item_master_id') {
              sqlType = sql.UniqueIdentifier;
            }
            itemRequest.input(field, sqlType, value);
          }
        }

        itemInsertQuery += ') ' + itemValuesQuery + ')';
        await itemRequest.query(itemInsertQuery);
      }
    }

    await transaction.commit();
    res.status(201).json({ 
      success: true, 
      message: 'Tender created successfully', 
      tenderId 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create tender:', error);
    res.status(500).json({ 
      error: 'Failed to create tender', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/tenders - List all tenders with filtering
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { type, status, searchTerm } = req.query;

    let query = `
      SELECT 
        id,
        reference_number,
        title,
        description,
        tender_type,
        status,
        estimated_value,
        publish_date,
        submission_deadline,
        created_at
      FROM tenders
      WHERE 1=1
    `;

    const request = pool.request();

    if (type && type !== 'all') {
      query += ' AND tender_type = @type';
      request.input('type', sql.NVarChar, type);
    }

    if (status && status !== 'all') {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, status);
    }

    if (searchTerm) {
      query += ' AND (title LIKE @searchTerm OR reference_number LIKE @searchTerm)';
      request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching tenders:', error);
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// ============================================================================
// GET /api/tenders/:id - Get tender details with items
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get tender details
    const tenderResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          reference_number,
          title,
          description,
          tender_type,
          status,
          estimated_value,
          publish_date,
          submission_deadline,
          created_at,
          updated_at,
          vendor_id,
          created_by
        FROM tenders
        WHERE id = @id
      `);

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderResult.recordset[0];

    // Get tender items
    const itemsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          tender_id,
          item_master_id,
          nomenclature,
          quantity,
          estimated_unit_price,
          vendor_id,
          specifications,
          remarks
        FROM tender_items
        WHERE tender_id = @tenderId
        ORDER BY nomenclature
      `);

    res.json({
      ...tender,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching tender details:', error);
    res.status(500).json({ error: 'Failed to fetch tender details' });
  }
});

// ============================================================================
// PUT /api/tenders/:id - Update tender
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, estimated_value } = req.body;
    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description)
      .input('status', sql.NVarChar, status)
      .input('estimated_value', sql.Decimal(15, 2), estimated_value)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE tenders
        SET title = @title,
            description = @description,
            status = @status,
            estimated_value = @estimated_value,
            updated_at = @updated_at
        WHERE id = @id
      `);

    res.json({ message: '✅ Tender updated successfully' });
  } catch (error) {
    console.error('❌ Error updating tender:', error);
    res.status(500).json({ error: 'Failed to update tender' });
  }
});

// ============================================================================
// DELETE /api/tenders/:id - Delete tender
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tenders WHERE id = @id');

    res.json({ message: '✅ Tender deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting tender:', error);
    res.status(500).json({ error: 'Failed to delete tender' });
  }
});

console.log('✅ Tender Routes Loaded');

module.exports = router;
