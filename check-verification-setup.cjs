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

async function checkVerificationSetup() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // First check wings table structure
    const wingsCheckResult = await pool.request()
      .query(`SELECT TOP 1 * FROM wings`);
    // Check user and their wing assignment
    const userResult = await pool.request()
      .query(`
        SELECT 
          ur.user_id,
          u.UserName,
          u.FullName,
          r.role_name,
          ur.scope_type,
          ur.scope_wing_id,
          w.*
        FROM ims_user_roles ur
        LEFT JOIN AspNetUsers u ON ur.user_id = u.Id
        LEFT JOIN ims_roles r ON ur.role_id = r.id
        LEFT JOIN wings w ON ur.scope_wing_id = w.id
        WHERE u.UserName = '3730207514595'
      `);
    
    if (userResult.recordset.length === 0) {
      } else {
      userResult.recordset.forEach(row => {
        });
    }

    // Check pending verifications
    const verificationsResult = await pool.request()
      .query(`
        SELECT 
          ivr.id,
          ivr.item_nomenclature,
          ivr.requested_quantity,
          ivr.requested_by_name,
          ivr.wing_id,
          ivr.wing_name,
          ivr.verification_status,
          ivr.created_at
        FROM inventory_verification_requests ivr
        WHERE ivr.verification_status = 'pending'
        ORDER BY ivr.created_at DESC
      `);
    
    if (verificationsResult.recordset.length === 0) {
      } else {
      verificationsResult.recordset.forEach((row, idx) => {
        });
    }

    // Check wings table
    const wingsResult = await pool.request()
      .query(`SELECT id, wing_name FROM wings ORDER BY id`);
    
    if (wingsResult.recordset.length === 0) {
      } else {
      wingsResult.recordset.forEach(row => {
        });
    }

    // Summary
    const wingAssignments = userResult.recordset.filter(r => r.role_name === 'WING_SUPERVISOR').map(r => r.scope_wing_id);
    const verificationWings = verificationsResult.recordset.map(v => v.wing_id);
    
    if (wingAssignments.length === 0) {
      } else {
      }

    if (verificationWings.length === 0) {
      } else {
      const matchingWings = verificationWings.filter(w => wingAssignments.includes(w));
      if (matchingWings.length === 0) {
        } else {
        }
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVerificationSetup();
