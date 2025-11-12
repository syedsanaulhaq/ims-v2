// Quick check of existing users
const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  server: process.env.SQL_SERVER_HOST,
  database: process.env.SQL_SERVER_DATABASE,
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true',
    enableArithAbort: true
  }
};

async function checkUsers() {
  try {
    console.log('🔗 Connecting...');
    const pool = await sql.connect(config);
    
    const result = await pool.request().query(`
      SELECT TOP 10
        UserName, FullName, Role, ISACT,
        CASE WHEN Password IS NOT NULL THEN Password ELSE '[hashed]' END as PasswordInfo
      FROM AspNetUsers 
      WHERE ISACT = 1
      ORDER BY UserName
    `);

    console.log('\n📊 Active Users:');
    console.table(result.recordset);
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
