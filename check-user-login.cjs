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
    console.log("✅ Connected\n");

    // Check for Muhammad Naseer
    console.log("🔍 Searching for 'Muhammad Naseer'...\n");
    const result1 = await pool.request()
      .input('name', sql.NVarChar, '%Muhammad Naseer%')
      .query(`
        SELECT Id, UserName, Email, intWingID
        FROM AspNetUsers
        WHERE UserName LIKE @name OR Email LIKE @name
      `);
    
    console.log("Users found with 'Muhammad Naseer':");
    result1.recordset.forEach(u => {
      console.log(`  - ID: ${u.Id}`);
      console.log(`    Username: ${u.UserName}`);
      console.log(`    Email: ${u.Email}`);
      console.log(`    Wing: ${u.intWingID}\n`);
    });

    // Check store keeper specifically
    console.log("\n🔍 Checking store keeper user...\n");
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
      console.log("Store Keeper Details:");
      console.log(`  - ID: ${u.Id}`);
      console.log(`    Username: ${u.UserName}`);
      console.log(`    Email: ${u.Email}`);
      console.log(`    Wing: ${u.intWingID}`);
      console.log(`    Role: ${u.role_name}\n`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkUsers();
