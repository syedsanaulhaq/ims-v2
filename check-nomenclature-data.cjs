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
    // Check what's in inventory_verification_requests table
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
    
    verResult.recordset.forEach((row, idx) => {
      });

    // Check what the view is returning
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
    
    viewResult.recordset.forEach((row, idx) => {
      });

    await pool.close();
    } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkData();
