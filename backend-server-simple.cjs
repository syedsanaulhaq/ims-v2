const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Database configuration
const dbConfig = {
  user: '',
  password: '',
  server: 'SYED-FAZLI-LAPT',
  database: 'InvMISDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Database connection pool
let poolPromise;

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to SQL Server...');
    poolPromise = new sql.ConnectionPool(dbConfig);
    await poolPromise.connect();
    console.log('✅ Connected to SQL Server successfully');
    return poolPromise;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
}

// Initialize database connection
initializeDatabase();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Inventory Management System API v2.0 - Running',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Get inventory dashboard data
app.get('/api/inventory/dashboard', async (req, res) => {
  try {
    console.log('📊 Fetching inventory dashboard data...');
    const pool = await poolPromise;
    
    // Get inventory statistics with proper table names
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT im.item_id) as total_items,
        COUNT(DISTINCT CASE WHEN cs.stock_id IS NOT NULL THEN cs.item_id END) as items_with_stock,
        COALESCE(SUM(CASE WHEN cs.current_quantity > 0 THEN cs.current_quantity ELSE 0 END), 0) as total_quantity,
        COUNT(DISTINCT CASE WHEN cs.current_quantity <= cs.minimum_level AND cs.current_quantity > 0 THEN cs.item_id END) as low_stock_items,
        COUNT(DISTINCT CASE WHEN cs.current_quantity = 0 THEN cs.item_id END) as out_of_stock_items
      FROM ItemMaster im
      LEFT JOIN CurrentStock cs ON im.item_id = cs.item_id
      WHERE im.is_active = 1 OR im.is_active IS NULL
    `;
    
    const statsResult = await pool.request().query(statsQuery);
    const stats = statsResult.recordset[0];
    
    // Get inventory items with stock information
    const itemsQuery = `
      SELECT TOP 100
        im.item_id,
        im.item_code,
        im.item_name,
        im.unit_of_measure,
        im.sub_category_id,
        COALESCE(cs.current_quantity, 0) as current_quantity,
        COALESCE(cs.minimum_level, 0) as minimum_level,
        COALESCE(cs.maximum_level, 0) as maximum_level,
        CASE 
          WHEN cs.current_quantity IS NULL OR cs.current_quantity = 0 THEN 'Out of Stock'
          WHEN cs.current_quantity <= cs.minimum_level THEN 'Low Stock'
          WHEN cs.current_quantity >= cs.maximum_level THEN 'Overstock'
          ELSE 'In Stock'
        END as stock_status
      FROM ItemMaster im
      LEFT JOIN CurrentStock cs ON im.item_id = cs.item_id
      WHERE im.is_active = 1 OR im.is_active IS NULL
      ORDER BY im.item_name
    `;
    
    const itemsResult = await pool.request().query(itemsQuery);
    const items = itemsResult.recordset;
    
    console.log(`✅ Retrieved ${items.length} inventory items`);
    
    res.json({
      success: true,
      stats: {
        totalItems: parseInt(stats.total_items) || 0,
        itemsWithStock: parseInt(stats.items_with_stock) || 0,
        totalQuantity: parseInt(stats.total_quantity) || 0,
        lowStockItems: parseInt(stats.low_stock_items) || 0,
        outOfStockItems: parseInt(stats.out_of_stock_items) || 0
      },
      items: items
    });
    
  } catch (error) {
    console.error('❌ Error fetching inventory dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory dashboard data',
      details: error.message 
    });
  }
});

// Get items for initial inventory setup
app.get('/api/inventory/initial-setup', async (req, res) => {
  try {
    console.log('🔧 Fetching initial setup data...');
    const pool = await poolPromise;
    
    // Get statistics for initial setup
    const statsQuery = `
      SELECT 
        COUNT(im.item_id) as total_items,
        COUNT(cs.stock_id) as configured_items,
        COALESCE(SUM(cs.current_quantity), 0) as total_quantity
      FROM ItemMaster im
      LEFT JOIN CurrentStock cs ON im.item_id = cs.item_id
      WHERE im.is_active = 1 OR im.is_active IS NULL
    `;
    
    const statsResult = await pool.request().query(statsQuery);
    const stats = statsResult.recordset[0];
    
    // Calculate completion percentage
    const completionPercentage = stats.total_items > 0 ? 
      Math.round((stats.configured_items / stats.total_items) * 100) : 0;
    
    // Get items for setup
    const itemsQuery = `
      SELECT 
        im.item_id,
        im.item_code,
        im.item_name,
        im.unit_of_measure,
        im.specifications,
        COALESCE(cs.current_quantity, 0) as current_quantity,
        COALESCE(cs.minimum_level, 0) as minimum_level,
        COALESCE(cs.maximum_level, 0) as maximum_level,
        CASE WHEN cs.stock_id IS NOT NULL THEN 1 ELSE 0 END as is_configured
      FROM ItemMaster im
      LEFT JOIN CurrentStock cs ON im.item_id = cs.item_id
      WHERE im.is_active = 1 OR im.is_active IS NULL
      ORDER BY im.item_name
    `;
    
    const itemsResult = await pool.request().query(itemsQuery);
    const items = itemsResult.recordset;
    
    console.log(`✅ Retrieved ${items.length} items for initial setup`);
    
    res.json({
      success: true,
      stats: {
        totalItems: parseInt(stats.total_items) || 0,
        configuredItems: parseInt(stats.configured_items) || 0,
        totalQuantity: parseInt(stats.total_quantity) || 0,
        completionPercentage: completionPercentage
      },
      items: items
    });
    
  } catch (error) {
    console.error('❌ Error fetching initial setup data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch initial setup data',
      details: error.message 
    });
  }
});

// Update inventory quantities for initial setup
app.post('/api/inventory/initial-setup/update', async (req, res) => {
  try {
    console.log('💾 Updating inventory quantities...');
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      for (const item of items) {
        const { item_id, current_quantity, minimum_level, maximum_level } = item;
        
        // Check if stock record exists
        const checkQuery = `SELECT stock_id FROM CurrentStock WHERE item_id = @item_id`;
        const checkRequest = new sql.Request(transaction);
        checkRequest.input('item_id', sql.UniqueIdentifier, item_id);
        const checkResult = await checkRequest.query(checkQuery);
        
        if (checkResult.recordset.length > 0) {
          // Update existing record
          const updateQuery = `
            UPDATE CurrentStock 
            SET current_quantity = @current_quantity,
                minimum_level = @minimum_level,
                maximum_level = @maximum_level,
                last_updated = GETDATE()
            WHERE item_id = @item_id
          `;
          const updateRequest = new sql.Request(transaction);
          updateRequest.input('item_id', sql.UniqueIdentifier, item_id);
          updateRequest.input('current_quantity', sql.Int, current_quantity || 0);
          updateRequest.input('minimum_level', sql.Int, minimum_level || 0);
          updateRequest.input('maximum_level', sql.Int, maximum_level || 0);
          await updateRequest.query(updateQuery);
        } else {
          // Insert new record
          const insertQuery = `
            INSERT INTO CurrentStock (stock_id, item_id, current_quantity, minimum_level, maximum_level, last_updated)
            VALUES (NEWID(), @item_id, @current_quantity, @minimum_level, @maximum_level, GETDATE())
          `;
          const insertRequest = new sql.Request(transaction);
          insertRequest.input('item_id', sql.UniqueIdentifier, item_id);
          insertRequest.input('current_quantity', sql.Int, current_quantity || 0);
          insertRequest.input('minimum_level', sql.Int, minimum_level || 0);
          insertRequest.input('maximum_level', sql.Int, maximum_level || 0);
          await insertRequest.query(insertQuery);
        }
      }
      
      await transaction.commit();
      console.log(`✅ Updated inventory quantities for ${items.length} items`);
      
      res.json({
        success: true,
        message: `Successfully updated ${items.length} items`,
        updated_count: items.length
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error updating inventory quantities:', error);
    res.status(500).json({ 
      error: 'Failed to update inventory quantities',
      details: error.message 
    });
  }
});

// Get item master statistics
app.get('/api/item-masters/stats', async (req, res) => {
  try {
    console.log('📈 Fetching item master statistics...');
    const pool = await poolPromise;
    
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 END) as active_items,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_items,
        COUNT(DISTINCT sub_category_id) as categories_used
      FROM ItemMaster
    `;
    
    const result = await pool.request().query(query);
    const stats = result.recordset[0];
    
    console.log('✅ Item master statistics retrieved');
    
    res.json({
      success: true,
      stats: {
        totalItems: parseInt(stats.total_items) || 0,
        activeItems: parseInt(stats.active_items) || 0,
        inactiveItems: parseInt(stats.inactive_items) || 0,
        categoriesUsed: parseInt(stats.categories_used) || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching item master statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch item master statistics',
      details: error.message 
    });
  }
});

// Get all item masters
app.get('/api/item-masters', async (req, res) => {
  try {
    console.log('📋 Fetching all item masters...');
    const pool = await poolPromise;
    
    const query = `
      SELECT 
        item_id,
        item_code,
        item_name,
        unit_of_measure,
        specifications,
        sub_category_id,
        is_active,
        created_date
      FROM ItemMaster 
      WHERE is_active = 1 OR is_active IS NULL
      ORDER BY item_name
    `;
    
    const result = await pool.request().query(query);
    const items = result.recordset;
    
    console.log(`✅ Retrieved ${items.length} item masters`);
    
    res.json({
      success: true,
      items: items,
      count: items.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching item masters:', error);
    res.status(500).json({ 
      error: 'Failed to fetch item masters',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Inventory Management System API v2.0`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🗄️ Connected to database: ${dbConfig.database}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    if (poolPromise) {
      await poolPromise.close();
      console.log('✅ Database connection closed');
    }
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  }
  process.exit(0);
});

module.exports = app;