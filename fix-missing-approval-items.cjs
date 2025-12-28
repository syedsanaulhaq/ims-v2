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

async function fixApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    const approvalId = '8F8D4879-A428-408B-B417-413B111A025E';
    const requestId = '987358A8-6844-4FA0-9299-E7AF1F230EEE';
    
    console.log('🔧 Creating missing approval_items...');
    
    // First check what columns exist
    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_issuance_items'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('   stock_issuance_items columns:', schemaResult.recordset.map(c => c.COLUMN_NAME).join(', '));
    
    // Get items for this request
    const itemsResult = await pool.request().query(`
      SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity
      FROM stock_issuance_items
      WHERE request_id = '${requestId}'
    `);
    
    console.log(`   Found ${itemsResult.recordset.length} items to link`);
    
    // Insert approval items
    for (const item of itemsResult.recordset) {
      await pool.request()
        .input('approvalId', sql.UniqueIdentifier, approvalId)
        .input('itemMasterId', sql.UniqueIdentifier, item.item_master_id)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('customItemName', sql.NVarChar, item.custom_item_name)
        .input('requestedQuantity', sql.Int, item.requested_quantity)
        .query(`
          INSERT INTO approval_items (
            request_approval_id, item_master_id, nomenclature,
            custom_item_name, requested_quantity
          )
          VALUES (
            @approvalId, @itemMasterId, @nomenclature,
            @customItemName, @requestedQuantity
          )
        `);
      console.log(`   ✅ Added: ${item.nomenclature}`);
    }
    
    // Verify
    const verifyResult = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM approval_items
      WHERE request_approval_id = '${approvalId}'
    `);
    
    console.log(`\n✅ Verification: ${verifyResult.recordset[0].count} approval items now exist`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

fixApprovalItems();
