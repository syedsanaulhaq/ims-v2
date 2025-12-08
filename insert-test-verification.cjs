const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB_TEST',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function insertTestData() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Get a sample user ID from AspNetUsers
    const userResult = await pool.request().query(`
      SELECT TOP 1 Id as user_id, FullName FROM AspNetUsers WHERE ISACT = 1
    `);

    if (userResult.recordset.length === 0) {
      console.error('❌ No active users found in AspNetUsers');
      await pool.close();
      return;
    }

    const testUser = userResult.recordset[0];
    console.log(`📝 Using test user: ${testUser.FullName} (${testUser.user_id})\n`);

    // Insert test verification request with nomenclature
    const testId = uuidv4();
    const stockIssuanceId = uuidv4();
    
    const insertResult = await pool.request()
      .input('id', sql.Int, 999)  // Use explicit ID for testing
      .input('stock_issuance_id', sql.UniqueIdentifier, stockIssuanceId)
      .input('item_master_id', sql.NVarChar, 'D96B728A-1234-5678-90AB-CDEF12345678')
      .input('item_nomenclature', sql.NVarChar, 'HP Laser Printer - Model M404N')
      .input('requested_by_user_id', sql.NVarChar, testUser.user_id)
      .input('requested_by_name', sql.NVarChar, testUser.FullName)
      .input('requested_quantity', sql.Int, 5)
      .input('verification_status', sql.NVarChar, 'pending')
      .input('wing_id', sql.Int, 1)
      .input('wing_name', sql.NVarChar, 'Test Wing')
      .query(`
        INSERT INTO inventory_verification_requests (
          stock_issuance_id, item_master_id, item_nomenclature, 
          requested_by_user_id, requested_by_name, requested_quantity,
          verification_status, wing_id, wing_name,
          created_at, updated_at
        ) VALUES (
          @stock_issuance_id, @item_master_id, @item_nomenclature,
          @requested_by_user_id, @requested_by_name, @requested_quantity,
          @verification_status, @wing_id, @wing_name,
          GETDATE(), GETDATE()
        )
      `);

    console.log('✅ Test record inserted!');

    // Now retrieve it from the view
    console.log('\n📋 Retrieving from View_Pending_Inventory_Verifications:');
    console.log('=====================================');
    const viewResult = await pool.request()
      .input('userId', sql.NVarChar, testUser.user_id)
      .query(`
        SELECT TOP 5 * FROM View_Pending_Inventory_Verifications
        WHERE requested_by_user_id = @userId
      `);

    if (viewResult.recordset.length > 0) {
      const record = viewResult.recordset[0];
      console.log('\nRetrieved from view:');
      console.log(`  ID: ${record.id}`);
      console.log(`  item_nomenclature: "${record.item_nomenclature}"`);
      console.log(`  requested_quantity: ${record.requested_quantity}`);
      console.log(`  status: ${record.status}`);
      console.log(`  verification_status: ${record.verification_status}`);
      console.log(`  requested_by_name: ${record.requested_by_name}`);
      console.log(`  created_at: ${record.created_at}`);
      
      console.log('\n✅ View is returning correct nomenclature!');
    } else {
      console.log('⚠️  No records returned from view');
    }

    await pool.close();
    console.log('\n✅ Test complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

insertTestData();
