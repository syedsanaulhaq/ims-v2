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

    const userId = '4dae06b7-17cd-480b-81eb-da9c76ad5728'; // Muhammad Ehtesham Siddiqui

    // Check what approvals this user is assigned to as approver
    const approvalsQuery = `
      SELECT 
        ra.id,
        ra.request_id,
        ra.current_approver_id,
        ra.current_status,
        sir.request_type,
        sir.justification
      FROM request_approvals ra
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      WHERE ra.current_approver_id = @userId
    `;

    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(approvalsQuery);

    console.log('Approvals for user as current_approver:');
    console.log(result.recordset);
    console.log(`\nTotal: ${result.recordset.length}`);

    // Count by request_type
    const byType = {};
    result.recordset.forEach(r => {
      const type = r.request_type || 'NULL';
      byType[type] = (byType[type] || 0) + 1;
    });
    console.log('\nBy Request Type:', byType);

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
