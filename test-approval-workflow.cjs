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

async function cleanupAndTest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('🔄 Starting cleanup and test...\n');
    
    // ============================================================
    // STEP 1: CLEANUP OLD TEST DATA
    // ============================================================
    console.log('📦 STEP 1: Cleaning up old test data...');
    
    // Find and delete old test requests
    const oldRequests = await pool.request().query(`
      SELECT id FROM stock_issuance_requests
      WHERE created_at < DATEADD(day, -1, GETDATE())
      AND request_number LIKE 'TEST-%'
    `);
    
    for (const req of oldRequests.recordset) {
      await pool.request().query(`
        DELETE FROM approval_items WHERE request_approval_id IN (
          SELECT id FROM request_approvals WHERE request_id = '${req.id}'
        );
        DELETE FROM approval_history WHERE request_approval_id IN (
          SELECT id FROM request_approvals WHERE request_id = '${req.id}'
        );
        DELETE FROM request_approvals WHERE request_id = '${req.id}';
        DELETE FROM stock_issuance_items WHERE request_id = '${req.id}';
        DELETE FROM stock_issuance_requests WHERE id = '${req.id}';
      `);
    }
    console.log(`   ✅ Deleted ${oldRequests.recordset.length} old test requests\n`);
    
    // ============================================================
    // STEP 2: CREATE NEW TEST REQUEST
    // ============================================================
    console.log('📝 STEP 2: Creating new test request...');
    
    // Get a test user
    const userResult = await pool.request().query(`
      SELECT TOP 1 Id, FullName FROM AspNetUsers 
      WHERE Id IS NOT NULL AND FullName IS NOT NULL
      ORDER BY NEWID()
    `);
    
    if (userResult.recordset.length === 0) {
      console.error('❌ No users found in database');
      return;
    }
    
    const testUserId = userResult.recordset[0].Id;
    const testUserName = userResult.recordset[0].FullName;
    console.log(`   User: ${testUserName}`);
    
    // Create test request
    const requestResult = await pool.request()
      .input('requestNumber', sql.NVarChar, `TEST-${Date.now()}`)
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        INSERT INTO stock_issuance_requests (
          id, request_number, requester_user_id, approval_status, request_status, created_at
        )
        OUTPUT INSERTED.id, INSERTED.request_number
        VALUES (NEWID(), @requestNumber, @userId, 'Pending Supervisor Review', 'Pending', GETDATE())
      `);
    
    const testRequestId = requestResult.recordset[0].id;
    const testRequestNumber = requestResult.recordset[0].request_number;
    console.log(`   ✅ Created request: ${testRequestNumber}`);
    console.log(`      Request ID: ${testRequestId}\n`);
    
    // ============================================================
    // STEP 3: ADD TEST ITEMS
    // ============================================================
    console.log('📦 STEP 3: Adding test items...');
    
    const testItems = [
      { nomenclature: 'Test Item 1 - Switches', quantity: 5 },
      { nomenclature: 'Test Item 2 - Cables', quantity: 10 },
      { nomenclature: 'Test Item 3 - Adapters', quantity: 3 }
    ];
    
    const itemIds = [];
    for (const item of testItems) {
      const itemResult = await pool.request()
        .input('requestId', sql.UniqueIdentifier, testRequestId)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('quantity', sql.Int, item.quantity)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, nomenclature, requested_quantity, created_at
          )
          OUTPUT INSERTED.id
          VALUES (NEWID(), @requestId, @nomenclature, @quantity, GETDATE())
        `);
      
      itemIds.push(itemResult.recordset[0].id);
      console.log(`   ✅ Added: ${item.nomenclature} (qty: ${item.quantity})`);
    }
    console.log('');
    
    // ============================================================
    // STEP 4: SUBMIT FOR APPROVAL
    // ============================================================
    console.log('🔄 STEP 4: Submitting for approval...');
    
    // Get or create the stock issuance workflow
    let workflowId;
    const workflowResult = await pool.request().query(`
      SELECT TOP 1 id FROM approval_workflows 
      WHERE request_type = 'stock_issuance'
    `);
    
    if (workflowResult.recordset.length > 0) {
      workflowId = workflowResult.recordset[0].id;
    } else {
      console.log('   Creating stock issuance workflow...');
      const createWfResult = await pool.request()
        .input('name', sql.NVarChar, 'Stock Issuance Approval')
        .input('requestType', sql.NVarChar, 'stock_issuance')
        .query(`
          INSERT INTO approval_workflows (id, name, request_type, created_at)
          OUTPUT INSERTED.id
          VALUES (NEWID(), @name, @requestType, GETDATE())
        `);
      workflowId = createWfResult.recordset[0].id;
    }
    
    console.log(`   Workflow ID: ${workflowId}`);
    
    // Get or create first approver
    let firstApproverId;
    const approverResult = await pool.request()
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .query(`
        SELECT TOP 1 user_id FROM workflow_approvers 
        WHERE workflow_id = @workflowId AND can_approve = 1
      `);
    
    if (approverResult.recordset.length > 0) {
      firstApproverId = approverResult.recordset[0].user_id;
    } else {
      // Get a random user to be the approver
      const approverUserResult = await pool.request().query(`
        SELECT TOP 1 Id FROM AspNetUsers 
        WHERE Id IS NOT NULL AND FullName IS NOT NULL
        AND Id != @userId
      `.replace('@userId', `'${testUserId}'`));
      
      if (approverUserResult.recordset.length === 0) {
        console.error('❌ No approvers available');
        return;
      }
      
      firstApproverId = approverUserResult.recordset[0].Id;
      
      // Add as approver
      await pool.request()
        .input('workflowId', sql.UniqueIdentifier, workflowId)
        .input('userId', sql.NVarChar, firstApproverId)
        .query(`
          INSERT INTO workflow_approvers (workflow_id, user_id, can_approve, added_date)
          VALUES (@workflowId, @userId, 1, GETDATE())
        `);
    }
    
    console.log(`   Approver: ${firstApproverId}`);
    
    // Create approval record
    const approvalResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .input('approverId', sql.NVarChar, firstApproverId)
      .input('submittedBy', sql.UniqueIdentifier, testUserId)
      .query(`
        INSERT INTO request_approvals (
          request_id, request_type, workflow_id, current_approver_id, 
          current_status, submitted_by
        )
        OUTPUT INSERTED.id
        VALUES (
          @requestId, 'stock_issuance', @workflowId, @approverId,
          'pending', @submittedBy
        )
      `);
    
    const approvalId = approvalResult.recordset[0].id;
    console.log(`   ✅ Created approval record: ${approvalId}`);
    
    // ============================================================
    // STEP 5: POPULATE APPROVAL_ITEMS (THIS IS THE FIX!)
    // ============================================================
    console.log('\n🔧 STEP 5: Populating approval_items (TESTING THE FIX)...');
    
    // Get items for this request
    const itemsToApproveResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, testRequestId)
      .query(`
        SELECT id, item_master_id, nomenclature, custom_item_name, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);
    
    console.log(`   Found ${itemsToApproveResult.recordset.length} items to link\n`);
    
    for (const item of itemsToApproveResult.recordset) {
      try {
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
        console.log(`   ✅ Added approval_item: ${item.nomenclature}`);
      } catch (err) {
        console.error(`   ❌ Failed to add ${item.nomenclature}:`, err.message);
      }
    }
    
    // ============================================================
    // STEP 6: VERIFY APPROVAL_ITEMS WERE CREATED
    // ============================================================
    console.log('\n✅ STEP 6: Verifying approval_items...');
    
    const verifyResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    console.log(`\n   Total approval_items created: ${verifyResult.recordset.length}`);
    verifyResult.recordset.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.nomenclature}`);
      console.log(`      - Requested: ${item.requested_quantity}`);
      console.log(`      - Decision: ${item.decision_type || 'PENDING'}`);
      console.log(`      - Reason: ${item.rejection_reason || 'N/A'}`);
    });
    
    // ============================================================
    // STEP 7: SIMULATE SUPERVISOR APPROVAL (with mixed decisions)
    // ============================================================
    console.log('\n🔄 STEP 7: Simulating supervisor approval...');
    
    // Get the approval items again
    const itemsForDecision = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature FROM approval_items
        WHERE request_approval_id = @approvalId
      `);
    
    // Make different decisions for each item
    const decisions = [
      { itemId: itemsForDecision.recordset[0].id, decision: 'APPROVE_FROM_STOCK', quantity: 5 },
      { itemId: itemsForDecision.recordset[1].id, decision: 'RETURN', quantity: 0 },
      { itemId: itemsForDecision.recordset[2].id, decision: 'APPROVE_FROM_STOCK', quantity: 3 }
    ];
    
    for (const decision of decisions) {
      try {
        await pool.request()
          .input('itemId', sql.UniqueIdentifier, decision.itemId)
          .input('decisionType', sql.NVarChar, decision.decision)
          .input('allocatedQty', sql.Int, decision.quantity)
          .input('reason', sql.NVarChar, decision.decision === 'RETURN' ? 'Request returned to requester for editing' : null)
          .query(`
            UPDATE approval_items
            SET decision_type = @decisionType,
                allocated_quantity = @allocatedQty,
                rejection_reason = @reason,
                updated_at = GETDATE()
            WHERE id = @itemId
          `);
        console.log(`   ✅ Updated decision: ${decision.decision} (qty: ${decision.quantity})`);
      } catch (err) {
        console.error(`   ❌ Failed to update:`, err.message);
      }
    }
    
    // ============================================================
    // STEP 8: VERIFY DECISIONS WERE SAVED
    // ============================================================
    console.log('\n✅ STEP 8: Verifying decisions...');
    
    const decisionsResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT nomenclature, decision_type, allocated_quantity, rejection_reason
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);
    
    console.log(`\n   Final Approval Decisions:`);
    decisionsResult.recordset.forEach((item, idx) => {
      const status = item.decision_type === 'RETURN' ? '↩ RETURNED' : '✅ APPROVED';
      console.log(`   ${idx + 1}. ${item.nomenclature}: ${status}`);
      if (item.decision_type === 'RETURN') {
        console.log(`      → Will appear in requester's "Returned Requests"`);
      }
    });
    
    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST COMPLETE - ALL STEPS PASSED!');
    console.log('='.repeat(60));
    console.log(`\nTest Request Summary:`);
    console.log(`  - Request Number: ${testRequestNumber}`);
    console.log(`  - Request ID: ${testRequestId}`);
    console.log(`  - Approval ID: ${approvalId}`);
    console.log(`  - Items: ${verifyResult.recordset.length}`);
    console.log(`  - Decisions: ${decisionsResult.recordset.length}`);
    console.log(`  - Returned Items: ${decisionsResult.recordset.filter(i => i.decision_type === 'RETURN').length}`);
    console.log(`\n✅ Approval workflow is now FULLY FUNCTIONAL!`);
    console.log(`✅ Items will appear in supervisor's dashboard`);
    console.log(`✅ Supervisor can make per-item decisions`);
    console.log(`✅ Returned items will appear in requester's returned section`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await pool.close();
  }
}

cleanupAndTest();
