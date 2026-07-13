const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',  // Check the main DB not _TEST
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkMainDatabase() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check if the table exists
    const tableCheckResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'inventory_verification_requests'
    `);

    if (tableCheckResult.recordset[0].count === 0) {
      } else {
      // Get all verification records
      const allResult = await pool.request().query(`
        SELECT TOP 20
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
      }
    }

    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkMainDatabase();
