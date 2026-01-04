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

async function checkVerifications() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected to InventoryManagementDB\n");

    // Check verification requests with forwarding info
    console.log("📋 Checking verification requests with forwarding info...\n");
    
    const result = await pool.request().query(`
      SELECT TOP 10
        id,
        stock_issuance_id,
        item_nomenclature,
        requested_by_user_id,
        requested_by_name,
        forwarded_to_user_id,
        forwarded_to_name,
        forwarded_at,
        wing_id,
        verification_status,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.recordset.length} verification requests:\n`);
    
    result.recordset.forEach((row, i) => {
      console.log(`${i + 1}. Item: ${row.item_nomenclature}`);
      console.log(`   Requested by: ${row.requested_by_name} (${row.requested_by_user_id})`);
      console.log(`   Forwarded to: ${row.forwarded_to_name || 'NOT SET'} (${row.forwarded_to_user_id || 'NULL'})`);
      console.log(`   Forwarded at: ${row.forwarded_at || 'NOT SET'}`);
      console.log(`   Status: ${row.verification_status}`);
      console.log(`   Wing: ${row.wing_id}`);
      console.log();
    });

    // Check if there are store keepers in the database
    console.log("\n📌 Checking for store keepers in the database...\n");
    
    const skResult = await pool.request().query(`
      SELECT DISTINCT 
        u.Id, 
        u.UserName,
        u.wing_id,
        u.aspNetRole
      FROM AspNetUsers u
      WHERE (u.aspNetRole LIKE '%STORE_KEEPER%' OR u.aspNetRole = 'CUSTOM_WING_STORE_KEEPER')
      ORDER BY u.wing_id, u.UserName
    `);

    console.log(`Found ${skResult.recordset.length} store keepers:\n`);
    
    skResult.recordset.forEach((row, i) => {
      console.log(`${i + 1}. ${row.UserName} (${row.Id})`);
      console.log(`   Wing: ${row.wing_id}`);
      console.log(`   Role: ${row.aspNetRole}`);
      console.log();
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.close();
  }
}

checkVerifications();
