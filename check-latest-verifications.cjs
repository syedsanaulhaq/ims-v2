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
    console.log("✅ Connected\n");

    const result = await pool.request().query(`
      SELECT TOP 10
        id,
        item_nomenclature,
        requested_by_name,
        forwarded_to_user_id,
        forwarded_to_name,
        forwarded_at,
        verification_status,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    console.log(`📋 Found ${result.recordset.length} verification requests:\n`);
    
    result.recordset.forEach((row, i) => {
      console.log(`${i + 1}. Item: ${row.item_nomenclature}`);
      console.log(`   Status: ${row.verification_status}`);
      console.log(`   Requested by: ${row.requested_by_name}`);
      console.log(`   Forwarded to: ${row.forwarded_to_name || 'NOT SET'}`);
      console.log(`   Forwarded ID: ${row.forwarded_to_user_id || 'NULL'}`);
      console.log(`   Forwarded at: ${row.forwarded_at || 'NOT SET'}`);
      console.log(`   Created: ${row.created_at}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkVerifications();
