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

async function checkRequest() {
  try {
    const pool = await sql.connect(config);

    const requestId = '36B9DC41-9A38-44E6-B4FB-C026B6A0F7E6';

    // Get request details
    const requestResult = await pool.request().query(`SELECT sir.*, u.FullName as requester_name FROM stock_issuance_requests sir LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id WHERE sir.id = '${requestId}'`);
    // Get approval workflow
    const approvalResult = await pool.request().query(`SELECT ra.*, u_approver.FullName as current_approver_name, u_submitter.FullName as submitter_name FROM request_approvals ra LEFT JOIN AspNetUsers u_approver ON ra.current_approver_id = u_approver.Id LEFT JOIN AspNetUsers u_submitter ON ra.submitted_by = u_submitter.Id WHERE ra.request_id = '${requestId}'`);
    approvalResult.recordset.forEach(a => {
      });

    // Get approval items
    const itemsResult = await pool.request().query(`SELECT ai.*, u_decider.FullName as decided_by_name FROM approval_items ai LEFT JOIN AspNetUsers u_decider ON ai.decided_by = u_decider.Id WHERE ai.request_approval_id IN (SELECT id FROM request_approvals WHERE request_id = '${requestId}')`);
    itemsResult.recordset.forEach(item => {
      });

    // Check supervisors
    const supervisorsResult = await pool.request().query("SELECT u.Id, u.FullName, r.Name as RoleName FROM AspNetUsers u INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId INNER JOIN AspNetRoles r ON ur.RoleId = r.Id WHERE r.Name LIKE '%supervisor%' OR r.Name LIKE '%wing%'");
    supervisorsResult.recordset.forEach(s => {
      });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkRequest();