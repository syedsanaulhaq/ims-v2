const sql = require('mssql');
const bcrypt = require('bcryptjs');

// IMPORTANT: Update these to match your PRODUCTION server database
const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',  // UPDATE THIS if different on production
  database: 'InventoryManagementDB_TEST',  // UPDATE THIS if different on production
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkServerUser() {
  try {
    console.log('🔗 Connecting to database...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    await sql.connect(config);
    console.log('✅ Connected\n');

    const username = '3740560772543';
    const password = 'P@ssword@1';
    
    console.log(`🔍 Checking user: ${username}\n`);
    
    // Query user - EXACT same query as backend
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
      WHERE UserName = ${username} AND ISACT = 1
    `;
    
    if (result.recordset.length === 0) {
      console.log('❌ User not found or inactive!');
      console.log('\n🔍 Let me check without ISACT filter...\n');
      
      const result2 = await sql.query`
        SELECT 
          Id,
          UserName,
          FullName,
          ISACT as IsActive,
          Password,
          PasswordHash
        FROM AspNetUsers
        WHERE UserName = ${username}
      `;
      
      if (result2.recordset.length === 0) {
        console.log('❌ User does not exist in database at all!');
      } else {
        const user = result2.recordset[0];
        console.log('⚠️ User exists but ISACT = false or NULL');
        console.log(`   ISACT: ${user.IsActive}`);
        console.log(`   Password: ${user.Password ? 'EXISTS' : 'NULL'}`);
        console.log(`   PasswordHash: ${user.PasswordHash ? 'EXISTS' : 'NULL'}`);
      }
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
    
    // Show hash preview
    const passwordToCheck = user.PasswordHash || user.Password;
    if (passwordToCheck) {
      console.log(`\n🔑 Hash to check: ${passwordToCheck.substring(0, 30)}...`);
      console.log(`   Hash format: ${passwordToCheck.startsWith('$2b$') || passwordToCheck.startsWith('$2a$') ? 'bcrypt' : 'OTHER'}`);
    }
    
    console.log('\n🔐 Testing password verification:\n');
    
    // Test PasswordHash (priority field)
    if (user.PasswordHash) {
      try {
        const isValidHash = await bcrypt.compare(password, user.PasswordHash);
        console.log(`   PasswordHash field: ${isValidHash ? '✅ VALID' : '❌ INVALID'}`);
      } catch (err) {
        console.log(`   PasswordHash field: ❌ ERROR - ${err.message}`);
      }
    } else {
      console.log(`   PasswordHash field: ⚠️ NULL`);
    }
    
    // Test Password field
    if (user.Password) {
      try {
        const isValidPassword = await bcrypt.compare(password, user.Password);
        console.log(`   Password field: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);
      } catch (err) {
        console.log(`   Password field: ❌ ERROR - ${err.message}`);
      }
    } else {
      console.log(`   Password field: ⚠️ NULL`);
    }
    
    console.log('\n📊 Summary:');
    const finalCheck = user.PasswordHash || user.Password;
    if (!finalCheck) {
      console.log('   ❌ NO PASSWORD HASH FOUND - User needs password reset');
    } else {
      const isValid = await bcrypt.compare(password, finalCheck);
      if (isValid) {
        console.log('   ✅ Authentication SHOULD WORK');
        console.log('   Backend is checking: ' + (user.PasswordHash ? 'PasswordHash' : 'Password'));
      } else {
        console.log('   ❌ Authentication WILL FAIL');
        console.log('   Password does not match database hash');
        console.log('\n💡 Run this to update password:');
        console.log('   node update-user-password.cjs');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkServerUser();
