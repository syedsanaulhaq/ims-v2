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

async function checkRoles() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected to InventoryManagementDB\n");

    // Check all AspNetRoles
    console.log("📌 All AspNetRoles:\n");
    const result1 = await pool.request().query(`
      SELECT Name FROM AspNetRoles WHERE Name LIKE '%STORE%' OR Name LIKE '%WING%'
      ORDER BY Name
    `);

    result1.recordset.forEach(row => {
      console.log(`  - ${row.Name}`);
    });

    // Check all users in wing 19
    console.log("\n📌 All users in wing 19:\n");
    const result2 = await pool.request().query(`
      SELECT DISTINCT u.Id, u.UserName, u.intWingID, u.Role
      FROM AspNetUsers u
      WHERE u.intWingID = 19
      ORDER BY u.UserName
    `);

    result2.recordset.forEach(row => {
      console.log(`  ${row.UserName} (${row.Id})`);
      console.log(`    Wing: ${row.intWingID}`);
      console.log(`    Role: ${row.Role}`);
      console.log();
    });

    // Check user roles for wing 19 users
    console.log("📌 User roles for wing 19 users:\n");
    const result3 = await pool.request().query(`
      SELECT DISTINCT u.Id, u.UserName, r.Name as RoleName
      FROM AspNetUsers u
      INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
      INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
      WHERE u.intWingID = 19
      ORDER BY u.UserName, r.Name
    `);

    result3.recordset.forEach(row => {
      console.log(`  ${row.UserName}`);
      console.log(`    Role: ${row.RoleName}`);
      console.log();
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkRoles();
