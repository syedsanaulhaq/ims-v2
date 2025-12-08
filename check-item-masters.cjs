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
  await pool.connect();

  try {
    console.log("✅ Connected to InventoryManagementDB\n");

    // Check item_masters table structure
    console.log("📋 Checking item_masters table structure...");
    const schemaResult = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' ORDER BY ORDINAL_POSITION`
      );
    console.log("Columns in item_masters:");
    schemaResult.recordset.forEach((col) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check total records
    console.log("\n📊 Total records in item_masters:");
    const countResult = await pool
      .request()
      .query(`SELECT COUNT(*) as count FROM item_masters`);
    console.log(`  Total: ${countResult.recordset[0].count}`);

    // Check if nomenclature column exists
    const nomenclatureCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'nomenclature'`
      );
    console.log(
      `\n  Has 'nomenclature' column: ${nomenclatureCheck.recordset[0].count > 0 ? "YES" : "NO"}`
    );

    // Check if item_name column exists
    const itemNameCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'item_name'`
      );
    console.log(
      `  Has 'item_name' column: ${itemNameCheck.recordset[0].count > 0 ? "YES" : "NO"}`
    );

    // Check the problematic IDs
    console.log(
      "\n🔍 Checking for the problematic item_master_id: 3753EF82-4AB9-4220-B9FB-22A04CE40C51"
    );
    const problematicId = await pool
      .request()
      .input("id", sql.UniqueIdentifier, "3753EF82-4AB9-4220-B9FB-22A04CE40C51")
      .query(`SELECT id, nomenclature FROM item_masters WHERE id = @id`);
    console.log(
      `  Found: ${problematicId.recordset.length > 0 ? "YES" : "NO"}`
    );
    if (problematicId.recordset.length > 0) {
      console.log("  Record:", problematicId.recordset[0]);
    }

    // Check the valid ID
    console.log(
      "\n✅ Checking for the valid item_master_id: D96B728A-1218-49EB-8035-CB9655715A10"
    );
    const validId = await pool
      .request()
      .input("id", sql.UniqueIdentifier, "D96B728A-1218-49EB-8035-CB9655715A10")
      .query(`SELECT id, nomenclature FROM item_masters WHERE id = @id`);
    console.log(`  Found: ${validId.recordset.length > 0 ? "YES" : "NO"}`);
    if (validId.recordset.length > 0) {
      console.log("  Record:", validId.recordset[0]);
    }

    // Sample some records
    console.log("\n📋 Sample 5 records from item_masters:");
    const sampleResult = await pool.request().query(`SELECT TOP 5 id, nomenclature FROM item_masters`);
    sampleResult.recordset.forEach((row) => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    item_name: ${row.item_name}`);
      console.log(`    nomenclature: ${row.nomenclature}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
