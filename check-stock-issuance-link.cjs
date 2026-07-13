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
    // Get verification records that have NULL nomenclature and try to find nomenclature from stock_issuance_items
    const result = await pool
      .request()
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ivr.item_nomenclature,
          sii.nomenclature as sii_nomenclature,
          sii.custom_item_name,
          sii.item_type
        FROM inventory_verification_requests ivr
        LEFT JOIN stock_issuance_items sii ON ivr.stock_issuance_id = sii.request_id
        ORDER BY ivr.id
      `);

    result.recordset.forEach((row) => {
      });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
