const sql = require('mssql');
const bcrypt = require('bcryptjs');

// PRODUCTION DATABASE CONFIGURATION
// CORRECT CREDENTIALS - DO NOT CHANGE
const config = {
  user: 'inventoryuser',
  password: '2025Pakistan52@',
  server: '172.20.151.60',
  database: 'InventoryManagementDB',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function updateProductionPassword() {
  try {
    console.log('🔗 Connecting to PRODUCTION database...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    await sql.connect(config);
    console.log('✅ Connected\n');

    const username = '3740560772543';
    const newPassword = 'P@ssword@1';
    
    console.log(`📝 Updating user: ${username}`);
    console.log(`   New password: ${newPassword}\n`);
    
    // Generate bcrypt hash (10 rounds)
    console.log('🔐 Generating bcrypt hash...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`✅ Hash generated: ${hashedPassword.substring(0, 30)}...\n`);
    
    // Update BOTH Password and PasswordHash fields with bcrypt hash
    console.log('💾 Updating database...');
    const result = await sql.query`
      UPDATE AspNetUsers
      SET 
        Password = ${hashedPassword},
        PasswordHash = ${hashedPassword}
      WHERE UserName = ${username}
    `;
    
    if (result.rowsAffected[0] === 0) {
      console.log('❌ User not found in database!');
      return;
    }
    
    console.log('✅ Password updated successfully!\n');
    
    // Verify the update
    console.log('🔍 Verifying update...');
    const verifyResult = await sql.query`
      SELECT 
        UserName,
        FullName,
        Password,
        PasswordHash,
        ISACT
      FROM AspNetUsers
      WHERE UserName = ${username}
    `;
    
    if (verifyResult.recordset.length === 0) {
      console.log('❌ Verification failed - user not found');
      return;
    }
    
    const user = verifyResult.recordset[0];
    console.log(`✅ User: ${user.FullName} (${user.UserName})`);
    console.log(`   Password field: ${user.Password ? 'EXISTS (' + user.Password.length + ' chars)' : 'NULL'}`);
    console.log(`   PasswordHash field: ${user.PasswordHash ? 'EXISTS (' + user.PasswordHash.length + ' chars)' : 'NULL'}`);
    console.log(`   ISACT: ${user.ISACT}\n`);
    
    // Test password verification
    console.log('🔐 Testing password verification...');
    const passwordToCheck = user.PasswordHash || user.Password;
    
    if (!passwordToCheck) {
      console.log('❌ No password hash found!');
      return;
    }
    
    const isValid = await bcrypt.compare(newPassword, passwordToCheck);
    console.log(`🔐 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);
    
    if (isValid) {
      console.log('✅ SUCCESS! User can now login with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${newPassword}`);
      console.log('\n📍 Test with Postman:');
      console.log('   POST http://172.20.150.34:3001/api/auth/ds-authenticate');
      console.log('   Body: { "UserName": "3740560772543", "Password": "P@ssword@1" }');
    } else {
      console.log('❌ FAILED! Password verification did not work.');
      console.log('   Something went wrong with the update.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('Login failed')) {
      console.log('\n💡 Check database credentials in this script (lines 6-16)');
    }
  } finally {
    await sql.close();
  }
}

updateProductionPassword();
