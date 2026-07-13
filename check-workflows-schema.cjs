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

async function checkSchema() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'approval_workflows'
      ORDER BY ORDINAL_POSITION
    `);
    
    result.recordset.forEach(col => {
      });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkSchema();
