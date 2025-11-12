// Check and insert test users
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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function checkAndCreateTestUsers() {
  let pool;
  try {
    console.log('🔗 Connecting to SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Connected!\n');

    // Check existing users
    console.log('📋 Checking existing users...');
    const checkResult = await pool.request().query(`
      SELECT 
        UserName,
        FullName,
        Role,
        ISACT,
        CASE 
          WHEN Password IS NOT NULL THEN 'Has Password'
          ELSE 'No Password'
        END as PasswordStatus,
        CASE 
          WHEN PasswordHash IS NOT NULL THEN 'Yes'
          ELSE 'No'
        END as HasPasswordHash
      FROM AspNetUsers 
      WHERE UserName IN ('testadmin', 'testmanager', 'testuser', 'admin')
      ORDER BY UserName
    `);

    console.log('\n📊 Current Users in Database:');
    console.table(checkResult.recordset);

    // Check if testadmin exists
    const testadminExists = checkResult.recordset.some(u => u.UserName === 'testadmin');
    
    if (!testadminExists) {
      console.log('\n⚙️  Creating test users...\n');

      // Insert testadmin
      await pool.request().query(`
        INSERT INTO AspNetUsers (
          Id, UserName, FullName, Email, Role, 
          Password, PasswordHash, ISACT, 
          intOfficeID, intWingID
        )
        VALUES (
          'test-admin-001', 
          'testadmin', 
          'Test Administrator', 
          'testadmin@ecp.gov.pk', 
          'Admin',
          'admin123',
          '$2b$10$viHX17Ukxb10tkTyHgNww.Mck1GUcRn03lhqqb0PjdOAiN0jB1QWa',
          1,
          583,
          16
        )
      `);
      console.log('✅ Created testadmin');

      // Insert testmanager
      await pool.request().query(`
        INSERT INTO AspNetUsers (
          Id, UserName, FullName, Email, Role, 
          Password, PasswordHash, ISACT, 
          intOfficeID, intWingID
        )
        VALUES (
          'test-manager-001', 
          'testmanager', 
          'Test Manager', 
          'testmanager@ecp.gov.pk', 
          'Manager',
          'manager123',
          '$2b$10$m4ujtS4/U9SuNSvXW4LgfeOQijwj4vYf9HpFHUS1X7Q436P7O1ocK',
          1,
          583,
          16
        )
      `);
      console.log('✅ Created testmanager');

      // Insert testuser
      await pool.request().query(`
        INSERT INTO AspNetUsers (
          Id, UserName, FullName, Email, Role, 
          Password, PasswordHash, ISACT, 
          intOfficeID, intWingID
        )
        VALUES (
          'test-user-001', 
          'testuser', 
          'Test User', 
          'testuser@ecp.gov.pk', 
          'User',
          'user123',
          '$2b$10$aLgjNYv/fNYV1Lpd/Mq6he9myKHnyY5PMrF2HPu4p8iYhXrX13p3q',
          1,
          583,
          16
        )
      `);
      console.log('✅ Created testuser');

      // Verify
      const verifyResult = await pool.request().query(`
        SELECT UserName, FullName, Role, ISACT
        FROM AspNetUsers 
        WHERE UserName IN ('testadmin', 'testmanager', 'testuser')
        ORDER BY UserName
      `);

      console.log('\n✅ Test Users Created Successfully:');
      console.table(verifyResult.recordset);
    } else {
      console.log('\n✅ Test users already exist!');
    }

    console.log('\n=== TEST CREDENTIALS ===');
    console.log('Username: testadmin  | Password: admin123   (Admin)');
    console.log('Username: testmanager| Password: manager123 (Manager)');
    console.log('Username: testuser   | Password: user123    (User)');
    console.log('\n✅ You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkAndCreateTestUsers();
