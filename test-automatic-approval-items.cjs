const sql = require('mssql');

const config = {
  server: '192.168.70.6',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'syed@123'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function testAutomaticApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✓ Connected to database');

    // Check a recent request to verify automatic approval_items population
    const recentRequest = await pool.request()
      .query(`
        SELECT TOP 1 
          sir.id as request_id,
          sir.created_at,
          ra.id as approval_id,
          ra.current_approver_id,
          u.username as approver_name
        FROM stock_issuance_requests sir
        LEFT JOIN request_approvals ra ON sir.id = ra.request_id
        LEFT JOIN users u ON ra.current_approver_id = u.id
        WHERE ra.id IS NOT NULL
        ORDER BY sir.created_at DESC
      `);

    if (recentRequest.recordset.length === 0) {
      console.log('❌ No recent requests found with approvals');
      return;
    }

    const request = recentRequest.recordset[0];
    console.log('\n📋 Testing Recent Request:');
    console.log('   Request ID:', request.request_id);
    console.log('   Approver:', request.approver_name);
    console.log('   Created:', request.created_at);

    // Check items in stock_issuance_items
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, request.request_id)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    console.log('\n📦 Items in stock_issuance_items:', stockItems.recordset.length);
    stockItems.recordset.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.nomenclature} (qty: ${item.requested_quantity})`);
    });

    // Check items in approval_items
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, request.approval_id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);

    console.log('\n✅ Items in approval_items:', approvalItems.recordset.length);
    if (approvalItems.recordset.length === 0) {
      console.log('   ❌ ERROR: No items found in approval_items!');
      console.log('   Items were NOT automatically populated!');
      return;
    }

    approvalItems.recordset.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.nomenclature} - Decision: ${item.decision_type} (qty: ${item.requested_quantity})`);
    });

    console.log('\n✅ SUCCESS: Items are being automatically added to approval_items!');
    console.log('✅ Automatic flow is working correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

testAutomaticApprovalItems();
