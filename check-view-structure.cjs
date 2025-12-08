const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkViewStructure() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Check view columns
    console.log('📋 VIEW COLUMNS:');
    console.log('=====================================');
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'View_Pending_Inventory_Verifications'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log(`Total columns: ${columnsResult.recordset.length}`);
    columnsResult.recordset.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // Try to select from view with all columns
    console.log('\n\n📋 VIEW DEFINITION (SELECT * output):');
    console.log('=====================================');
    const sampleResult = await pool.request().query(`
      SELECT * FROM View_Pending_Inventory_Verifications LIMIT 1
    `);
    
    if (sampleResult.recordset.length > 0) {
      console.log('Columns returned:');
      Object.keys(sampleResult.recordset[0]).forEach(key => {
        console.log(`- ${key}`);
      });
      console.log('\nSample data:', JSON.stringify(sampleResult.recordset[0], null, 2));
    } else {
      console.log('No data in view (empty result set)');
    }

    await pool.close();
    console.log('\n✅ Check complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkViewStructure();
