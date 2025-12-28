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

async function diagnoseApprovalDashboard() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    // Find all pending requests
    console.log('📋 STEP 1: Check all requests');
    const requestsCheck = await pool.request()
      .query(`
        SELECT 
          ra.id as approval_id,
          ra.request_id,
          ra.current_approver_id,
          u.FullName as approver_name,
          ra.submitted_by,
          u_sub.FullName as requester_name,
          (SELECT COUNT(*) FROM stock_issuance_items WHERE request_id = ra.request_id) as item_count_in_stock,
          (SELECT COUNT(*) FROM approval_items WHERE request_approval_id = ra.id) as item_count_in_approval
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
        LEFT JOIN AspNetUsers u_sub ON u_sub.Id = ra.submitted_by
        WHERE ra.request_type = 'stock_issuance'
        ORDER BY ra.id DESC
      `);

    console.log(`Found ${requestsCheck.recordset.length} requests\n`);
    
    if (requestsCheck.recordset.length === 0) {
      console.log('❌ No requests found!');
      return;
    }

    requestsCheck.recordset.slice(0, 5).forEach((req, i) => {
      console.log(`${i+1}. Request: ${req.request_id?.toString().slice(0, 12)}`);
      console.log(`   Approver: ${req.approver_name}`);
      console.log(`   Requester: ${req.requester_name}`);
      console.log(`   Items in stock_issuance_items: ${req.item_count_in_stock}`);
      console.log(`   Items in approval_items: ${req.item_count_in_approval}`);
      console.log('');
    });

    // Check approval_items with PENDING status
    console.log('\n📋 STEP 2: Check PENDING items');
    const pendingItems = await pool.request()
      .query(`
        SELECT 
          ai.id,
          ai.nomenclature,
          ai.decision_type,
          ra.id as approval_id,
          ra.current_approver_id,
          u.FullName as approver_name
        FROM approval_items ai
        INNER JOIN request_approvals ra ON ra.id = ai.request_approval_id
        WHERE ai.decision_type = 'PENDING'
        ORDER BY ai.created_at DESC
      `);

    console.log(`Found ${pendingItems.recordset.length} PENDING items`);
    
    if (pendingItems.recordset.length > 0) {
      pendingItems.recordset.slice(0, 5).forEach((item, i) => {
        console.log(`${i+1}. Item: ${item.nomenclature} (${item.decision_type})`);
        console.log(`   Approver: ${item.approver_name}`);
      });
    }

    // Check a specific approver
    console.log('\n📋 STEP 3: Check a specific approver');
    const approverCheck = await pool.request()
      .query(`
        SELECT DISTINCT ra.current_approver_id, u.FullName as approver_name, u.Id
        FROM request_approvals ra
        LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
        WHERE ra.current_approver_id IS NOT NULL
        LIMIT 1
      `);

    if (approverCheck.recordset.length > 0) {
      const approver = approverCheck.recordset[0];
      console.log(`Checking approver: ${approver.approver_name} (${approver.current_approver_id})\n`);

      const approverRequests = await pool.request()
        .input('userId', sql.NVarChar(450), approver.current_approver_id)
        .query(`
          SELECT 
            COUNT(DISTINCT ra.id) as total_requests,
            (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
             INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
             WHERE ra.current_approver_id = @userId AND ai.decision_type = 'PENDING') as pending_requests
          FROM request_approvals ra
          WHERE ra.current_approver_id = @userId
        `);

      const counts = approverRequests.recordset[0];
      console.log(`Total requests assigned: ${counts.total_requests}`);
      console.log(`Pending requests (with PENDING items): ${counts.pending_requests}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

diagnoseApprovalDashboard();
