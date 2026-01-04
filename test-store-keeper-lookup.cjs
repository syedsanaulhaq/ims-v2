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

async function testStoreKeeperLookup() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected to InventoryManagementDB\n");

    // Test 1: Find store keepers for wing 19
    console.log("📌 Test 1: Find store keepers for wing 19\n");
    
    const wingId = 19;
    const result1 = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT TOP 1 u.Id, u.UserName, u.intWingID
        FROM AspNetUsers u
        INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
        INNER JOIN ims_roles ir ON ur.role_id = ir.id
        WHERE u.intWingID = @wingId
          AND ir.is_active = 1
          AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
        ORDER BY u.UserName
      `);

    if (result1.recordset.length > 0) {
      const sk = result1.recordset[0];
      console.log(`✅ Found store keeper for wing ${wingId}:`);
      console.log(`   Name: ${sk.UserName}`);
      console.log(`   ID: ${sk.Id}`);
      console.log(`   Wing: ${sk.intWingID}\n`);
    } else {
      console.log(`❌ No store keepers found for wing ${wingId}\n`);
    }

    // Test 2: List all store keepers
    console.log("📌 Test 2: List all store keepers\n");
    
    const result2 = await pool.request().query(`
      SELECT DISTINCT u.Id, u.UserName, u.intWingID, ir.role_name
      FROM AspNetUsers u
      INNER JOIN ims_user_roles ur ON u.Id = ur.user_id
      INNER JOIN ims_roles ir ON ur.role_id = ir.id
      WHERE ir.is_active = 1
        AND (ir.role_name LIKE '%STORE_KEEPER%' OR ir.role_name = 'CUSTOM_WING_STORE_KEEPER')
      ORDER BY u.intWingID, u.UserName
    `);

    console.log(`Found ${result2.recordset.length} store keepers:\n`);
    result2.recordset.forEach((row, i) => {
      console.log(`${i + 1}. ${row.UserName}`);
      console.log(`   Wing: ${row.intWingID}`);
      console.log(`   Role: ${row.role_name}`);
      console.log(`   ID: ${row.Id}\n`);
    });

    // Test 3: Check verification requests
    console.log("📌 Test 3: Check verification requests\n");
    
    const result3 = await pool.request().query(`
      SELECT TOP 5
        id,
        item_nomenclature,
        wing_id,
        forwarded_to_user_id,
        forwarded_to_name,
        forwarded_at,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result3.recordset.length} verification requests:\n`);
    result3.recordset.forEach((row, i) => {
      console.log(`${i + 1}. ${row.item_nomenclature}`);
      console.log(`   Wing: ${row.wing_id}`);
      console.log(`   Forwarded to: ${row.forwarded_to_name || 'NOT SET'}`);
      console.log(`   Forwarded at: ${row.forwarded_at || 'NOT SET'}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

testStoreKeeperLookup();
