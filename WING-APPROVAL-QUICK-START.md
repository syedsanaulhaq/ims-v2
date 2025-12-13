# 🎯 WING APPROVAL DASHBOARD - QUICK START GUIDE
## Per-Item Approval Decision System

**Feature Version**: 1.0  
**Date**: December 13, 2025  
**Status**: ✅ LIVE  

---

## 🚀 ACCESSING THE WING APPROVAL DASHBOARD

### URL
```
http://localhost:8080/dashboard/approval-dashboard
```

### Who Can Access
- Wing Supervisors
- Department Heads
- Authorized Approval Personnel

---

## 📝 TYPICAL WORKFLOW

### 1️⃣ OPEN THE DASHBOARD

Navigate to **Approval Dashboard** from the main menu:
```
Main Menu → Issuance Manager → Approval Management
OR
Direct URL: http://localhost:8080/dashboard/approval-dashboard
```

You'll see a list of **Pending Requests** waiting for your approval.

### 2️⃣ SELECT A REQUEST TO REVIEW

Click on any pending request from the list to view its details:
- Request number
- Requester name & department
- Purpose of request
- Urgency level
- Return date (if applicable)
- **List of items being requested**

### 3️⃣ REVIEW ITEMS ONE BY ONE

For each item, you'll see:

```
┌─────────────────────────────────────────────┐
│ SURGICAL MASKS                              │
├─────────────────────────────────────────────┤
│ Requested Quantity: 100 units               │
├─────────────────────────────────────────────┤
│ WING STOCK STATUS:                          │
│ ✓ Stock: 150 units (Available)              │
│                                             │
│ Can approve from wing inventory             │
└─────────────────────────────────────────────┘
```

### 4️⃣ MAKE YOUR DECISION FOR EACH ITEM

**You have THREE options for each item:**

#### ✓ OPTION 1: APPROVE FROM WING STORE
```
When to use: Item is available in wing inventory

What happens:
  ✓ Item is deducted from wing storage
  ✓ Item is allocated to requester immediately
  ✓ Requester can pick up item right away

Example: If surgical masks are in stock
  - Click: ✓ Approve from Wing Store
  - System deducts 100 masks from wing
  - Ward supervisor gets 100 masks
```

**Availability**: Only enabled when wing has sufficient stock

---

#### ⏭ OPTION 2: FORWARD TO ADMIN
```
When to use: Item NOT available in wing inventory OR
             You want admin to decide

What happens:
  ⏭ Forwarded to admin supervisor
  → Admin checks admin/central warehouse
  → Admin approves or rejects from their stock
  → Requester waits for admin decision
  
Example: If surgical masks are OUT OF STOCK in wing
  - Click: ⏭ Forward to Admin
  - Request sent to admin supervisor
  - Admin checks central warehouse
  - Admin decides to approve or reject
  - Requester gets notified of admin's decision
```

**Availability**: Always available (for any item)

---

#### ✗ OPTION 3: REJECT
```
When to use: Item not needed OR 
             Should not be issued

What happens:
  ✗ Item is rejected entirely
  ✗ Item removed from request
  ✗ No deduction from inventory
  ✗ Requester notified of rejection

Example: If item is not critical
  - Click: ✗ Reject Request
  - Item removed from request
  - Requester can re-request later if needed
```

**Availability**: Always available (for any item)

---

### 5️⃣ REVIEW YOUR DECISIONS

After making decisions for all items, you'll see a summary:

```
╔═══════════════════════════════════════════════╗
║        DECISION SUMMARY                       ║
╠═══════════════════════════════════════════════╣
║  ✓ Wing Approve:      2 items                ║
║  ⏭ Forward to Admin:  1 item                 ║
║  ✗ Reject:            0 items                ║
║  ? Undecided:         0 items        ← OK!   ║
╚═══════════════════════════════════════════════╝
```

**What Each Means**:
- **Wing Approve**: Items you approved from wing (deducted immediately)
- **Forward to Admin**: Items sent to admin for their decision
- **Reject**: Items you rejected entirely
- **Undecided**: Items still waiting for your decision (MUST BE ZERO)

### 6️⃣ SUBMIT YOUR DECISIONS

When all items have decisions:
1. Enter your **Name** (required)
2. (Optional) Enter your **Designation** (e.g., "Ward Supervisor")
3. (Optional) Add **Comments** about your decisions
4. Click **"Submit Decisions"** button

```
┌─────────────────────────────────────────────┐
│ Approver Name:   [Ahmed Khan            ]   │
│ Designation:     [Ward Supervisor       ]   │
│ Comments:        [Stock checked, approved]  │
├─────────────────────────────────────────────┤
│ [Clear Selection]  [Submit Decisions ✓]     │
└─────────────────────────────────────────────┘
```

### 7️⃣ CONFIRMATION

You'll see a success message:
```
✅ Per-item approval decisions submitted successfully

Your decisions are now being processed:
  • Wing-approved items: Deducted from inventory
  • Forwarded items: Sent to admin supervisor
  • Rejected items: Removed from request
  
Requester will be notified of the decisions.
```

---

## 📊 DECISION EXAMPLES

### Example 1: Emergency Ward Request
```
REQUEST: Emergency Medical Supplies
REQUESTER: Emergency Ward Supervisor

ITEM 1: Oxygen Masks (Requested: 50)
  Wing Stock: ✓ 100 units available
  YOUR DECISION: ✓ Approve from Wing
  RESULT: 50 deducted from wing, allocated immediately

ITEM 2: IV Stands (Requested: 10)
  Wing Stock: ✗ 0 units (out of stock)
  YOUR DECISION: ⏭ Forward to Admin
  RESULT: Sent to admin for decision from central warehouse

ITEM 3: Gauze Pads (Requested: 25)
  Wing Stock: ✓ 50 units available
  YOUR DECISION: ✓ Approve from Wing
  RESULT: 25 deducted from wing, allocated immediately

SUMMARY:
  ✓ Wing Approve: 2 items (50 masks + 25 gauze)
  ⏭ Forward: 1 item (10 stands)
  
OUTCOME:
  - Ward gets 50 masks + 25 gauze immediately
  - Admin decides on IV stands
```

### Example 2: General Ward Request
```
REQUEST: General Supplies
REQUESTER: General Ward Head

ITEM 1: Bedding Sheets (Requested: 20)
  Wing Stock: ✗ Out of stock
  YOUR DECISION: ⏭ Forward to Admin
  RESULT: Admin handles

ITEM 2: Pillows (Requested: 30)
  Wing Stock: ✓ 50 units available
  YOUR DECISION: ✓ Approve from Wing
  RESULT: 30 deducted from wing

ITEM 3: Blankets (Requested: 15)
  Wing Stock: ✗ Out of stock
  YOUR DECISION: ✗ Reject
  REASON: Can be procured in next cycle
  RESULT: Item removed from request

SUMMARY:
  ✓ Wing Approve: 1 item (30 pillows)
  ⏭ Forward: 1 item (20 sheets)
  ✗ Reject: 1 item (blankets)
  
OUTCOME:
  - Ward gets 30 pillows immediately
  - Admin decides on 20 sheets
  - Blankets can be re-requested later
```

---

## ⚠️ IMPORTANT RULES

### BEFORE YOU SUBMIT:

✅ **ALL ITEMS MUST HAVE A DECISION**
```
If even one item is undecided, the system will show:
⚠️ "You have 1 items without a decision. 
    Please make a decision for each item before submitting."
```

✅ **YOU MUST ENTER YOUR NAME**
```
Your name is required for accountability and audit trail.
Without it, the Submit button is disabled.
```

✅ **SELECT ONLY ONE OPTION PER ITEM**
```
Each item can have ONLY ONE decision:
  • Approve Wing, OR
  • Forward to Admin, OR
  • Reject

You cannot select multiple options for the same item.
```

### DECISION LOGIC:

| Item Stock | Approve Wing | Forward Admin | Reject |
|-----------|-------------|---------------|--------|
| Available | ✅ Enabled   | ✅ Available  | ✅ Available |
| Insufficient | ❌ Disabled | ✅ Available  | ✅ Available |
| Out of Stock | ❌ Disabled | ✅ Available  | ✅ Available |

---

## 🎯 BEST PRACTICES

### ✓ DO:
1. **Check stock status carefully** before deciding
2. **Use "Approve from Wing"** whenever possible (faster for requester)
3. **Forward to Admin** only when wing doesn't have stock
4. **Add comments** for complex decisions (helps audit trail)
5. **Review decision summary** before submitting
6. **Keep your name entry consistent** (for reporting)

### ✗ DON'T:
1. Don't submit without reading stock status
2. Don't approve items you know are not in stock
3. Don't forward unnecessarily (wastes admin time)
4. Don't reject items without reason
5. Don't make bulk approve/reject (use per-item decisions)

---

## 🔄 WHAT HAPPENS AFTER YOU SUBMIT

### Immediate (Wing-Approved Items)
```
ITEM: Surgical Masks
DECISION: ✓ Approve from Wing
ACTION: Immediate
├─ Wing inventory: Deducted 100 units
├─ Allocation: Created for requester
├─ Status: Ready for pickup
└─ Requester: Notified (Item ready!)
```

### Pending (Forwarded Items)
```
ITEM: IV Stands
DECISION: ⏭ Forward to Admin
ACTION: Waiting for Admin
├─ Request: Sent to admin supervisor
├─ Admin checks: Central warehouse
├─ Admin decides: Approve/Reject
└─ Requester: Waits for admin decision
```

### Rejected (Rejected Items)
```
ITEM: Blankets
DECISION: ✗ Reject
ACTION: Removed
├─ Inventory: No deduction
├─ Item status: Rejected
├─ Requester: Notified (Item rejected)
└─ Option: Can re-request later
```

---

## 📞 NEED HELP?

### Common Issues

**Q: Why is "Approve from Wing" disabled?**
A: Because the wing doesn't have enough stock. Choose "Forward to Admin" instead.

**Q: What if I change my mind?**
A: Click "Clear Selection" to reset everything. Then start over.

**Q: How do I check current wing inventory?**
A: Before opening the approval dashboard, check the Inventory module for real-time stock levels.

**Q: Will requester get notified?**
A: Yes! They get notified immediately of all decisions:
  - Wing approvals → Item ready for pickup
  - Forwarded items → Waiting for admin decision
  - Rejected items → Item cannot be fulfilled

**Q: Can I undo my decision after submitting?**
A: No. But if needed, contact your admin to discuss alternatives.

---

## 📋 APPROVAL CHECKLIST

Before submitting, verify:

- [ ] I have reviewed all items in the request
- [ ] I checked wing stock status for each item
- [ ] I made a decision for EACH item (0 undecided)
- [ ] I entered my name correctly
- [ ] I added any necessary comments
- [ ] I reviewed the decision summary
- [ ] All decisions make sense for my wing
- [ ] Ready to submit

---

## 🎉 YOU'RE READY!

The per-item approval system makes it easy for you to:
- **Control** which items come from wing stock
- **Route** items intelligently based on availability
- **Decide** individually per item (not all-or-nothing)
- **Track** your decisions in audit trail
- **Help** requester get what they need faster

### Start Using It Now

1. Go to: http://localhost:8080/dashboard/approval-dashboard
2. Select a pending request
3. Make per-item decisions
4. Submit decisions
5. See approval in action!

---

**Questions?** Contact your system administrator.

**Feature Status**: ✅ Live & Ready  
**Last Updated**: December 13, 2025
