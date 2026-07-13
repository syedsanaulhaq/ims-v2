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

    // Check what request_type values exist in the database
    const result = await pool.request().query(`
      SELECT DISTINCT request_type FROM stock_issuance_requests
    `);

    // Also check a sample organizational request
    const sample = await pool.request().query(`
      SELECT TOP 5
        id,
        request_type,
        justification,
        requester_wing_id
      FROM stock_issuance_requests
      WHERE request_type = 'Organizational'
      ORDER BY created_date DESC
    `);

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
