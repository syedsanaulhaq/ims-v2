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

async function fixVerificationStatus() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    // Update verification status from 'pending' to 'forwarded' if it has been forwarded
    const result = await pool.request().query(`
      UPDATE inventory_verification_requests
      SET verification_status = 'forwarded'
      WHERE forwarded_to_user_id IS NOT NULL
        AND verification_status = 'pending'
    `);

    console.log(`✅ Updated ${result.rowsAffected[0]} verification records\n`);

    // Verify the update
    const verify = await pool.request().query(`
      SELECT 
        id,
        item_nomenclature,
        verification_status,
        forwarded_to_user_id,
        forwarded_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    console.log(`📋 Updated verification statuses:\n`);
    verify.recordset.forEach((row, i) => {
      console.log(`${i + 1}. Item: ${row.item_nomenclature}`);
      console.log(`   Status: '${row.verification_status}'`);
      console.log(`   Forwarded: ${row.forwarded_to_user_id ? '✅ Yes' : '❌ No'}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

fixVerificationStatus();
