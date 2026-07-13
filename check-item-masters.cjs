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
    // Check item_masters table structure
    const schemaResult = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' ORDER BY ORDINAL_POSITION`
      );
    schemaResult.recordset.forEach((col) => {
      });

    // Check total records
    const countResult = await pool
      .request()
      .query(`SELECT COUNT(*) as count FROM item_masters`);
    // Check if nomenclature column exists
    const nomenclatureCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'nomenclature'`
      );
    // Check if item_name column exists
    const itemNameCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'item_masters' AND COLUMN_NAME = 'item_name'`
      );
    // Check the problematic IDs
    const problematicId = await pool
      .request()
      .input("id", sql.UniqueIdentifier, "3753EF82-4AB9-4220-B9FB-22A04CE40C51")
      .query(`SELECT id, nomenclature FROM item_masters WHERE id = @id`);
    if (problematicId.recordset.length > 0) {
      }

    // Check the valid ID
    const validId = await pool
      .request()
      .input("id", sql.UniqueIdentifier, "D96B728A-1218-49EB-8035-CB9655715A10")
      .query(`SELECT id, nomenclature FROM item_masters WHERE id = @id`);
    if (validId.recordset.length > 0) {
      }

    // Sample some records
    const sampleResult = await pool.request().query(`SELECT TOP 5 id, nomenclature FROM item_masters`);
    sampleResult.recordset.forEach((row) => {
      });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
