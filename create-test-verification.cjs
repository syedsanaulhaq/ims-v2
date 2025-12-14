const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function createTestVerification() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected\n');

    // Get a sample item from item_masters
    const itemResult = await pool.request()
      .query(`SELECT TOP 1 id, nomenclature, item_code FROM item_masters ORDER BY id`);
    
    if (itemResult.recordset.length === 0) {
      console.log('❌ No items found in item_master. Please add items first.');
      await pool.close();
      return;
    }

    const item = itemResult.recordset[0];
    console.log(`✓ Found item: ${item.nomenclature} (${item.item_code})`);

    // Get a stock issuance record for Wing 19
    const issuanceResult = await pool.request()
      .query(`SELECT TOP 1 id FROM stock_issuance_requests WHERE requester_wing_id = 19 ORDER BY id`);
    
    let stockIssuanceId;
    if (issuanceResult.recordset.length > 0) {
      stockIssuanceId = issuanceResult.recordset[0].id;
      console.log(`✓ Found stock issuance: ${stockIssuanceId}`);
    } else {
      // Create a dummy issuance or use first available
      const anyIssuance = await pool.request()
        .query(`SELECT TOP 1 id FROM stock_issuance_requests ORDER BY id`);
      
      if (anyIssuance.recordset.length === 0) {
        console.log('❌ No stock issuance requests found. Please create one first.');
        await pool.close();
        return;
      }
      
      stockIssuanceId = anyIssuance.recordset[0].id;
      console.log(`⚠️  Using issuance from another wing: ${stockIssuanceId}`);
    }

    // Create a verification request for Wing 19 (PMU)
    const insertResult = await pool.request()
      .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
      .input('itemMasterId', sql.NVarChar, item.id)
      .input('itemNomenclature', sql.NVarChar, item.nomenclature)
      .input('requestedQuantity', sql.Int, 10)
      .input('requestedByUserId', sql.NVarChar, '9a4d3aca-7a4f-4342-a431-267da1171244')
      .input('requestedByName', sql.NVarChar, 'Test User')
      .input('wingId', sql.Int, 19)
      .input('wingName', sql.NVarChar, 'Project Management Unit')
      .query(`
        INSERT INTO inventory_verification_requests 
        (stock_issuance_id, item_master_id, item_nomenclature, requested_quantity, requested_by_user_id, requested_by_name, 
         verification_status, wing_id, wing_name, created_at, updated_at)
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, @requestedQuantity, @requestedByUserId, @requestedByName,
                'pending', @wingId, @wingName, GETDATE(), GETDATE())
      `);

    const verificationId = insertResult.recordset[0].id;
    console.log(`✓ Created verification request ID: ${verificationId}`);
    console.log(`  Item: ${item.nomenclature}`);
    console.log(`  Wing: 19 (PMU)`);
    console.log(`  Status: pending`);

    // Now test the API filter - verify that user 3730207514595 can see it
    console.log('\n=== TESTING FILTER ===');
    const filterResult = await pool.request()
      .query(`
        SELECT ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT Id FROM AspNetUsers WHERE UserName = '3730207514595')
          AND r.role_name = 'WING_SUPERVISOR'
          AND ur.scope_wing_id IS NOT NULL
      `);

    const wingIds = filterResult.recordset.map(w => w.scope_wing_id);
    console.log(`User 3730207514595 is WING_SUPERVISOR for wings: ${wingIds.join(', ')}`);

    if (wingIds.includes(19)) {
      console.log('✓ Wing 19 is in the list - user SHOULD see the verification request!');
    } else {
      console.log('❌ Wing 19 is NOT in the list - there\'s a mismatch');
    }

    // Check if the verification is visible with the filter
    console.log('\n=== CHECKING VISIBILITY ===');
    const placeholders = wingIds.map((_, i) => `@wingId${i}`).join(',');
    if (wingIds.length > 0) {
      let query = `SELECT id, item_nomenclature, wing_id, wing_name FROM View_Pending_Inventory_Verifications WHERE wing_id IN (${placeholders})`;
      let request = pool.request();
      wingIds.forEach((wingId, i) => {
        request.input(`wingId${i}`, sql.Int, wingId);
      });
      const visibilityResult = await request.query(query);
      console.log(`Found ${visibilityResult.recordset.length} verification request(s) visible to user:`);
      visibilityResult.recordset.forEach(v => {
        console.log(`  - ${v.item_nomenclature} (Wing: ${v.wing_name})`);
      });
    }

    await pool.close();
    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestVerification();
