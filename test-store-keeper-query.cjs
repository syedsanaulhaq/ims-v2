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

async function testStoreKeeperQuery() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    // Store keeper ID
    const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    
    console.log(`🔍 Testing query for store keeper: ${storeKeeperId}\n`);
    
    // This is exactly what the backend endpoint does
    const result = await pool.request()
      .input('userId', sql.NVarChar, storeKeeperId)
      .query(`
        SELECT 
          ivr.id,
          ivr.stock_issuance_id,
          ivr.item_master_id,
          ivr.requested_by_user_id,
          ivr.requested_by_name,
          ivr.requested_at,
          ivr.requested_quantity,
          ivr.verification_status,
          ivr.item_nomenclature,
          ivr.forwarded_to_user_id,
          ivr.forwarded_to_name,
          ivr.forwarded_by_user_id,
          ivr.forwarded_by_name,
          ivr.forwarded_at,
          ivr.forward_notes,
          ivr.created_at,
          ivr.updated_at
        FROM inventory_verification_requests ivr
        WHERE ivr.forwarded_to_user_id = @userId
        ORDER BY ivr.forwarded_at DESC
      `);

    console.log(`✅ Found ${result.recordset.length} forwarded verifications for store keeper\n`);
    
    result.recordset.forEach((row, i) => {
      console.log(`${i + 1}. Item: ${row.item_nomenclature}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Status: ${row.verification_status}`);
      console.log(`   Requested by: ${row.requested_by_name}`);
      console.log(`   Requested quantity: ${row.requested_quantity}`);
      console.log(`   Forwarded at: ${row.forwarded_at}`);
      console.log(`   Notes: ${row.forward_notes || 'N/A'}\n`);
    });

    if (result.recordset.length === 0) {
      console.log('⚠️  No verifications forwarded to this store keeper found!');
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

testStoreKeeperQuery();
