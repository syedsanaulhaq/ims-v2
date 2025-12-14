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

async function checkWingsInformation() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected\n');

    // Check WingsInformation table
    console.log('=== WINGSINFORMATION TABLE ===');
    const wingsColCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'WingsInformation' ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns:');
    wingsColCheck.recordset.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Get data from WingsInformation
    console.log('\n=== WINGSINFORMATION DATA ===');
    const wingsDataCheck = await pool.request().query(`SELECT * FROM WingsInformation`);
    console.log(`Found ${wingsDataCheck.recordset.length} wing(s):`);
    wingsDataCheck.recordset.forEach((w, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(w)}`);
    });

    // Check inventory_verification_requests wing_id data type
    console.log('\n=== INVENTORY_VERIFICATION_REQUESTS TABLE ===');
    const verCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME LIKE '%wing%' ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Wing-related columns:');
    verCheckResult.recordset.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Check scope_wing_id in ims_user_roles
    console.log('\n=== IMS_USER_ROLES WING COLUMN ===');
    const imsCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ims_user_roles' AND COLUMN_NAME = 'scope_wing_id'
    `);
    
    if (imsCheckResult.recordset.length > 0) {
      console.log(`scope_wing_id: ${imsCheckResult.recordset[0].DATA_TYPE}`);
    }

    // Now check user 3730207514595 wing assignment
    console.log('\n=== USER 3730207514595 WING ASSIGNMENT ===');
    const userWingCheck = await pool.request().query(`
      SELECT ur.user_id, ur.scope_wing_id, u.UserName, u.FullName, r.role_name
      FROM ims_user_roles ur
      LEFT JOIN AspNetUsers u ON ur.user_id = u.Id
      LEFT JOIN ims_roles r ON ur.role_id = r.id
      WHERE u.UserName = '3730207514595'
      ORDER BY r.role_name
    `);
    
    console.log('User roles:');
    userWingCheck.recordset.forEach(row => {
      console.log(`  - ${row.role_name}: scope_wing_id = ${row.scope_wing_id}`);
    });

    // Check WingsInformation ID to find wing 19
    console.log('\n=== CHECKING WING ID 19 IN WINGSINFORMATION ===');
    const wing19Check = await pool.request().query(`
      SELECT * FROM WingsInformation WHERE WingID = 19
    `);
    
    if (wing19Check.recordset.length > 0) {
      console.log('✓ Wing 19 exists:', wing19Check.recordset[0]);
    } else {
      console.log('❌ Wing 19 does NOT exist in WingsInformation');
      console.log('Available wings:', wingsDataCheck.recordset.map(w => w.WingID || w.id).join(', '));
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWingsInformation();
