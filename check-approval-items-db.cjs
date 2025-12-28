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

async function checkApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    // Check the specific request from the screenshot
    const requestId = '0DC79EAB-02F8-41AA-BF10-F1944567070A';
    
    console.log('📋 Checking request:', requestId);
    console.log('');

    // Get approval record
    const approvalCheck = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, request_id, current_approver_id
        FROM request_approvals
        WHERE request_id = @requestId
      `);

    if (approvalCheck.recordset.length === 0) {
      console.log('❌ No approval record found');
      return;
    }

    const approval = approvalCheck.recordset[0];
    console.log('✅ Found approval record:', approval.id);
    console.log('');

    // Check items in stock_issuance_items
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    console.log(`📦 Items in stock_issuance_items: ${stockItems.recordset.length}`);
    stockItems.recordset.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.nomenclature} (qty: ${item.requested_quantity})`);
    });
    console.log('');

    // Check items in approval_items
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approval.id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);

    console.log(`✅ Items in approval_items: ${approvalItems.recordset.length}`);
    if (approvalItems.recordset.length > 0) {
      approvalItems.recordset.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.nomenclature} (qty: ${item.requested_quantity}, decision_type: ${item.decision_type})`);
      });
    } else {
      console.log('   ❌ NO ITEMS FOUND - Items need to be added to approval_items!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

checkApprovalItems();
