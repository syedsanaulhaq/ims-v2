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

async function checkSetup() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // 1. Check wings table
    console.log('=== WINGS TABLE ===');
    const wingsResult = await pool.request().query(`SELECT * FROM wings`);
    console.log(`Found ${wingsResult.recordset.length} wing(s)`);
    wingsResult.recordset.forEach((w, i) => {
      console.log(`  ${i + 1}. ID: ${w.id}, Name: ${Object.values(w).join(' | ')}`);
    });

    // 2. Check if verification requests table exists and has data
    console.log('\n=== VERIFICATION REQUESTS TABLE ===');
    try {
      const verResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM inventory_verification_requests
      `);
      console.log(`Total records: ${verResult.recordset[0].total}`);
      
      if (verResult.recordset[0].total > 0) {
        const samples = await pool.request().query(`
          SELECT TOP 5 id, item_nomenclature, wing_id, wing_name, verification_status, created_at 
          FROM inventory_verification_requests
          ORDER BY created_at DESC
        `);
        console.log(`\nSample verification requests:`);
        samples.recordset.forEach((v, i) => {
          console.log(`  ${i + 1}. Item: ${v.item_nomenclature}, Wing ID: ${v.wing_id}, Status: ${v.verification_status}`);
        });
      }
    } catch (e) {
      console.log(`❌ Error querying verification table: ${e.message}`);
    }

    // 3. Check user and their roles
    console.log('\n=== USER 3730207514595 ROLES ===');
    const userCheck = await pool.request().query(`
      SELECT Id, UserName, FullName FROM AspNetUsers WHERE UserName = '3730207514595'
    `);
    
    if (userCheck.recordset.length === 0) {
      console.log('❌ User not found!');
    } else {
      const user = userCheck.recordset[0];
      console.log(`User found: ${user.FullName} (${user.UserName})`);
      
      const rolesResult = await pool.request().query(`
        SELECT DISTINCT r.role_name, ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = '${user.Id}'
      `);
      
      if (rolesResult.recordset.length === 0) {
        console.log('❌ NO ROLES ASSIGNED!');
      } else {
        console.log(`Assigned roles:`);
        rolesResult.recordset.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.role_name}, Wing: ${r.scope_wing_id || 'NULL'}`);
        });
      }
    }

    // 4. Summary
    console.log('\n=== SUMMARY ===');
    if (wingsResult.recordset.length === 0) {
      console.log('⚠️  NO WINGS FOUND - This is required for wing-based filtering!');
      console.log('    You need to set up wings in the wings table first.');
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
