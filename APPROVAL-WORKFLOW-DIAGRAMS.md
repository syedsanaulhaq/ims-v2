# 📊 PER-ITEM APPROVAL WORKFLOW DIAGRAMS
## Visual Guide to the New Approval System

**Date**: December 13, 2025  
**Version**: 1.0  

---

## 1️⃣ OVERALL APPROVAL FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUESTER SUBMITS REQUEST                │
│                   (Hospital Ward/Department)                │
│                                                              │
│  Example: Emergency Ward needs:                             │
│  - Surgical Masks (100 units)                              │
│  - IV Stands (10 units)                                    │
│  - Gauze Pads (50 units)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            WING SUPERVISOR OPENS APPROVAL DASHBOARD          │
│                                                              │
│  Dashboard: http://localhost:8080/dashboard/approval-dashboard
│  Sees: List of pending requests awaiting approval          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          SUPERVISOR SELECTS REQUEST TO REVIEW               │
│                                                              │
│  Sees: Request details + all items                          │
│  Action: Reviews each item one by one                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ITEM 1       ITEM 2       ITEM 3
    ────────    ────────     ────────
    (Masks)     (Stands)     (Gauze)
         │           │           │
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Decision│  │Decision│  │Decision│
    └────┬───┘  └────┬───┘  └────┬───┘
         │           │           │
    APPROVE      FORWARD       APPROVE
     WING        TO ADMIN       WING
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  REVIEW DECISION SUMMARY   │
        │                            │
        │ ✓ Wing Approve:    2 items │
        │ ⏭ Forward Admin:   1 item  │
        │ ✗ Reject:          0 items │
        │ ? Undecided:       0 items │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │   SUBMIT ALL DECISIONS     │
        │                            │
        │   Enter: Approver Name     │
        │   Click: Submit Decisions  │
        └────────┬───────────────────┘
                 │
                 ▼
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
WING APPROVED FORWARDED   REJECTED
    │            │            │
    ▼            ▼            ▼
DEDUCT FROM   WAIT FOR     NO ACTION
 WING STOCK   ADMIN DECISION
    │            │            │
    ▼            ▼            ▼
ALLOCATE     ADMIN        REQUESTER
TO REQUESTER DECIDES      NOTIFIED
    │            │            │
    └────────────┼────────────┘
                 │
                 ▼
         REQUESTER NOTIFIED
              (By Email)
```

---

## 2️⃣ PER-ITEM DECISION TREE

```
                    FOR EACH ITEM:
                        │
                        ▼
         ┌──────────────────────────────┐
         │ CHECK WING STOCK STATUS      │
         │                              │
         │ Is item in wing inventory?   │
         └──────┬───────────────────┬───┘
                │                   │
               YES                  NO
                │                   │
                ▼                   ▼
        ┌─────────────────┐ ┌──────────────────┐
        │ OPTIONS:        │ │ OPTIONS:         │
        │                 │ │                  │
        │ ✓ Approve Wing  │ │ ⏭ Forward Admin  │
        │   (ENABLED)     │ │   (ENABLED)      │
        │                 │ │                  │
        │ ⏭ Forward Admin │ │ ✗ Reject         │
        │   (ENABLED)     │ │   (ENABLED)      │
        │                 │ │                  │
        │ ✗ Reject        │ │ ⏭ Approve Wing   │
        │   (ENABLED)     │ │   (DISABLED) ❌  │
        └────┬──────┬──┬──┘ └────┬───────┬─────┘
             │      │  │         │       │
         APPROVE FORWARD REJECT FORWARD REJECT
         WING    ADMIN  ITEM   ADMIN   ITEM
             │      │    │      │       │
             ▼      ▼    ▼      ▼       ▼
         DECISION SELECTED FOR THIS ITEM
```

---

## 3️⃣ WING APPROVAL SCENARIO

```
SCENARIO: Emergency Ward Emergency Request
REQUEST: 3 items for emergency procedures

┌──────────────────────────────────────────────────────┐
│ ITEM 1: SURGICAL MASKS (Requested: 100)             │
├──────────────────────────────────────────────────────┤
│                                                       │
│ WING STOCK CHECK:                                    │
│ ✓ Status: AVAILABLE - 150 units in stock            │
│                                                       │
│ OPTIONS:                                             │
│ ○ ✓ Approve from Wing (ENABLED)  ← SELECTED         │
│ ○ ⏭ Forward to Admin (ENABLED)                      │
│ ○ ✗ Reject (ENABLED)                                │
│                                                       │
│ ACTION: Deduct 100 masks from wing inventory         │
│         Allocate to emergency ward immediately       │
│                                                       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ITEM 2: VENTILATOR TUBES (Requested: 5)             │
├──────────────────────────────────────────────────────┤
│                                                       │
│ WING STOCK CHECK:                                    │
│ ✗ Status: OUT OF STOCK - 0 units in stock           │
│                                                       │
│ OPTIONS:                                             │
│ ○ ✓ Approve from Wing (DISABLED) ❌                 │
│ ○ ⏭ Forward to Admin (ENABLED)  ← SELECTED          │
│ ○ ✗ Reject (ENABLED)                                │
│                                                       │
│ ACTION: Forward request to admin supervisor         │
│         Admin checks admin warehouse                │
│         Admin approves if available                  │
│                                                       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ITEM 3: OXYGEN MASKS (Requested: 50)                │
├──────────────────────────────────────────────────────┤
│                                                       │
│ WING STOCK CHECK:                                    │
│ ✓ Status: AVAILABLE - 80 units in stock             │
│                                                       │
│ OPTIONS:                                             │
│ ○ ✓ Approve from Wing (ENABLED)  ← SELECTED         │
│ ○ ⏭ Forward to Admin (ENABLED)                      │
│ ○ ✗ Reject (ENABLED)                                │
│                                                       │
│ ACTION: Deduct 50 masks from wing inventory         │
│         Allocate to emergency ward immediately       │
│                                                       │
└──────────────────────────────────────────────────────┘

DECISION SUMMARY:
┌────────────┬────────────┬─────────┬──────────┐
│ Wing       │ Forward    │ Reject  │ Undecid. │
│ Approve    │ Admin      │         │          │
├────────────┼────────────┼─────────┼──────────┤
│    2       │     1      │    0    │    0     │
│  items     │   items    │  items  │  items   │
└────────────┴────────────┴─────────┴──────────┘

ACTION: Click "Submit Decisions"

RESULT:
┌─────────────────────────────────────────────────┐
│ DECISIONS SUBMITTED                             │
├─────────────────────────────────────────────────┤
│                                                  │
│ ITEM 1 (Masks):                                │
│   ✓ Wing Approved                              │
│   → Deduct 100 from wing inventory             │
│   → Allocate to emergency ward                 │
│   → Status: READY FOR PICKUP                   │
│   → Requester notified: "Item ready"           │
│                                                  │
│ ITEM 2 (Ventilator Tubes):                     │
│   ⏭ Forwarded to Admin                         │
│   → Request sent to admin supervisor           │
│   → Admin will check admin warehouse           │
│   → Admin will approve or reject               │
│   → Status: AWAITING ADMIN DECISION            │
│   → Requester notified: "Awaiting admin"       │
│                                                  │
│ ITEM 3 (Oxygen Masks):                         │
│   ✓ Wing Approved                              │
│   → Deduct 50 from wing inventory              │
│   → Allocate to emergency ward                 │
│   → Status: READY FOR PICKUP                   │
│   → Requester notified: "Item ready"           │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 4️⃣ DECISION FLOW CHART

```
         FOR EACH ITEM IN REQUEST:

              ITEM NAME
                 │
                 ▼
        ┌────────────────────┐
        │ IS ITEM AVAILABLE? │
        │ (Stock Status)     │
        └────────┬───────┬───┘
                 │       │
                YES      NO
                 │       │
                 ▼       ▼
           ┌─────────┐ ┌──────────┐
           │         │ │          │
           ▼         ▼ ▼          ▼
       OPTION 1  OPTION 2    OPTION 2   OPTION 3
       ────────  ────────    ────────   ────────
       ✓ APPROVE ⏭FORWARD ✗ REJECT  (can choose any)
       FROM WING TO ADMIN             
       (ENABLED) (ENABLED) (ENABLED)

           │         │        │
           └────────────────────┘
                    │
                    ▼
          DECISION RECORDED
          FOR THIS ITEM
                    │
                    ▼
          MOVE TO NEXT ITEM
          (Repeat for all items)
                    │
                    ▼
         ALL ITEMS PROCESSED
                    │
                    ▼
        SHOW DECISION SUMMARY
                    │
                    ▼
         CHECK: ALL ITEMS DECIDED?
                    │
          ┌─────────┴──────────┐
          │                    │
         YES                   NO
          │                    │
          ▼                    ▼
       READY TO           ⚠️ WARNING
       SUBMIT             (Show alert)
          │                    │
          └────────┬───────────┘
                   │
                   ▼
         ENTER APPROVER NAME
         ADD COMMENTS (OPTIONAL)
                   │
                   ▼
         CLICK "SUBMIT DECISIONS"
                   │
                   ▼
      PROCESS ALL DECISIONS
              (Backend)
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
    APPROVE      FORWARD     REJECT
    FROM WING    TO ADMIN    ITEM
       │           │           │
       ▼           ▼           ▼
    DEDUCT      CREATE      MARK
    INVENTORY   FORWARD     REJECTED
       │         REQUEST      │
       ▼           │          ▼
    ALLOCATE      ▼         NO ACTION
       │        ADMIN
       │        DECIDES
       └────┬────┘
            │
            ▼
   AUDIT TRAIL UPDATED
            │
            ▼
   REQUESTER NOTIFIED
   (By Email)
```

---

## 5️⃣ STATE MANAGEMENT DIAGRAM

```
┌─────────────────────────────────────────────────────┐
│         COMPONENT STATE (React)                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  itemDecisions: Map<itemId, ItemDecision>          │
│  ─────────────────────────────────────────────      │
│                                                      │
│  {                                                  │
│    "item-001": {                                   │
│      itemId: "item-001",                           │
│      decision: "approve_wing",                     │
│      approvedQuantity: 100,                        │
│      reason: undefined                             │
│    },                                              │
│                                                      │
│    "item-002": {                                   │
│      itemId: "item-002",                           │
│      decision: "forward_admin",                    │
│      approvedQuantity: 10,                         │
│      reason: "Not in wing stock"                   │
│    },                                              │
│                                                      │
│    "item-003": {                                   │
│      itemId: "item-003",                           │
│      decision: "reject",                           │
│      approvedQuantity: 0,                          │
│      reason: "Not needed"                          │
│    }                                               │
│  }                                                  │
│                                                      │
│  Other State:                                       │
│  ─────────────                                      │
│  • approverName: string (required)                 │
│  • approverDesignation: string (optional)          │
│  • approvalComments: string (optional)             │
│  • selectedRequest: IssuanceRequest                │
│  • isLoading: boolean                              │
│  • success: string                                 │
│  • error: string                                   │
│                                                      │
└─────────────────────────────────────────────────────┘

         ▼ When supervisor clicks radio button ▼

    setItemDecision(itemId, decision, qty)
             │
             ▼
    itemDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: qty,
      reason
    })
             │
             ▼
    Component re-renders with:
    • Updated radio button state
    • Real-time decision summary
    • Validation status check
    • Submit button enable/disable
```

---

## 6️⃣ VALIDATION STATE MACHINE

```
         USER OPENS REQUEST
                │
                ▼
    [NO ITEMS SELECTED]
         │        │        │
         ▼        ▼        ▼
    ITEM1     ITEM2      ITEM3
    (?)       (?)        (?)
    
    0 DECIDED, 3 UNDECIDED
    Submit Button: ❌ DISABLED

         User selects decision for Item 1

         │        │        │
         ▼        ▼        ▼
    ITEM1     ITEM2      ITEM3
    (✓)       (?)        (?)
    
    1 DECIDED, 2 UNDECIDED
    Alert: ⚠️ "You have 2 items without decision"
    Submit Button: ❌ DISABLED

         User selects decision for Item 2

         │        │        │
         ▼        ▼        ▼
    ITEM1     ITEM2      ITEM3
    (✓)       (⏭)       (?)
    
    2 DECIDED, 1 UNDECIDED
    Alert: ⚠️ "You have 1 item without decision"
    Submit Button: ❌ DISABLED

         User selects decision for Item 3

         │        │        │
         ▼        ▼        ▼
    ITEM1     ITEM2      ITEM3
    (✓)       (⏭)       (✗)
    
    3 DECIDED, 0 UNDECIDED
    Alert: ✅ CLEARED
    Submit Button: 🟢 ENABLED!
    
    User can now click "Submit Decisions"
```

---

## 7️⃣ BACKEND PROCESSING

```
CLIENT SUBMITS:
┌─────────────────────────────────────────────────────┐
│ ApprovalAction {                                    │
│   request_id: "req-123",                           │
│   approver_name: "Ahmed Khan",                     │
│   approver_designation: "Wing Supervisor",         │
│   approval_comments: "Per-item decisions",         │
│   item_allocations: [                              │
│     {                                              │
│       requested_item_id: "item-001",               │
│       inventory_item_id: "inv-123",                │
│       allocated_quantity: 100,                     │
│       decision_type: "APPROVE_FROM_STOCK"          │
│     },                                             │
│     {                                              │
│       requested_item_id: "item-002",               │
│       inventory_item_id: "inv-456",                │
│       allocated_quantity: 10,                      │
│       decision_type: "APPROVE_FOR_PROCUREMENT"     │
│     },                                             │
│     {                                              │
│       requested_item_id: "item-003",               │
│       inventory_item_id: null,                     │
│       allocated_quantity: 0,                       │
│       decision_type: "REJECT"                      │
│     }                                              │
│   ]                                                │
│ }                                                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Backend Processing ▼
       
FOR EACH ITEM ALLOCATION:

┌─────────────────────────────────────────────────────┐
│ IF decision_type == "APPROVE_FROM_STOCK":           │
│                                                      │
│   1. Validate item available in wing inventory      │
│   2. Deduct allocated_quantity from wing stock     │
│   3. Create allocation record                      │
│   4. Insert stock_transfer_log entry               │
│   5. Update request item status to "Approved"      │
│   6. Create requester notification                 │
│                                                      │
│ ELSE IF decision_type == "APPROVE_FOR_PROCUREMENT":│
│                                                      │
│   1. Create forwarding request to admin            │
│   2. Link to admin supervisor queue                │
│   3. Update request item status to "Forwarded"    │
│   4. Insert forwarding audit log                   │
│   5. Create requester notification                 │
│                                                      │
│ ELSE (decision_type == "REJECT"):                  │
│                                                      │
│   1. Mark item as rejected                         │
│   2. Update request item status to "Rejected"      │
│   3. Insert rejection log                          │
│   4. Create requester notification                 │
│                                                      │
└─────────────────────────────────────────────────────┘

RESPONSE TO CLIENT:
┌─────────────────────────────────────────────────────┐
│ {                                                   │
│   success: true,                                   │
│   message: "Per-item approval decisions submitted" │
│   details: {                                       │
│     approved_items: 1,                             │
│     forwarded_items: 1,                            │
│     rejected_items: 1                              │
│   }                                                │
│ }                                                   │
└─────────────────────────────────────────────────────┘

CLIENT UPDATES UI:
✅ Success notification shown
📧 Refresh approval list
🔄 Clear selected request
📊 Display next pending request
```

---

## 8️⃣ COMPLETE REQUEST LIFECYCLE

```
┌─────────────────────────────────────────────────────────┐
│ TIME:  T0 - REQUESTER SUBMITS REQUEST                  │
│                                                          │
│ Request Status: SUBMITTED                               │
│ Awaiting: Wing Supervisor Approval                      │
│ Items: All "Pending" status                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ TIME:  T1 - WING SUPERVISOR REVIEWS                     │
│                                                          │
│ Request Status: IN REVIEW                               │
│ Supervisor: Checking wing inventory                     │
│ Decision: Making per-item decisions                     │
│                                                          │
│ Item 1: ✓ Approve Wing                                │
│ Item 2: ⏭ Forward to Admin                             │
│ Item 3: ✓ Approve Wing                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ TIME:  T2 - DECISIONS SUBMITTED                         │
│                                                          │
│ Request Status: APPROVED (Mixed)                        │
│ Wing Supervisor: Ahmed Khan                            │
│ Decision Time: 3 minutes                                │
│                                                          │
│ Item 1: ✓ APPROVED FROM WING                           │
│         → Status: Ready for Pickup                      │
│         → Location: Wing Store                          │
│         → Allocated: Yes                                │
│                                                          │
│ Item 2: ⏭ FORWARDED TO ADMIN                           │
│         → Status: Awaiting Admin                        │
│         → Next: Admin Supervisor                        │
│         → Allocated: No (waiting)                       │
│                                                          │
│ Item 3: ✓ APPROVED FROM WING                           │
│         → Status: Ready for Pickup                      │
│         → Location: Wing Store                          │
│         → Allocated: Yes                                │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        WING APPROVED  FORWARDED   WING APPROVED
        (Item 1)       (Item 2)    (Item 3)
              │           │           │
              ▼           ▼           ▼
        IMMEDIATE      ADMIN        IMMEDIATE
        PICKUP       DECIDES       PICKUP
              │           │           │
              └─────┬─────┴─────┬─────┘
                    │           │
                    ▼           ▼
        ┌───────────────────────────────┐
        │ T3: REQUESTER NOTIFIED        │
        │                               │
        │ Email Subject:                │
        │ "Request Partially Approved"  │
        │                               │
        │ Content:                      │
        │ ✓ Item 1: Ready for pickup   │
        │ ⏳ Item 2: Awaiting admin    │
        │ ✓ Item 3: Ready for pickup   │
        │                               │
        │ Status: PARTIAL FULFILLMENT   │
        └───────────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────────┐
        │ T4: REQUESTER PICKS UP        │
        │                               │
        │ Collected:                    │
        │ • Item 1 (100 units)          │
        │ • Item 3 (50 units)           │
        │                               │
        │ Still Waiting:                │
        │ • Item 2 (Awaiting admin)    │
        │                               │
        │ Request Status: PARTIAL       │
        └───────────────────────────────┘
                      │
        ┌─────────────┘
        │ (Meanwhile, admin is processing Item 2)
        │
        ▼ (Admin approves Item 2)
        
        ┌───────────────────────────────┐
        │ T5: ITEM 2 APPROVED BY ADMIN   │
        │                               │
        │ Item 2 Status: Ready          │
        │ Allocated: Yes                │
        │                               │
        │ Requester Notified:           │
        │ "Item 2 is now ready"         │
        └───────────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────────┐
        │ T6: REQUESTER PICKS UP ITEM 2 │
        │                               │
        │ All Items Collected:          │
        │ ✓ Item 1 (100 units)          │
        │ ✓ Item 2 (10 units)           │
        │ ✓ Item 3 (50 units)           │
        │                               │
        │ Request Status: COMPLETE      │
        └───────────────────────────────┘
```

---

## 📋 SUMMARY

The per-item approval system enables:

1. **Granular Control**: Each item gets individual decision
2. **Smart Routing**: Wing-approved items immediate, others escalated
3. **Mixed Fulfillment**: Partial immediate, partial admin-managed
4. **Flexible Options**: Every item can go three different paths
5. **Real-time Feedback**: Summary shows decision breakdown
6. **Full Audit Trail**: Every decision recorded with timestamp

**Result**: More efficient, flexible, and transparent approval process! ✅

---

**Created**: December 13, 2025  
**Status**: ✅ COMPLETE
