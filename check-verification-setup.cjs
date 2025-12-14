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
    console.log('✅ Connected to database\n');

    // First check wings table structure
    console.log('=== CHECKING WINGS TABLE ===');
    const wingsCheckResult = await pool.request()
      .query(`SELECT TOP 1 * FROM wings`);
    console.log('Columns in wings table:', Object.keys(wingsCheckResult.recordset[0] || {}));

    // Check user and their wing assignment
    console.log('\n=== USER WING SUPERVISOR ASSIGNMENT ===');
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
      console.log('❌ NO ROLES FOUND FOR USER 3730207514595!');
    } else {
      console.log(`Found ${userResult.recordset.length} role(s):`);
      userResult.recordset.forEach(row => {
        console.log(`  ✓ Role: ${row.role_name}, Scope Type: ${row.scope_type}, Wing ID: ${row.scope_wing_id} (${row.wing_name})`);
      });
    }

    // Check pending verifications
    console.log('\n=== PENDING VERIFICATION REQUESTS ===');
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
      console.log('❌ NO PENDING VERIFICATION REQUESTS IN DATABASE');
    } else {
      console.log(`✓ Found ${verificationsResult.recordset.length} pending verification(s):`);
      verificationsResult.recordset.forEach((row, idx) => {
        console.log(`\n  ${idx + 1}. Item: ${row.item_nomenclature}`);
        console.log(`     Wing: ID=${row.wing_id} (${row.wing_name})`);
        console.log(`     Requested By: ${row.requested_by_name}`);
        console.log(`     Quantity: ${row.requested_quantity}`);
      });
    }

    // Check wings table
    console.log('\n=== WINGS IN SYSTEM ===');
    const wingsResult = await pool.request()
      .query(`SELECT id, wing_name FROM wings ORDER BY id`);
    
    if (wingsResult.recordset.length === 0) {
      console.log('⚠️  NO WINGS FOUND');
    } else {
      wingsResult.recordset.forEach(row => {
        console.log(`  ✓ ID: ${row.id}, Name: ${row.wing_name}`);
      });
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    const wingAssignments = userResult.recordset.filter(r => r.role_name === 'WING_SUPERVISOR').map(r => r.scope_wing_id);
    const verificationWings = verificationsResult.recordset.map(v => v.wing_id);
    
    if (wingAssignments.length === 0) {
      console.log('⚠️  User has NO WING_SUPERVISOR role assigned!');
    } else {
      console.log(`✓ User is WING_SUPERVISOR for wings: ${wingAssignments.join(', ')}`);
    }

    if (verificationWings.length === 0) {
      console.log('⚠️  NO verification requests exist in database');
    } else {
      console.log(`✓ Verification requests exist for wings: ${verificationWings.join(', ')}`);
      const matchingWings = verificationWings.filter(w => wingAssignments.includes(w));
      if (matchingWings.length === 0) {
        console.log('❌ PROBLEM: User\'s wings do NOT match any verification request wings!');
      } else {
        console.log(`✓ User should see ${matchingWings.length} verification request(s)`);
      }
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVerificationSetup();
