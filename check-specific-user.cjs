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
    const username = '3740560772543';
    const password = 'P@ssword@1';
    
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
      return;
    }
    
    const user = result.recordset[0];
    if (user.Password) {
      }
    if (user.PasswordHash) {
      }
    
    // Test against Password field
    if (user.Password) {
      const isValidPassword = await bcrypt.compare(password, user.Password);
      }
    
    // Test against PasswordHash field
    if (user.PasswordHash) {
      const isValidHash = await bcrypt.compare(password, user.PasswordHash);
      }
    
    const passwordToCheck = user.Password || user.PasswordHash;
    if (passwordToCheck) {
      const isValid = await bcrypt.compare(password, passwordToCheck);
      if (isValid) {
        } else {
        }
    } else {
      }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkUser();
