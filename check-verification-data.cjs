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

    // Check inventory_verification_requests structure
    console.log("📋 inventory_verification_requests columns:");
    const verifySchema = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'inventory_verification_requests' 
         ORDER BY ORDINAL_POSITION`
      );
    verifySchema.recordset.forEach((col) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check all records
    console.log("\n📋 All inventory_verification_requests records:");
    const allRecords = await pool
      .request()
      .query(`SELECT id, item_master_id, item_nomenclature, verification_status FROM inventory_verification_requests`);
    allRecords.recordset.forEach((row) => {
      console.log(
        `  ID: ${row.id}, item_master_id: ${row.item_master_id}, nomenclature: "${row.item_nomenclature || "NULL"}", status: ${row.verification_status}`
      );
    });

    // Check stock_issuance_items columns
    console.log("\n📋 stock_issuance_items columns:");
    const siiSchema = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'stock_issuance_items' 
         ORDER BY ORDINAL_POSITION`
      );
    if (siiSchema.recordset.length > 0) {
      siiSchema.recordset.forEach((col) => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    } else {
      console.log("  Table does not exist");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
