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

async function fixWingNames() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    // Find all verifications with "Unknown" wing and fix them
    console.log("🔍 Finding verifications with 'Unknown' wing...\n");
    
    const findResult = await pool.request().query(`
      SELECT id, wing_id, wing_name
      FROM inventory_verification_requests
      WHERE wing_name = 'Unknown' OR wing_name IS NULL
    `);

    console.log(`Found ${findResult.recordset.length} records with Unknown wing\n`);

    for (const record of findResult.recordset) {
      let wingName = 'Unknown';
      
      if (record.wing_id) {
        // Lookup wing name
        const wingLookup = await pool.request()
          .input('wingId', sql.Int, record.wing_id)
          .query(`
            SELECT TOP 1
              CASE 
                WHEN intWingID = 1 THEN 'Wing 1 - Admin'
                WHEN intWingID = 2 THEN 'Wing 2 - Stores'
                WHEN intWingID = 3 THEN 'Wing 3 - Finance'
                WHEN intWingID = 19 THEN 'Wing 19'
                ELSE 'Wing ' + CAST(intWingID AS NVARCHAR(10))
              END AS wing_name
            FROM AspNetUsers
            WHERE intWingID = @wingId
          `);
        
        if (wingLookup.recordset.length > 0) {
          wingName = wingLookup.recordset[0].wing_name;
        }
      }

      // Update the record
      await pool.request()
        .input('id', sql.Int, record.id)
        .input('wingName', sql.NVarChar, wingName)
        .query(`
          UPDATE inventory_verification_requests
          SET wing_name = @wingName
          WHERE id = @id
        `);

      console.log(`✅ Updated ID ${record.id}: wing_id=${record.wing_id} → wing_name='${wingName}'`);
    }

    console.log("\n📋 Verifying updates...\n");
    const verify = await pool.request().query(`
      SELECT id, wing_id, wing_name, item_nomenclature
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    verify.recordset.forEach(row => {
      console.log(`ID ${row.id}: ${row.item_nomenclature} | Wing: ${row.wing_name}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

fixWingNames();
