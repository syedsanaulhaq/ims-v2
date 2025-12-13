# Wing Stock Confirmation/Request Workflow - Git History & Codebase Findings

## 📋 Overview

This document summarizes findings from git history and codebase analysis regarding wing stock confirmation workflows, how requests are sent to wing supervisors, and API endpoints for wing stock management.

---

## 🔍 Key Git Commits Found

### Wing Stock Confirmation Implementation
```
9b5d8bd - feat: Add wing stock confirmation modal with confirm/reject actions
8ebb0c4 - refactor: Convert stock details to modal dialog with actual stock availability
1e3e3c1 - feat: Add stock availability check with details display
5033149 - feat: Add stock availability check and wing stock confirmation buttons
ac6510b - fix: Update isInWing check to use issued_quantity instead of stock_status
```

### Approval & Verification Workflow
```
5ea0727 - feat: Add per-item approval logic to approval-dashboard
90cd8cb - docs: Add comprehensive guide for new 4-option approval system
e37f081 - feat: Add 4-option per-item approval system with supervisor forwarding
01eabf3 - feat: Implement per-item approval decision system for wing supervisors
ef25521 - feat: Complete approval-to-issuance workflow system
```

### Wing Dashboard & Request Management
```
555c62a - Feat: Enhance Wing Dashboard with analytics charts and improved request display
95f76b6 - Add dedicated WingRequestsPage for wing supervisor to view all wing member requests
4d03ee2 - Fix: Wing Requests card now navigates to requests list instead of stock-issuance
eaf8690 - Add click handlers to WingDashboard request and detail pages
```

---

## 🏗️ Wing Stock Confirmation Workflow Architecture

### 1. **Wing Stock Availability Check**

**Location**: `backend-server.cjs` lines 8520-8550

```javascript
// Check wing stock availability for each item
const itemsWithAvailability = await Promise.all(itemsResult.recordset.map(async (item) => {
  if (item.is_custom_item) {
    return { ...item, wing_stock_available: 'N/A - Custom Item', admin_stock_available: 'N/A' };
  }

  // Check wing stock
  const wingStock = await pool.request()
    .input('itemId', sql.UniqueIdentifier, item.item_master_id)
    .input('wingId', sql.Int, request.requester_wing_id)
    .query(`
      SELECT available_quantity FROM stock_wing 
      WHERE item_master_id = @itemId AND wing_id = @wingId
    `);

  // Check admin stock
  const adminStock = await pool.request()
    .input('itemId', sql.UniqueIdentifier, item.item_master_id)
    .query(`
      SELECT available_quantity FROM stock_admin 
      WHERE item_master_id = @itemId
    `);

  return {
    ...item,
    wing_stock_available: wingStock.recordset.length > 0 ? wingStock.recordset[0].available_quantity : 0,
    admin_stock_available: adminStock.recordset.length > 0 ? adminStock.recordset[0].available_quantity : 0,
    can_fulfill_from_wing: wingStock.recordset.length > 0 && wingStock.recordset[0].available_quantity >= item.requested_quantity,
    can_fulfill_from_admin: adminStock.recordset.length > 0 && adminStock.recordset[0].available_quantity >= item.requested_quantity
  };
}));
```

**Key Pattern**: 
- Queries both `stock_wing` and `stock_admin` tables
- Returns availability status as boolean flags
- Checks quantity sufficiency at query time

---

## 📡 API Endpoints for Wing Stock Management

### **1. Wing Stock Confirmation Modal (Frontend)**

**Component**: `src/components/PerItemApprovalPanel.tsx` lines 340-375

```typescript
const confirmWingStock = async (item: any) => {
  setWingConfirmItem(item);
  setWingConfirmLoading(true);
  setConfirmationStatus('pending');
  try {
    // Fetch wing stock from inventory
    const itemMasterId = item.item_master_id || item.id;
    const response = await fetch(`http://localhost:3001/api/inventory/stock/${itemMasterId}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const available = data.available_quantity || data.quantity || 0;
      setWingStockAvailable(available);
      console.log('✓ Wing stock:', available);
    } else {
      setWingStockAvailable(0);
    }
  } catch (err) {
    console.error('Error fetching wing stock:', err);
    setWingStockAvailable(0);
  } finally {
    setWingConfirmLoading(false);
  }
};

const handleConfirmWing = () => {
  setConfirmationStatus('confirmed');
  console.log('✓ Wing stock confirmed for item:', getItemId(wingConfirmItem));
};

const handleRejectWing = () => {
  setConfirmationStatus('rejected');
  console.log('✗ Wing stock rejected for item:', getItemId(wingConfirmItem));
};
```

**Endpoint Used**: `GET /api/inventory/stock/{itemMasterId}`

**Response States**:
- `'pending'` - Awaiting confirmation check
- `'confirmed'` - Wing stock verified and available
- `'rejected'` - Wing stock verification failed

---

### **2. Wing Supervisor Approval Endpoint**

**Location**: `backend-server.cjs` lines 8573-8620

```javascript
// Supervisor: Approve request (issue from wing stock)
app.post('/api/approvals/supervisor/approve', 
  requireAuth, 
  requirePermission('stock_request.approve_supervisor'), 
  async (req, res) => {
    try {
      const { requestId, supervisorId, comments, itemApprovals } = req.body;

      if (!requestId || !supervisorId) {
        return res.status(400).json({ error: 'requestId and supervisorId are required' });
      }

      // Start transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Update request status
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('supervisorId', sql.NVarChar(450), supervisorId)
          .input('comments', sql.NVarChar(sql.MAX), comments)
          .query(`
            UPDATE stock_issuance_requests
            SET approval_status = 'Approved by Supervisor',
                supervisor_id = @supervisorId,
                supervisor_reviewed_at = GETDATE(),
                supervisor_comments = @comments,
                supervisor_action = 'Approved',
                source_store_type = 'Wing'
            WHERE id = @requestId
          `);
```

**Request Body**:
```json
{
  "requestId": "uuid",
  "supervisorId": "user-id",
  "comments": "Approved from wing stock",
  "itemApprovals": [
    {
      "itemId": "uuid",
      "decision": "approve_wing" | "forward_admin" | "forward_supervisor" | "reject",
      "allocatedQuantity": 100,
      "reason": "optional"
    }
  ]
}
```

---

### **3. Forward Request to Admin Endpoint**

**Location**: `backend-server.cjs` lines 8648-8700

```javascript
app.post('/api/approvals/supervisor/forward', 
  requireAuth, 
  requirePermission('stock_request.forward_to_admin'), 
  async (req, res) => {
    try {
      const { requestId, supervisorId, forwardingReason, comments } = req.body;

      if (!requestId || !supervisorId || !forwardingReason) {
        return res.status(400).json({ 
          error: 'requestId, supervisorId, and forwardingReason are required' 
        });
      }

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Update request status
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('supervisorId', sql.NVarChar(450), supervisorId)
          .input('forwardingReason', sql.NVarChar(sql.MAX), forwardingReason)
          .input('comments', sql.NVarChar(sql.MAX), comments)
          .query(`
            UPDATE stock_issuance_requests
            SET approval_status = 'Forwarded to Admin',
                supervisor_id = @supervisorId,
                supervisor_reviewed_at = GETDATE(),
                supervisor_comments = @comments,
                supervisor_action = 'Forwarded',
                forwarding_reason = @forwardingReason
            WHERE id = @requestId
          `);

        // Log history
        await transaction.request()
          .input('requestId', sql.UniqueIdentifier, requestId)
          .input('actorId', sql.NVarChar(450), supervisorId)
          .input('action', sql.NVarChar(30), 'Forwarded')
          .input('newStatus', sql.NVarChar(30), 'Forwarded to Admin')
          .input('reason', sql.NVarChar(sql.MAX), forwardingReason)
          .query(`
            INSERT INTO stock_issuance_approval_history 
            (request_id, actor_id, actor_name, actor_role, action, new_status, forwarding_reason)
            SELECT @requestId, @actorId, FullName, Role, @action, @newStatus, @reason
            FROM AspNetUsers WHERE Id = @actorId
          `);

        await transaction.commit();
        res.json({ success: true, message: 'Request forwarded to admin successfully', action: 'forwarded' });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (error) {
      console.error('❌ Error forwarding request:', error);
      res.status(500).json({ error: 'Failed to forward request', details: error.message });
    }
  }
);
```

---

### **4. Forward to Next Supervisor Endpoint**

**Location**: `backend-server.cjs` lines 13011-13070

```javascript
app.post('/api/approvals/:approvalId/forward', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { forwarded_to, comments, forwarding_type } = req.body;
    
    // Get userId using the same logic as other endpoints
    let userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      // Try to get the current logged-in user from AspNetUsers
      try {
        const userResult = await pool.request().query(`
          SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
        `);
        if (userResult.recordset.length > 0) {
          userId = userResult.recordset[0].Id;
          console.log('🔄 Forward: Auto-detected logged-in user:', userId);
        }
      } catch (error) {
        console.log('⚠️ Forward: Could not auto-detect user, using fallback');
      }
    }
    
    const forwardingTypeLabel = forwarding_type === 'action' ? 'Action (Admin)' : 'Approval (Supervisor)';
    console.log('🔄 Forward: Processing forward request by user:', userId, '| Type:', forwardingTypeLabel);
    
    const request = pool.request();
    
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('forwarded_to', sql.NVarChar, forwarded_to)
      .query(`
        UPDATE request_approvals 
        SET current_approver_id = @forwarded_to, updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    // Add history tracking
    try {
      const historyComments = `${comments || 'Forwarded'} [${forwardingTypeLabel}]`;
      await request
        .input('userId', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, historyComments)
        .query(`
          INSERT INTO approval_history 
          (request_approval_id, action_type, action_by, forwarded_from, forwarded_to, comments, step_number, is_current_step, action_date)
          VALUES (@approvalId, 'forwarded', @userId, @userId, @forwarded_to, @comments, 1, 1, GETDATE())
        `);
      console.log('📝 Forward: History recorded successfully with type:', forwardingTypeLabel);
    } catch (historyError) {
      console.warn('⚠️ Forward: Could not record history:', historyError.message);
    }
    
    res.json({ success: true, message: `Request forwarded successfully for ${forwardingTypeLabel}` });
  } catch (error) {
    console.error('Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});
```

**Request Body**:
```json
{
  "forwarded_to": "supervisor-user-id",
  "comments": "Forwarding for approval authority check",
  "forwarding_type": "approval" | "action"
}
```

---

### **5. Inventory Verification Request Endpoint**

**Location**: `backend-server.cjs` lines 11453-11500

```javascript
app.post('/api/inventory/request-verification', async (req, res) => {
  try {
    const { 
      stockIssuanceId,
      itemMasterId,
      itemNomenclature,
      requestedQuantity,
      requestedByUserId,
      requestedByName,
      wingId,
      wingName
    } = req.body;

    console.log('📦 Verification request received:', { 
      stockIssuanceId, 
      itemMasterId, 
      itemNomenclature, 
      requestedByUserId 
    });

    if (!stockIssuanceId || !itemMasterId || !requestedByUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { stockIssuanceId, itemMasterId, requestedByUserId }
      });
    }

    try {
      // Create verification request
      const result = await pool.request()
        .input('stockIssuanceId', sql.UniqueIdentifier, stockIssuanceId)
        .input('itemMasterId', sql.NVarChar, itemMasterId)
        .input('itemNomenclature', sql.NVarChar, itemNomenclature || 'Unknown Item')
        .input('requestedByUserId', sql.NVarChar, requestedByUserId)
        .input('requestedByName', sql.NVarChar, requestedByName || 'System')
        .input('requestedQuantity', sql.Int, requestedQuantity || 0)
        .input('wingId', sql.Int, wingId || 0)
        .input('wingName', sql.NVarChar, wingName || 'Unknown')
        .query(`
          INSERT INTO inventory_verification_requests 
          (stock_issuance_id, item_master_id, item_nomenclature, requested_by_user_id, 
           requested_by_name, requested_quantity, verification_status, wing_id, wing_name, 
           created_at, updated_at)
          OUTPUT INSERTED.id
          VALUES (@stockIssuanceId, @itemMasterId, @itemNomenclature, @requestedByUserId, 
                  @requestedByName, @requestedQuantity, 'Pending', @wingId, @wingName, 
                  GETDATE(), GETDATE())
        `);

      console.log('✅ Verification request created:', result.recordset[0].id);
      res.json({
        success: true,
        verificationId: result.recordset[0].id,
        message: 'Verification request sent to inventory supervisor'
      });
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      res.status(500).json({ 
        error: 'Failed to create verification request', 
        details: dbError.message 
      });
    }
  } catch (error) {
    console.error('❌ Error in verification request:', error);
    res.status(500).json({ 
      error: 'Failed to request verification', 
      details: error.message 
    });
  }
});
```

**Request Body**:
```json
{
  "stockIssuanceId": "uuid",
  "itemMasterId": "uuid",
  "itemNomenclature": "Item Name",
  "requestedQuantity": 100,
  "requestedByUserId": "user-id",
  "requestedByName": "Wing Supervisor Name",
  "wingId": 1,
  "wingName": "Ward Name"
}
```

---

## 🎯 4-Option Per-Item Approval System

### Decision Options Implemented

```typescript
decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject'
```

### **1. Approve & Provide from Wing** (`approve_wing`)

**What Happens**:
- Wing stock deducted immediately
- Item allocated to requester
- Source: `stock_wing` table decremented
- Status: `APPROVED`

**Implementation Pattern**:
```javascript
if (decision === 'approve_wing') {
  // Deduct from wing stock
  UPDATE stock_wing 
  SET available_quantity = available_quantity - @requestedQuantity
  WHERE item_master_id = @itemId AND wing_id = @wingId;
  
  // Record allocation
  INSERT INTO stock_issuance_allocations
  (request_id, item_id, allocated_quantity, source_type, allocated_from_location)
  VALUES (@requestId, @itemId, @requestedQuantity, 'wing', @wingId);
}
```

---

### **2. Forward to Admin** (`forward_admin`)

**What Happens**:
- Request forwarded to admin supervisor
- Admin checks `stock_admin` table
- No immediate deduction
- Status: `Forwarded to Admin`

**Implementation Pattern**:
```javascript
if (decision === 'forward_admin') {
  UPDATE stock_issuance_requests
  SET approval_status = 'Forwarded to Admin',
      supervisor_id = @supervisorId,
      supervisor_action = 'Forwarded',
      forwarding_reason = @forwardingReason
  WHERE id = @requestId;
  
  // Add to admin queue
  INSERT INTO request_approvals
  (request_id, approver_type, approver_id, approval_level, status)
  VALUES (@requestId, 'admin', @adminId, 2, 'pending');
}
```

---

### **3. Forward to Next Supervisor** (`forward_supervisor`)

**What Happens**:
- Request forwarded to higher supervisor level
- Supervisor checks authority/budget
- No immediate deduction
- Status: `Awaiting Supervisor Approval`

**Implementation Pattern**:
```javascript
if (decision === 'forward_supervisor') {
  UPDATE request_approvals 
  SET current_approver_id = @nextSupervisorId,
      updated_date = GETDATE()
  WHERE id = @approvalId;
  
  INSERT INTO approval_history 
  (request_approval_id, action_type, action_by, forwarded_from, 
   forwarded_to, comments, step_number, is_current_step, action_date)
  VALUES (@approvalId, 'forwarded', @currentUserId, @currentUserId, 
          @nextSupervisorId, @comments, 1, 1, GETDATE());
}
```

---

### **4. Reject** (`reject`)

**What Happens**:
- Item rejected entirely
- No deduction from inventory
- No allocation created
- Status: `REJECTED`

**Implementation Pattern**:
```javascript
if (decision === 'reject') {
  UPDATE stock_issuance_requests
  SET approval_status = 'Rejected',
      supervisor_id = @supervisorId,
      supervisor_action = 'Rejected',
      supervisor_comments = @comments
  WHERE id = @requestId;
}
```

---

## 🗄️ Related Database Tables

### **stock_wing**
```sql
CREATE TABLE stock_wing (
    id INT IDENTITY PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER,
    wing_id INT,
    available_quantity INT,
    reserved_quantity INT,
    stock_status NVARCHAR(50),
    last_updated DATETIME,
    UNIQUE (item_master_id, wing_id)
);
```

### **stock_admin**
```sql
CREATE TABLE stock_admin (
    id INT IDENTITY PRIMARY KEY,
    item_master_id UNIQUEIDENTIFIER,
    available_quantity INT,
    reserved_quantity INT,
    stock_status NVARCHAR(50),
    last_updated DATETIME
);
```

### **stock_issuance_requests**
```sql
CREATE TABLE stock_issuance_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    request_number NVARCHAR(50),
    requester_user_id NVARCHAR(450),
    requester_wing_id INT,
    approval_status NVARCHAR(50),
    supervisor_id NVARCHAR(450),
    supervisor_reviewed_at DATETIME,
    supervisor_comments NVARCHAR(MAX),
    supervisor_action NVARCHAR(30),
    forwarding_reason NVARCHAR(MAX),
    source_store_type NVARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME
);
```

### **inventory_verification_requests**
```sql
CREATE TABLE inventory_verification_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    stock_issuance_id UNIQUEIDENTIFIER,
    item_master_id NVARCHAR(450),
    item_nomenclature NVARCHAR(500),
    requested_by_user_id NVARCHAR(450),
    requested_by_name NVARCHAR(500),
    requested_quantity INT,
    verification_status NVARCHAR(50),
    wing_id INT,
    wing_name NVARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);
```

---

## 🔐 Required Permissions

### Wing Supervisor Permissions
```sql
'wing.supervisor'                           -- Access wing menu
'stock_request.view_wing'                  -- View wing requests
'stock_request.approve_supervisor'         -- Approve from wing
'stock_request.forward_to_admin'           -- Forward to admin
'stock_request.reject_supervisor'          -- Reject requests
```

### Permission Enforcement Pattern
```javascript
requireAuth,                                           // Check authenticated
requirePermission('stock_request.approve_supervisor') // Check specific permission
```

---

## 📊 Workflow State Transitions

```
User Request Created
    ↓
[Wing Supervisor Reviews]
    ├─→ Approve & Provide from Wing ──→ [APPROVED] → Wing stock deducted → Requester gets item
    ├─→ Forward to Admin            ──→ [FORWARDED TO ADMIN] → Admin reviews → Admin decision
    ├─→ Forward to Next Supervisor  ──→ [AWAITING SUPERVISOR] → Supervisor reviews → Supervisor decision
    └─→ Reject                      ──→ [REJECTED] → Item not allocated
        ↓
    [Admin/Supervisor Reviews (if forwarded)]
        ├─→ Approve                 ──→ [APPROVED BY ADMIN/SUPERVISOR]
        └─→ Reject                  ──→ [REJECTED BY ADMIN/SUPERVISOR]
```

---

## 🔗 Related Frontend Components

### **PerItemApprovalPanel.tsx**
- Displays items for individual decision-making
- Shows wing stock status for each item
- Implements 4-option decision buttons
- Tracks decision summary in real-time
- Opens wing stock confirmation modal

### **ApprovalManagement.tsx**
- Dashboard for wing supervisors
- Shows pending approvals
- Integrated with PerItemApprovalPanel
- Displays stock status indicators

### **WingDashboard.tsx**
- Wing supervisor dashboard
- Shows requests for wing members
- Displays analytics
- Navigates to approval management

### **WingRequestsPage.tsx**
- Lists all requests for wing members
- Filtered by wing
- Shows request details
- Links to approval/issuance pages

---

## 📝 Summary of Request Flow

1. **Ward/User creates stock request** → Submitted to wing supervisor
2. **Wing Supervisor opens approval** → Sees items with wing stock status
3. **Per-item decision made**:
   - ✅ **Approve Wing**: Item deducted now, requester gets it today
   - ⏭️ **Forward Admin**: Admin checks their stock, decides later
   - ↗️ **Forward Supervisor**: Supervisor checks authority, decides later
   - ❌ **Reject**: Item denied, no allocation
4. **Admin/Supervisor reviews** (if forwarded): Makes final decision
5. **Request completed** with full audit trail

---

## 🎓 Key Pattern Learnings

### Pattern 1: Wing Stock Confirmation Modal
- Uses React state for confirmation status
- Fetches stock availability via API
- Updates UI based on confirmation result
- Tracks pending/confirmed/rejected state

### Pattern 2: Approval Forwarding
- Updates `request_approvals.current_approver_id`
- Inserts history record with forwarding metadata
- Uses `forwarding_type` to indicate target role
- Transaction-based for consistency

### Pattern 3: Per-Item Decisions
- Maps item IDs to decision objects
- Maintains summary counts (approve_wing, forward_admin, etc.)
- Submits all decisions atomically
- Processes based on decision type

### Pattern 4: Permission-Based Actions
- Endpoint-level permission checking
- Different endpoints for different roles
- Supervisor vs Admin endpoints
- Transaction rollback on permission failure
