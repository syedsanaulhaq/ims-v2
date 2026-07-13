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
    
    // Check approval_items schema
    const schema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'approval_items'
      ORDER BY ORDINAL_POSITION
    `);
    
    schema.recordset.forEach(col => {
      });
    
    // Check if there are constraints
    const constraints = await pool.request().query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'approval_items'
    `);
    
    constraints.recordset.forEach(c => {
      });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkSchema();
