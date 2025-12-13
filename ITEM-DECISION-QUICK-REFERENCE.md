# 📋 QUICK REFERENCE - ITEM DECISIONS

**One-page guide for quick lookup**

---

## 🎯 THE 3 DECISIONS

### 1️⃣ APPROVE FROM WING ✅

```
WHEN TO USE:
- Item is in wing inventory
- You want to give it right away
- Requester can pick up today

WHAT HAPPENS:
- Item deducted from wing storage
- Allocated to requester immediately
- Requester notified to come pick up

INVENTORY CHANGE:
- Wing: DECREASES (100 → 50)
- Admin: NO CHANGE
- Requester: GETS ITEM

TIME TO RECEIVE:
- 1-2 hours (immediate)

ENABLED WHEN:
- Stock available ✓

RESULT:
✓ Item given immediately from wing
```

---

### 2️⃣ FORWARD TO ADMIN ⏭️

```
WHEN TO USE:
- Item NOT in wing inventory
- Admin warehouse might have it
- You can't give it right now

WHAT HAPPENS:
- Request forwarded to admin supervisor
- Admin checks their warehouse
- Admin will approve or reject later

INVENTORY CHANGE (NOW):
- Wing: NO CHANGE
- Admin: NO CHANGE (waiting)
- Requester: WAITING

TIME TO RECEIVE:
- 1-2 days (depends on admin)

ENABLED WHEN:
- Always (even if wing has stock!)

RESULT:
⏳ Item forwarded to admin for decision
```

---

### 3️⃣ REJECT ❌

```
WHEN TO USE:
- Item not needed
- Requester has surplus already
- Supervisor policy doesn't allow it

WHAT HAPPENS:
- Item marked as rejected
- Nothing deducted or allocated
- Requester doesn't get item

INVENTORY CHANGE:
- Wing: NO CHANGE
- Admin: NO CHANGE
- Requester: GETS NOTHING

TIME TO RECEIVE:
- Never (rejected)

ENABLED WHEN:
- Always

RESULT:
✗ Item not allocated
```

---

## 📊 DECISION MATRIX

```
┌─────────────────┬──────────┬──────────┬─────────┬──────────────┐
│ QUESTION        │ APPROVE  │ FORWARD  │ REJECT  │ WHEN ENABLED │
│                 │ WING     │ ADMIN    │         │              │
├─────────────────┼──────────┼──────────┼─────────┼──────────────┤
│ Get it today?   │ YES ✓    │ NO       │ NO      │ Stock=Yes    │
│ Give right now? │ YES ✓    │ NO       │ NO      │ Stock=Yes    │
│ Deduct stock?   │ YES ✓    │ NO       │ NO      │ Stock=Yes    │
│ Need stock?     │ YES ✓    │ NO       │ NO      │ Stock=Yes    │
│ Allocate item?  │ YES ✓    │ NO       │ NO      │ Stock=Yes    │
│ Forward to adm? │ NO       │ YES ⏭    │ NO      │ Always       │
│ Admin decides?  │ NO       │ YES ⏭    │ NO      │ Always       │
│ Reject item?    │ NO       │ NO       │ YES ✗   │ Always       │
│ Lose inventory? │ YES ↓    │ NO       │ NO      │ Stock=Yes    │
└─────────────────┴──────────┴──────────┴─────────┴──────────────┘
```

---

## 🔍 HOW TO CHOOSE

```
START HERE:
│
▼
Is item in wing inventory?
│
├─ YES (Stock available)
│  │
│  ▼
│  Should we give it from wing?
│  │
│  ├─ YES → Click ✓ APPROVE FROM WING
│  └─ NO  → Click ⏭ FORWARD TO ADMIN
│           (or ❌ REJECT if not needed)
│
└─ NO (No stock)
   │
   ▼
   Click ⏭ FORWARD TO ADMIN
   (admin will check their warehouse)
   
   OR
   
   Click ❌ REJECT
   (if you don't want to forward)
```

---

## 📱 WHAT REQUESTER SEES

### IF YOU APPROVE WING ✓

```
Email Subject: ✅ Your Item is Ready

Content:
"Your item is ready for pickup!

Item: Surgical Masks
Quantity: 100 units
Location: Wing Store
Ready: Today
Pickup Time: Any time today

Come to wing store to collect."
```

### IF YOU FORWARD TO ADMIN ⏭

```
Email Subject: ⏳ Waiting for Approval

Content:
"Your item is waiting for admin approval.

Item: Surgical Masks
Quantity: 100 units
Status: Forwarded to admin
Next: Admin supervisor will check warehouse
Timeline: 1-2 days

We'll notify you when admin decides."
```

### IF YOU REJECT ❌

```
Email Subject: ❌ Item Rejected

Content:
"Your item request was rejected.

Item: Surgical Masks
Quantity: 100 units
Reason: Not needed / Already have surplus

This item will not be allocated.

Contact supervisor if you have questions."
```

---

## 🛠️ DECISION FLOW

```
STEP 1: LOOK AT ITEM
┌──────────────────────────────┐
│ Item: Surgical Masks         │
│ Qty: 100 units              │
│ Wing Stock: 150 units ✓      │
└──────────────────────────────┘

STEP 2: DECIDE
┌──────────────────────────────┐
│ Option 1: ✓ Approve Wing     │
│ → Give from wing now         │
│ → Requester gets today       │
│                              │
│ Option 2: ⏭ Forward Admin    │
│ → Check admin warehouse      │
│ → Requester gets later       │
│                              │
│ Option 3: ❌ Reject          │
│ → Don't give item            │
│ → Requester gets nothing     │
└──────────────────────────────┘

STEP 3: CLICK CHOSEN OPTION
○ ✓ Approve Wing ← SELECTED
○ ⏭ Forward Admin
○ ❌ Reject

STEP 4: REPEAT FOR OTHER ITEMS
(Same process for each item)

STEP 5: SUBMIT
All items decided? ✓ YES
Click "Submit Decisions"

STEP 6: BACKEND PROCESSES
Each decision executed independently
Requester notified
Done! ✓
```

---

## ⚡ QUICK TIPS

✓ **APPROVE WING** = Fastest, deducts wing stock right now
⏭ **FORWARD ADMIN** = Slower, admin checks warehouse  
❌ **REJECT** = Item not given, no deduction

**Stock Check**:
- Wing has 150 → Can approve from wing ✓
- Wing has 0 → Can't approve from wing ❌

**Mixed Decisions**:
- Item 1: Approve Wing ✓
- Item 2: Forward Admin ⏭
- Item 3: Reject ❌
- All in ONE request! ✓

**Can't Submit Until**:
- All items have decisions ✓
- No undecided items ✓

**If You Change Mind**:
- Click different option for that item
- Summary updates in real-time
- Can click "Clear Selection" to reset

---

## 🎓 REMEMBER

1. **Each item is independent** - Different decisions for each
2. **Only 3 choices** - Approve Wing / Forward Admin / Reject
3. **Approve Wing only works if stock exists** - Otherwise button disabled
4. **Forward/Reject always work** - No restrictions
5. **Must decide ALL items** - Can't submit with undecided items
6. **Mix and match** - Can use different decisions in same request
7. **Summary shows count** - See how many of each type
8. **Backend handles it** - Frontend records, backend executes

---

## 📞 NEED HELP?

- **Full explanation**: See ITEM-DECISION-EXPLANATION.md
- **System design**: See PER-ITEM-APPROVAL-SYSTEM.md  
- **Supervisor guide**: See WING-APPROVAL-QUICK-START.md
- **Workflow diagrams**: See APPROVAL-WORKFLOW-DIAGRAMS.md

---

**Created**: December 13, 2025  
**Status**: ✅ COMPLETE  
**Length**: One page reference
