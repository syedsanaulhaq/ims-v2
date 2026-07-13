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

async function checkTables() {
  try {
    await sql.connect(config);

    // Check stock_issuance_requests structure
    const requestsSchema = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests'");
    requestsSchema.recordset.forEach(col => {
      });

    // Check request_approvals structure
    const approvalsSchema = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'request_approvals'");
    approvalsSchema.recordset.forEach(col => {
      });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkTables();