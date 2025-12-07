const sql = require('mssql');

// Database connection config
const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

async function runMigration() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database');

    const request = pool.request();

    console.log('📋 Checking for existing view...');
    const viewCheck = await request.query(`
      SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications'
    `);

    if (viewCheck.recordset.length > 0) {
      console.log('📋 Dropping existing view...');
      await request.query(`DROP VIEW dbo.View_Pending_Inventory_Verifications;`);
    }

    // Update view - now with nomenclature
    console.log('📋 Creating updated view...');
    await request.query(`
      CREATE VIEW dbo.View_Pending_Inventory_Verifications AS
      SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ISNULL(ivr.item_nomenclature, 'Unknown Item') AS item_nomenclature,
          ivr.requested_quantity,
          ivr.requested_by_name,
          ivr.requested_by_user_id,
          ivr.requested_at,
          ivr.verification_status,
          CASE 
              WHEN ivr.verification_status LIKE 'verified%' THEN 'verified'
              ELSE 'pending'
          END AS status,
          ivr.verified_by_user_id,
          ivr.verified_by_name,
          ivr.verified_at,
          ivr.physical_count,
          ivr.available_quantity,
          ivr.verification_notes,
          ivr.wing_id,
          ivr.wing_name,
          ivr.created_at,
          ivr.updated_at
      FROM dbo.inventory_verification_requests ivr;
    `);

    console.log('✅ View updated successfully');
    await pool.close();
    console.log('✅ All migrations complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
