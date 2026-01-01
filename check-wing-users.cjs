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

    // Check wing columns
    const wingQuery = `
      SELECT TOP 1 *
      FROM WingsInformation
      WHERE Id = 19
    `;

    const wingResult = await pool.request().query(wingQuery);
    if (wingResult.recordset.length > 0) {
      console.log('Wing 19 structure:');
      console.log(Object.keys(wingResult.recordset[0]));
      console.log('\nWing 19 data:');
      console.log(wingResult.recordset[0]);
    }

    // Also check users in wing 19
    const usersQuery = `
      SELECT 
        Id,
        FullName,
        Email,
        intWingID
      FROM AspNetUsers
      WHERE intWingID = 19
      ORDER BY FullName
    `;

    const usersResult = await pool.request().query(usersQuery);
    console.log(`\n\nUsers in Wing 19 (${usersResult.recordset.length} users):`);
    console.log(JSON.stringify(usersResult.recordset, null, 2));

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
