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

async function checkSupervisor() {
  try {
    const pool = await sql.connect(config);

    // Find Muhammad Ehtesham Siddiqui
    const supervisorResult = await pool.request().query("SELECT Id, FullName, UserName FROM AspNetUsers WHERE FullName LIKE '%Muhammad Ehtesham Siddiqui%'");
    console.log('Supervisor User:');
    console.log(supervisorResult.recordset[0]);

    const supervisorId = supervisorResult.recordset[0]?.Id;

    // Check supervisor's roles
    const rolesResult = await pool.request().query(`SELECT r.Name as RoleName FROM AspNetUserRoles ur INNER JOIN AspNetRoles r ON ur.RoleId = r.Id WHERE ur.UserId = '${supervisorId}'`);
    console.log('\nSupervisor Roles:');
    rolesResult.recordset.forEach(r => console.log('-', r.RoleName));

    // Check pending approvals for this supervisor
    const pendingApprovals = await pool.request().query(`SELECT ra.id, ra.request_id, ra.current_status, u_submitter.FullName as submitter FROM request_approvals ra LEFT JOIN AspNetUsers u_submitter ON ra.submitted_by = u_submitter.Id WHERE ra.current_approver_id = '${supervisorId}' AND ra.current_status = 'pending'`);
    console.log('\nPending Approvals for Supervisor:');
    pendingApprovals.recordset.forEach(a => {
      console.log('- Approval ID:', a.id, 'Request ID:', a.request_id, 'Submitter:', a.submitter, 'Status:', a.current_status);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkSupervisor();