const sql = require("mssql");

const config = {
  server: "SYED-FAZLI-LAPT",
  database: "InventoryManagementDB",
  user: "inventorymanagementuser",
  password: "2016Wfp61@",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkUsers() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check for Muhammad Naseer
    const result1 = await pool.request()
      .input('name', sql.NVarChar, '%Muhammad Naseer%')
      .query(`
        SELECT Id, UserName, Email, intWingID
        FROM AspNetUsers
        WHERE UserName LIKE @name OR Email LIKE @name
      `);
    
    result1.recordset.forEach(u => {
      });

    // Check store keeper specifically
    const storeKeeper = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    const result2 = await pool.request()
      .input('id', sql.NVarChar, storeKeeper)
      .query(`
        SELECT u.Id, u.UserName, u.Email, u.intWingID,
               ir.role_name
        FROM AspNetUsers u
        LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
        LEFT JOIN ims_roles ir ON ur.role_id = ir.id
        WHERE u.Id = @id
      `);
    
    if (result2.recordset.length > 0) {
      const u = result2.recordset[0];
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkUsers();
