# Visual Comparison: Wing Stock Confirmation Implementation Patterns

## 🎯 Quick Reference

### **Files Created by This Search**

```
✓ WING-STOCK-CONFIRMATION-WORKFLOW-FINDINGS.md  (6.5 KB)
✓ HOW-REQUESTS-SENT-TO-SUPERVISORS.md          (8.2 KB)
✓ WING-STOCK-API-ENDPOINTS-REFERENCE.md        (9.1 KB)
✓ SEARCH-RESULTS-SUMMARY.md                    (5.8 KB)
✓ VISUAL-COMPARISON-PATTERNS.md                (This file)
```

---

## 📊 API Endpoints at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│ WING STOCK APPROVAL FLOW                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Request Created                                           │
│         ↓                                                       │
│  Wing Supervisor notified                                       │
│         ↓                                                       │
│  Supervisor reviews items & stock                              │
│  (GET /api/approvals/{approvalId})                             │
│  (GET /api/inventory/stock/{itemId})                           │
│         ↓                                                       │
│  Per-item decision made ────────────────┐                       │
│                                         │                       │
│  ┌─────────────────────────────────────┴───────────────────┐  │
│  │                                                         │  │
│  ▼ Wing Stock Available                ▼ Not Available    │  │
│                                                         │  │
│ [Approve from Wing] [Forward]         [Forward Admin]  │  │
│ POST /api/approvals/                  POST /api/appro- │  │
│   supervisor/approve                    vals/supervi-  │  │
│                                          sor/forward    │  │
│ • Deduct wing stock                                    │  │
│ • Allocate item                        • No deduction  │  │
│ • Status: APPROVED ✓                   • Status: FWD ⏭ │  │
│                                                         │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  Optional:              │                                 │
│ [Forward Supervisor]    │ Request now with              │
│ POST /api/approvals/    │ Admin Supervisor              │
│   {id}/forward          │                                 │
│                         │ Admin decides:                │
│  • Forward for          │ • Approve (POST /api/...)     │
│    authority/budget     │ • Reject                       │
│  • No deduction yet     │                                 │
│  • Status: AWAITING SVP │ Final Status: APPROVED        │
│                         │ or REJECTED                    │
└─────────────────────────┴─────────────────────────────────┘
```

---

## 🔄 Request Journey Visualization

### **Normal Flow (Stock Available)**

```
WARD
  ├─ Creates Request
  │  └─ POST /api/stock-issuance/requests
  │     Body: { items, purpose, urgency }
  │     System auto-routes to wing supervisor
  │
  └─ Gets Notification: "Approval Needed"

            ↓

WING SUPERVISOR
  ├─ Reviews Dashboard
  │  └─ GET /api/approvals/pending/{supervisorId}
  │     Shows: 5 pending approvals
  │
  ├─ Opens Specific Request
  │  └─ GET /api/approvals/{approvalId}
  │     Shows items & stock levels
  │
  ├─ Checks Stock Levels
  │  ├─ GET /api/inventory/stock/{item1}
  │  │  Response: wing=150, admin=80
  │  │
  │  └─ GET /api/inventory/stock/{item2}
  │     Response: wing=0, admin=50
  │
  ├─ Makes Per-Item Decisions
  │  └─ Item 1 (Wing Available): Approve
  │     Item 2 (Wing Not Available): Forward to Admin
  │
  └─ Submits All Decisions
     └─ POST /api/approvals/supervisor/approve
        Body: {
          requestId, supervisorId,
          itemApprovals: [
            { itemId: 1, decision: 'approve_wing', quantity: 150 },
            { itemId: 2, decision: 'forward_admin', reason: 'out of stock' }
          ]
        }
        
        Backend Processes:
        1. START TRANSACTION
        2. Update request status → "Approved by Supervisor"
        3. Deduct Item 1 from stock_wing (150 → 50)
        4. Create allocation for Item 1
        5. Create approval record for admin (Item 2)
        6. INSERT approval history
        7. COMMIT TRANSACTION
        
        Response: { success: true, allocations: [...] }

            ↓ (if forwarded)

ADMIN SUPERVISOR (for Item 2)
  ├─ Receives Notification
  │  └─ "Item forwarded from wing supervisor"
  │
  ├─ Reviews Item Details
  │  └─ Checks admin warehouse
  │     Admin stock: 50 available
  │
  ├─ Approves or Rejects
  │  └─ POST /api/approvals/admin/approve
  │     (deducts from admin stock)
  │     OR
  │     POST /api/approvals/admin/reject
  │     (no deduction)
  │
  └─ Item 2 Status: APPROVED or REJECTED

            ↓

WARD RECEIVES NOTIFICATION
  ├─ Item 1: Ready for pickup (Approved by Wing)
  ├─ Item 2: Approved/Rejected (by Admin)
  └─ Can view complete approval history
```

---

## 💾 Database State Changes

### **State Before Approval**

```sql
-- stock_wing table
SELECT * FROM stock_wing WHERE item_id = 'item1' AND wing_id = 5;
| item_id | wing_id | available | reserved |
|---------|---------|-----------|----------|
| item1   | 5       | 150       | 30       | ← 120 net available

-- stock_issuance_requests
SELECT * FROM stock_issuance_requests WHERE id = 'req123';
| id    | requester_wing_id | approval_status | supervisor_id |
|-------|-------------------|-----------------|---------------|
| req123| 5                 | Awaiting Wing   | NULL          |
```

### **State After "Approve Wing" Decision**

```sql
-- stock_wing table (UPDATED)
| item_id | wing_id | available | reserved |
|---------|---------|-----------|----------|
| item1   | 5       | 50        | 30       | ← Deducted 100 units

-- stock_issuance_requests (UPDATED)
| id    | requester_wing_id | approval_status      | supervisor_id |
|-------|-------------------|----------------------|---------------|
| req123| 5                 | Approved by Supervisor| wing-sup-id   |

-- stock_issuance_allocations (NEW RECORD)
| id  | request_id | item_id | quantity | source      |
|-----|-----------|---------|----------|------------|
| 999 | req123    | item1   | 100      | wing_store |

-- stock_issuance_approval_history (NEW RECORD)
| id  | request_id | actor_id | action    | new_status              |
|-----|-----------|----------|-----------|------------------------|
| 888 | req123    | wing-sup | Approved  | Approved by Supervisor |
```

### **State After "Forward to Admin" Decision**

```sql
-- stock_wing table (NO CHANGE)
| item_id | wing_id | available | reserved |
|---------|---------|-----------|----------|
| item2   | 5       | 0         | 0        | ← Still 0

-- request_approvals (NEW RECORD)
| id | request_id | approver_id | approver_type | status  |
|----|-----------|-----------|---------------|---------|
| 777| req123    | admin-sup | admin         | pending |

-- stock_issuance_approval_history (NEW RECORD)
| id  | request_id | actor_id | action    | forwarding_reason           |
|-----|-----------|----------|-----------|---------------------------|
| 889 | req123    | wing-sup | Forwarded | Item not in wing inventory |
```

---

## 🎯 Decision Tree Implementation

### **Code Logic**

```javascript
// Frontend: Decision Component
const decisions = {
  'approve_wing': {
    label: '✓ Approve & Provide from Wing',
    enabled: wingStock.available >= requestedQuantity,
    endpoint: '/api/approvals/supervisor/approve',
    impact: { wingStock: '-quantity', allocation: '+quantity', status: 'APPROVED' }
  },
  'forward_admin': {
    label: '⏭ Forward to Admin',
    enabled: true, // Always available
    endpoint: '/api/approvals/supervisor/forward',
    impact: { wingStock: 'no change', allocation: 'pending', status: 'FORWARDED' }
  },
  'forward_supervisor': {
    label: '↗ Forward to Next Supervisor',
    enabled: true, // Always available
    endpoint: '/api/approvals/{id}/forward',
    impact: { wingStock: 'no change', allocation: 'pending', status: 'AWAITING SVP' }
  },
  'reject': {
    label: '✗ Reject',
    enabled: true, // Always available
    endpoint: '/api/approvals/supervisor/reject',
    impact: { wingStock: 'no change', allocation: 'none', status: 'REJECTED' }
  }
};

// Backend: Process Decision
function processDecision(decision, itemData, wingStock) {
  if (decision === 'approve_wing') {
    if (wingStock < itemData.requestedQuantity) {
      throw new Error('Insufficient wing stock');
    }
    // Deduct and allocate
    deductFromWingStock(itemData.itemId, itemData.requestedQuantity);
    createAllocation(itemData, 'wing_store');
  } else if (decision === 'forward_admin') {
    // Create approval record for admin
    createApprovalForRole(itemData, 'ADMIN_SUPERVISOR');
  } else if (decision === 'forward_supervisor') {
    // Forward to next supervisor level
    routeToNextSupervisor(itemData);
  } else if (decision === 'reject') {
    // Just mark rejected, no stock impact
    recordRejection(itemData);
  }
}
```

---

## 📱 UI Component State Machine

```
┌─────────────────────────────────────────────────────────┐
│ PerItemApprovalPanel Component State                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ STATE: Loading                                          │
│   └─ Fetching approval details                         │
│      GET /api/approvals/{approvalId}                   │
│      ↓                                                   │
│                                                         │
│ STATE: Ready                                            │
│   └─ Displaying items with decision buttons            │
│      Each item shows:                                   │
│      - Item name & quantity                            │
│      - Wing stock available                            │
│      - Admin stock available                           │
│      - Decision options (conditional enable/disable)   │
│      ↓                                                   │
│                                                         │
│ STATE: Confirming (Wing Stock Check)                   │
│   └─ User clicks "Approve from Wing"                   │
│      Modal opens                                        │
│      GET /api/inventory/stock/{itemId}                 │
│      confirmationStatus: 'pending'                      │
│      ↓                                                   │
│                                                         │
│ STATE: Stock Confirmed / Rejected                       │
│   ├─ Supervisor clicks Confirm                         │
│   │  confirmationStatus: 'confirmed'                   │
│   │  ↓                                                   │
│   │                                                     │
│   └─ Supervisor clicks Reject                          │
│      confirmationStatus: 'rejected'                    │
│      ↓ Back to Ready (decision buttons available)      │
│                                                         │
│ STATE: Submitting                                       │
│   └─ User clicks "Submit Decisions"                    │
│      POST /api/approvals/supervisor/approve            │
│      Submitting: true                                  │
│      ↓                                                   │
│                                                         │
│ STATE: Success                                          │
│   └─ Response received                                 │
│      Show success message                              │
│      Disable all buttons                               │
│      Display completion info                           │
│      ↓                                                   │
│                                                         │
│ STATE: Error (if any step fails)                        │
│   └─ Show error message                                │
│      User can retry                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Permission Cascade

```
REQUEST CREATED
    ↓
WING SUPERVISOR (Permission: 'wing.supervisor')
├─ Can View: Wing requests only
│  Endpoint: GET /api/approvals/pending/{userId}
│            GET /api/dashboard/wing-requests
│
├─ Can Approve from Wing: 'stock_request.approve_supervisor'
│  Endpoint: POST /api/approvals/supervisor/approve
│  Impact: Deducts wing stock, allocates item
│
├─ Can Forward to Admin: 'stock_request.forward_to_admin'
│  Endpoint: POST /api/approvals/supervisor/forward
│  Impact: Routes to admin supervisor
│
├─ Can Forward to Supervisor: (implied or explicit)
│  Endpoint: POST /api/approvals/{id}/forward
│  Impact: Routes to next supervisor level
│
└─ Can Reject: 'stock_request.reject_supervisor'
   Endpoint: POST /api/approvals/supervisor/reject
   Impact: Marks request as rejected
        ↓
    ADMIN SUPERVISOR (Permission: 'stock_request.approve_admin')
    ├─ Can View: Admin requests only
    │
    ├─ Can Approve: 'stock_request.approve_admin'
    │  Endpoint: POST /api/approvals/admin/approve
    │  Impact: Deducts admin stock, allocates item
    │
    └─ Can Reject: 'stock_request.reject_admin'
       Endpoint: POST /api/approvals/admin/reject
       Impact: Marks request as rejected
```

---

## 📈 Approval History Timeline

```
Time  │ Action        │ Actor           │ Decision         │ Stock Impact
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
09:00 │ Created       │ Dr. Ahmed Khan  │ -                │ Wing: 150
      │               │ (Ward)          │ Submitted        │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
10:30 │ Approved      │ Dr. Hassan      │ Approve Wing     │ Wing: 150→50
      │               │ (Wing Supervisor)│ (Item 1: 100)    │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
10:32 │ Forwarded     │ Dr. Hassan      │ Forward Admin    │ Wing: 50
      │               │ (Wing Supervisor)│ (Item 2: to admin)│ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
10:45 │ Requested Ver.│ Dr. Hassan      │ Verification Req │ Wing: 50
      │               │ (Wing Supervisor)│ (Item 3)         │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
11:00 │ Verified      │ Inventory Sup.  │ Verified 95 avail│ Wing: 50
      │               │                 │ (Item 3)         │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
11:15 │ Approved      │ Dr. Rahman      │ Approve from Wing│ Wing: 50→45
      │               │ (Admin Supervisor)│ (Item 2: 5)      │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
11:20 │ Approved      │ Dr. Hassan      │ Approve Wing     │ Wing: 45→0
      │               │ (Wing Supervisor)│ (Item 3: 45)     │ Admin: 80
──────┼───────────────┼─────────────────┼──────────────────┼──────────────
FINAL │ Complete      │ System          │ All items        │ Wing: 0
      │               │                 │ allocated        │ Admin: 80
```

---

## 🎓 Learning Path

```
Start Here
    ↓
1. Read SEARCH-RESULTS-SUMMARY.md
   └─ Get overview of what was found
    ↓
2. Review WING-STOCK-CONFIRMATION-WORKFLOW-FINDINGS.md
   └─ Understand technical implementation details
    ↓
3. Study HOW-REQUESTS-SENT-TO-SUPERVISORS.md
   └─ Learn how requests flow through system
    ↓
4. Reference WING-STOCK-API-ENDPOINTS-REFERENCE.md
   └─ Get detailed API endpoint usage
    ↓
5. Read Actual Code
   ├─ backend-server.cjs lines 8520-13070
   ├─ src/components/PerItemApprovalPanel.tsx
   └─ src/pages/ApprovalManagement.tsx
    ↓
6. Implement Similar Feature
   └─ Use provided patterns and examples
```

---

## ✅ Checklist for Implementation

Based on patterns found, here's what you need:

### Database Setup
- [ ] Create `stock_wing` table with (item_id, wing_id, available_qty)
- [ ] Create `stock_admin` table with (item_id, available_qty)
- [ ] Add `request_approvals` table for routing
- [ ] Add `approval_history` table for audit trail
- [ ] Create views for status tracking

### Backend APIs
- [ ] GET endpoint to check stock availability
- [ ] POST endpoint for approval with stock deduction
- [ ] POST endpoint for forward to admin
- [ ] POST endpoint for forward to supervisor
- [ ] POST endpoint for reject
- [ ] GET endpoint for approval details
- [ ] GET endpoint for pending approvals

### Frontend Components
- [ ] Create approval dashboard component
- [ ] Create per-item approval panel
- [ ] Add stock confirmation modal
- [ ] Create approval history viewer
- [ ] Add decision summary tracker

### Authorization
- [ ] Implement permission checking middleware
- [ ] Create role-based access control
- [ ] Add endpoint-level permissions
- [ ] Create permission for each decision type

### Notifications
- [ ] Send notification on approval
- [ ] Send notification on forward
- [ ] Send notification on rejection
- [ ] Send notification on verification request

### Audit Trail
- [ ] Log every approval action
- [ ] Track all forwarding decisions
- [ ] Record stock deductions
- [ ] Store complete decision history
