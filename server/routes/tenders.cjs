// ============================================================================
// Tender Routes
// ============================================================================
// All tender related endpoints including creation, listing, updates, and vendor management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../db/connection.cjs');
const upload = require('../middleware/fileUpload.cjs');

const normalizeIdList = (value) => {
  if (Array.isArray(value)) {
    const ids = value.map((id) => String(id).trim()).filter(Boolean);
    return ids.length > 0 ? ids.join(',') : null;
  }
  if (typeof value === 'string') {
    const ids = value.split(',').map((id) => id.trim()).filter(Boolean);
    return ids.length > 0 ? ids.join(',') : null;
  }
  return null;
};

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

    tenderData.office_ids = normalizeIdList(tenderData.office_ids);
    tenderData.wing_ids = normalizeIdList(tenderData.wing_ids);
    tenderData.dec_ids = normalizeIdList(tenderData.dec_ids);

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
        is_finalized,
        finalized_at,
        finalized_by,
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
          opening_date,
          office_ids,
          wing_ids,
          dec_ids,
          publication_daily,
          procurement_method,
          procedure_adopted,
          is_finalized,
          finalized_at,
          finalized_by,
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

    // Get tender items with category information
    const itemsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ti.id,
          ti.tender_id,
          ti.item_master_id,
          ti.nomenclature,
          ti.quantity,
          ti.estimated_unit_price,
          ti.total_amount,
          ti.vendor_id,
          ti.specifications,
          ti.remarks,
          c.category_name,
          c.description as category_description,
          v.vendor_name,
          v.vendor_code
        FROM tender_items ti
        LEFT JOIN item_masters im ON ti.item_master_id = im.id
        LEFT JOIN categories c ON im.category_id = c.id
        LEFT JOIN vendors v ON ti.vendor_id = v.id
        WHERE ti.tender_id = @tenderId
        ORDER BY c.description, c.category_name, ti.nomenclature
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
// GET /api/tenders/:id/items - Get items for a tender
// ============================================================================
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get tender items with category and vendor information
    const itemsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ti.id,
          ti.tender_id,
          ti.item_master_id,
          ti.nomenclature,
          ti.quantity,
          ti.estimated_unit_price,
          ti.vendor_id,
          ti.specifications,
          ti.remarks,
          c.category_name,
          c.description as category_description,
          v.vendor_name,
          v.vendor_code
        FROM tender_items ti
        LEFT JOIN item_masters im ON ti.item_master_id = im.id
        LEFT JOIN categories c ON im.category_id = c.id
        LEFT JOIN vendors v ON ti.vendor_id = v.id
        WHERE ti.tender_id = @tenderId
        ORDER BY c.description, c.category_name, ti.nomenclature
      `);

    res.json(itemsResult.recordset);
  } catch (error) {
    console.error('❌ Error fetching tender items:', error);
    res.status(500).json({ error: 'Failed to fetch tender items' });
  }
});

// ============================================================================
// GET /api/tenders/:id/vendors - Get vendors/bidders for a tender
// ============================================================================
router.get('/:id/vendors', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // First check if this is a regular tender with tender_vendors table
    const vendorsResult = await pool.request()
      .input('tenderId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          tv.id,
          tv.tender_id,
          tv.vendor_id,
          tv.vendor_name,
          tv.quoted_amount,
          tv.remarks,
          tv.is_awarded,
          tv.is_successful,
          tv.proposal_document_path,
          tv.created_at,
          v.vendor_code,
          v.contact_person,
          v.phone,
          v.email
        FROM tender_vendors tv
        INNER JOIN vendors v ON tv.vendor_id = v.id
        WHERE tv.tender_id = @tenderId
        ORDER BY tv.vendor_name
      `);

    // If no vendors found in tender_vendors, check if it's an annual tender with items
    if (vendorsResult.recordset.length === 0) {
      const itemVendorsResult = await pool.request()
        .input('tenderId', sql.UniqueIdentifier, id)
        .query(`
          SELECT DISTINCT
            v.id as vendor_id,
            v.vendor_name,
            v.vendor_code,
            v.contact_person,
            v.phone,
            v.email,
            1 as is_successful
          FROM tender_items ti
          INNER JOIN vendors v ON ti.vendor_id = v.id
          WHERE ti.tender_id = @tenderId AND ti.vendor_id IS NOT NULL
          ORDER BY v.vendor_name
        `);
      
      return res.json(itemVendorsResult.recordset);
    }

    res.json(vendorsResult.recordset);
  } catch (error) {
    console.error('❌ Error fetching tender vendors:', error);
    res.status(500).json({ error: 'Failed to fetch tender vendors' });
  }
});

// ============================================================================
// PUT /api/tenders/:id - Update tender
// ============================================================================
router.put('/:id', async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const { id } = req.params;
    const { items = [], ...tenderData } = req.body;

    tenderData.office_ids = normalizeIdList(tenderData.office_ids);
    tenderData.wing_ids = normalizeIdList(tenderData.wing_ids);
    tenderData.dec_ids = normalizeIdList(tenderData.dec_ids);

    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];

    const updateRequest = transaction.request();
    updateRequest.input('id', sql.UniqueIdentifier, id);
    updateRequest.input('updated_at', sql.DateTime, new Date());

    let updateQuery = 'UPDATE tenders SET updated_at = @updated_at';

    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        updateQuery += `, ${field} = @${field}`;
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

        updateRequest.input(field, sqlType, value);
      }
    }

    updateQuery += ' WHERE id = @id';
    await updateRequest.query(updateQuery);

    if (Array.isArray(items)) {
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');

      if (items.length > 0) {
        const tender_type = tenderData.tender_type || 'contract';
        const awardedVendorId = tenderData.vendor_id || tenderData.awarded_vendor_id;
        const now = new Date();

        for (const item of items) {
          const itemRequest = transaction.request();
          itemRequest.input('id', sql.UniqueIdentifier, uuidv4());
          itemRequest.input('tender_id', sql.UniqueIdentifier, id);
          itemRequest.input('created_at', sql.DateTime2, now);
          itemRequest.input('updated_at', sql.DateTime2, now);

          let itemVendorId = null;
          if (tender_type === 'annual-tender') {
            const vendorFromList = Array.isArray(item.vendor_ids) ? item.vendor_ids[0] : null;
            itemVendorId = item.vendor_id || vendorFromList || null;
          } else if (['contract', 'spot-purchase'].includes(tender_type)) {
            itemVendorId = awardedVendorId || item.vendor_id || null;
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
    }

    await transaction.commit();
    res.json({ message: '✅ Tender updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error updating tender:', error);
    res.status(500).json({ error: 'Failed to update tender' });
  }
});

// ============================================================================
// PUT /api/tenders/:id/finalize - Finalize tender
// ============================================================================
router.put('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalized_by } = req.body;
    const pool = getPool();

    // Check if tender exists
    const tenderCheck = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_finalized FROM tenders WHERE id = @id');

    if (tenderCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tenderCheck.recordset[0].is_finalized) {
      return res.status(400).json({ error: 'Tender is already finalized' });
    }

    // Update tender to finalized
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('finalized_by', sql.NVarChar(450), finalized_by || 'System')
      .query(`
        UPDATE tenders 
        SET is_finalized = 1,
            finalized_at = GETDATE(),
            finalized_by = @finalized_by,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    console.log(`✅ Tender ${id} finalized successfully`);
    res.json({ 
      success: true, 
      message: '✅ Tender finalized successfully',
      is_finalized: true,
      finalized_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error finalizing tender:', error);
    res.status(500).json({ error: 'Failed to finalize tender' });
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
