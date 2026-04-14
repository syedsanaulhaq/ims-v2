// ============================================================================
// Inventory Management Routes
// ============================================================================
// Inventory verification workflows and inventory tracking

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/inventory - Get all inventory items (root route for /api/inventory-stock alias)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, category_id, search, includeDeleted } = req.query;

    let query = `
      SELECT 
        im.id,
        im.nomenclature,
        im.description,
        im.unit,
        im.category_id,
        c.category_name,
        COALESCE(
          (SELECT SUM(sa.quantity_available) 
           FROM stock_acquisitions sa 
           WHERE sa.item_master_id = im.id 
             AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)), 0
        ) as quantity_in_stock,
        im.reorder_point,
        im.created_at,
        im.updated_at
      FROM item_masters im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE (im.is_deleted = 0 OR im.is_deleted IS NULL)
    `;

    let request = pool.request();

    if (category_id) {
      query += ` AND im.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.description LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch inventory', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/dashboard-stats - Get dashboard statistics
// ============================================================================
router.get('/dashboard-stats', async (req, res) => {
  try {
    const pool = getPool();

    // Get total items count
    const itemsResult = await pool.request().query(`
      SELECT COUNT(*) as total_items 
      FROM item_masters 
      WHERE is_deleted = 0 OR is_deleted IS NULL
    `);

    // Get total stock value and quantity
    const stockResult = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT sa.item_master_id) as items_with_stock,
        COALESCE(SUM(sa.quantity_available), 0) as total_quantity,
        COALESCE(SUM(sa.quantity_available * ISNULL(sa.unit_cost, 0)), 0) as total_value
      FROM stock_acquisitions sa
      WHERE sa.quantity_available > 0
        AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)
    `);

    // Get low stock items count
    const lowStockResult = await pool.request().query(`
      SELECT COUNT(*) as low_stock_count
      FROM item_masters im
      WHERE im.reorder_point IS NOT NULL
        AND im.reorder_point > 0
        AND (im.is_deleted = 0 OR im.is_deleted IS NULL)
        AND COALESCE(
          (SELECT SUM(sa.quantity_available) 
           FROM stock_acquisitions sa 
           WHERE sa.item_master_id = im.id 
             AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)), 0
        ) <= im.reorder_point
    `);

    // Get pending requests count
    const pendingResult = await pool.request().query(`
      SELECT COUNT(*) as pending_requests
      FROM stock_issuance_requests
      WHERE approval_status IN ('Pending', 'pending')
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `);

    // Get categories count
    const categoriesResult = await pool.request().query(`
      SELECT COUNT(*) as total_categories
      FROM categories
      WHERE is_deleted = 0 OR is_deleted IS NULL
    `);

    res.json({
      success: true,
      total_items: itemsResult.recordset[0].total_items,
      items_with_stock: stockResult.recordset[0].items_with_stock,
      total_quantity: stockResult.recordset[0].total_quantity,
      total_value: stockResult.recordset[0].total_value,
      low_stock_count: lowStockResult.recordset[0].low_stock_count,
      pending_requests: pendingResult.recordset[0].pending_requests,
      total_categories: categoriesResult.recordset[0].total_categories
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard statistics', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/dashboard - Alias for dashboard-stats
// ============================================================================
router.get('/dashboard', async (req, res) => {
  // Redirect to dashboard-stats handler by directly calling it
  try {
    const pool = getPool();

    const itemsResult = await pool.request().query(`
      SELECT COUNT(*) as total_items 
      FROM item_masters 
      WHERE is_deleted = 0 OR is_deleted IS NULL
    `);

    const stockResult = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT sa.item_master_id) as items_with_stock,
        COALESCE(SUM(sa.quantity_available), 0) as total_quantity,
        COALESCE(SUM(sa.quantity_available * ISNULL(sa.unit_cost, 0)), 0) as total_value
      FROM stock_acquisitions sa
      WHERE sa.quantity_available > 0
        AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)
    `);

    const lowStockResult = await pool.request().query(`
      SELECT COUNT(*) as low_stock_count
      FROM item_masters im
      WHERE im.reorder_point IS NOT NULL
        AND im.reorder_point > 0
        AND (im.is_deleted = 0 OR im.is_deleted IS NULL)
        AND COALESCE(
          (SELECT SUM(sa.quantity_available) 
           FROM stock_acquisitions sa 
           WHERE sa.item_master_id = im.id 
             AND (sa.is_deleted = 0 OR sa.is_deleted IS NULL)), 0
        ) <= im.reorder_point
    `);

    res.json({
      success: true,
      total_items: itemsResult.recordset[0].total_items,
      items_with_stock: stockResult.recordset[0].items_with_stock,
      total_quantity: stockResult.recordset[0].total_quantity,
      total_value: stockResult.recordset[0].total_value,
      low_stock_count: lowStockResult.recordset[0].low_stock_count
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

// ============================================================================
// GET /api/inventory/verification - Get inventory verification list
// ============================================================================
router.get('/verification', async (req, res) => {
  try {
    const pool = getPool();
    const { status, wing_id, search } = req.query;

    let query = `
      SELECT 
        iv.id,
        iv.verification_code,
        iv.wing_id,
        iv.status,
        iv.start_date,
        iv.end_date,
        iv.total_items,
        iv.verified_items,
        iv.discrepancy_items,
        iv.created_by,
        iv.created_at,
        w.Name as wing_name,
        u.FullName as created_by_name
      FROM inventory_verifications iv
      LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
      LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (status) {
      query += ` AND iv.status = @status`;
      request = request.input('status', sql.NVarChar(50), status);
    }

    if (wing_id) {
      query += ` AND iv.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (search) {
      query += ` AND (iv.verification_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY iv.created_at DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching inventory verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verifications', details: error.message });
  }
});

// ============================================================================
// GET /api/inventory/verification/:id - Get verification details
// ============================================================================
router.get('/verification/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          iv.*,
          w.Name as wing_name,
          u.FullName as created_by_name
        FROM inventory_verifications iv
        LEFT JOIN WingsInformation w ON iv.wing_id = w.Id
        LEFT JOIN AspNetUsers u ON iv.created_by = u.Id
        WHERE iv.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    const verification = result.recordset[0];

    // Get verification items
    const itemsResult = await pool.request()
      .input('verificationId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          ivi.*,
          im.nomenclature,
          im.unit
        FROM inventory_verification_items ivi
        LEFT JOIN item_masters im ON ivi.item_master_id = im.id
        WHERE ivi.verification_id = @verificationId
      `);

    res.json({
      verification,
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({ error: 'Failed to fetch verification details' });
  }
});

// ============================================================================
// POST /api/inventory/verification - Create new inventory verification
// ============================================================================
router.post('/verification', requireAuth, async (req, res) => {
  try {
    const { wing_id, items } = req.body;
    const pool = getPool();

    if (!wing_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'wing_id and items are required' });
    }

    const verificationId = require('uuid').v4();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create verification record
      await transaction.request()
        .input('id', sql.UniqueIdentifier, verificationId)
        .input('wingId', sql.Int, wing_id)
        .input('totalItems', sql.Int, items.length)
        .input('createdBy', sql.NVarChar(450), req.session.userId)
        .query(`
          INSERT INTO inventory_verifications 
          (id, wing_id, status, total_items, verified_items, discrepancy_items, created_by, created_at)
          VALUES (@id, @wingId, 'In Progress', @totalItems, 0, 0, @createdBy, GETDATE())
        `);

      // Add verification items
      for (const item of items) {
        await transaction.request()
          .input('verificationId', sql.UniqueIdentifier, verificationId)
          .input('itemId', sql.UniqueIdentifier, item.item_id)
          .input('systemQty', sql.Int, item.system_quantity)
          .input('physicalQty', sql.Int, item.physical_quantity)
          .input('status', sql.NVarChar(20), 'Pending')
          .query(`
            INSERT INTO inventory_verification_items 
            (verification_id, item_master_id, system_quantity, physical_quantity, status)
            VALUES (@verificationId, @itemId, @systemQty, @physicalQty, @status)
          `);
      }

      await transaction.commit();
      res.status(201).json({ success: true, verification_id: verificationId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: 'Failed to create verification' });
  }
});

// ============================================================================
// PUT /api/inventory/verification/:id - Update verification status
// ============================================================================
router.put('/verification/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;
    const pool = getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update verification status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar(50), status)
        .query(`
          UPDATE inventory_verifications
          SET status = @status,
              updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await transaction.request()
            .input('itemId', sql.UniqueIdentifier, item.id)
            .input('physicalQty', sql.Int, item.physical_quantity)
            .input('itemStatus', sql.NVarChar(20), item.status)
            .query(`
              UPDATE inventory_verification_items
              SET physical_quantity = @physicalQty,
                  status = @itemStatus
              WHERE id = @itemId
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Verification updated' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ============================================================================
// GET /api/inventory/stock - Get current stock levels
// ============================================================================
router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { wing_id, item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sw.id,
        sw.item_master_id,
        sw.wing_id,
        sw.available_quantity,
        sw.reserved_quantity,
        sw.damaged_quantity,
        im.nomenclature,
        im.unit,
        w.Name as wing_name
      FROM stock_wing sw
      JOIN item_masters im ON sw.item_master_id = im.id
      JOIN WingsInformation w ON sw.wing_id = w.Id
      WHERE 1=1
    `;

    let request = pool.request();

    if (wing_id) {
      query += ` AND sw.wing_id = @wingId`;
      request = request.input('wingId', sql.Int, wing_id);
    }

    if (item_id) {
      query += ` AND sw.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sw.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
});

// ============================================================================
// GET /api/inventory/stock/admin - Get admin stock levels
// ============================================================================
router.get('/stock/admin', async (req, res) => {
  try {
    const pool = getPool();
    const { item_id, low_stock } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.item_master_id,
        sa.available_quantity,
        sa.reserved_quantity,
        sa.damaged_quantity,
        im.nomenclature,
        im.unit
      FROM stock_admin sa
      JOIN item_masters im ON sa.item_master_id = im.id
      WHERE 1=1
    `;

    let request = pool.request();

    if (item_id) {
      query += ` AND sa.item_master_id = @itemId`;
      request = request.input('itemId', sql.UniqueIdentifier, item_id);
    }

    if (low_stock === 'true') {
      query += ` AND sa.available_quantity < 10`;
    }

    query += ` ORDER BY im.nomenclature`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching admin stock:', error);
    res.status(500).json({ error: 'Failed to fetch admin stock' });
  }
});

// ============================================================================
// POST /api/inventory/request-verification - Forward item to store keeper
// ============================================================================
router.post('/request-verification', async (req, res) => {
  try {
    const { 
      stockIssuanceId,
      itemMasterId,
      itemNomenclature,
      requestedQuantity,
      requestedByUserId,
      requestedByName,
      wingId,
      wingName,
      forwardToStoreKeeperId
    } = req.body;

    console.log('📦 Verification request received:', { stockIssuanceId, itemMasterId, itemNomenclature, requestedByUserId, wingId });

    if (!stockIssuanceId || !itemMasterId || !requestedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { stockIssuanceId, itemMasterId, requestedByUserId }
      });
    }

    const pool = getPool();

    // Find a store keeper for this wing
    let storeKeeperUserId = forwardToStoreKeeperId || null;
    let storeKeeperName = null;

    if (storeKeeperUserId) {
      const skResult = await pool.request()
        .input('userId', sql.NVarChar, storeKeeperUserId)
        .query(`SELECT FullName FROM AspNetUsers WHERE Id = @userId`);
      if (skResult.recordset.length > 0) {
        storeKeeperName = skResult.recordset[0].FullName;
      }
    } else if (wingId) {
      // Auto-forward to store keeper in this wing
      const skSearchResult = await pool.request()
        .input('wingId', sql.Int, wingId)
        .query(`
          SELECT TOP 1 u.Id, u.FullName
          FROM AspNetUsers u
          INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
          INNER JOIN ims_roles ir ON ur.role_id = ir.id
          WHERE u.intWingID = @wingId
            AND ir.is_active = 1
            AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
          ORDER BY u.FullName
        `);
      if (skSearchResult.recordset.length > 0) {
        storeKeeperUserId = skSearchResult.recordset[0].Id;
        storeKeeperName = skSearchResult.recordset[0].FullName;
        console.log('✅ Store keeper auto-assigned:', { storeKeeperUserId, storeKeeperName });
      } else {
        console.log('⚠️ No store keepers found for wing:', wingId);
      }
    }

    // Get wing name if not provided
    let finalWingName = wingName || 'Unknown';
    if (wingId && !wingName) {
      const wingQuery = await pool.request()
        .input('wingId', sql.Int, wingId)
        .query(`
          SELECT TOP 1 'Wing ' + CAST(intWingID AS NVARCHAR(10)) AS wing_name
          FROM AspNetUsers WHERE intWingID = @wingId
        `);
      if (wingQuery.recordset.length > 0) {
        finalWingName = wingQuery.recordset[0].wing_name;
      }
    }

    const result = await pool.request()
      .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
      .input('itemMasterId', sql.NVarChar, itemMasterId)
      .input('itemNomenclature', sql.NVarChar, itemNomenclature || 'Unknown Item')
      .input('requestedByUserId', sql.NVarChar, requestedByUserId)
      .input('requestedByName', sql.NVarChar, requestedByName || 'System')
      .input('requestedQuantity', sql.Int, requestedQuantity || 0)
      .input('wingId', sql.Int, wingId || 0)
      .input('wingName', sql.NVarChar, finalWingName)
      .input('forwardedToUserId', sql.NVarChar, storeKeeperUserId || null)
      .input('forwardedToName', sql.NVarChar, storeKeeperName || null)
      .input('forwardedByUserId', sql.NVarChar, requestedByUserId)
      .input('forwardedByName', sql.NVarChar, requestedByName)
      .query(`
        INSERT INTO inventory_verification_requests 
        (stock_issuance_id, item_master_id, item_nomenclature, requested_by_user_id, requested_by_name, 
         requested_quantity, verification_status, wing_id, wing_name, created_at, updated_at,
         forwarded_to_user_id, forwarded_to_name, forwarded_by_user_id, forwarded_by_name, forwarded_at)
        OUTPUT INSERTED.id
        VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, @requestedByUserId, @requestedByName,
                @requestedQuantity, 'pending', @wingId, @wingName, GETDATE(), GETDATE(),
                @forwardedToUserId, @forwardedToName, @forwardedByUserId, @forwardedByName, GETDATE())
      `);

    const verificationId = result.recordset[0]?.id;
    console.log('✅ Verification request created:', verificationId);

    res.json({
      success: true,
      message: 'Verification request created successfully',
      verificationId: verificationId
    });
  } catch (error) {
    console.error('❌ Error requesting verification:', error);
    res.status(500).json({ 
      error: 'Failed to request verification', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/stock/:itemMasterId - Get stock for a specific item
// ============================================================================
router.get('/stock/:itemMasterId', async (req, res) => {
  try {
    const { itemMasterId } = req.params;

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(itemMasterId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const pool = getPool();

    // Get stock from stock_admin (main inventory) and stock_wing
    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, itemMasterId)
      .query(`
        SELECT 
          im.id as item_master_id,
          im.nomenclature,
          im.item_code,
          im.unit,
          im.specifications,
          im.description,
          COALESCE(wing_total.total_wing_qty, 0) as wing_available_quantity,
          COALESCE(admin_stock.admin_qty, 0) as admin_available_quantity,
          COALESCE(admin_stock.admin_qty, 0) as available_quantity,
          im.is_returnable
        FROM item_masters im
        LEFT JOIN (
          SELECT item_master_id, SUM(available_quantity) as total_wing_qty
          FROM stock_wing
          WHERE item_master_id = @itemId
          GROUP BY item_master_id
        ) wing_total ON wing_total.item_master_id = im.id
        LEFT JOIN (
          SELECT item_master_id, available_quantity as admin_qty
          FROM stock_admin
          WHERE item_master_id = @itemId
        ) admin_stock ON admin_stock.item_master_id = im.id
        WHERE im.id = @itemId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found', available_quantity: 0 });
    }

    const item = result.recordset[0];
    res.json({
      item_master_id: item.item_master_id,
      nomenclature: item.nomenclature,
      item_code: item.item_code,
      unit: item.unit,
      description: item.description,
      available_quantity: item.available_quantity,
      quantity: item.available_quantity,
      wing_available_quantity: item.wing_available_quantity,
      admin_available_quantity: item.admin_available_quantity,
      is_returnable: item.is_returnable
    });
  } catch (error) {
    console.error('Error fetching item stock:', error);
    res.status(500).json({ error: 'Failed to fetch item stock' });
  }
});

// ============================================================================
// GET /api/inventory/current-stock - Get current inventory from deliveries
// ============================================================================
router.get('/current-stock', async (req, res) => {
  try {
    const pool = getPool();
    const { search, category_id, low_stock } = req.query;

    let query = `
      SELECT 
        cis.id,
        cis.item_master_id,
        cis.current_quantity,
        cis.last_transaction_date,
        cis.last_transaction_type,
        cis.last_updated,
        im.nomenclature,
        im.item_code,
        im.unit,
        im.specifications,
        c.category_name,
        c.description as category_description
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE 1=1
    `;

    let request = pool.request();

    if (search) {
      query += ` AND (im.nomenclature LIKE @search OR im.item_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (category_id) {
      query += ` AND im.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (low_stock === 'true') {
      query += ` AND cis.current_quantity < 10`;
    }

    query += ` ORDER BY cis.last_transaction_date DESC, im.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      inventory: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching current inventory stock:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch current inventory stock',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/current-stock/summary - Get inventory summary stats
// ============================================================================
router.get('/current-stock/summary', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT cis.item_master_id) as total_items,
        SUM(cis.current_quantity) as total_quantity,
        COUNT(DISTINCT c.id) as total_categories,
        (SELECT COUNT(*) FROM current_inventory_stock WHERE current_quantity < 10) as low_stock_items,
        (SELECT COUNT(*) FROM stock_acquisitions WHERE status = 'completed') as total_acquisitions,
        MAX(cis.last_updated) as last_updated
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
    `);

    res.json({
      success: true,
      summary: result.recordset[0]
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch inventory summary' 
    });
  }
});

// ============================================================================
// GET /api/inventory/stock-breakdown - Get stock with OPB vs new acquisitions breakdown
// ============================================================================
router.get('/stock-breakdown', async (req, res) => {
  try {
    const pool = getPool();
    const { search, category_id, low_stock, show_zero_stock } = req.query;

    let query = `
      SELECT 
        sqb.item_master_id,
        sqb.nomenclature,
        sqb.item_code,
        sqb.unit,
        sqb.specifications,
        sqb.category_id,
        sqb.category_name,
        sqb.sub_category_id,
        sqb.sub_category_name,
        sqb.opening_balance_quantity,
        sqb.new_acquisition_quantity,
        sqb.total_quantity,
        sqb.total_received,
        sqb.total_issued,
        sqb.last_transaction_date,
        sqb.acquisition_count,
        sqb.opening_balance_count,
        sqb.new_acquisition_count
      FROM vw_stock_quantity_breakdown sqb
      WHERE 1=1
    `;

    let request = pool.request();

    if (search) {
      query += ` AND (sqb.nomenclature LIKE @search OR sqb.item_code LIKE @search)`;
      request = request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (category_id) {
      query += ` AND sqb.category_id = @categoryId`;
      request = request.input('categoryId', sql.UniqueIdentifier, category_id);
    }

    if (low_stock === 'true') {
      query += ` AND sqb.total_quantity < 10 AND sqb.total_quantity > 0`;
    }

    // By default, hide items with zero stock unless requested
    if (show_zero_stock !== 'true') {
      query += ` AND sqb.total_quantity > 0`;
    }

    query += ` ORDER BY sqb.total_quantity ASC, sqb.nomenclature`;

    const result = await request.query(query);
    
    res.json({
      success: true,
      inventory: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching stock breakdown:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stock breakdown',
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/inventory/current-stock/:id/history - Get item transaction history
// ============================================================================
router.get('/current-stock/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('itemId', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.delivery_number,
          d.delivery_date,
          d.receiving_date,
          d.delivery_personnel,
          d.delivery_chalan,
          po.po_number,
          di.delivery_qty,
          di.quality_status,
          sa.acquisition_number,
          sa.acquisition_date
        FROM delivery_items di
        INNER JOIN deliveries d ON di.delivery_id = d.id
        INNER JOIN purchase_orders po ON d.po_id = po.id
        LEFT JOIN stock_acquisitions sa ON sa.delivery_id = d.id
        WHERE di.item_master_id = @itemId
          AND d.delivery_status = 'completed'
          AND di.quality_status = 'good'
        ORDER BY d.receiving_date DESC
      `);

    res.json({
      success: true,
      history: result.recordset
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch item history' 
    });
  }
});

console.log('✅ Inventory Routes Loaded');

module.exports = router;
