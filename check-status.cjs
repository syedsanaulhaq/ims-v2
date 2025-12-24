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

async function checkStatusValues() {
  try {
    const pool = await sql.connect(config);

    // Check distinct status values in request_approvals
    const statusResult = await pool.request().query('SELECT DISTINCT current_status FROM request_approvals');
    console.log('Distinct status values in request_approvals:');
    statusResult.recordset.forEach(s => console.log('-', s.current_status));

    // Check the specific approval record
    const approvalResult = await pool.request().query("SELECT id, current_status, current_approver_id FROM request_approvals WHERE id = 'B0847DDF-3FA1-46A6-9116-E1DCB90B28D2'");
    console.log('\nSpecific approval record:');
    console.log(approvalResult.recordset[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkStatusValues();