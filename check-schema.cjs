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

async function checkSchema() {
  try {
    await sql.connect(config);

    const result = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_issuance_items'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach(col => {
      });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkSchema();