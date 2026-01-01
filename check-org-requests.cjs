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

    // Find organizational requests
    const orgQuery = `
      SELECT 
        sir.id,
        sir.request_type,
        sir.justification,
        sir.requester_wing_id,
        u.FullName as requester_name,
        ra.current_approver_id,
        u_approver.FullName as approver_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_id
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      WHERE sir.request_type = 'Organizational'
      ORDER BY sir.created_at DESC
    `;

    const result = await pool.request().query(orgQuery);

    console.log('Organizational Requests in Database:');
    console.log(JSON.stringify(result.recordset, null, 2));
    console.log(`\nTotal: ${result.recordset.length}`);

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
