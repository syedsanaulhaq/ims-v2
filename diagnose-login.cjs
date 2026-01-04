const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    console.log('✅ Database connection: SUCCESS\n');

    // Check test users
    const testUsers = [
      '4dae06b7-17cd-480b-81eb-da9c76ad5728', // Muhammad Ehtesham Siddiqui
      '9a4d3aca-7a4f-4342-a431-267da1171244'  // Asad ur Rehman
    ];

    console.log('=== Checking Test Users ===\n');
    
    for (const userId of testUsers) {
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), userId)
        .query(`
          SELECT 
            Id,
            FullName,
            Email,
            UserName,
            intWingID,
            EmailConfirmed
          FROM AspNetUsers
          WHERE Id = @userId
        `);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        console.log(`User: ${user.FullName}`);
        console.log(`  Email: ${user.Email}`);
        console.log(`  UserName: ${user.UserName}`);
        console.log(`  Wing ID: ${user.intWingID}`);
        console.log(`  Email Confirmed: ${user.EmailConfirmed}`);
        console.log('  Status: ✓ Found\n');
      } else {
        console.log(`User ID ${userId}: ✗ NOT FOUND\n`);
      }
    }

    // Check AspNetUsers table
    console.log('=== Total Users in System ===');
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM AspNetUsers
    `);
    console.log(`Total users: ${totalResult.recordset[0].total}\n`);

    // Check authentication tables
    console.log('=== Checking Authentication Tables ===');
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('AspNetUsers', 'AspNetUserLogins', 'AspNetRoles', 'AspNetUserRoles')
    `;
    const tableResult = await pool.request().query(tablesQuery);
    console.log(`Found tables: ${tableResult.recordset.map(t => t.TABLE_NAME).join(', ')}\n`);

    pool.close();
    
    console.log('✅ Diagnostic check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
