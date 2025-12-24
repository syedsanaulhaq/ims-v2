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
    console.log('stock_issuance_requests columns:');
    requestsSchema.recordset.forEach(col => {
      console.log('-', col.COLUMN_NAME, '(', col.DATA_TYPE, ')');
    });

    // Check request_approvals structure
    const approvalsSchema = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'request_approvals'");
    console.log('\nrequest_approvals columns:');
    approvalsSchema.recordset.forEach(col => {
      console.log('-', col.COLUMN_NAME, '(', col.DATA_TYPE, ')');
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

checkTables();