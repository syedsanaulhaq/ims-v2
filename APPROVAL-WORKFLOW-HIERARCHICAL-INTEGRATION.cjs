// ============================================================================
// HIERARCHICAL INVENTORY INTEGRATION EXAMPLE
// Shows how to integrate hierarchical deduction into approval workflow
// ============================================================================

/**
 * EXAMPLE 1: Wing Supervisor Approves Request
 * (Deducts from wing inventory)
 */
async function approveWingRequest(req, res) {
  try {
    const {
      stockIssuanceId,
      wingId,
      itemMasterId,
      quantityNeeded,
      userId,
      userName
    } = req.body;

    console.log(`\n👨‍⚕️ WING SUPERVISOR APPROVING REQUEST`);
    console.log(`   Wing: ${wingId}`);
    console.log(`   Item: ${itemMasterId}`);
    console.log(`   Quantity: ${quantityNeeded}`);

    // Step 1: Update request status to approved
    await pool.request()
      .input('id', sql.UniqueIdentifier, stockIssuanceId)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'APPROVED',
            approved_by_user_id = @userId,
            approved_by_name = @userName,
            approved_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @id
      `)
      .input('userId', sql.NVarChar(450), userId)
      .input('userName', sql.NVarChar(255), userName);

    console.log(`   ✅ Request marked as APPROVED`);

    // Step 2: Call hierarchical deduction endpoint
    console.log(`   📍 Calling hierarchical inventory deduction...`);

    const deductionResponse = await fetch('http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: stockIssuanceId,
        itemMasterId: itemMasterId,
        quantityToDeduct: quantityNeeded,
        wingId: wingId,  // ← KEY: Non-null = deduct from WING inventory
        deductedBy: userId,
        deductedByName: userName,
        reason: `Wing approved request #${stockIssuanceId}`
      })
    });

    if (!deductionResponse.ok) {
      const error = await deductionResponse.json();
      console.error(`   ❌ Deduction failed: ${error.details}`);
      return res.status(400).json({
        error: error.details || 'Failed to deduct from wing inventory'
      });
    }

    const deductionResult = await deductionResponse.json();

    console.log(`   ✅ Deducted from ${deductionResult.location}`);
    console.log(`   ✅ New quantity: ${deductionResult.new_quantity}`);

    // Step 3: Update stock issuance status
    await pool.request()
      .input('id', sql.UniqueIdentifier, stockIssuanceId)
      .query(`
        UPDATE stock_issuance_requests
        SET fulfillment_status = 'FULFILLED',
            fulfilled_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Request approved and inventory deducted from wing',
      location: deductionResult.location,
      new_quantity: deductionResult.new_quantity
    });

  } catch (error) {
    console.error('❌ Error approving wing request:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * EXAMPLE 2: Admin Approves Request
 * (Deducts from admin inventory)
 */
async function approveAdminRequest(req, res) {
  try {
    const {
      stockIssuanceId,
      itemMasterId,
      quantityNeeded,
      userId,
      userName
    } = req.body;

    console.log(`\n👔 ADMIN APPROVING REQUEST`);
    console.log(`   Item: ${itemMasterId}`);
    console.log(`   Quantity: ${quantityNeeded}`);

    // Step 1: Update request status
    await pool.request()
      .input('id', sql.UniqueIdentifier, stockIssuanceId)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'ADMIN_APPROVED',
            approved_by_user_id = @userId,
            approved_by_name = @userName,
            approved_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @id
      `)
      .input('userId', sql.NVarChar(450), userId)
      .input('userName', sql.NVarChar(255), userName);

    console.log(`   ✅ Request marked as ADMIN_APPROVED`);

    // Step 2: Call hierarchical deduction (wingId = null for admin)
    console.log(`   📍 Calling admin-level inventory deduction...`);

    const deductionResponse = await fetch('http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: stockIssuanceId,
        itemMasterId: itemMasterId,
        quantityToDeduct: quantityNeeded,
        wingId: null,  // ← KEY: null = deduct from ADMIN inventory
        deductedBy: userId,
        deductedByName: userName,
        reason: `Admin approved request #${stockIssuanceId}`
      })
    });

    if (!deductionResponse.ok) {
      const error = await deductionResponse.json();
      console.error(`   ❌ Deduction failed: ${error.details}`);
      return res.status(400).json({
        error: error.details || 'Failed to deduct from admin inventory'
      });
    }

    const deductionResult = await deductionResponse.json();

    console.log(`   ✅ Deducted from ${deductionResult.location}`);
    console.log(`   ✅ New quantity: ${deductionResult.new_quantity}`);

    res.json({
      success: true,
      message: 'Request approved and inventory deducted from admin warehouse',
      location: deductionResult.location,
      new_quantity: deductionResult.new_quantity
    });

  } catch (error) {
    console.error('❌ Error approving admin request:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * EXAMPLE 3: Wing Insufficient Stock → Forward to Admin
 */
async function forwardRequestToAdmin(req, res) {
  try {
    const {
      stockIssuanceId,
      wingId,
      quantityNeeded,
      wingAvailableQuantity,
      userId,
      userName
    } = req.body;

    console.log(`\n📤 FORWARDING REQUEST FROM WING TO ADMIN`);
    console.log(`   Wing: ${wingId}`);
    console.log(`   Needed: ${quantityNeeded}, Available: ${wingAvailableQuantity}`);

    // Check if wing really doesn't have enough
    if (wingAvailableQuantity >= quantityNeeded) {
      return res.status(400).json({
        error: 'Wing has sufficient inventory - no need to forward'
      });
    }

    // Step 1: Call forwarding endpoint
    console.log(`   📍 Updating request source to Admin inventory...`);

    const forwardResponse = await fetch('http://localhost:3000/api/hierarchical-inventory/forward-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: stockIssuanceId,
        wingId: wingId,
        forwardedBy: userId,
        forwardedByName: userName,
        reason: `Insufficient stock in wing (need ${quantityNeeded}, have ${wingAvailableQuantity})`
      })
    });

    if (!forwardResponse.ok) {
      const error = await forwardResponse.json();
      console.error(`   ❌ Forwarding failed: ${error.details}`);
      return res.status(400).json({ error: error.details });
    }

    const forwardResult = await forwardResponse.json();

    console.log(`   ✅ Request forwarded to admin`);
    console.log(`   📋 Now awaiting admin approval...`);

    // Step 2: Update request status
    await pool.request()
      .input('id', sql.UniqueIdentifier, stockIssuanceId)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'FORWARDED_TO_ADMIN',
            forwarded_at = GETDATE(),
            forwarded_by_user_id = @userId,
            updated_at = GETDATE()
        WHERE id = @id
      `)
      .input('userId', sql.NVarChar(450), userId);

    res.json({
      success: true,
      message: 'Request forwarded to admin for approval',
      request_id: stockIssuanceId,
      wing_id: wingId,
      forwarded_reason: `Insufficient stock (need ${quantityNeeded}, have ${wingAvailableQuantity})`
    });

  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * EXAMPLE 4: Complete Workflow Helper
 * Automatically decides: Approve wing / Forward to admin
 */
async function smartApprovalWorkflow(req, res) {
  try {
    const {
      stockIssuanceId,
      wingId,
      itemMasterId,
      quantityNeeded,
      userId,
      userName
    } = req.body;

    console.log(`\n🤖 SMART APPROVAL WORKFLOW`);
    console.log(`   Wing: ${wingId}`);
    console.log(`   Item: ${itemMasterId}`);
    console.log(`   Quantity Needed: ${quantityNeeded}`);

    if (!wingId) {
      // Admin request - approve directly
      console.log(`   📌 Admin request - approving from admin inventory`);
      return await approveAdminRequest(req, res);
    }

    // Wing request - check availability
    console.log(`   🔍 Checking wing inventory...`);

    const stockResult = await pool.request()
      .input('wingId', sql.Int, wingId)
      .input('itemId', sql.UniqueIdentifier, itemMasterId)
      .query(`
        SELECT ist.available_quantity
        FROM inventory_stock ist
        JOIN inventory_locations il ON ist.location_id = il.id
        WHERE il.wing_id = @wingId 
          AND ist.item_master_id = @itemId
          AND il.location_type = 'WING_INVENTORY'
      `);

    const availableQuantity = stockResult.recordset.length > 0 
      ? stockResult.recordset[0].available_quantity 
      : 0;

    console.log(`   📊 Available in wing: ${availableQuantity} units`);

    if (availableQuantity >= quantityNeeded) {
      // Approve from wing
      console.log(`   ✅ Sufficient inventory - approving from wing`);
      return await approveWingRequest(req, res);
    } else {
      // Forward to admin
      console.log(`   ⚠️  Insufficient inventory - forwarding to admin`);
      req.body.wingAvailableQuantity = availableQuantity;
      return await forwardRequestToAdmin(req, res);
    }

  } catch (error) {
    console.error('❌ Error in smart approval workflow:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// REGISTER ENDPOINTS
// ============================================================================

app.post('/api/approval/wing-approve', approveWingRequest);
app.post('/api/approval/admin-approve', approveAdminRequest);
app.post('/api/approval/forward-to-admin', forwardRequestToAdmin);
app.post('/api/approval/smart-workflow', smartApprovalWorkflow);

console.log('✅ Hierarchical inventory approval endpoints registered');

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * EXAMPLE: Wing Supervisor Approving Request
 * 
 * POST /api/approval/wing-approve
 * {
 *   "stockIssuanceId": "550e8400-e29b-41d4-a716-446655440000",
 *   "wingId": 1,
 *   "itemMasterId": "650e8400-e29b-41d4-a716-446655440001",
 *   "quantityNeeded": 10,
 *   "userId": "user@domain.com",
 *   "userName": "Dr. Smith"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Request approved and inventory deducted from wing",
 *   "location": "Surgery Ward Inventory",
 *   "new_quantity": 90
 * }
 */

/**
 * EXAMPLE: Admin Approving Request
 * 
 * POST /api/approval/admin-approve
 * {
 *   "stockIssuanceId": "550e8400-e29b-41d4-a716-446655440000",
 *   "itemMasterId": "650e8400-e29b-41d4-a716-446655440001",
 *   "quantityNeeded": 20,
 *   "userId": "admin@domain.com",
 *   "userName": "Admin User"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Request approved and inventory deducted from admin warehouse",
 *   "location": "Admin Central Warehouse",
 *   "new_quantity": 480
 * }
 */

/**
 * EXAMPLE: Forwarding Request to Admin
 * 
 * POST /api/approval/forward-to-admin
 * {
 *   "stockIssuanceId": "550e8400-e29b-41d4-a716-446655440000",
 *   "wingId": 1,
 *   "quantityNeeded": 20,
 *   "wingAvailableQuantity": 5,
 *   "userId": "doctor@domain.com",
 *   "userName": "Dr. Jones"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Request forwarded to admin for approval",
 *   "request_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "wing_id": 1,
 *   "forwarded_reason": "Insufficient stock (need 20, have 5)"
 * }
 */

/**
 * EXAMPLE: Smart Approval Workflow (Auto-decides)
 * 
 * POST /api/approval/smart-workflow
 * {
 *   "stockIssuanceId": "550e8400-e29b-41d4-a716-446655440000",
 *   "wingId": 1,
 *   "itemMasterId": "650e8400-e29b-41d4-a716-446655440001",
 *   "quantityNeeded": 10,
 *   "userId": "doctor@domain.com",
 *   "userName": "Dr. Smith"
 * }
 * 
 * This endpoint automatically:
 * 1. Checks wing inventory
 * 2. If sufficient → Approves from wing
 * 3. If insufficient → Forwards to admin
 * 
 * Response varies based on availability
 */
