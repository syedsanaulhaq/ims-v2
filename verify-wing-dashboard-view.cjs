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

async function main() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected to InventoryManagementDB\n");

    // Query the view that wing-dashboard uses
    console.log("📋 Testing View_Pending_Inventory_Verifications (what wing-dashboard sees):\n");
    const viewResult = await pool
      .request()
      .query(`SELECT * FROM View_Pending_Inventory_Verifications`);

    if (viewResult.recordset.length === 0) {
      console.log("❌ View returned no records");
    } else {
      viewResult.recordset.forEach((row) => {
        console.log(`✅ ID: ${row.id}`);
        console.log(`   Item: ${row.item_nomenclature}`);
        console.log(`   Status: ${row.verification_status}`);
        console.log(`   Requested by: ${row.requested_by_name}`);
        console.log(`   Wing: ${row.wing_name}`);
        console.log("");
      });
    }

    console.log(`📊 Total records visible on wing-dashboard: ${viewResult.recordset.length}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
