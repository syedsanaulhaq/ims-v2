const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkTestItem() {
  try {
    await sql.connect(config);

    const result = await sql.query(`
      SELECT * FROM stock_issuance_items
      WHERE request_id = 'b4221f2f-76a9-4770-a477-e86c840baf0d'
    `);

    } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkTestItem();