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

    console.log('Checking stock_issuance_items schema:');
    const result = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_issuance_items'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE ? 'NULL' : 'NOT NULL'}) ${col.COLUMN_DEFAULT ? 'DEFAULT: ' + col.COLUMN_DEFAULT : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkSchema();