const sql = require('mssql');

async function checkTenderColumns() {
  try {
    const pool = await sql.connect({
      server: 'DESKTOP-9AOS93U\\SQLEXPRESS',
      database: 'InventoryManagementSystem',
      options: { 
        encrypt: false, 
        trustServerCertificate: true,
        enableArithAbort: true 
      },
      authentication: {
        type: 'ntlm',
        options: {
          domain: '',
          userName: 'SYED FAROOQ ALI',
          password: ''
        }
      }
    });
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tenders' 
      AND (COLUMN_NAME LIKE '%office%' OR COLUMN_NAME LIKE '%wing%' OR COLUMN_NAME LIKE '%dec%') 
      ORDER BY COLUMN_NAME
    `);
    
    console.table(result.recordset);
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTenderColumns();
