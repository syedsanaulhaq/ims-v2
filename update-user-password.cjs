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

async function updateUserPassword() {
  try {
    await sql.connect(config);
    console.log('✅ Connected to database\n');

    const username = '3740560772543';
    const password = 'P@ssword@1';
    
    console.log(`🔄 Updating password for user: ${username}\n`);
    
    // Generate bcrypt hash
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Generated bcrypt hash');
    console.log(`   Hash: ${hashedPassword}\n`);
    
    // Update both Password and PasswordHash fields
    await sql.query`
      UPDATE AspNetUsers
      SET 
        Password = ${hashedPassword},
        PasswordHash = ${hashedPassword}
      WHERE UserName = ${username}
    `;
    
    console.log('✅ Password updated successfully!\n');
    
    // Verify the update
    const result = await sql.query`
      SELECT 
        UserName,
        FullName,
        Password,
        PasswordHash
      FROM AspNetUsers
      WHERE UserName = ${username}
    `;
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log('🔍 Verification:');
      console.log(`   Username: ${user.UserName}`);
      console.log(`   FullName: ${user.FullName}`);
      console.log(`   Password starts with: ${user.Password.substring(0, 20)}...`);
      
      // Test password verification
      const isValid = await bcrypt.compare(password, user.Password);
      console.log(`\n🔐 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (isValid) {
        console.log('\n✅ SUCCESS! User can now login with:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

updateUserPassword();
