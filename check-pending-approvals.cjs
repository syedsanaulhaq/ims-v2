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

    if (result.recordset.length > 0) {
      result.recordset.forEach((row, i) => {
        });
    } else {
      }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sql.close();
  }
}

checkPendingApprovals();