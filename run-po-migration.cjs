const sql = require('mssql');
const fs = require('fs');
require('dotenv').config({ path: '.env.sqlserver' });

const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true' || true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

async function runMigration() {
  let pool;
  try {
    console.log('🔗 Connecting to SQL Server...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server');

    // Split by CREATE TRIGGER to execute triggers separately
    const query = fs.readFileSync('add-purchase-orders.sql', 'utf8');
    const triggerSplit = query.split('CREATE TRIGGER');
    
    // First, execute everything before triggers
    if (triggerSplit[0].trim()) {
      console.log('📝 Creating tables and indexes...');
      await pool.request().batch(triggerSplit[0].trim());
    }
    
    // Then execute each trigger separately (triggers need to be in their own batch)
    for (let i = 1; i < triggerSplit.length; i++) {
      console.log(`📝 Creating trigger ${i}/${triggerSplit.length - 1}...`);
      await pool.request().batch('CREATE TRIGGER' + triggerSplit[i]);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Purchase Orders tables created:');
    console.log('   - purchase_orders');
    console.log('   - purchase_order_items');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runMigration();
