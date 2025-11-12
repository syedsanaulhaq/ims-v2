// Add plain text password to test user
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

async function fixPassword() {
  try {
    console.log('🔗 Connecting...');
    const pool = await sql.connect(config);
    
    // Update password
    await pool.request()
      .input('username', sql.NVarChar, '1111111111111')
      .input('password', sql.NVarChar, '123456')
      .query(`
        UPDATE AspNetUsers 
        SET Password = @password
        WHERE UserName = @username
      `);
    
    console.log('✅ Updated password for user: 1111111111111');
    
    // Verify
    const result = await pool.request()
      .input('username', sql.NVarChar, '1111111111111')
      .query(`
        SELECT UserName, FullName, Role, Password
        FROM AspNetUsers 
        WHERE UserName = @username
      `);
    
    console.log('\n📊 Updated User:');
    console.table(result.recordset);
    console.log('\n✅ You can now login with:');
    console.log('   Username: 1111111111111');
    console.log('   Password: 123456');
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPassword();
