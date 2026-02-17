// ============================================================================
// Stock Acquisitions Routes - MILESTONE-1
// ============================================================================
// Handles opening balance entries and stock acquisition tracking
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// POST /api/stock-acquisitions/opening-balance
// Create opening balance entries for existing stock
// ============================================================================
router.post('/opening-balance', async (req, res) => {
  try {
    const {
      tender_reference,
      tender_title,
      source_type,
      acquisition_date,
      remarks,
      items
    } = req.body;

    // Get current user ID (you'll need to add auth middleware)
    const entered_by = req.user?.Id || '00000000-0000-0000-0000-000000000000';

    if (!tender_reference || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Tender reference and at least one item required' 
      });
    }

    const pool = await getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      const createdEntries = [];

      // Create opening balance entry for each item
      for (const item of items) {
        const entryId = uuidv4();

        await transaction.request()
          .input('id', sql.UniqueIdentifier, entryId)
          .input('tender_reference', sql.NVarChar, tender_reference)
          .input('tender_title', sql.NVarChar, tender_title || null)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('quantity_received', sql.Int, item.quantity_received)
          .input('quantity_already_issued', sql.Int, item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .input('source_type', sql.NVarChar, source_type || 'TENDER')
          .input('acquisition_date', sql.Date, acquisition_date || new Date())
          .input('entered_by', sql.UniqueIdentifier, entered_by)
          .input('remarks', sql.NVarChar, remarks || null)
          .query(`
            INSERT INTO opening_balance_entries (
              id, tender_reference, tender_title, item_master_id,
              quantity_received, quantity_already_issued, unit_cost,
              source_type, acquisition_date, entered_by, remarks
            )
            VALUES (
              @id, @tender_reference, @tender_title, @item_master_id,
              @quantity_received, @quantity_already_issued, @unit_cost,
              @source_type, @acquisition_date, @entered_by, @remarks
            )
          `);

        // Immediately process to stock_acquisitions
        const acqNumber = await generateAcquisitionNumber(transaction);
        const acqId = uuidv4();

        await transaction.request()
          .input('acq_id', sql.UniqueIdentifier, acqId)
          .input('acq_number', sql.NVarChar, acqNumber)
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('quantity_received', sql.Decimal(15, 2), item.quantity_received)
          .input('quantity_issued', sql.Decimal(15, 2), item.quantity_already_issued || 0)
          .input('unit_cost', sql.Decimal(15, 2), item.unit_cost || null)
          .input('delivery_date', sql.Date, acquisition_date || new Date())
          .input('processed_by', sql.UniqueIdentifier, entered_by)
          .input('notes', sql.NVarChar, `Opening Balance: ${tender_reference}`)
          .query(`
            INSERT INTO stock_acquisitions (
              id, acquisition_number, item_master_id,
              quantity_received, quantity_issued,
              unit_cost, delivery_date, processed_by, status, notes
            )
            VALUES (
              @acq_id, @acq_number, @item_master_id,
              @quantity_received, @quantity_issued,
              @unit_cost, @delivery_date, @processed_by, 'completed', @notes
            )
          `);

        // Mark opening balance as processed
        await transaction.request()
          .input('entry_id', sql.UniqueIdentifier, entryId)
          .query(`
            UPDATE opening_balance_entries
            SET processed_to_stock = 1
            WHERE id = @entry_id
          `);

        createdEntries.push({
          entryId,
          acqNumber,
          item: item.nomenclature,
          quantity_available: item.quantity_received - (item.quantity_already_issued || 0)
        });
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `Created ${createdEntries.length} opening balance entries`,
        entries: createdEntries
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating opening balance:', error);
    res.status(500).json({ 
      error: 'Failed to create opening balance',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/opening-balance
// Get all opening balance entries
// ============================================================================
router.get('/opening-balance', async (req, res) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT * FROM vw_opening_balance_summary
      ORDER BY entry_date DESC
    `);

    res.json({
      success: true,
      entries: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching opening balance entries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opening balance entries',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/stock-acquisitions/stock-by-item/:itemId
// Get available stock for an item (with FIFO ordering)
// ============================================================================
router.get('/stock-by-item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('item_master_id', sql.UniqueIdentifier, itemId)
      .query(`
        SELECT 
          id,
          acquisition_number,
          quantity_received,
          quantity_issued,
          quantity_available,
          unit_cost,
          delivery_date,
          notes,
          created_at
        FROM stock_acquisitions
        WHERE item_master_id = @item_master_id
          AND quantity_available > 0
        ORDER BY delivery_date ASC, created_at ASC
      `);

    const totalAvailable = result.recordset.reduce(
      (sum, stock) => sum + parseFloat(stock.quantity_available || 0), 
      0
    );

    res.json({
      success: true,
      stocks: result.recordset,
      total_available: totalAvailable
    });

  } catch (error) {
    console.error('❌ Error fetching stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock',
      details: error.message 
    });
  }
});

// ============================================================================
// Helper: Generate acquisition number
// ============================================================================
async function generateAcquisitionNumber(transaction) {
  const result = await transaction.request().query(`
    SELECT ISNULL(MAX(CAST(RIGHT(acquisition_number, 6) AS INT)), 0) as max_num
    FROM stock_acquisitions
    WHERE acquisition_number LIKE 'OPB-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '%'
  `);
  
  const maxNum = result.recordset[0].max_num;
  const year = new Date().getFullYear();
  const newNum = String(maxNum + 1).padStart(6, '0');
  
  return `OPB-${year}-${newNum}`;
}

console.log('✅ Stock Acquisitions Routes Loaded (MILESTONE-1)');

module.exports = router;
