const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkPendingApprovals() {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT TOP 5 * FROM request_approvals
      WHERE current_status = 'pending'
      ORDER BY submitted_date DESC
    `;

    console.log('Pending request_approvals:');
    if (result.recordset.length > 0) {
      console.log('Columns:', Object.keys(result.recordset[0]));
      result.recordset.forEach((row, i) => {
        console.log(`--- Request ${i+1} ---`);
        console.log('ID:', row.id);
        console.log('Request ID:', row.request_id);
        console.log('Current Approver:', row.current_approver_id);
        console.log('Status:', row.current_status);
        console.log('Submitted Date:', row.submitted_date);
        console.log('');
      });
    } else {
      console.log('No pending approvals found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sql.close();
  }
}

checkPendingApprovals();