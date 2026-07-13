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
    // Check WingsInformation table
    const wingsColCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'WingsInformation' ORDER BY ORDINAL_POSITION
    `);
    
    wingsColCheck.recordset.forEach(c => {
      });

    // Get data from WingsInformation
    const wingsDataCheck = await pool.request().query(`SELECT * FROM WingsInformation`);
    wingsDataCheck.recordset.forEach((w, i) => {
      });

    // Check inventory_verification_requests wing_id data type
    const verCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_verification_requests' AND COLUMN_NAME LIKE '%wing%' ORDER BY ORDINAL_POSITION
    `);
    
    verCheckResult.recordset.forEach(c => {
      });

    // Check scope_wing_id in ims_user_roles
    const imsCheckResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ims_user_roles' AND COLUMN_NAME = 'scope_wing_id'
    `);
    
    if (imsCheckResult.recordset.length > 0) {
      }

    // Now check user 3730207514595 wing assignment
    const userWingCheck = await pool.request().query(`
      SELECT ur.user_id, ur.scope_wing_id, u.UserName, u.FullName, r.role_name
      FROM ims_user_roles ur
      LEFT JOIN AspNetUsers u ON ur.user_id = u.Id
      LEFT JOIN ims_roles r ON ur.role_id = r.id
      WHERE u.UserName = '3730207514595'
      ORDER BY r.role_name
    `);
    
    userWingCheck.recordset.forEach(row => {
      });

    // Check WingsInformation ID to find wing 19
    const wing19Check = await pool.request().query(`
      SELECT * FROM WingsInformation WHERE WingID = 19
    `);
    
    if (wing19Check.recordset.length > 0) {
      } else {
      }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWingsInformation();
