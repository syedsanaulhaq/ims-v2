// Check specific user details including password
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

async function checkUser() {
  try {
    console.log('🔗 Connecting...');
    const pool = await sql.connect(config);
    
    const result = await pool.request()
      .input('username', sql.NVarChar, '1111111111111')
      .query(`
        SELECT 
          UserName, FullName, Role, ISACT,
          Password, 
          LEFT(PasswordHash, 20) + '...' as PasswordHashPreview
        FROM AspNetUsers 
        WHERE UserName = @username
      `);

    if (result.recordset.length === 0) {
      console.log('❌ User not found!');
    } else {
      console.log('\n📊 User Details:');
      console.table(result.recordset);
      
      const user = result.recordset[0];
      console.log('\n🔐 Authentication Info:');
      console.log('- Has Password field:', user.Password ? `YES (value: ${user.Password})` : 'NO');
      console.log('- Has PasswordHash:', user.PasswordHashPreview ? 'YES' : 'NO');
      console.log('- Is Active (ISACT):', user.ISACT);
    }
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUser();
