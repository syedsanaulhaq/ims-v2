const sql = require('mssql');
const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    const requestId = '0DC79EAB-02F8-41AA-BF10-F1944567070A';

    console.log('=== CHECKING STOCK_ISSUANCE_ITEMS TABLE ===\n');
    const items = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          id as ItemId,
          nomenclature,
          requested_quantity,
          created_at
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    console.log(`Found ${items.recordset.length} items in stock_issuance_items:\n`);
    items.recordset.forEach(item => {
      console.log(`Item: ${item.nomenclature}`);
      console.log(`  ID: ${item.ItemId}`);
      console.log(`  Quantity: ${item.requested_quantity}`);
      console.log(`  Created: ${item.created_at}`);
      console.log('');
    });

    if (items.recordset.length === 0) {
      console.log('⚠️  No items found in stock_issuance_items');
      console.log('The request has no items submitted yet!');
    } else {
      console.log('\n=== CHECKING APPROVAL_ITEMS TABLE ===\n');
      const approvalItems = await pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT 
            ai.id,
            ai.nomenclature,
            ai.decision_type,
            ai.request_approval_id
          FROM approval_items ai
          WHERE ai.request_approval_id IN (
            SELECT id FROM request_approvals WHERE request_id = @requestId
          )
        `);

      console.log(`Found ${approvalItems.recordset.length} items in approval_items\n`);
      if (approvalItems.recordset.length === 0) {
        console.log('❌ Problem: Items exist in stock_issuance_items but NOT in approval_items!');
        console.log('The /api/stock-issuance/items endpoint did not populate approval_items.');
      }
    }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

checkItems();
