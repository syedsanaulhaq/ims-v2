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

async function checkRequests() {
  try {
    await sql.connect(config);

    // Check all stock_issuance_requests
    const requests = await sql.query('SELECT sir.*, u.FullName as submitted_by_name FROM stock_issuance_requests sir LEFT JOIN AspNetUsers u ON sir.submitted_by = u.Id ORDER BY sir.created_at DESC');
    requests.recordset.forEach(r => {
      });

    // Check all request_approvals
    const approvals = await sql.query('SELECT ra.*, submitter.FullName as submitted_by_name, approver.FullName as current_approver_name FROM request_approvals ra LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id ORDER BY ra.created_date DESC');
    approvals.recordset.forEach(a => {
      });

    // Check for Asad's requests specifically
    const asadRequests = await sql.query("SELECT sir.*, u.FullName as submitted_by_name FROM stock_issuance_requests sir LEFT JOIN AspNetUsers u ON sir.submitted_by = u.Id WHERE u.FullName LIKE '%asad%' ORDER BY sir.created_at DESC");
    asadRequests.recordset.forEach(r => {
      });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkRequests();