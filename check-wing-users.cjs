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
    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
