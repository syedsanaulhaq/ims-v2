const mssql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: 'Ims@12345',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function checkWingSupervisors() {
  try {
    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Get the wing supervisor role ID
    const roleResult = await pool.request()
      .query(`SELECT id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR'`);
    
    if (roleResult.recordset.length === 0) {
      console.log('❌ WING_SUPERVISOR role not found');
      return;
    }

    const wingSupRoleId = roleResult.recordset[0].id;
    console.log(`✓ Found WING_SUPERVISOR role: ${wingSupRoleId}\n`);

    // Get all wing supervisors
    const supervisorResult = await pool.request()
      .input('roleId', wingSupRoleId)
      .query(`
        SELECT 
          ur.user_id,
          ur.scope_wing_id,
          u.UserName,
          w.wing_name
        FROM ims_user_roles ur
        LEFT JOIN AspNetUsers u ON ur.user_id = u.Id
        LEFT JOIN WingsInformation w ON ur.scope_wing_id = w.wing_id
        WHERE ur.role_id = @roleId
        ORDER BY ur.user_id, ur.scope_wing_id
      `);

    console.log('=== WING SUPERVISORS ===\n');
    if (supervisorResult.recordset.length === 0) {
      console.log('❌ No wing supervisors found!');
    } else {
      supervisorResult.recordset.forEach(row => {
        console.log(`User: ${row.UserName} (${row.user_id})`);
        console.log(`  Wing: ${row.wing_name || 'UNASSIGNED'} (ID: ${row.scope_wing_id})\n`);
      });
    }

    // Check specifically for our test users
    const testUserIds = [
      'eb8c4e0a-1234-5678-b4c1-0f43c3c8ae1d', // Muhammad Ehtesham Siddiqui
      'ab12345c-6789-0abc-def1-23456789abcd', // Asad ur Rehman
      '3730207514595' // The ID from earlier tests
    ];

    console.log('\n=== CHECKING TEST USERS ===\n');
    for (const userId of testUserIds) {
      const userResult = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT 
            u.Id,
            u.UserName,
            u.intWingID,
            w.wing_name
          FROM AspNetUsers u
          LEFT JOIN WingsInformation w ON u.intWingID = w.wing_id
          WHERE u.Id = @userId OR u.UserName = @userId
        `);

      if (userResult.recordset.length > 0) {
        const user = userResult.recordset[0];
        console.log(`Found: ${user.UserName} (${user.Id})`);
        console.log(`  Wing ID: ${user.intWingID || 'NOT SET'}`);
        console.log(`  Wing Name: ${user.wing_name || 'UNASSIGNED'}`);

        // Check roles for this user
        const rolesResult = await pool.request()
          .input('userId', user.Id)
          .query(`
            SELECT 
              r.role_name,
              ur.scope_wing_id
            FROM ims_user_roles ur
            JOIN ims_roles r ON ur.role_id = r.id
            WHERE ur.user_id = @userId
          `);

        if (rolesResult.recordset.length > 0) {
          console.log(`  Roles:`);
          rolesResult.recordset.forEach(role => {
            console.log(`    - ${role.role_name} (Wing: ${role.scope_wing_id || 'N/A'})`);
          });
        } else {
          console.log(`  Roles: NONE ASSIGNED`);
        }
      } else {
        console.log(`Not found: ${userId}`);
      }
      console.log();
    }

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWingSupervisors();
