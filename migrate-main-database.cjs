const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',  // Main database
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function addNomenclatureColumn() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to InventoryManagementDB\n');

    // Check if column already exists
    console.log('📋 Checking if item_nomenclature column exists...');
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_verification_requests' 
      AND COLUMN_NAME = 'item_nomenclature'
    `);

    if (checkResult.recordset[0].count > 0) {
      console.log('✅ Column item_nomenclature already exists!');
    } else {
      console.log('❌ Column does not exist, adding it...');
      
      await pool.request().query(`
        ALTER TABLE inventory_verification_requests
        ADD item_nomenclature NVARCHAR(500) NULL;
      `);
      
      console.log('✅ Column item_nomenclature added successfully!');
    }

    // Now update the view
    console.log('\n📋 Updating View_Pending_Inventory_Verifications...');
    
    // Drop existing view if it exists
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.views WHERE name = 'View_Pending_Inventory_Verifications')
      BEGIN
        DROP VIEW dbo.View_Pending_Inventory_Verifications;
      END
    `);

    // Recreate the view
    await pool.request().query(`
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

    console.log('✅ View updated successfully!');

    // Test the view
    console.log('\n📋 Testing view...');
    const testResult = await pool.request().query(`
      SELECT TOP 5 
        id,
        item_nomenclature,
        requested_by_name,
        verification_status,
        created_at
      FROM View_Pending_Inventory_Verifications
      ORDER BY created_at DESC
    `);

    console.log(`✅ View test successful! Found ${testResult.recordset.length} records`);
    
    if (testResult.recordset.length > 0) {
      console.log('\nSample records:');
      testResult.recordset.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.item_nomenclature} (${row.verification_status})`);
      });
    }

    await pool.close();
    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

addNomenclatureColumn();
