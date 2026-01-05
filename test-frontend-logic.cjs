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

async function testFrontendLogic() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    const storeKeeperId = 'a84bbf7a-dfb7-45ca-b603-e2313c57033b';
    
    // This is what the frontend fetches
    const result = await pool.request()
      .input('userId', sql.NVarChar, storeKeeperId)
      .query(`
        SELECT 
          id,
          item_nomenclature,
          requested_by_name,
          requested_quantity,
          verification_status,
          forwarded_at
        FROM inventory_verification_requests
        WHERE forwarded_to_user_id = @userId
        ORDER BY forwarded_at DESC
      `);

    console.log(`📋 Verifications for store keeper (${result.recordset.length} total):\n`);
    
    const verifications = result.recordset;
    
    // Frontend logic - getPendingCount
    const pendingCount = verifications.filter(r => {
      const status = (r.verification_status || '').toLowerCase();
      return status === 'pending';
    }).length;
    
    console.log(`Status Counts:`);
    console.log(`  - Pending: ${pendingCount}`);
    console.log(`  - Total: ${verifications.length}\n`);
    
    // Frontend logic - getFilteredVerifications when no filter is set
    const filtered = verifications.filter(r => {
      const status = (r.verification_status || '').toLowerCase();
      return status === 'pending';
    });
    
    console.log(`Filtered Results (when statusFilter=null):`);
    console.log(`  - Count: ${filtered.length}\n`);
    
    if (filtered.length > 0) {
      filtered.forEach((v, i) => {
        console.log(`${i + 1}. ${v.item_nomenclature}`);
        console.log(`   Requested: ${v.requested_quantity} units`);
        console.log(`   By: ${v.requested_by_name}`);
        console.log(`   Status: ${v.verification_status}\n`);
      });
      console.log('✅ Frontend should NOW display these verifications!');
    } else {
      console.log('❌ Still no verifications shown (status mismatch)');
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

testFrontendLogic();
