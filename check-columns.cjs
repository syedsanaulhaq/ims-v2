const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    // Check what tables exist
    const tables = await pool.request()
      .query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND (TABLE_NAME LIKE '%approval%' OR TABLE_NAME LIKE '%request%')
        ORDER BY TABLE_NAME
      `);
    
    console.log('\n📋 Relevant tables:');
    tables.recordset.forEach(t => {
      console.log(`  ✓ ${t.TABLE_NAME}`);
    });
    
    // Check if approval_items exists
    const approvalCheck = await pool.request()
      .query(`
        SELECT COUNT(*) as tbl_count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'approval_items'
      `);
    
    if (approvalCheck.recordset[0].tbl_count > 0) {
      const columns = await pool.request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'approval_items'
        `);
      console.log('\n📋 approval_items columns:');
      columns.recordset.forEach(c => console.log(`  • ${c.COLUMN_NAME}`));
    } else {
      console.log('\n❌ approval_items table does NOT exist');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
})();
