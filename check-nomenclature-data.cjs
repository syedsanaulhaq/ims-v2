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

async function checkData() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Check what's in inventory_verification_requests table
    console.log('📋 VERIFICATION REQUESTS TABLE:');
    console.log('=====================================');
    const verResult = await pool.request().query(`
      SELECT TOP 5
        id,
        item_master_id,
        item_nomenclature,
        requested_quantity,
        verification_status,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);
    
    console.log(`Total records: ${verResult.recordset.length}`);
    verResult.recordset.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ID: ${row.id}`);
      console.log(`   item_master_id: ${row.item_master_id}`);
      console.log(`   item_nomenclature: ${row.item_nomenclature || '(NULL)'}`);
      console.log(`   requested_qty: ${row.requested_quantity}`);
      console.log(`   status: ${row.verification_status}`);
      console.log(`   created: ${row.created_at}`);
    });

    // Check what the view is returning
    console.log('\n\n📋 VIEW_PENDING_INVENTORY_VERIFICATIONS VIEW:');
    console.log('=====================================');
    const viewResult = await pool.request().query(`
      SELECT TOP 5
        id,
        item_master_id,
        item_nomenclature,
        requested_quantity,
        verification_status,
        status,
        created_at
      FROM View_Pending_Inventory_Verifications
      ORDER BY created_at DESC
    `);
    
    console.log(`Total records: ${viewResult.recordset.length}`);
    viewResult.recordset.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ID: ${row.id}`);
      console.log(`   item_master_id: ${row.item_master_id}`);
      console.log(`   item_nomenclature: ${row.item_nomenclature || '(NULL)'}`);
      console.log(`   requested_qty: ${row.requested_quantity}`);
      console.log(`   verification_status: ${row.verification_status}`);
      console.log(`   status: ${row.status}`);
      console.log(`   created: ${row.created_at}`);
    });

    await pool.close();
    console.log('\n✅ Check complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkData();
