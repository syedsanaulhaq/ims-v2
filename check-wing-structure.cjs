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

async function checkWingStructure() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // Check all tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `);

    const wingRelatedTables = tablesResult.recordset
      .map(t => t.TABLE_NAME)
      .filter(t => t.toLowerCase().includes('wing') || t.toLowerCase().includes('office') || t.toLowerCase().includes('dec'));

    wingRelatedTables.forEach(t => );

    // Check DEC_MST
    const decResult = await pool.request().query(`SELECT TOP 5 * FROM DEC_MST`);
    if (decResult.recordset.length > 0) {
      }

    // Check if wings table exists
    const wingsTableCheck = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wings'
    `);
    
    if (wingsTableCheck.recordset.length > 0) {
      const wingsColCheck = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wings' ORDER BY ORDINAL_POSITION
      `);
      const wingsDataCheck = await pool.request().query(`SELECT COUNT(*) as cnt FROM wings`);
      } else {
      }

    // Check inventory_verification_requests
    const verTableCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_verification_requests' ORDER BY ORDINAL_POSITION
    `);
    
    verTableCheck.recordset.forEach(c => {
      });

    // Check scope_wing_id data type
    const imsCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ims_user_roles' AND COLUMN_NAME LIKE '%wing%'
    `);
    
    imsCheckResult.recordset.forEach(c => {
      });

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWingStructure();
