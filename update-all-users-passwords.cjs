const sql = require('mssql');
const bcrypt = require('bcryptjs');

// PRODUCTION DATABASE CONFIGURATION
const config = {
  user: 'sa',
  password: 'Pakistan@786',
  server: '172.20.151.60\\MSSQLSERVER2',
  database: 'InventoryManagementDB',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function updateAllUsersPasswords() {
  try {
    console.log('🔗 Connecting to PRODUCTION database...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    await sql.connect(config);
    console.log('✅ Connected\n');

    // Default password for all users
    const defaultPassword = 'P@ssword@1';
    
    console.log('📋 Fetching all active users...');
    
    // Get all active users
    const usersResult = await sql.query`
      SELECT 
        Id,
        UserName,
        FullName,
        Password,
        PasswordHash,
        ISACT
      FROM AspNetUsers
      WHERE ISACT = 1
      ORDER BY UserName
    `;
    
    const users = usersResult.recordset;
    console.log(`✅ Found ${users.length} active users\n`);
    
    if (users.length === 0) {
      console.log('❌ No active users found!');
      return;
    }

    // Generate bcrypt hash once (same for all users)
    console.log('🔐 Generating bcrypt hash...');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log(`✅ Hash generated: ${hashedPassword.substring(0, 30)}...\n`);
    
    console.log('=' .repeat(80));
    console.log('Starting batch password update...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;
      
      try {
        // Check if password is already in bcrypt format
        const currentHash = user.PasswordHash || user.Password;
        if (currentHash && currentHash.startsWith('$2b$')) {
          console.log(`${progress} ⏭️  SKIP: ${user.UserName} (${user.FullName})`);
          console.log(`          Already in bcrypt format\n`);
          skipCount++;
          continue;
        }
        
        console.log(`${progress} 🔄 Updating: ${user.UserName} (${user.FullName})`);
        
        // Update both Password and PasswordHash fields
        const updateResult = await sql.query`
          UPDATE AspNetUsers
          SET 
            Password = ${hashedPassword},
            PasswordHash = ${hashedPassword}
          WHERE Id = ${user.Id}
        `;
        
        if (updateResult.rowsAffected[0] > 0) {
          console.log(`          ✅ SUCCESS\n`);
          successCount++;
        } else {
          console.log(`          ⚠️  No rows updated\n`);
          errorCount++;
        }
        
      } catch (err) {
        console.log(`          ❌ ERROR: ${err.message}\n`);
        errorCount++;
      }
    }
    
    console.log('=' .repeat(80));
    console.log('\n📊 BATCH UPDATE SUMMARY:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount} (already bcrypt format)`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n🔐 Testing password verification...');
      
      // Verify a few random users
      const sampleSize = Math.min(3, successCount);
      const updatedUsers = users.filter(u => {
        const hash = u.PasswordHash || u.Password;
        return !hash || !hash.startsWith('$2b$');
      }).slice(0, sampleSize);
      
      for (const user of updatedUsers) {
        const verifyResult = await sql.query`
          SELECT PasswordHash 
          FROM AspNetUsers 
          WHERE Id = ${user.Id}
        `;
        
        if (verifyResult.recordset.length > 0) {
          const newHash = verifyResult.recordset[0].PasswordHash;
          const isValid = await bcrypt.compare(defaultPassword, newHash);
          console.log(`   ${user.UserName}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        }
      }
    }
    
    console.log('\n✅ BATCH UPDATE COMPLETE!');
    console.log(`\n📝 All updated users can now login with:`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`\n⚠️  IMPORTANT: Users should change their password after first login!`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('Login failed')) {
      console.log('\n💡 Check database credentials in this script (lines 6-16)');
    }
  } finally {
    await sql.close();
  }
}

updateAllUsersPasswords();
