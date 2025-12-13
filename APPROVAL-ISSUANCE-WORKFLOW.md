# ✅ APPROVAL-TO-ISSUANCE WORKFLOW IMPLEMENTATION GUIDE

## Overview

This document describes the complete workflow for approving stock issuance requests and automatically assigning items to requesters while deducting from inventory.

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUEST SUBMITTED                                │
│  Requester submits a stock issuance request with items              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               STEP 1: SUPERVISOR APPROVES REQUEST                   │
│  POST /api/approval-workflow/approve-and-allocate                   │
│                                                                       │
│  Creates:                                                             │
│  - stock_issuance_transactions (main transaction record)            │
│  - stock_allocations (allocation to each item)                      │
│  - Updates request status to 'Approved'                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STEP 2: ADMIN ASSIGNS TO REQUESTER (Optional)            │
│  POST /api/approval-workflow/assign-to-requester                    │
│                                                                       │
│  - Links allocation to specific requester                           │
│  - Logs assignment in inventory_log                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               STEP 3: DEDUCT FROM INVENTORY                         │
│  POST /api/approval-workflow/deduct-from-inventory                  │
│                                                                       │
│  - Validates sufficient inventory exists                            │
│  - Deducts quantity from item_masters.quantity                      │
│  - Marks transaction as 'issued'                                    │
│  - Creates immutable inventory_log entry                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ITEM ASSIGNED TO REQUESTER                         │
│  Inventory deducted, allocation complete                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Tables

### 1. stock_issuance_transactions
Main transaction tracking table. One record per approval/issuance event.

```sql
CREATE TABLE dbo.stock_issuance_transactions (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    stock_issuance_request_id UNIQUEIDENTIFIER,      -- Link to request
    inventory_item_id UNIQUEIDENTIFIER,              -- Item being allocated
    requester_user_id NVARCHAR(450),                 -- Who requested
    transaction_type NVARCHAR(50),                   -- 'ALLOCATION', 'ISSUANCE'
    quantity INT,                                     -- Total quantity
    transaction_status NVARCHAR(30),                 -- 'pending', 'allocated', 'issued'
    approved_by_user_id NVARCHAR(450),               -- Approver
    approved_at DATETIME2,                           -- When approved
    approval_comments NVARCHAR(MAX),                 -- Approval notes
    inventory_deducted BIT,                          -- Whether deducted
    deducted_at DATETIME2,                           -- When deducted
    assigned_to_user_id NVARCHAR(450),               -- Assigned to
    assigned_at DATETIME2,                           -- When assigned
    created_at DATETIME2,
    updated_at DATETIME2
);
```

### 2. stock_allocations
Individual item allocations to requesters.

```sql
CREATE TABLE dbo.stock_allocations (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    transaction_id UNIQUEIDENTIFIER,                 -- Link to transaction
    inventory_item_id UNIQUEIDENTIFIER,              -- Item allocated
    requester_user_id NVARCHAR(450),                 -- Recipient
    allocated_quantity INT,                          -- How many units
    allocation_status NVARCHAR(30),                  -- 'allocated', 'issued', 'returned'
    issued_at DATETIME2,                             -- When issued
    issued_quantity INT,                             -- How many issued
    returned_at DATETIME2,                           -- When returned
    returned_quantity INT,                           -- How many returned
    serial_numbers NVARCHAR(MAX),                    -- JSON array of serial numbers
    created_at DATETIME2,
    updated_at DATETIME2
);
```

### 3. inventory_log
Immutable audit log of ALL inventory changes.

```sql
CREATE TABLE dbo.inventory_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventory_item_id UNIQUEIDENTIFIER,
    item_code NVARCHAR(100),
    item_name NVARCHAR(500),
    log_type NVARCHAR(50),                           -- 'ISSUANCE', 'RETURN', 'DEDUCTION'
    quantity_before INT,                             -- Quantity before change
    quantity_after INT,                              -- Quantity after change
    quantity_changed INT,                            -- Delta (can be negative)
    user_id NVARCHAR(450),                           -- Who made the change
    user_name NVARCHAR(255),
    reference_type NVARCHAR(50),                     -- 'REQUEST', 'ALLOCATION'
    reference_id UNIQUEIDENTIFIER,
    description NVARCHAR(MAX),
    logged_at DATETIME2 DEFAULT GETDATE()            -- Immutable timestamp
);
```

## API Endpoints

### 1. Approve & Allocate
**POST /api/approval-workflow/approve-and-allocate**

Creates transaction and allocation records for an approved request.

```javascript
Request Body:
{
  "requestId": "uuid",
  "approverId": "user-id",
  "approverName": "John Supervisor",
  "approvalComments": "Approved, ready for issuance",
  "allocations": [
    {
      "itemId": "uuid",
      "quantity": 10,
      "inventoryItemId": "uuid"
    }
  ]
}

Response:
{
  "success": true,
  "message": "Request approved and allocated successfully",
  "transaction_id": "uuid"
}
```

**When to call**: After supervisor approves the request

---

### 2. Assign to Requester
**POST /api/approval-workflow/assign-to-requester**

Links allocated items to the specific requester.

```javascript
Request Body:
{
  "transactionId": "uuid",
  "requesterId": "user-id",
  "requesterName": "Ahmed Ali",
  "allocatedQuantity": 10,
  "assignedBy": "admin-id",
  "assignedByName": "Admin User",
  "notes": "Assigned from Wing A stock"
}

Response:
{
  "success": true,
  "message": "Items assigned successfully",
  "allocation_id": "uuid"
}
```

**When to call**: Before deducting inventory (optional but recommended)

---

### 3. Deduct from Inventory
**POST /api/approval-workflow/deduct-from-inventory**

Deducts the approved quantity from total inventory. **CRITICAL**: This actually reduces the item_masters.quantity value.

```javascript
Request Body:
{
  "transactionId": "uuid",
  "inventoryItemId": "uuid",
  "quantityToDeduct": 10,
  "deductedBy": "admin-id",
  "deductedByName": "Inventory Manager",
  "notes": "Deducted for approved issuance request XYZ"
}

Response:
{
  "success": true,
  "message": "Inventory deducted successfully",
  "new_quantity": 190,
  "deducted": 10
}
```

**When to call**: After assignment is confirmed. This is the final step that reduces inventory.

---

### 4. Get Transactions
**GET /api/approval-workflow/transactions/:requestId**

Retrieve all transactions for a request.

```javascript
Response:
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "ALLOCATION",
      "quantity": 10,
      "transaction_status": "issued",
      "approved_by_name": "John Supervisor",
      "approved_at": "2025-12-13T10:30:00Z",
      "assigned_to_name": "Ahmed Ali",
      "assigned_at": "2025-12-13T11:00:00Z",
      "inventory_deducted": true,
      "deducted_at": "2025-12-13T11:15:00Z"
    }
  ]
}
```

---

### 5. Get Allocations
**GET /api/approval-workflow/allocations/:transactionId**

Retrieve all allocations for a transaction.

```javascript
Response:
{
  "success": true,
  "allocations": [
    {
      "id": "uuid",
      "inventory_item_id": "uuid",
      "requester_name": "Ahmed Ali",
      "allocated_quantity": 10,
      "allocation_status": "issued",
      "item_code": "ITEM-001",
      "nomenclature": "Office Chair",
      "issued_at": "2025-12-13T11:15:00Z"
    }
  ]
}
```

---

### 6. Get Inventory Log
**GET /api/approval-workflow/inventory-log/:itemId**

Get complete audit trail for an inventory item.

```javascript
Query Parameters:
- limit: number (default 50)

Response:
{
  "success": true,
  "log": [
    {
      "id": 1,
      "log_type": "DEDUCTION",
      "quantity_before": 200,
      "quantity_after": 190,
      "quantity_changed": -10,
      "user_name": "Inventory Manager",
      "reference_type": "REQUEST",
      "description": "Deducted 10 units for request ABC123",
      "logged_at": "2025-12-13T11:15:00Z"
    }
  ]
}
```

---

## Frontend Implementation

### In Approval Dashboard
When supervisor clicks "Approve":

```typescript
// 1. Call approve-and-allocate
const approveResponse = await fetch(
  'http://localhost:3001/api/approval-workflow/approve-and-allocate',
  {
    method: 'POST',
    body: JSON.stringify({
      requestId: request.id,
      approverId: currentUser.user_id,
      approverName: currentUser.user_name,
      approvalComments: "Approved",
      allocations: request.items.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        inventoryItemId: item.inventory_item_id
      }))
    })
  }
);

// Show success message and update UI
if (approveResponse.success) {
  showNotification('Request approved successfully');
  refreshRequestList();
}
```

### In Admin Issuance Dashboard
When admin assigns/deducts:

```typescript
// 1. Assign to requester (optional)
await fetch(
  'http://localhost:3001/api/approval-workflow/assign-to-requester',
  {
    method: 'POST',
    body: JSON.stringify({
      transactionId,
      requesterId: request.requester_id,
      requesterName: request.requester_name,
      allocatedQuantity: approved_quantity,
      assignedBy: currentUser.user_id,
      assignedByName: currentUser.user_name
    })
  }
);

// 2. Deduct from inventory (final step)
const deductResponse = await fetch(
  'http://localhost:3001/api/approval-workflow/deduct-from-inventory',
  {
    method: 'POST',
    body: JSON.stringify({
      transactionId,
      inventoryItemId: item.id,
      quantityToDeduct: approved_quantity,
      deductedBy: currentUser.user_id,
      deductedByName: currentUser.user_name,
      notes: "Items issued to requester"
    })
  }
);

if (deductResponse.success) {
  showNotification(`Inventory deducted. New quantity: ${deductResponse.new_quantity}`);
  refreshInventory();
}
```

---

## Key Features

✅ **Complete Audit Trail**: Every change logged in inventory_log table
✅ **Transactional**: All changes use SQL Server transactions (rollback on error)
✅ **Validation**: Checks for sufficient inventory before deducting
✅ **Status Tracking**: Tracks each step (allocated → issued → returned)
✅ **Allocation Support**: Handles multiple items per request
✅ **Flexible**: Can be called step-by-step or skipped if needed
✅ **Error Handling**: Proper error messages for insufficient inventory

---

## Deployment Steps

1. **Run SQL script**: `setup-approval-issuance-workflow.sql`
   ```sql
   -- Creates tables and stored procedures
   ```

2. **Add endpoints to backend**: Copy code from `APPROVAL-WORKFLOW-ENDPOINTS.cjs` to `backend-server.cjs`

3. **Test endpoints**:
   ```bash
   # Test approval & allocate
   curl -X POST http://localhost:3001/api/approval-workflow/approve-and-allocate \
     -H "Content-Type: application/json" \
     -d '{ "requestId": "...", "approverId": "...", ... }'
   
   # Test inventory deduction
   curl -X POST http://localhost:3001/api/approval-workflow/deduct-from-inventory \
     -H "Content-Type: application/json" \
     -d '{ "transactionId": "...", "inventoryItemId": "...", ... }'
   ```

4. **Build frontend**: `npm run build`

5. **Deploy**: Push changes to GitHub

---

## Troubleshooting

### Error: "Insufficient inventory"
- Check if inventory_deducted is already true for this transaction
- Verify item_masters.quantity is up to date
- Check inventory_log for recent deductions

### Error: "Request not found"
- Verify requestId is a valid UUID
- Check stock_issuance_requests table has the record

### Transaction rollback
- Check backend console for detailed error message
- Review inventory_log to see what failed
- Verify all foreign key references exist

### Inventory discrepancies
- Query inventory_log to see all changes
- Sum all quantity_changed values for an item
- Compare against current item_masters.quantity

---

## Monitoring & Reporting

### Check transaction status
```sql
SELECT id, transaction_type, transaction_status, inventory_deducted, created_at
FROM stock_issuance_transactions
WHERE created_at > DATEADD(HOUR, -24, GETDATE())
ORDER BY created_at DESC;
```

### Audit inventory changes
```sql
SELECT id, item_name, log_type, quantity_before, quantity_after, user_name, logged_at
FROM inventory_log
WHERE logged_at > DATEADD(DAY, -7, GETDATE())
ORDER BY logged_at DESC;
```

### Pending allocations
```sql
SELECT sa.id, sa.requester_name, sa.allocated_quantity, sit.item_name
FROM stock_allocations sa
JOIN stock_issuance_transactions sit ON sa.transaction_id = sit.id
WHERE sa.allocation_status = 'allocated'
ORDER BY sa.created_at ASC;
```

---

## Next Steps

1. ✅ Run SQL script to create tables
2. ✅ Add endpoints to backend  
3. ✅ Build and test
4. ✅ Integrate into approval dashboard UI
5. ✅ Deploy to production

Questions? Check the logs in backend console for detailed traces.
