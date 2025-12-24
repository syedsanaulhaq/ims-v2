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

async function checkUserRequest() {
  try {
    const pool = await sql.connect(config);

    const userId = '36B9DC41-9A38-44E6-B4FB-C026B6A0F7E6';

    console.log('=== CHECKING USER REQUESTS ===');
    console.log('User ID:', userId);

    // Get user info
    const userResult = await pool.request().query(`SELECT Id, FullName, UserName, Email FROM AspNetUsers WHERE Id = '${userId}'`);
    console.log('\nUser Info:');
    console.log(userResult.recordset[0]);

    // Check user's submitted requests
    const requestsQuery = `
      SELECT 
        sir.id as request_id,
        sir.request_number,
        sir.request_status,
        sir.submitted_at,
        sir.created_at,
        sir.requester_user_id,
        sir.supervisor_id,
        sir.admin_id,
        u_supervisor.FullName as supervisor_name,
        u_admin.FullName as admin_name
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u_supervisor ON u_supervisor.Id = sir.supervisor_id
      LEFT JOIN AspNetUsers u_admin ON u_admin.Id = sir.admin_id
      WHERE sir.requester_user_id = '${userId}'
      ORDER BY sir.created_at DESC
    `;
    
    const requestsResult = await pool.request()
      .query(requestsQuery);

    console.log('\nUser\'s Submitted Requests:');
    requestsResult.recordset.forEach(r => {
      console.log('- Request ID:', r.request_id);
      console.log('  Status:', r.request_status);
      console.log('  Submitted:', r.submitted_at);
      console.log('  Supervisor:', r.supervisor_name || 'Not assigned');
      console.log('  Admin:', r.admin_name || 'Not assigned');
    });

    // Check approval workflow for this user's requests
    const approvalQuery = `
      SELECT
        ra.id as approval_id,
        ra.request_id,
        ra.current_status,
        ra.current_approver_id,
        ra.submitted_by,
        ra.submitted_date,
        u_approver.FullName as current_approver_name,
        u_submitter.FullName as submitter_name
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      LEFT JOIN AspNetUsers u_submitter ON u_submitter.Id = ra.submitted_by
      WHERE ra.submitted_by = '${userId}'
      ORDER BY ra.submitted_date DESC
    `;

    const approvalResult = await pool.request()
      .query(approvalQuery);

    console.log('\nApproval Workflow Records:');
    approvalResult.recordset.forEach(a => {
      console.log('- Approval ID:', a.approval_id);
      console.log('  Request ID:', a.request_id);
      console.log('  Status:', a.current_status);
      console.log('  Current Approver:', a.current_approver_name || 'Not assigned');
      console.log('  Submitted by:', a.submitter_name);
      console.log('  Submitted date:', a.submitted_date);
    });

    // Check if there are any supervisors in the system
    const supervisorsQuery = `
      SELECT DISTINCT u.Id, u.FullName, u.UserName
      FROM AspNetUsers u
      INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
      INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
      WHERE r.Name LIKE '%supervisor%' OR r.Name LIKE '%wing%'
    `;

    const supervisorsResult = await pool.request().query(supervisorsQuery);
    console.log('\nAvailable Supervisors:');
    supervisorsResult.recordset.forEach(s => {
      console.log('- ID:', s.Id, 'Name:', s.FullName, 'Role:', s.UserName);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkUserRequest();