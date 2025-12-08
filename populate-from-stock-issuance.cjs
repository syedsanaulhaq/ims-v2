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

    // Get records with NULL nomenclature and their stock issuance nomenclature
    console.log("📋 Finding NULL nomenclature records...\n");
    const nullRecords = await pool
      .request()
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          sii.nomenclature
        FROM inventory_verification_requests ivr
        LEFT JOIN stock_issuance_items sii ON ivr.stock_issuance_id = sii.request_id
        WHERE ivr.item_nomenclature IS NULL
        ORDER BY ivr.id
      `);

    console.log(`Found ${nullRecords.recordset.length} records with NULL nomenclature\n`);

    let updated = 0;
    let failed = 0;

    // Update each record
    for (const record of nullRecords.recordset) {
      if (record.nomenclature) {
        try {
          await pool
            .request()
            .input("id", sql.Int, record.id)
            .input("nomenclature", sql.NVarChar(500), record.nomenclature)
            .query(
              `UPDATE inventory_verification_requests 
               SET item_nomenclature = @nomenclature
               WHERE id = @id`
            );
          console.log(`✅ ID ${record.id}: Updated with "${record.nomenclature}"`);
          updated++;
        } catch (error) {
          console.log(`❌ ID ${record.id}: Update failed - ${error.message}`);
          failed++;
        }
      } else {
        console.log(`❌ ID ${record.id}: No nomenclature found in stock_issuance_items`);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);

    // Verify final state
    console.log(`\n📋 Final state of records:`);
    const finalResult = await pool
      .request()
      .query(
        `SELECT id, item_master_id, item_nomenclature, verification_status 
         FROM inventory_verification_requests 
         ORDER BY id`
      );

    finalResult.recordset.forEach((row) => {
      console.log(
        `   ${row.id}. "${row.item_nomenclature || "Unknown Item"}" - ${row.verification_status}`
      );
    });

    console.log(`\n✅ Population from stock_issuance_items complete!`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

main();
