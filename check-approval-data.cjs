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

async function checkApprovalData() {
  try {
    const pool = await sql.connect(config);

    console.log('=== CHECKING APPROVAL DATA ===');

    // Get supervisor ID
    const supervisor = await pool.request().query(`SELECT Id, FullName FROM AspNetUsers WHERE FullName LIKE '%Ehtesham%'`);
    const supervisorId = supervisor.recordset[0]?.Id;
    console.log('Supervisor:', supervisor.recordset[0]);

    // Check approval for Asad's request
    const approval = await pool.request().query(`SELECT * FROM request_approvals WHERE request_id = '36B9DC41-9A38-44E6-B4FB-C026B6A0F7E6'`);
    console.log('Approval record:', approval.recordset[0]);

    // Check if supervisor has pending approvals
    if (supervisorId) {
      const pending = await pool.request()
        .input('id', sql.NVarChar, supervisorId)
        .query('SELECT COUNT(*) as count FROM request_approvals WHERE current_approver_id = @id AND current_status = \'pending\'');
      console.log('Supervisor pending count:', pending.recordset[0].count);

      // Get all pending approvals for supervisor
      const allPending = await pool.request()
        .input('id', sql.NVarChar, supervisorId)
        .query('SELECT ra.*, u_sub.FullName as submitter FROM request_approvals ra LEFT JOIN AspNetUsers u_sub ON ra.submitted_by = u_sub.Id WHERE ra.current_approver_id = @id AND ra.current_status = \'pending\'');
      console.log('All pending approvals:');
      allPending.recordset.forEach(a => {
        console.log('- Request:', a.request_id, 'Submitter:', a.submitter, 'Status:', a.current_status);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkApprovalData();