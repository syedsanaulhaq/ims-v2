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
    // Check inventory_verification_requests structure
    const verifySchema = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'inventory_verification_requests' 
         ORDER BY ORDINAL_POSITION`
      );
    verifySchema.recordset.forEach((col) => {
      });

    // Check all records
    const allRecords = await pool
      .request()
      .query(`SELECT id, item_master_id, item_nomenclature, verification_status FROM inventory_verification_requests`);
    allRecords.recordset.forEach((row) => {
      });

    // Check stock_issuance_items columns
    const siiSchema = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'stock_issuance_items' 
         ORDER BY ORDINAL_POSITION`
      );
    if (siiSchema.recordset.length > 0) {
      siiSchema.recordset.forEach((col) => {
        });
    } else {
      }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
