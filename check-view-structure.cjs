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

async function checkViewStructure() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check view columns
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'View_Pending_Inventory_Verifications'
      ORDER BY ORDINAL_POSITION
    `);
    
    columnsResult.recordset.forEach(col => {
      });

    // Try to select from view with all columns
    const sampleResult = await pool.request().query(`
      SELECT * FROM View_Pending_Inventory_Verifications LIMIT 1
    `);
    
    if (sampleResult.recordset.length > 0) {
      Object.keys(sampleResult.recordset[0]).forEach(key => {
        });
      } else {
      }

    await pool.close();
    } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkViewStructure();
