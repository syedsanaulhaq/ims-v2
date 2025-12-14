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
    enableKeepAlive: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
    }
  }
};

async function checkUserPassword() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('\n📋 Checking user password fields...\n');
    
    const userId = '3730207514595';
    
    // First, try to find by ID
    let result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          Id, 
          UserName, 
          FullName, 
          Email,
          Password, 
          PasswordHash,
          ISACT
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    
    if (result.recordset.length === 0) {
      console.log('❌ User not found by ID, trying as username...');
      // Try as username
      result = await pool.request()
        .input('username', sql.NVarChar, userId)
        .query(`
          SELECT 
            Id, 
            UserName, 
            FullName, 
            Email,
            Password, 
            PasswordHash,
            ISACT
          FROM AspNetUsers 
          WHERE UserName = @username
        `);
    }
    
    if (result.recordset.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.recordset[0];
    
    console.log('✅ User found:');
    console.log('   ID:', user.Id);
    console.log('   UserName:', user.UserName);
    console.log('   FullName:', user.FullName);
    console.log('   Email:', user.Email);
    console.log('   ISACT (Active):', user.ISACT);
    console.log('\n🔐 Password Fields:');
    console.log('   Password field exists:', !!user.Password);
    if (user.Password) {
      console.log('   Password field value:', user.Password);
      console.log('   Password field length:', user.Password.length);
    }
    console.log('   PasswordHash field exists:', !!user.PasswordHash);
    if (user.PasswordHash) {
      console.log('   PasswordHash field value:', user.PasswordHash);
      console.log('   PasswordHash field length:', user.PasswordHash.length);
      console.log('   Looks like bcrypt hash:', user.PasswordHash.startsWith('$2'));
    }
    
    console.log('\n💡 Recommendation:');
    if (user.Password && !user.PasswordHash) {
      console.log('   → Password is stored as PLAIN TEXT in Password field');
    } else if (user.PasswordHash && !user.Password) {
      console.log('   → Password is stored as HASH in PasswordHash field');
    } else if (user.Password && user.PasswordHash) {
      console.log('   → Both fields have values');
      console.log('   → Plain text password:', user.Password);
      console.log('   → Hash:', user.PasswordHash);
    } else {
      console.log('   → No password found in either field!');
    }
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserPassword();
