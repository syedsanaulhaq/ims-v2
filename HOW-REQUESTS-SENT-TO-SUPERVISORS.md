# How Requests Are Sent to Wing Stock Supervisors - Implementation Patterns

## 🎯 Executive Summary

Based on git history and codebase analysis, the system uses a **multi-stage approval forwarding mechanism** where requests can be sent to wing supervisors, admin supervisors, or higher-level supervisors through:

1. **Per-Item Decision System** - Wing supervisors make individual decisions for each item
2. **Automatic Role-Based Routing** - System routes forwarded items to appropriate roles
3. **Direct Supervisor Forwarding** - Wing supervisors can forward items to specific users
4. **Verification Request System** - Wing supervisors can request inventory verification

---

## 📤 How Requests Are Sent to Wing Stock Supervisors

### **Method 1: Per-Item Approval System (Primary)**

When a request is submitted by a ward/requester, it's automatically routed to the wing supervisor for that wing.

**Frontend Flow**:
```
User Creates Request
    ↓
System identifies requester's wing_id
    ↓
Request marked as awaiting wing supervisor approval
    ↓
Wing Supervisor sees in Approval Dashboard
    ↓
Wing Supervisor makes per-item decisions
```

**Database Implementation**:
```javascript
// Identify wing supervisor
const wingResult = await pool.request()
  .input('requester_user_id', sql.NVarChar(450), requesterId)
  .query(`
    SELECT wing_id FROM AspNetUsers 
    WHERE Id = @requester_user_id
  `);

const wingId = wingResult.recordset[0].wing_id;

// Find wing supervisor(s) for that wing
const supervisorResult = await pool.request()
  .input('wingId', sql.Int, wingId)
  .query(`
    SELECT u.Id, u.FullName, u.Email
    FROM AspNetUsers u
    JOIN ims_user_roles ur ON u.Id = ur.user_id
    JOIN ims_roles r ON ur.role_id = r.id
    WHERE r.role_name = 'WING_SUPERVISOR' 
    AND u.wing_id = @wingId
  `);

// Send to wing supervisor
for (const supervisor of supervisorResult.recordset) {
  // Route request to supervisor's approval queue
  INSERT INTO request_approvals 
  (request_id, approver_id, approver_type, approval_level, status)
  VALUES (@requestId, @supervisorId, 'wing', 1, 'pending');
}
```

**Related Code Files**:
- `backend-server.cjs` lines 8520-8650
- `src/components/PerItemApprovalPanel.tsx` lines 1-100
- `src/pages/ApprovalManagement.tsx`

---

### **Method 2: Automatic Forwarding to Admin Supervisor**

When a wing supervisor forwards an item to admin (insufficient wing stock or policy reason), the system automatically routes it to the admin supervisor.

**API Endpoint**: `POST /api/approvals/supervisor/forward`

**Code Pattern**:
```javascript
app.post('/api/approvals/supervisor/forward', 
  requireAuth, 
  requirePermission('stock_request.forward_to_admin'), 
  async (req, res) => {
    const { requestId, supervisorId, forwardingReason, comments } = req.body;
    
    // 1. Update request to "Forwarded to Admin"
    await transaction.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        UPDATE stock_issuance_requests
        SET approval_status = 'Forwarded to Admin',
            supervisor_action = 'Forwarded',
            forwarding_reason = @forwardingReason
        WHERE id = @requestId
      `);
    
    // 2. Find admin supervisor(s)
    const adminSuperviors = await pool.request()
      .query(`
        SELECT u.Id, u.FullName FROM AspNetUsers u
        JOIN ims_user_roles ur ON u.Id = ur.user_id
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE r.role_name = 'ADMIN_SUPERVISOR'
      `);
    
    // 3. Create approval record for admin
    for (const admin of adminSuperviors.recordset) {
      INSERT INTO request_approvals
      (request_id, approver_id, approver_type, approval_level, status)
      VALUES (@requestId, @adminId, 'admin', 2, 'pending');
    }
    
    // 4. Log history
    await transaction.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        INSERT INTO stock_issuance_approval_history 
        (request_id, actor_id, action, new_status, forwarding_reason)
        SELECT @requestId, @supervisorId, 'Forwarded', 'Forwarded to Admin', @forwardingReason
      `);
  }
);
```

**Triggers to Forward**:
- Wing stock insufficient (0 items available)
- Item value exceeds wing supervisor authority
- Policy requires higher-level approval
- Requester specifically needs item from admin stock

---

### **Method 3: Direct Supervisor-to-Supervisor Forwarding**

A wing supervisor can forward a request directly to a specific next-level supervisor for authority/budget checks.

**API Endpoint**: `POST /api/approvals/:approvalId/forward`

**Code Pattern**:
```javascript
app.post('/api/approvals/:approvalId/forward', async (req, res) => {
  const { forwarded_to, comments, forwarding_type } = req.body;
  // forwarding_type: 'action' (Admin) or 'approval' (Supervisor)
  
  // 1. Update approval to route to new approver
  await request
    .input('approvalId', sql.NVarChar, approvalId)
    .input('forwarded_to', sql.NVarChar, forwarded_to)
    .query(`
      UPDATE request_approvals 
      SET current_approver_id = @forwarded_to, updated_date = GETDATE()
      WHERE id = @approvalId
    `);
  
  // 2. Record forwarding history
  await request
    .input('userId', sql.NVarChar, userId)
    .input('comments', sql.NVarChar, historyComments)
    .query(`
      INSERT INTO approval_history 
      (request_approval_id, action_type, action_by, forwarded_from, 
       forwarded_to, comments, step_number, is_current_step, action_date)
      VALUES (@approvalId, 'forwarded', @userId, @userId, 
              @forwarded_to, @comments, 1, 1, GETDATE())
    `);
  
  // 3. Notify new approver
  await sendNotification(forwarded_to, {
    type: 'approval_forwarded',
    from: currentUser,
    reason: comments,
    priority: forwarding_type === 'action' ? 'high' : 'normal'
  });
});
```

**Forwarding Options**:
- To **next supervisor level** for authority checks
- To **specific department head** for specialized decision
- To **procurement** for sourcing decisions
- To **finance** for budget approval

---

### **Method 4: Verification Request System**

Wing supervisors can request inventory supervisors to verify stock availability before making approval decisions.

**API Endpoint**: `POST /api/inventory/request-verification`

**Code Pattern**:
```javascript
app.post('/api/inventory/request-verification', async (req, res) => {
  const { 
    stockIssuanceId,
    itemMasterId,
    itemNomenclature,
    requestedQuantity,
    requestedByUserId,  // Wing supervisor
    wingId,
    wingName
  } = req.body;
  
  // 1. Create verification request
  const result = await pool.request()
    .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
    .input('itemMasterId', sql.NVarChar, itemMasterId)
    .input('itemNomenclature', sql.NVarChar, itemNomenclature)
    .input('requestedByUserId', sql.NVarChar, requestedByUserId)
    .input('requestedQuantity', sql.Int, requestedQuantity)
    .input('wingId', sql.Int, wingId)
    .input('wingName', sql.NVarChar, wingName)
    .query(`
      INSERT INTO inventory_verification_requests 
      (stock_issuance_id, item_master_id, item_nomenclature, 
       requested_by_user_id, requested_quantity, verification_status, 
       wing_id, wing_name, created_at)
      OUTPUT INSERTED.id
      VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, 
              @requestedByUserId, @requestedQuantity, 'Pending', 
              @wingId, @wingName, GETDATE())
    `);
  
  // 2. Find inventory supervisor for wing
  const inventorySupervisor = await pool.request()
    .input('wingId', sql.Int, wingId)
    .query(`
      SELECT u.Id, u.Email FROM AspNetUsers u
      JOIN ims_user_roles ur ON u.Id = ur.user_id
      JOIN ims_roles r ON ur.role_id = r.id
      WHERE r.role_name = 'INVENTORY_SUPERVISOR'
      AND u.wing_id = @wingId
    `);
  
  // 3. Send verification request to inventory supervisor
  for (const supervisor of inventorySupervisor.recordset) {
    await sendNotification(supervisor.Email, {
      type: 'verification_request',
      message: `${itemNomenclature} (${requestedQuantity} units) needs verification`,
      requestedBy: requestedByUserId,
      wing: wingName
    });
  }
  
  // 4. Return verification ID to track response
  res.json({
    success: true,
    verificationId: result.recordset[0].id,
    message: 'Verification request sent to inventory supervisor'
  });
});
```

---

## 🔄 Complete Request Flow to Wing Supervisors

### **Scenario: Ward requests 100 surgical masks**

```
STEP 1: WARD SUBMITS REQUEST
┌─────────────────────────────────────────────────────────┐
│ Ward "Emergency Ward" (wing_id: 5)                      │
│ Requests: 100 Surgical Masks                            │
│ Urgency: High                                           │
│ → POST /api/stock-issuance/requests                     │
└─────────────────────────────────────────────────────────┘
        ↓
System executes:
  1. GET wing_id from AspNetUsers WHERE Id = ward_user_id
  2. INSERT INTO stock_issuance_requests
     (request_number, requester_user_id, requester_wing_id, 
      approval_status, urgency_level, created_at)
  3. Find wing supervisors: SELECT WHERE wing_id = 5 AND role = 'WING_SUPERVISOR'
  4. INSERT INTO request_approvals for each supervisor
  5. Send notification: "New stock request requires approval"
        ↓

STEP 2: WING SUPERVISOR RECEIVES NOTIFICATION
┌─────────────────────────────────────────────────────────┐
│ Wing Supervisor: Dr. Ahmed (wing_id: 5)                │
│ Notification: "Stock request from Emergency Ward"      │
│ Action: Click "View Approval"                          │
│ → Dashboard shows approval card                        │
└─────────────────────────────────────────────────────────┘
        ↓
System executes:
  1. GET /api/approvals/{approvalId}
  2. SELECT * FROM stock_issuance_requests WHERE id = requestId
  3. SELECT items FROM stock_issuance_items WHERE request_id = requestId
  4. FOR EACH item:
       - SELECT available_quantity FROM stock_wing 
         WHERE item_id = item_id AND wing_id = 5
       - SELECT available_quantity FROM stock_admin 
         WHERE item_id = item_id
  5. Return approval with wing_stock_available = 150, admin_stock_available = 80
        ↓

STEP 3: WING SUPERVISOR MAKES PER-ITEM DECISION
┌─────────────────────────────────────────────────────────┐
│ Approval Dashboard                                      │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Item: Surgical Masks                             │   │
│ │ Requested: 100 units                             │   │
│ │ Wing Stock: 150 units ✓ AVAILABLE               │   │
│ │ Admin Stock: 80 units                            │   │
│ │                                                  │   │
│ │ Decision Options:                                │   │
│ │ ○ Approve & Provide from Wing    ← SELECTED     │   │
│ │ ○ Forward to Admin                              │   │
│ │ ○ Forward to Next Supervisor                    │   │
│ │ ○ Reject                                         │   │
│ │                                                  │   │
│ │ [Submit Decision]                                │   │
│ └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
        ↓
System executes:
  1. POST /api/approvals/supervisor/approve
  2. START TRANSACTION
  3. UPDATE stock_issuance_requests
     SET approval_status = 'Approved by Supervisor',
         supervisor_id = '123',
         supervisor_action = 'Approved'
  4. UPDATE stock_wing
     SET available_quantity = available_quantity - 100
     WHERE item_id = 'masks' AND wing_id = 5
  5. INSERT INTO stock_issuance_allocations
     (item_id, requested_quantity=100, allocated_quantity=100, 
      allocated_from='wing_store', source_location='Emergency Ward store')
  6. INSERT INTO stock_issuance_approval_history
     (action='Approved', decision='approve_wing', wing_stock_deducted=100)
  7. COMMIT TRANSACTION
  8. Send notification to requester: "Your request approved! 100 masks ready"
        ↓

STEP 4: SUCCESS - REQUEST APPROVED
┌─────────────────────────────────────────────────────────┐
│ Status: APPROVED ✓                                      │
│ Decision: Approved by Wing Supervisor (Dr. Ahmed)      │
│ Source: Wing Store                                      │
│ Available for Pickup: YES (today)                       │
│ Wing Stock After: 150 → 50 units                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Alternative Scenario: Forwarding to Admin

```
STEP 3B: WING STOCK INSUFFICIENT
┌─────────────────────────────────────────────────────────┐
│ Item: Ventilator Tubes                                  │
│ Requested: 50 units                                     │
│ Wing Stock: 0 units ✗ OUT OF STOCK                     │
│ Admin Stock: 100 units ✓ AVAILABLE                     │
│                                                         │
│ Wing Supervisor Decision:                              │
│ ○ Approve & Provide from Wing (DISABLED - no stock)    │
│ ○ Forward to Admin                   ← SELECTED        │
│ ○ Forward to Next Supervisor                           │
│ ○ Reject                                                │
│                                                         │
│ Forwarding Reason: "Item not in wing inventory"       │
│ [Submit Decision]                                       │
└─────────────────────────────────────────────────────────┘
        ↓
System executes:
  1. POST /api/approvals/supervisor/forward
  2. START TRANSACTION
  3. UPDATE stock_issuance_requests
     SET approval_status = 'Forwarded to Admin',
         supervisor_action = 'Forwarded',
         forwarding_reason = 'Item not in wing inventory'
  4. Find admin supervisors:
     SELECT u.Id, u.Email FROM AspNetUsers u
     WHERE role = 'ADMIN_SUPERVISOR'
  5. INSERT INTO request_approvals (for admin supervisors)
     (approver_id, approver_type='admin', approval_level=2, status='pending')
  6. INSERT INTO stock_issuance_approval_history
     (action='Forwarded', forwarding_reason='Item not in wing inventory')
  7. COMMIT TRANSACTION
  8. Send notification to admin supervisor(s):
     "Request forwarded from wing supervisor - 50 ventilator tubes"
        ↓

STEP 4B: ADMIN SUPERVISOR RECEIVES REQUEST
┌─────────────────────────────────────────────────────────┐
│ Admin Supervisor Dashboard                              │
│ Sees forwarded request from wing supervisor             │
│ Reason: "Item not in wing inventory"                    │
│ Can check admin_stock: 100 tubes available             │
│ Options:                                                │
│ - Approve (deduct from admin stock)                    │
│ - Reject (not available or policy)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎛️ Wing Stock Confirmation Modal Interaction

When supervisor clicks "Approve & Provide from Wing":

```typescript
// 1. Modal opens showing confirmation
<Dialog>
  <DialogTitle>Confirm Wing Stock Availability</DialogTitle>
  
  // 2. Fetch current stock
  const response = await fetch(
    `http://localhost:3001/api/inventory/stock/{itemMasterId}`,
    { credentials: 'include' }
  );
  
  // 3. Display current availability
  Wing Stock Available: 150 units
  Requested: 100 units
  
  // 4. Supervisor confirms
  [✓ Confirm Stock Availability] [✗ Reject]
  
  // 5. On confirm:
  setConfirmationStatus('confirmed');
  // Proceed with approval and stock deduction
  
  // 6. On reject:
  setConfirmationStatus('rejected');
  // Reset to decision options
</Dialog>
```

---

## 🔐 Permission Model for Sending Requests

```javascript
// Wing Supervisor can:
1. 'stock_request.view_wing'          // View wing requests
2. 'stock_request.approve_supervisor' // Approve from wing
3. 'stock_request.forward_to_admin'   // Forward to admin
4. 'stock_request.forward_to_supervisor' // Forward to next supervisor
5. 'stock_request.reject_supervisor'  // Reject requests

// Admin Supervisor can:
1. 'stock_request.view_admin'         // View admin requests
2. 'stock_request.approve_admin'      // Approve from admin
3. 'stock_request.forward_to_procurement' // Forward to procurement
4. 'stock_request.reject_admin'       // Reject requests

// Inventory Supervisor can:
1. 'inventory.verify_stock'           // Verify inventory
2. 'inventory.handle_verification'    // Handle verification results
```

---

## 📊 Request Routing Decision Tree

```
Request Created
    ↓
[System auto-routes to wing supervisor of requester's wing]
    ↓
Wing Supervisor receives notification
    ↓
Wing Supervisor opens approval
    ↓
System displays:
├─ Item name & quantity
├─ Wing stock available
├─ Admin stock available
├─ Can fulfill from wing? (YES/NO)
└─ Can fulfill from admin? (YES/NO)
    ↓
Wing Supervisor decides per item:
    ├─→ YES wing stock available
    │   ├─→ Approve & Provide from Wing
    │   │   └─→ Deduct wing stock immediately
    │   ├─→ Forward to Admin
    │   │   └─→ Let admin also decide
    │   ├─→ Forward to Supervisor
    │   │   └─→ Let supervisor verify authority
    │   └─→ Reject
    │       └─→ Don't allocate
    │
    └─→ NO wing stock available
        ├─→ Forward to Admin (RECOMMENDED)
        │   └─→ Admin checks admin stock
        ├─→ Forward to Supervisor
        │   └─→ Supervisor decides
        ├─→ Reject
        │   └─→ Don't allocate
        └─→ Approve disabled (no stock)
```

---

## 🎯 Summary of Sending Mechanisms

| Mechanism | Trigger | Recipient | Timing | Use Case |
|-----------|---------|-----------|--------|----------|
| **Auto-Route** | Request created | Wing supervisor of requester's wing | Immediate | First approval |
| **Forward Admin** | Wing approves button | Admin supervisor | Immediate | Item not in wing |
| **Forward Supervisor** | Wing forwards button | Next supervisor level | Immediate | Authority/budget check |
| **Verification Request** | Optional verification | Inventory supervisor | On-demand | Confirm availability |
| **Rejection** | Reject button | Requester (notification) | Immediate | Item denied |

---

## 📝 Key Files for Request Routing

| File | Purpose | Line Range |
|------|---------|-----------|
| `backend-server.cjs` | API endpoints for forwarding | 8573-13070 |
| `PerItemApprovalPanel.tsx` | UI for per-item decisions | 1-762 |
| `ApprovalManagement.tsx` | Supervisor dashboard | Full file |
| `WingDashboard.tsx` | Wing supervisor dashboard | Full file |
| `WingRequestsPage.tsx` | Request list for wing | Full file |

---

## ✅ Implementation Checklist for Similar Workflows

- [ ] Create role-based approval tables (`request_approvals`)
- [ ] Add forwarding reason field to requests table
- [ ] Implement per-item decision system with decision mapping
- [ ] Add permission checks for each role
- [ ] Create notification system for forwarded requests
- [ ] Implement audit trail in approval history
- [ ] Add confirmation modals for stock verification
- [ ] Create role-specific dashboards
- [ ] Add automatic role-based routing on request creation
- [ ] Implement transaction-based updates for consistency
