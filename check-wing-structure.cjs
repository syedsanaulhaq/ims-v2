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
    console.log('✅ Connected\n');

    // Check all tables
    console.log('=== CHECKING TABLE STRUCTURES ===\n');

    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `);

    const wingRelatedTables = tablesResult.recordset
      .map(t => t.TABLE_NAME)
      .filter(t => t.toLowerCase().includes('wing') || t.toLowerCase().includes('office') || t.toLowerCase().includes('dec'));

    console.log(`Found ${wingRelatedTables.length} wing/office/department-related tables:`);
    wingRelatedTables.forEach(t => console.log(`  - ${t}`));

    // Check DEC_MST
    console.log('\n=== DEC_MST TABLE ===');
    const decResult = await pool.request().query(`SELECT TOP 5 * FROM DEC_MST`);
    if (decResult.recordset.length > 0) {
      console.log('Columns:', Object.keys(decResult.recordset[0]));
      console.log(`Sample data: ${decResult.recordset[0].DEC_ID} - ${decResult.recordset[0].DEC_NAME}`);
    }

    // Check if wings table exists
    console.log('\n=== WINGS TABLE ===');
    const wingsTableCheck = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wings'
    `);
    
    if (wingsTableCheck.recordset.length > 0) {
      console.log('Wings table exists');
      const wingsColCheck = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wings' ORDER BY ORDINAL_POSITION
      `);
      console.log('Columns:', wingsColCheck.recordset.map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE})`).join(', '));
      
      const wingsDataCheck = await pool.request().query(`SELECT COUNT(*) as cnt FROM wings`);
      console.log(`Data: ${wingsDataCheck.recordset[0].cnt} rows`);
    } else {
      console.log('❌ Wings table does NOT exist');
    }

    // Check inventory_verification_requests
    console.log('\n=== INVENTORY_VERIFICATION_REQUESTS TABLE ===');
    const verTableCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_verification_requests' ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns:');
    verTableCheck.recordset.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Check scope_wing_id data type
    console.log('\n=== IMS_USER_ROLES TABLE ===');
    const imsCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ims_user_roles' AND COLUMN_NAME LIKE '%wing%'
    `);
    
    imsCheckResult.recordset.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWingStructure();
