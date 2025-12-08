const sql = require('mssql');

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
  }
};

async function checkAllRecords() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Check ALL records regardless of status
    console.log('📋 ALL VERIFICATION REQUESTS (No Status Filter):');
    console.log('=====================================');
    const allResult = await pool.request().query(`
      SELECT 
        id,
        item_master_id,
        item_nomenclature,
        requested_quantity,
        verification_status,
        requested_by_user_id,
        requested_by_name,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);
    
    console.log(`Total records in table: ${allResult.recordset.length}`);
    
    if (allResult.recordset.length > 0) {
      allResult.recordset.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ID: ${row.id}`);
        console.log(`   item_master_id: ${row.item_master_id}`);
        console.log(`   item_nomenclature: ${row.item_nomenclature || '(NULL)'}`);
        console.log(`   requested_qty: ${row.requested_quantity}`);
        console.log(`   verification_status: ${row.verification_status}`);
        console.log(`   requested_by: ${row.requested_by_name}`);
        console.log(`   user_id: ${row.requested_by_user_id}`);
        console.log(`   created: ${row.created_at}`);
      });
    } else {
      console.log('No records found in inventory_verification_requests table');
    }

    // Check if there are any records with different filter
    console.log('\n\n📋 View (With All Statuses):');
    console.log('=====================================');
    const viewAllResult = await pool.request().query(`
      SELECT 
        id,
        item_master_id,
        item_nomenclature,
        requested_quantity,
        verification_status,
        status,
        requested_by_user_id,
        requested_by_name,
        created_at
      FROM View_Pending_Inventory_Verifications
    `);
    
    console.log(`Records from view: ${viewAllResult.recordset.length}`);
    if (viewAllResult.recordset.length > 0) {
      viewAllResult.recordset.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ID: ${row.id}`);
        console.log(`   item_nomenclature: ${row.item_nomenclature}`);
        console.log(`   verification_status: ${row.verification_status}`);
        console.log(`   status: ${row.status}`);
      });
    }

    await pool.close();
    console.log('\n✅ Check complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAllRecords();
