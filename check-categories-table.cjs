const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InvMISDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'categories'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('✅ Categories table columns:');
    console.log(result.recordset);
    
    await pool.close();
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();
