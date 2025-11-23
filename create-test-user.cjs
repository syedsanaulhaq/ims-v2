// Script to create test user with proper bcrypt hash
const bcrypt = require('bcryptjs');
const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function createTestUser() {
  console.log('🔐 Creating/Updating Test User');
  console.log('================================\n');

  try {
    // Connect to database
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to database\n');

    // Check if user exists by UserName instead of CNIC
    const checkResult = await pool.request()
      .input('username', sql.NVarChar, '1234567891011')
      .query('SELECT Id, FullName, CNIC, UserName, ISACT, Password, PasswordHash FROM AspNetUsers WHERE UserName = @username');

    // Generate proper bcrypt hash for 'admin123'
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('🔑 Generated password hash for "admin123"\n');

    if (checkResult.recordset.length > 0) {
      // User exists, update password
      const user = checkResult.recordset[0];
      console.log('✅ User exists:');
      console.log(`   ID: ${user.Id}`);
      console.log(`   Name: ${user.FullName}`);
      console.log(`   UserName: ${user.UserName}`);
      console.log(`   CNIC: ${user.CNIC}`);
      console.log(`   Active: ${user.ISACT}`);
      console.log(`   Has Password field: ${user.Password ? 'Yes' : 'No'}`);
      console.log(`   Has PasswordHash field: ${user.PasswordHash ? 'Yes' : 'No'}\n`);

      console.log('📝 Updating password...');
      
      // Update both Password and PasswordHash fields
      await pool.request()
        .input('hash', sql.NVarChar, passwordHash)
        .input('username', sql.NVarChar, '1234567891011')
        .query('UPDATE AspNetUsers SET Password = @hash, PasswordHash = @hash WHERE UserName = @username');

      console.log('✅ Password updated successfully!\n');

    } else {
      // User doesn't exist, create it
      console.log('❌ User does not exist');
      console.log('📝 Creating new user...\n');

      const { v4: uuidv4 } = require('uuid');
      const newId = uuidv4();

      await pool.request()
        .input('id', sql.UniqueIdentifier, newId)
        .input('fullName', sql.NVarChar, 'Test Administrator')
        .input('cnic', sql.NVarChar, '1234567890123')
        .input('userName', sql.NVarChar, '1234567891011')
        .input('email', sql.NVarChar, 'testadmin@ims.local')
        .input('hash', sql.NVarChar, passwordHash)
        .input('officeId', sql.Int, 583)
        .input('wingId', sql.Int, 19)
        .input('role', sql.NVarChar, 'Admin')
        .input('isActive', sql.Bit, 1)
        .input('gender', sql.NVarChar, 'Male')
        .query(`
          INSERT INTO AspNetUsers (
            Id, FullName, CNIC, UserName, Email, Password, PasswordHash,
            intOfficeID, intWingID, Role, ISACT, Gender
          ) VALUES (
            @id, @fullName, @cnic, @userName, @email, @hash, @hash,
            @officeId, @wingId, @role, @isActive, @gender
          )
        `);

      console.log('✅ User created successfully!\n');
    }

    console.log('================================');
    console.log('✅ Test credentials ready:');
    console.log('   UserName: 1234567891011');
    console.log('   Password: admin123');
    console.log('================================\n');

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
