const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check the actual data in request_approvals
    const result = await pool.request().query(`
      SELECT TOP 1 * FROM request_approvals ORDER BY id DESC
    `);

    if (result.recordset.length > 0) {
      const record = result.recordset[0];
      Object.keys(record).forEach(key => {
        });
    } else {
      }

    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
