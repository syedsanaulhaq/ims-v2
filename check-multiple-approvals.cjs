const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function checkApprovals() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    const result = await pool.query('SELECT request_id, COUNT(*) as count FROM request_approvals GROUP BY request_id HAVING COUNT(*) > 1');
    result.recordset.forEach(row => {
      });
    pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkApprovals();