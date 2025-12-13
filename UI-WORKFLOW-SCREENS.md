# 👁️ UI WORKFLOW - WHAT YOU SEE ON SCREEN

**Visual guide showing exactly what appears on your dashboard**

---

## SCREEN 1️⃣: APPROVAL DASHBOARD

```
╔═══════════════════════════════════════════════════════════════╗
║          APPROVAL DASHBOARD - Wing Supervisor               ║
╚═══════════════════════════════════════════════════════════════╝

Pending Approvals:

┌─────────────────────────────────────────────────────────────┐
│ REQUEST #1                                                  │
│                                                              │
│ Submitted By: Muhammad Naseer                              │
│ Items: 2                                                    │
│ Status: PENDING APPROVAL                                   │
│ Type: Stock Issuance                                       │
│                                                              │
│ [SELECT THIS REQUEST] ▶                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ REQUEST #2                                                  │
│                                                              │
│ Submitted By: Dr. Ahmed Khan                               │
│ Items: 3                                                    │
│ Status: PENDING APPROVAL                                   │
│ Type: Stock Issuance                                       │
│                                                              │
│ [SELECT THIS REQUEST] ▶                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## SCREEN 2️⃣: REQUEST DETAILS (BEFORE YOU DECIDE)

```
╔═══════════════════════════════════════════════════════════════╗
║                    APPROVAL STATUS                           ║
║                                                               ║
║ Status: PENDING                                              ║
╚═══════════════════════════════════════════════════════════════╝

Request Type: stock_issuance
Request ID: 6E3D91D9-458E-49DB-A406-CD098618A3BB

Submitted By: Muhammad Naseer
Submitted Date: Dec 13, 2025, 11:06 PM

Selected Approver: Muhammad Ehtesham Siddiqui

─────────────────────────────────────────────────────────────

ITEMS REQUESTED (2)

┌─ COLUMN HEADERS ──────────────────────────────────────────┐
│ ITEM │ DESCRIPTION │ QTY │ UNIT │ STATUS │ INVENTORY │ ACT. │
└────────────────────────────────────────────────────────────┘

┌─ ITEM 1 ──────────────────────────────────────────────────┐
│ NAME: Desktop Computer                                    │
│ DESC: Intel i5, 8GB RAM, 256GB SSD                       │
│ QTY: 1                                                    │
│ UNIT: PCS                                                 │
│ STATUS: Approved ✓                                        │
│ WING INVENTORY: [Check]                                  │
│ ACTION: [✓ Approve] [✗ Reject]                           │
└────────────────────────────────────────────────────────────┘

┌─ ITEM 2 ──────────────────────────────────────────────────┐
│ NAME: UPS                                                 │
│ DESC: Minimum 60 KVA or Above UPS Solution...            │
│ QTY: 1                                                    │
│ UNIT: BOX                                                 │
│ STATUS: Pending ⏳                                         │
│ WING INVENTORY: [Check]                                  │
│ ACTION: [✓ Approve] [✗ Reject]                           │
└────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────

APPROVAL ACTIONS

Approver Name: __________________ (required)
Designation: __________________ (optional)

Comments: (optional)
┌────────────────────────────────────────────────────────────┐
│                                                            │
└────────────────────────────────────────────────────────────┘

[Approve]  [Reject]
```

---

## SCREEN 3️⃣: AFTER CLICKING "CHECK" INVENTORY

```
╔═══════════════════════════════════════════════════════════════╗
║            WING INVENTORY CHECK RESULTS                      ║
╚═══════════════════════════════════════════════════════════════╝

┌─ ITEM 1: DESKTOP COMPUTER ───────────────────────────────┐
│                                                           │
│ Status: ✓ AVAILABLE                                      │
│                                                           │
│ Current Stock:                                           │
│ ├─ Location: Central Store                              │
│ ├─ Total Available: 15 units                             │
│ └─ Can Fulfill: YES ✓                                   │
│                                                           │
│ Allocation Quantity: [1] PCS                             │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌─ ITEM 2: UPS ────────────────────────────────────────────┐
│                                                           │
│ Status: ✗ OUT OF STOCK                                  │
│                                                           │
│ Current Stock:                                           │
│ ├─ Location: Central Store                              │
│ ├─ Total Available: 0 units                              │
│ └─ Can Fulfill: NO ✗                                    │
│                                                           │
│ Last Stock In: 20 days ago                               │
│ Expected Restock: 10 days (pending order)                │
│                                                           │
└───────────────────────────────────────────────────────────┘

[Back to Approval] ◀
```

---

## SCREEN 4️⃣: NEW UI - MAKING PER-ITEM DECISIONS

```
╔═══════════════════════════════════════════════════════════════╗
║                    APPROVAL STATUS                           ║
║                                                               ║
║ Status: PENDING                                              ║
╚═══════════════════════════════════════════════════════════════╝

Request Type: stock_issuance
Request ID: 6E3D91D9-458E-49DB-A406-CD098618A3BB

Submitted By: Muhammad Naseer
Submitted Date: Dec 13, 2025, 11:06 PM

─────────────────────────────────────────────────────────────

ITEMS REQUESTED (2)

┌─────────────────────────────────────────────────────────┐
│ ITEM 1: DESKTOP COMPUTER                                │
│                                                          │
│ Description: Intel i5, 8GB RAM, 256GB SSD              │
│ Quantity Needed: 1 PCS                                 │
│                                                          │
│ Wing Stock Status: ✓ AVAILABLE (15 units in stock)     │
│                                                          │
│ YOUR DECISION:                                          │
│                                                          │
│ ○ ✓ Approve from Wing                                 │
│     (Deduct from wing inventory now,                   │
│      requester gets item today)                        │
│                                                          │
│ ○ ⏭ Forward to Admin                                   │
│     (Admin checks warehouse,                           │
│      requester gets item later)                        │
│                                                          │
│ ○ ✗ Reject                                             │
│     (Item not given to requester)                      │
│                                                          │
│ Reason (optional):                                      │
│ __________________ [text field]                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ITEM 2: UPS                                              │
│                                                          │
│ Description: Minimum 60 KVA or Above UPS Solution...   │
│ Quantity Needed: 1 BOX                                 │
│                                                          │
│ Wing Stock Status: ✗ OUT OF STOCK (0 units)            │
│                                                          │
│ YOUR DECISION:                                          │
│                                                          │
│ ○ ✓ Approve from Wing          (DISABLED) ❌           │
│     └─ Reason: No stock available                      │
│                                                          │
│ ○ ⏭ Forward to Admin                                   │
│     (Admin checks warehouse,                           │
│      requester gets item later)  ← SELECT THIS         │
│                                                          │
│ ○ ✗ Reject                                             │
│     (Item not given to requester)                      │
│                                                          │
│ Reason (optional):                                      │
│ "Not available in wing inventory"                       │
│                                                          │
└─────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────

ITEM DECISIONS SUMMARY
┌────────────────────────────────────────────────────────┐
│                                                        │
│ ✓ Wing Approve:      1 item                           │
│ ⏭ Forward Admin:     1 item    ← SELECTED             │
│ ✗ Reject:            0 items                          │
│ ? Undecided:         0 items                          │
│                                                        │
│ Status: ✅ ALL ITEMS DECIDED - READY TO SUBMIT        │
│                                                        │
└────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────

APPROVAL ACTIONS

Approver Name: Muhammad Ehtesham Siddiqui (required)
                ________________________________________

Designation: Wing Supervisor (optional)
                ________________________________________

Comments: (optional)
┌────────────────────────────────────────────────────────┐
│                                                        │
└────────────────────────────────────────────────────────┘

[Clear Selection]  [Submit Decisions]
```

---

## SCREEN 5️⃣: DECISION SELECTED (VISUAL)

```
When you click on a radio button:

┌─────────────────────────────────────────────────────┐
│ ITEM 1: DESKTOP COMPUTER                            │
│                                                      │
│ Wing Stock: ✓ AVAILABLE (15 units)                 │
│                                                      │
│ ● ✓ Approve from Wing         ✓ SELECTED          │
│   [Your choice is recorded]                         │
│                                                      │
│ ○ ⏭ Forward to Admin                               │
│                                                      │
│ ○ ✗ Reject                                          │
│                                                      │
└─────────────────────────────────────────────────────┘

SUMMARY UPDATES IN REAL-TIME:
┌────────────────────────────────────┐
│ ✓ Wing Approve:      1 item ✓      │
│ ⏭ Forward Admin:     0 items       │
│ ✗ Reject:            0 items       │
│ ? Undecided:         1 item ⏳     │
└────────────────────────────────────┘

Submit Button: 🟥 DISABLED (still 1 undecided item)
```

---

## SCREEN 6️⃣: ALL ITEMS DECIDED

```
When you decide the last item:

ITEM DECISIONS SUMMARY
┌──────────────────────────────────────┐
│                                      │
│ ✓ Wing Approve:      1 item ✓       │
│ ⏭ Forward Admin:     1 item ✓       │
│ ✗ Reject:            0 items        │
│ ? Undecided:         0 items ✓      │
│                                      │
│ ✅ ALL ITEMS DECIDED!               │
│                                      │
│ Ready to click "Submit Decisions"   │
│                                      │
└──────────────────────────────────────┘

Submit Button: 🟢 ENABLED ✓ (can click now!)
```

---

## SCREEN 7️⃣: VALIDATION ERROR (IF UNDECIDED)

```
If you try to submit with undecided items:

┌──────────────────────────────────────────────────────┐
│                                                      │
│ ⚠️  WARNING                                          │
│                                                      │
│ You have 1 item without a decision!                 │
│                                                      │
│ Please make a decision for:                         │
│ • UPS (Qty: 1)                                      │
│                                                      │
│ Options:                                            │
│ - ✓ Approve from Wing                              │
│ - ⏭ Forward to Admin                               │
│ - ✗ Reject                                          │
│                                                      │
│ [OK - Close Warning]                                │
│                                                      │
└──────────────────────────────────────────────────────┘

Submit Button: 🟥 STILL DISABLED
(Won't work until all items have decisions)
```

---

## SCREEN 8️⃣: SUCCESS - DECISIONS SUBMITTED

```
After clicking "Submit Decisions":

╔═══════════════════════════════════════════════════════╗
║                                                       ║
║ ✅ SUCCESS                                            ║
║                                                       ║
║ Your per-item approval decisions have been           ║
║ successfully submitted!                              ║
║                                                       ║
║ Summary:                                              ║
║ • Desktop Computer: Approved from Wing ✓             ║
║ • UPS: Forwarded to Admin ⏭                          ║
║                                                       ║
║ Requester Notifications: Sent                        ║
║ Audit Trail: Recorded                                │
║ Inventory: Updated                                   │
║                                                       ║
║ [OK - Return to Dashboard]                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

## SCREEN 9️⃣: WHAT REQUESTER SEES

```
After you submit, requester gets email:

╔════════════════════════════════════════════════════╗
║ EMAIL TO: Muhammad Naseer                         ║
╚════════════════════════════════════════════════════╝

Subject: 📦 Your Request Was Partially Approved

Dear Muhammad Naseer,

Your stock issuance request has been processed.

─────────────────────────────────────────────────────

✓ ITEM 1: DESKTOP COMPUTER - APPROVED

Status: Ready for Pickup
Location: Wing Central Store
Quantity: 1 PCS
Approved By: Muhammad Ehtesham Siddiqui
Date: Dec 13, 2025

👉 ACTION: Come to Wing Central Store to collect
          your item

─────────────────────────────────────────────────────

⏳ ITEM 2: UPS - AWAITING ADMIN APPROVAL

Status: Forwarded to Admin
Quantity: 1 BOX
Forwarded By: Muhammad Ehtesham Siddiqui
Reason: Not available in wing inventory

👉 ACTION: Your admin supervisor will check the
          warehouse and contact you soon

─────────────────────────────────────────────────────

If you have questions, contact your approver.

Best Regards,
Inventory Management System
```

---

## SCREEN 🔟: DECISION FLOW SUMMARY

```
VISUAL FLOW - WHAT YOU DO:

STEP 1: OPEN DASHBOARD
        ↓
STEP 2: SELECT REQUEST
        ↓
STEP 3: CHECK INVENTORY FOR EACH ITEM
        ↓
STEP 4: FOR EACH ITEM, CHOOSE:
        
        Item 1: Wing has? YES → Approve/Forward/Reject
        Item 2: Wing has? NO  → Forward/Reject (Approve disabled)
        Item 3: Wing has? YES → Approve/Forward/Reject
        
        ↓
STEP 5: REVIEW DECISION SUMMARY
        ✓ Wing: 1
        ⏭ Admin: 1
        ✗ Reject: 1
        
        ↓
STEP 6: FILL APPROVER NAME
        
        ↓
STEP 7: CLICK "SUBMIT DECISIONS"
        
        ↓
STEP 8: SYSTEM PROCESSES EACH DECISION
        • Item 1: Deduct from wing ✓
        • Item 2: Forward to admin ⏭
        • Item 3: Reject ✗
        
        ↓
STEP 9: REQUESTER NOTIFIED
        • Email sent
        • Status updated
        • Inventory changed
        
        ✅ COMPLETE!
```

---

## 🎯 KEY VISUAL ELEMENTS

### Radio Button States

```
NOT SELECTED:
○ Option Name

SELECTED:
● Option Name  ✓

DISABLED (Greyed Out):
○ Option Name  ❌
  Reason: No stock available
```

### Decision Summary Box

```
┌────────────────────────────────────┐
│ ✓ Wing Approve:      2 items       │
│ ⏭ Forward Admin:     1 item        │
│ ✗ Reject:            0 items       │
│ ? Undecided:         0 items       │
└────────────────────────────────────┘
```

### Status Badges

```
✓ Approved
⏳ Pending
⏭ Forwarded
✗ Rejected
```

### Button States

```
🟢 ENABLED (clickable, bright green)
   [Click to Submit]

🟥 DISABLED (greyed out, can't click)
   [Submit Decisions] (disabled - items undecided)
```

---

## 📱 MOBILE FLOW

On phone/tablet, layout might be:

```
ITEM 1
───────────────────────────
Name: Desktop Computer
Qty: 1
Stock: ✓ Available

Decision:
[●] Approve Wing
[ ] Forward Admin
[ ] Reject

───────────────────────────

ITEM 2
───────────────────────────
Name: UPS
Qty: 1
Stock: ✗ Out of Stock

Decision:
[○] Approve Wing (disabled)
[●] Forward Admin
[ ] Reject

───────────────────────────

SUMMARY
Wing Approve: 1
Forward Admin: 1
Reject: 0
Undecided: 0

[SUBMIT DECISIONS]
```

---

## 💡 TIPS FOR SUPERVISORS

1. **Always check inventory first** - Click "Check" button to see stock
2. **Read the stock status** - Green = Available, Red = Out of stock
3. **Watch the summary** - See your decisions update in real-time
4. **Fill approver name** - Required field, can't submit without it
5. **All items must be decided** - Button won't work if any undecided
6. **Add reason for forwarding** - Helps admin understand why
7. **Review summary before submit** - Last chance to change mind

---

**Created**: December 13, 2025  
**Status**: ✅ COMPLETE  
**Visual Format**: Screen mockups with UI layout
