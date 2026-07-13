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
    await sql.connect(config);
    const username = '1730115698727';
    const password = 'P@ssword@1';
    
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
        } else {
        const user = result2.recordset[0];
        }
      return;
    }
    
    const user = result.recordset[0];
    // Show hash preview
    const passwordToCheck = user.PasswordHash || user.Password;
    if (passwordToCheck) {
      }
    
    // Test PasswordHash (priority field)
    if (user.PasswordHash) {
      try {
        const isValidHash = await bcrypt.compare(password, user.PasswordHash);
        } catch (err) {
        }
    } else {
      }
    
    // Test Password field
    if (user.Password) {
      try {
        const isValidPassword = await bcrypt.compare(password, user.Password);
        } catch (err) {
        }
    } else {
      }
    
    const finalCheck = user.PasswordHash || user.Password;
    if (!finalCheck) {
      } else {
      const isValid = await bcrypt.compare(password, finalCheck);
      if (isValid) {
        } else {
        }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkServerUser();
