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

async function checkViews() {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT name FROM sys.views
      WHERE name LIKE '%supervisor%' OR name LIKE '%pending%' OR name LIKE '%approval%'
    `;

    console.log('Available views related to approvals:');
    result.recordset.forEach(view => {
      console.log('- ' + view.name);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sql.close();
  }
}

checkViews();