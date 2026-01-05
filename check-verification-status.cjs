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

async function checkVerificationStatus() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    const result = await pool.request().query(`
      SELECT 
        id,
        item_nomenclature,
        verification_status,
        forwarded_to_user_id,
        forwarded_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    console.log(`📋 Verification statuses:\n`);
    result.recordset.forEach((row, i) => {
      console.log(`${i + 1}. Item: ${row.item_nomenclature}`);
      console.log(`   Status: '${row.verification_status}' (type: ${typeof row.verification_status})`);
      console.log(`   Forwarded to: ${row.forwarded_to_user_id ? '✅ Yes' : '❌ No'}`);
      console.log(`   Forwarded at: ${row.forwarded_at}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkVerificationStatus();
