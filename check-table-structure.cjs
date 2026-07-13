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

async function checkTableStructure() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    const result = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_issuance_requests'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach(col => {
      });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.close();
  }
}

checkTableStructure();