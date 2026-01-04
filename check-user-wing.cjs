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

async function checkUserWing() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    // Find the current user
    const userId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';  // Muhammad Ehtesham Siddiqui
    
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          Id,
          UserName,
          intWingID,
          intOfficeID
        FROM AspNetUsers
        WHERE Id = @userId
      `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log(`📌 User: ${user.UserName}`);
      console.log(`   ID: ${user.Id}`);
      console.log(`   Wing ID (intWingID): ${user.intWingID}`);
      console.log(`   Office ID: ${user.intOfficeID}\n`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkUserWing();
