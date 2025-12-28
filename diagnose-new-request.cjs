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

async function diagnosticCheck() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    const requestId = 'E0D6C366-AD5C-4403-B982-B983DE79FB3D';
    
    console.log('📋 DIAGNOSTIC CHECK FOR REQUEST:', requestId);
    console.log('='.repeat(60));

    // Step 1: Check approval record
    console.log('\n1️⃣  Checking request_approvals table:');
    const approvalCheck = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, request_id, current_approver_id, submitted_date
        FROM request_approvals
        WHERE request_id = @requestId
      `);

    if (approvalCheck.recordset.length === 0) {
      console.log('   ❌ No approval record found!');
      return;
    }

    const approval = approvalCheck.recordset[0];
    console.log('   ✅ Found approval record');
    console.log('      Approval ID:', approval.id);
    console.log('      Request ID:', approval.request_id);

    // Step 2: Check stock items
    console.log('\n2️⃣  Checking stock_issuance_items table:');
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity, created_at
        FROM stock_issuance_items
        WHERE request_id = @requestId
        ORDER BY created_at
      `);

    console.log(`   Found ${stockItems.recordset.length} items in stock_issuance_items`);
    stockItems.recordset.forEach((item, i) => {
      console.log(`      ${i+1}. ${item.nomenclature} (qty: ${item.requested_quantity})`);
    });

    // Step 3: Check approval items
    console.log('\n3️⃣  Checking approval_items table:');
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approval.id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, created_at
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY created_at
      `);

    console.log(`   Found ${approvalItems.recordset.length} items in approval_items`);
    if (approvalItems.recordset.length > 0) {
      approvalItems.recordset.forEach((item, i) => {
        console.log(`      ${i+1}. ${item.nomenclature} (qty: ${item.requested_quantity}, decision: ${item.decision_type})`);
      });
    } else {
      console.log('   ❌ PROBLEM: No items in approval_items!');
      console.log('   ⚠️  Items exist in stock_issuance_items but NOT in approval_items');
      console.log('   📝 The /api/stock-issuance/items endpoint did not populate approval_items');
    }

    // Step 4: Compare counts
    console.log('\n4️⃣  Summary:');
    console.log(`   Stock items: ${stockItems.recordset.length}`);
    console.log(`   Approval items: ${approvalItems.recordset.length}`);
    
    if (stockItems.recordset.length > 0 && approvalItems.recordset.length === 0) {
      console.log('   ❌ MISMATCH: Items were created but not added to approval_items table!');
    } else if (stockItems.recordset.length === approvalItems.recordset.length) {
      console.log('   ✅ Items properly synchronized!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

diagnosticCheck();
