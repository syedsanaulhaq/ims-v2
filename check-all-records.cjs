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
    // Check ALL records regardless of status
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
    
    if (allResult.recordset.length > 0) {
      allResult.recordset.forEach((row, idx) => {
        });
    } else {
      }

    // Check if there are any records with different filter
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
    
    if (viewAllResult.recordset.length > 0) {
      viewAllResult.recordset.forEach((row, idx) => {
        });
    }

    await pool.close();
    } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAllRecords();
