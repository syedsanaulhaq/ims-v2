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

async function checkCurrentState() {
  try {
    const pool = await sql.connect(config);

    console.log('=== CURRENT DATABASE STATE ===');

    // Check all tables
    const tables = ['stock_issuance_requests', 'request_approvals', 'approval_items', 'approval_history', 'stock_issuance_items'];

    for (const table of tables) {
      const result = await pool.request().query('SELECT COUNT(*) as count FROM ' + table);
      console.log(table + ':', result.recordset[0].count, 'records');
    }

    // Check if Asad's request still exists
    const asadRequest = await pool.request().query(`SELECT sir.id, sir.request_status, u.FullName as requester FROM stock_issuance_requests sir LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id WHERE u.FullName LIKE '%Asad%'`);
    console.log('\nAsad\'s requests:');
    asadRequest.recordset.forEach(r => {
      console.log('- ID:', r.id, 'Status:', r.request_status, 'Requester:', r.requester);
    });

    // Check supervisor's pending approvals
    const supervisorApprovals = await pool.request().query(`SELECT ra.id, ra.request_id, ra.current_status, u_sub.FullName as submitter FROM request_approvals ra LEFT JOIN AspNetUsers u_sub ON ra.submitted_by = u_sub.Id WHERE ra.current_approver_id = '4dae06b7-17cd-480b-81eb-da9c76ad5728' AND ra.current_status = 'pending'`);
    console.log('\nSupervisor\'s pending approvals:');
    supervisorApprovals.recordset.forEach(a => {
      console.log('- Approval ID:', a.id, 'Request ID:', a.request_id, 'Submitter:', a.submitter, 'Status:', a.current_status);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkCurrentState();