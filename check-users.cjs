const sql = require('mssql');
const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

async function checkUsers() {
  try {
    const pool = await sql.connect(config);

    // Check all users
    const usersResult = await pool.request().query('SELECT TOP 10 Id, FullName, UserName, Email FROM AspNetUsers ORDER BY FullName');
    usersResult.recordset.forEach(u => {
      });

    // Check for the specific user ID
    const specificUser = await pool.request().query("SELECT Id, FullName, UserName, Email FROM AspNetUsers WHERE Id = '36B9DC41-9A38-44E6-B4FB-C026B6A0F7E6'");
    // Check recent requests
    const recentRequests = await pool.request().query('SELECT TOP 5 sir.id, sir.requester_user_id, u.FullName, sir.request_status, sir.created_at FROM stock_issuance_requests sir LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id ORDER BY sir.created_at DESC');
    recentRequests.recordset.forEach(r => {
      });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkUsers();