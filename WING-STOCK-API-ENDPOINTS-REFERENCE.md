# Wing Stock API Endpoints Reference - Complete Guide

## 🔗 All Wing Stock Related Endpoints

### **GROUP 1: WING SUPERVISOR APPROVAL ENDPOINTS**

---

#### **1. Approve Request from Wing Stock**

```http
POST /api/approvals/supervisor/approve
Content-Type: application/json
Authorization: Bearer {token}

{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "supervisorId": "wing-supervisor-user-id",
  "comments": "Approved from wing store",
  "itemApprovals": [
    {
      "itemId": "item-id-1",
      "decision": "approve_wing",
      "allocatedQuantity": 100,
      "reason": "Available in wing stock"
    },
    {
      "itemId": "item-id-2",
      "decision": "reject",
      "allocatedQuantity": 0,
      "reason": "Already have sufficient supply"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Request approved successfully",
  "action": "approved",
  "allocations": [
    {
      "itemId": "item-id-1",
      "allocated": 100,
      "from": "wing_store",
      "timestamp": "2025-12-14T10:30:00Z"
    }
  ]
}
```

**Permission Required**: `stock_request.approve_supervisor`

**What It Does**:
- Updates request status to "Approved by Supervisor"
- Deducts approved items from `stock_wing` table
- Creates allocations for requester
- Records approval in audit history
- Sends notification to requester

---

#### **2. Forward Request to Admin**

```http
POST /api/approvals/supervisor/forward
Content-Type: application/json
Authorization: Bearer {token}

{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "supervisorId": "wing-supervisor-user-id",
  "forwardingReason": "Item not in wing inventory, please check admin stock",
  "comments": "Emergency request, patient care needed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Request forwarded to admin successfully",
  "action": "forwarded",
  "forwardedTo": "admin_supervisor",
  "timestamp": "2025-12-14T10:32:00Z"
}
```

**Permission Required**: `stock_request.forward_to_admin`

**What It Does**:
- Updates request status to "Forwarded to Admin"
- Stores forwarding reason in database
- Creates approval record for admin supervisor
- Sends notification to admin supervisor
- Does NOT deduct from wing stock
- Does NOT allocate to requester yet

---

#### **3. Forward Request to Next Supervisor**

```http
POST /api/approvals/{approvalId}/forward
Content-Type: application/json

{
  "forwarded_to": "next-supervisor-user-id",
  "comments": "Requesting supervisor authority approval",
  "forwarding_type": "approval"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Request forwarded successfully for Approval (Supervisor)"
}
```

**Permission Required**: Varies by forwarding_type

**Parameters**:
- `forwarding_type`: 
  - `"approval"` → Forward to next supervisor level (default)
  - `"action"` → Forward for action/processing (admin)

**What It Does**:
- Updates `request_approvals.current_approver_id` to new supervisor
- Records forwarding in approval history
- Changes approval level
- Notifies new supervisor
- Maintains audit trail

---

#### **4. Reject Request**

```http
POST /api/approvals/supervisor/reject
Content-Type: application/json
Authorization: Bearer {token}

{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "supervisorId": "wing-supervisor-user-id",
  "comments": "Item already in sufficient quantity at ward",
  "reason": "duplicate_request"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Request rejected successfully",
  "action": "rejected",
  "timestamp": "2025-12-14T10:35:00Z"
}
```

**Permission Required**: `stock_request.reject_supervisor`

**What It Does**:
- Updates request status to "Rejected"
- Records rejection reason
- Does NOT allocate items
- Does NOT deduct from inventory
- Sends rejection notification to requester

---

### **GROUP 2: WING STOCK QUERY ENDPOINTS**

---

#### **5. Get Wing Stock Availability**

```http
GET /api/hierarchical-inventory/wing-stock/{wingId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "wingId": 5,
  "wingName": "Emergency Ward",
  "items": [
    {
      "itemId": "550e8400-e29b-41d4-a716-446655440001",
      "itemName": "Surgical Masks",
      "nomenclature": "N95 Masks - Box of 50",
      "availableQuantity": 150,
      "reservedQuantity": 30,
      "stockStatus": "sufficient",
      "lastUpdated": "2025-12-14T09:00:00Z",
      "unitPrice": 2.50
    },
    {
      "itemId": "550e8400-e29b-41d4-a716-446655440002",
      "itemName": "Ventilator Tubes",
      "nomenclature": "Endotracheal Tubes - Size 7.5",
      "availableQuantity": 0,
      "reservedQuantity": 0,
      "stockStatus": "insufficient",
      "lastUpdated": "2025-12-14T08:30:00Z",
      "unitPrice": 5.00
    }
  ],
  "totalItems": 24,
  "timestamp": "2025-12-14T10:40:00Z"
}
```

**Purpose**: Get all items in specific wing inventory

---

#### **6. Check Single Item Stock**

```http
GET /api/inventory/stock/{itemMasterId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "itemId": "550e8400-e29b-41d4-a716-446655440001",
  "itemName": "Surgical Masks",
  "wing": {
    "available_quantity": 150,
    "reserved_quantity": 30,
    "net_available": 120
  },
  "admin": {
    "available_quantity": 80,
    "reserved_quantity": 10,
    "net_available": 70
  },
  "status": "available",
  "canFulfillFromWing": true,
  "canFulfillFromAdmin": true
}
```

**Purpose**: Check stock availability before approval decision

---

#### **7. Get Approval Request Details**

```http
GET /api/approvals/{approvalId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "requestNumber": "REQ-2025-001234",
    "requesterName": "Dr. Ahmed Khan",
    "requesterEmail": "ahmed.khan@hospital.com",
    "requesterDepartment": "Emergency Ward",
    "urgencyLevel": "high",
    "submittedAt": "2025-12-14T09:00:00Z"
  },
  "items": [
    {
      "id": "item-1",
      "itemName": "Surgical Masks",
      "requestedQuantity": 100,
      "stockStatus": "sufficient",
      "wing_stock_available": 150,
      "admin_stock_available": 80,
      "can_fulfill_from_wing": true,
      "can_fulfill_from_admin": true
    }
  ],
  "history": [
    {
      "timestamp": "2025-12-14T09:30:00Z",
      "action": "Submitted",
      "actor": "Dr. Ahmed Khan",
      "details": "Request submitted for approval"
    }
  ]
}
```

---

### **GROUP 3: INVENTORY VERIFICATION ENDPOINTS**

---

#### **8. Request Inventory Verification**

```http
POST /api/inventory/request-verification
Content-Type: application/json
Authorization: Bearer {token}

{
  "stockIssuanceId": "550e8400-e29b-41d4-a716-446655440000",
  "itemMasterId": "550e8400-e29b-41d4-a716-446655440001",
  "itemNomenclature": "N95 Masks - Box of 50",
  "requestedQuantity": 100,
  "requestedByUserId": "wing-supervisor-id",
  "requestedByName": "Dr. Ahmed Khan",
  "wingId": 5,
  "wingName": "Emergency Ward"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification request sent to inventory supervisor",
  "verificationId": "VER-550e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "sentTo": "inventory.supervisor@hospital.com",
  "timestamp": "2025-12-14T10:45:00Z"
}
```

**Permission Required**: `stock_request.request_verification`

**What It Does**:
- Creates verification request record
- Notifies inventory supervisor
- Allows wing supervisor to get confirmation before approval
- Tracks verification status
- Links to original stock issuance

---

#### **9. Handle Verification Result**

```http
POST /api/issuance/handle-verification-result
Content-Type: application/json
Authorization: Bearer {token}

{
  "verificationId": "VER-550e8400-e29b-41d4-a716-446655440001",
  "verified": true,
  "actualQuantityAvailable": 95,
  "verificationNotes": "Confirmed 95 units in wing storage, 5 units reserved",
  "verifiedBy": "inventory-supervisor-id",
  "timestamp": "2025-12-14T10:50:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification result recorded",
  "verificationStatus": "verified",
  "actionTaken": "updated_wing_supervisor_dashboard"
}
```

---

### **GROUP 4: WING SUPERVISOR DASHBOARD ENDPOINTS**

---

#### **10. Get Wing Supervisor Approvals**

```http
GET /api/approvals/pending/{userId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "userId": "wing-supervisor-id",
  "role": "WING_SUPERVISOR",
  "pendingApprovals": [
    {
      "approvalId": "APR-001",
      "requestId": "REQ-2025-001234",
      "requestNumber": "REQ-2025-001234",
      "requesterName": "Dr. Ahmed Khan",
      "itemCount": 3,
      "urgency": "high",
      "submittedAt": "2025-12-14T09:00:00Z",
      "awaitingSince": "1.5 hours",
      "status": "pending"
    }
  ],
  "stats": {
    "totalPending": 12,
    "highUrgency": 3,
    "normalUrgency": 9
  }
}
```

---

#### **11. Get Approval History**

```http
GET /api/approvals/history/{issuanceId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "issuanceId": "550e8400-e29b-41d4-a716-446655440000",
  "timeline": [
    {
      "timestamp": "2025-12-14T09:00:00Z",
      "action": "Submitted",
      "actor": "Dr. Ahmed Khan",
      "notes": "Request submitted to approval"
    },
    {
      "timestamp": "2025-12-14T10:30:00Z",
      "action": "Approved",
      "actor": "Dr. Muhammad Hassan",
      "role": "Wing Supervisor",
      "approvalType": "approve_wing",
      "itemsApproved": 2,
      "itemsRejected": 1,
      "notes": "Approved from wing stock"
    },
    {
      "timestamp": "2025-12-14T10:35:00Z",
      "action": "Forwarded",
      "actor": "Dr. Muhammad Hassan",
      "forwardedTo": "Admin Supervisor",
      "reason": "Ventilator tubes not in wing inventory",
      "itemCount": 1
    }
  ]
}
```

---

### **GROUP 5: WING REQUESTS PAGE ENDPOINTS**

---

#### **12. Get Wing Member Requests**

```http
GET /api/dashboard/wing-requests
Query: ?wingId=5&status=pending
Authorization: Bearer {token}
```

**Response**:
```json
{
  "wingId": 5,
  "wingName": "Emergency Ward",
  "requests": [
    {
      "requestId": "REQ-2025-001234",
      "requestNumber": "REQ-2025-001234",
      "submittedBy": "Dr. Ahmed Khan",
      "department": "Emergency",
      "submittedAt": "2025-12-14T09:00:00Z",
      "status": "pending_approval",
      "itemCount": 3,
      "urgency": "high",
      "estimatedDelivery": "Today",
      "totalValue": 250.00
    }
  ],
  "summary": {
    "totalRequests": 45,
    "approved": 30,
    "rejected": 5,
    "pending": 10,
    "forwarded": 5
  }
}
```

---

## 📊 Common Request-Response Patterns

### **Pattern 1: Stock Check Before Decision**

```javascript
// Supervisor wants to check stock before approving
const checkStock = async (itemId) => {
  // Step 1: Get current stock
  const stockResponse = await fetch(
    `/api/inventory/stock/${itemId}`,
    { credentials: 'include' }
  );
  const stock = await stockResponse.json();
  
  // Step 2: Display in UI
  console.log(`Wing: ${stock.wing.available_quantity}`);
  console.log(`Admin: ${stock.admin.available_quantity}`);
  
  // Step 3: Make decision
  if (stock.wing.available_quantity >= requestedQuantity) {
    // Approve from wing
    approveRequest('approve_wing');
  } else if (stock.admin.available_quantity >= requestedQuantity) {
    // Forward to admin
    forwardRequest('forward_admin', 'Not in wing, check admin');
  }
};
```

---

### **Pattern 2: Per-Item Approval Submission**

```javascript
// Supervisor approves multiple items with different decisions
const submitApprovals = async (approvalId, decisions) => {
  const response = await fetch('/api/approvals/supervisor/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: approvalId,
      supervisorId: currentUserId,
      comments: 'Reviewed and decided per item',
      itemApprovals: [
        {
          itemId: 'item-1',
          decision: 'approve_wing',
          allocatedQuantity: 100
        },
        {
          itemId: 'item-2',
          decision: 'forward_admin',
          reason: 'Not in wing inventory'
        },
        {
          itemId: 'item-3',
          decision: 'reject',
          reason: 'Duplicate request'
        }
      ]
    }),
    credentials: 'include'
  });
  
  const result = await response.json();
  if (result.success) {
    showNotification('Approval submitted successfully');
  }
};
```

---

### **Pattern 3: Verification Request Flow**

```javascript
// Wing supervisor wants to verify stock before deciding
const requestVerification = async (itemId, quantity) => {
  // Step 1: Request verification
  const verResponse = await fetch('/api/inventory/request-verification', {
    method: 'POST',
    body: JSON.stringify({
      stockIssuanceId: requestId,
      itemMasterId: itemId,
      itemNomenclature: itemName,
      requestedQuantity: quantity,
      requestedByUserId: supervisorId,
      wingId: wingId,
      wingName: wingName
    })
  });
  
  const verResult = await verResponse.json();
  const verificationId = verResult.verificationId;
  
  // Step 2: Poll for result
  const pollInterval = setInterval(async () => {
    const resultResponse = await fetch(
      `/api/inventory/verification/${verificationId}`
    );
    const result = await resultResponse.json();
    
    if (result.status === 'verified') {
      clearInterval(pollInterval);
      // Now supervisor can make final decision
      if (result.actualQuantity >= quantity) {
        approveRequest('approve_wing');
      }
    }
  }, 5000); // Poll every 5 seconds
};
```

---

## 🔑 Required Headers & Authentication

### **All Requests Require**:
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
Cookie: session={SESSION_ID}
```

### **Session Setup**:
```javascript
// Login first to get session
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'supervisor@hospital.com',
    password: 'password'
  })
});

// Use credentials for all subsequent requests
const options = {
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
};
```

---

## ⚠️ Common Error Responses

### **Error 1: Insufficient Permissions**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "User does not have permission: stock_request.approve_supervisor"
}
```

### **Error 2: Invalid Request Data**
```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "requestId, supervisorId, and forwardingReason are required"
}
```

### **Error 3: Request Not Found**
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Request not found"
}
```

### **Error 4: Database Transaction Failed**
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "Failed to approve request",
  "details": "Database transaction error"
}
```

---

## 📈 Usage Examples

### **Complete Wing Approval Flow**

```bash
# 1. Get pending approvals
curl -H "Cookie: session={sid}" \
  http://localhost:3001/api/approvals/pending/{supervisorId}

# 2. Get approval details
curl -H "Cookie: session={sid}" \
  http://localhost:3001/api/approvals/{approvalId}

# 3. Check wing stock
curl -H "Cookie: session={sid}" \
  http://localhost:3001/api/hierarchical-inventory/wing-stock/{wingId}

# 4. Approve with allocation
curl -X POST \
  -H "Cookie: session={sid}" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "uuid",
    "supervisorId": "userid",
    "comments": "Approved",
    "itemApprovals": [{"itemId": "uuid", "decision": "approve_wing", "allocatedQuantity": 100}]
  }' \
  http://localhost:3001/api/approvals/supervisor/approve
```

---

## 🎯 Integration Checklist

- [ ] Implement per-item decision tracking
- [ ] Add wing stock availability checks
- [ ] Create approval forwarding endpoints
- [ ] Add verification request system
- [ ] Implement role-based access control
- [ ] Add audit history tracking
- [ ] Create notification system
- [ ] Add transaction management for consistency
- [ ] Implement error handling & logging
- [ ] Test all approval workflows
