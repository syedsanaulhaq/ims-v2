const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function populateNomenclature() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to InventoryManagementDB\n');

    // Get all verification requests that have NULL nomenclature
    console.log('📋 Finding verification requests with NULL nomenclature...');
    const pendingResult = await pool.request().query(`
      SELECT TOP 20
        id,
        item_master_id,
        requested_quantity,
        requested_by_name
      FROM inventory_verification_requests
      WHERE item_nomenclature IS NULL
      ORDER BY created_at DESC
    `);

    console.log(`Found ${pendingResult.recordset.length} records with NULL nomenclature\n`);

    if (pendingResult.recordset.length === 0) {
      console.log('✅ All records already have nomenclature!');
      await pool.close();
      return;
    }

    // For each record, try to get nomenclature from item_master table
    let updated = 0;
    let couldNotFind = 0;

    for (const record of pendingResult.recordset) {
      console.log(`\n🔍 Processing record ID ${record.id}:`);
      console.log(`   item_master_id: ${record.item_master_id}`);
      
      // Try to find nomenclature from item_masters table
      try {
        const itemResult = await pool.request()
          .input('itemId', sql.NVarChar, record.item_master_id)
          .query(`
            SELECT TOP 1 nomenclature FROM item_masters WHERE id = @itemId
          `);

        if (itemResult.recordset.length > 0 && itemResult.recordset[0].nomenclature) {
          const nomenclature = itemResult.recordset[0].nomenclature;
          console.log(`   ✅ Found nomenclature: "${nomenclature}"`);
          
          // Update the record
          await pool.request()
            .input('id', sql.Int, record.id)
            .input('nomenclature', sql.NVarChar, nomenclature)
            .query(`
              UPDATE inventory_verification_requests
              SET item_nomenclature = @nomenclature
              WHERE id = @id
            `);
          
          console.log(`   ✅ Updated record`);
          updated++;
        } else {
          console.log(`   ❌ No nomenclature found in item_masters`);
          couldNotFind++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        couldNotFind++;
      }
    }

    console.log(`\n\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Could not find: ${couldNotFind}`);

    // Show final state
    console.log('\n📋 Final state of records:');
    const finalResult = await pool.request().query(`
      SELECT TOP 10
        id,
        item_nomenclature,
        requested_by_name,
        verification_status
      FROM View_Pending_Inventory_Verifications
      ORDER BY created_at DESC
    `);

    finalResult.recordset.forEach((row, idx) => {
      console.log(`${idx + 1}. "${row.item_nomenclature}" - ${row.requested_by_name}`);
    });

    await pool.close();
    console.log('\n✅ Population complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

populateNomenclature();
