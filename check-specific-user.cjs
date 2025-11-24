const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkUser() {
  try {
    await sql.connect(config);
    console.log('✅ Connected to database\n');

    const username = '3740560772543';
    const password = 'P@ssword@1';
    
    console.log(`🔍 Checking user: ${username}\n`);
    
    // Query user
    const result = await sql.query`
      SELECT 
        Id,
        UserName,
        FullName,
        Email,
        Password,
        PasswordHash,
        ISACT as IsActive,
        Role
      FROM AspNetUsers
      WHERE UserName = ${username}
    `;
    
    if (result.recordset.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const user = result.recordset[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.Id}`);
    console.log(`   Username: ${user.UserName}`);
    console.log(`   FullName: ${user.FullName}`);
    console.log(`   Email: ${user.Email}`);
    console.log(`   Role: ${user.Role}`);
    console.log(`   IsActive: ${user.IsActive}`);
    console.log(`   Password field: ${user.Password ? 'EXISTS (length: ' + user.Password.length + ')' : 'NULL'}`);
    console.log(`   PasswordHash field: ${user.PasswordHash ? 'EXISTS (length: ' + user.PasswordHash.length + ')' : 'NULL'}`);
    
    if (user.Password) {
      console.log(`   Password starts with: ${user.Password.substring(0, 20)}...`);
    }
    if (user.PasswordHash) {
      console.log(`   PasswordHash starts with: ${user.PasswordHash.substring(0, 20)}...`);
    }
    
    console.log('\n🔐 Testing password verification:\n');
    
    // Test against Password field
    if (user.Password) {
      const isValidPassword = await bcrypt.compare(password, user.Password);
      console.log(`   Password field check: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    // Test against PasswordHash field
    if (user.PasswordHash) {
      const isValidHash = await bcrypt.compare(password, user.PasswordHash);
      console.log(`   PasswordHash field check: ${isValidHash ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    console.log('\n📝 Recommendation:');
    const passwordToCheck = user.Password || user.PasswordHash;
    if (passwordToCheck) {
      const isValid = await bcrypt.compare(password, passwordToCheck);
      if (isValid) {
        console.log('   ✅ Password is correct! Authentication should work.');
      } else {
        console.log('   ❌ Password is incorrect. User needs to reset password.');
        console.log('\n💡 Would you like to update this user\'s password?');
        console.log('   Run: node create-test-user.cjs');
        console.log(`   Then update the username to: ${username}`);
        console.log(`   And password to: ${password}`);
      }
    } else {
      console.log('   ❌ No password hash found! User needs password set.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkUser();
