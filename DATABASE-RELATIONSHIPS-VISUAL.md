# IMS Database Relationship Diagram & Mapping

**Date:** December 27, 2025

---

## TABLE RELATIONSHIPS VISUAL MAP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MASTER DATA LAYER                               │
│                  (Reference/Lookup Tables)                             │
└─────────────────────────────────────────────────────────────────────────┘

    tblOffices                 WingsInformation              DEC_MST
    ──────────                 ────────────────              ───────
    OfficeCode        ID       intAutoID
    strOfficeName     Name     DECName
    intWingID ────────┘        WingID ───→ (to WingsInformation)
    IS_ACT                     HODID
                               IS_ACT

                              AspNetUsers
                              ────────────
                              Id (GUID)
                              UserName
                              Email
                              Role
                              intOfficeID
                              intWingID
                              (Referenced everywhere for created_by, approver_id)


    categories                          sub_categories
    ──────────                          ───────────────
    id ──────────────┐                  id
    category_name    │      category_id ←─ category_id
    description      └─────────→        sub_category_name
    status

    ItemMaster
    ──────────
    item_id
    item_code (UNIQUE)
    item_name
    category_id ────→ (to categories)
    sub_category_id ────→ (to sub_categories)
    unit_of_measure
    specifications
    is_deleted

    vendors
    ───────
    id (GUID)
    vendor_code
    vendor_name
    email
    status


┌─────────────────────────────────────────────────────────────────────────┐
│              PROCUREMENT REQUEST WORKFLOW LAYER                        │
│                  (Request → Approval → Award)                          │
└─────────────────────────────────────────────────────────────────────────┘

ProcurementRequests (Main Request Container)
├─ request_id (PK)
├─ request_code (UNIQUE)
├─ request_title
├─ dec_id ─────────────→ DEC_MST
├─ requested_by ───────→ AspNetUsers
├─ status: "Draft" → "Submitted" → "Approved" → "Tendering" → "Awarded"
└─ created_at, created_by

    ↓ One-to-Many

RequestItems (Line Items in Request)
├─ request_item_id (PK)
├─ request_id (FK) ────→ ProcurementRequests
├─ item_id (FK) ───────→ ItemMaster
├─ quantity_requested
├─ specifications
└─ created_at

    ↓ During Approval Process

ApprovalWorkflow (Hierarchical Approval Chain)
├─ approval_id (PK, auto-increment)
├─ request_id (FK) ────→ ProcurementRequests
├─ approval_level: 1 (DEC_HOD) → 2 (Wings_Incharge) → 3 (Director)
├─ approver_role
├─ approver_id ────────→ AspNetUsers
├─ status: "PENDING" → "APPROVED" → "REJECTED" / "FORWARDED"
└─ created_at, approved_at

    ↓ If Approved

tenders (Procurement Tender Document)
├─ id (GUID)
├─ reference_number (UNIQUE)
├─ title
├─ tender_type: "Open", "Limited", "Single"
├─ estimated_value
├─ status: "Draft" → "Published" → "Closed" → "Evaluated"
└─ created_at, created_by

    ↓ One-to-Many

tender_items (Items in Tender)
├─ id (GUID)
├─ tender_id (FK) ────→ tenders
├─ item_master_id (FK) ─→ ItemMaster
├─ quantity
├─ estimated_unit_price
└─ specifications

    ↓ After Bid Evaluation

TenderAwards (Winning Bid / Contract)
├─ award_id (PK, auto-increment)
├─ award_code (UNIQUE)
├─ request_id (FK) ────→ ProcurementRequests
├─ vendor_id (FK) ─────→ vendors
├─ award_date
├─ expected_delivery_date
├─ total_contract_amount
├─ contract_number
├─ status: "Active" → "Delivery" → "Completed"
└─ created_at, created_by

    ↓ One-to-Many

AwardItems (Items in Award)
├─ award_item_id (PK, auto-increment)
├─ award_id (FK) ──────→ TenderAwards
├─ item_id (FK) ───────→ ItemMaster
├─ quantity_awarded
├─ unit_price
├─ total_price
└─ warranty_months, brand, model


┌─────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY & RECEIPT LAYER                            │
│              (Items Coming In to Inventory)                            │
└─────────────────────────────────────────────────────────────────────────┘

Deliveries (Delivery Document)
├─ delivery_id (PK, auto-increment)
├─ award_id (FK) ──────→ TenderAwards
├─ delivery_code (UNIQUE)
├─ delivery_date
├─ delivery_note_number
├─ received_by ────────→ AspNetUsers
├─ status: "Pending" → "Received" → "Inspected" → "Accepted" / "Rejected"
├─ inspection_notes
├─ total_items_delivered
├─ total_items_accepted
└─ created_at

    ↓ One-to-Many

DeliveryItems (Line Items in Delivery)
├─ delivery_item_id (PK, auto-increment)
├─ delivery_id (FK) ───→ Deliveries
├─ award_item_id (FK) ─→ AwardItems
├─ quantity_delivered
├─ quantity_accepted
├─ quantity_rejected
└─ serial_numbers (if applicable)

    ↓ After Acceptance (IMPORTANT!)

StockTransactions (OUT→IN Transition)
├─ transaction_id (PK, auto-increment)
├─ item_id (FK) ───────→ ItemMaster
├─ transaction_type: "IN" (for received items)
├─ quantity_change
├─ quantity_before
├─ quantity_after
├─ reference_type: "DELIVERY"
├─ reference_id: Delivery ID
├─ transaction_date
├─ created_by ──────────→ AspNetUsers
└─ (immutable audit record)

    ↓ Updates

CurrentStock (Real-time Inventory)
├─ stock_id (PK, auto-increment)
├─ item_id (FK) ───────→ ItemMaster
├─ current_quantity ◄─── (increased by delivery IN)
├─ minimum_level
├─ maximum_level
└─ last_updated, updated_by


┌─────────────────────────────────────────────────────────────────────────┐
│              STOCK ISSUANCE WORKFLOW LAYER                             │
│            (Items Going Out to Users/Departments)                      │
└─────────────────────────────────────────────────────────────────────────┘

stock_issuance_requests (Main Issuance Container)
├─ id (GUID)
├─ request_number (UNIQUE)
├─ request_type: "personal", "departmental", etc.
├─ requester_office_id (FK) ────────→ tblOffices
├─ requester_wing_id (FK) ──────────→ WingsInformation
├─ requester_user_id (FK) ──────────→ AspNetUsers
├─ purpose
├─ urgency_level: "Low", "Medium", "High", "Critical"
├─ is_returnable: true/false
├─ request_status: "Submitted" → "Pending" → "Approved" → "Issued"
├─ expected_return_date
└─ submitted_at, created_at, updated_at

    ↓ One-to-Many

stock_issuance_items (Line Items in Issuance)
├─ id (GUID)
├─ request_id (FK) ────────────────→ stock_issuance_requests
├─ item_master_id (FK) ────────────→ ItemMaster
├─ nomenclature
├─ requested_quantity
├─ unit_price
├─ item_type: "standard", "custom"
└─ custom_item_name (if custom)

    ↓ Optional Approval Path

ApprovalWorkflow / approval_items
└─ (If approval required for issuance)

    ↓ After Approval/Issuance

StockTransactions (Debit from Inventory)
├─ transaction_id (PK)
├─ item_id (FK) ────────────────────→ ItemMaster
├─ transaction_type: "OUT"
├─ quantity_change: negative (amount issued)
├─ reference_type: "ISSUANCE"
├─ reference_id: stock_issuance_items.id
├─ transaction_date: when issued
└─ created_by ────────────────────→ AspNetUsers

    ↓ Updates

CurrentStock (Real-time Inventory)
├─ stock_id (PK)
├─ item_id (FK)
└─ current_quantity ◄─── (decreased by issuance OUT)


┌─────────────────────────────────────────────────────────────────────────┐
│              STOCK RETURN WORKFLOW LAYER                               │
│          (Items Coming Back to Inventory)                              │
└─────────────────────────────────────────────────────────────────────────┘

stock_returns (Return Container)
├─ id (PK, auto-increment)
├─ return_date
├─ returned_by ────────────────────→ AspNetUsers
├─ verified_by ────────────────────→ AspNetUsers (optional)
├─ return_notes
├─ return_status: "Pending" → "Verified" → "Processed"
└─ created_at

    ↓ One-to-Many

stock_return_items (Line Items in Return)
├─ id (PK, auto-increment)
├─ return_id (FK) ──────────────────→ stock_returns
├─ issued_item_id: reference to original issuance
├─ nomenclature
├─ return_quantity
├─ condition_on_return: "Good", "Damaged", "Partial"
├─ damage_description
└─ created_at

    ↓ After Return Verified

StockTransactions (Credit Back to Inventory)
├─ transaction_type: "RETURN"
├─ quantity_change: positive (amount returned)
├─ reference_type: "RETURN"
├─ reference_id: stock_returns.id
└─ (audit trail)

    ↓ Updates

CurrentStock (Replenish Inventory)
└─ current_quantity ◄─── (increased by return IN)


┌─────────────────────────────────────────────────────────────────────────┐
│              STOCK MONITORING & AUTOMATION LAYER                       │
│           (Triggers and Alerts for Low Stock)                          │
└─────────────────────────────────────────────────────────────────────────┘

CurrentStock (Monitoring)
└─ current_quantity vs minimum_level check

    ↓ If current_quantity < minimum_level:

reorder_requests (Auto-generated)
├─ id (GUID)
├─ item_master_id (FK) ────────────→ ItemMaster
├─ office_id (FK) ──────────────────→ tblOffices
├─ current_stock
├─ minimum_level
├─ reorder_level
├─ suggested_quantity (system-calculated)
├─ actual_quantity (when ordered)
├─ priority: "Low", "Medium", "High"
├─ status: "Pending" → "Ordered" → "Received"
├─ requested_by ────────────────────→ AspNetUsers
└─ created_at, updated_at

    ↓ Triggers

ProcurementRequests (Flow Back to Step 1)
└─ New procurement request created based on reorder


┌─────────────────────────────────────────────────────────────────────────┐
│                   CROSS-CUTTING CONCERNS                              │
│                  (Used by All Processes)                              │
└─────────────────────────────────────────────────────────────────────────┘

ApprovalWorkflow (Central Approval Engine)
├─ Used by:
│  ├─ ProcurementRequests approval
│  ├─ Tender approval
│  ├─ Stock issuance approval (optional)
│  └─ Any other approval need
├─ Features:
│  ├─ Hierarchical levels (1, 2, 3...)
│  ├─ Role-based routing (DEC_HOD, Wings_Incharge, Director)
│  ├─ Status tracking (PENDING, APPROVED, REJECTED, FORWARDED)
│  └─ Comments and audit trail
└─ All approvals reference AspNetUsers for approver_id

StockTransactions (Universal Audit Trail)
├─ Used by:
│  ├─ Delivery receipts (IN)
│  ├─ Stock issuance (OUT)
│  ├─ Returns (IN/RETURN)
│  ├─ Transfers (TRANSFER)
│  └─ Inventory adjustments (ADJUSTMENT)
├─ Never deleted (only soft deleted)
├─ Immutable record
└─ Complete quantity history (before/after)

CurrentStock (Real-time Inventory Status)
├─ Updated by all transactions
├─ Used by dashboard for visibility
├─ Checked for reorder triggers
├─ Validated against minimum/maximum levels
└─ Single source of truth for quantities
```

---

## Data Input/Output Matrix

### What Goes In (POST/CREATE)

| Endpoint | Input Table | Created Records |
|----------|------------|-----------------|
| Submit Procurement Request | ProcurementRequests | 1 header + N items |
| Add Items to Request | RequestItems | N records |
| Submit for Approval | ApprovalWorkflow | M approval levels |
| Award Tender | TenderAwards | 1 header + N award items |
| Receive Delivery | Deliveries | 1 header + N delivery items |
| Accept Delivery | StockTransactions + CurrentStock | 1 + N records |
| Issue Stock | stock_issuance_requests | 1 header + N items |
| Return Stock | stock_returns | 1 header + N items |

### What Comes Out (GET/READ)

| Endpoint | Queries From | Returns |
|----------|------------|---------|
| View Requests | ProcurementRequests + JOINs | List with details |
| View Items | RequestItems + ItemMaster | Enriched items list |
| Check Approvals | ApprovalWorkflow | Status at each level |
| View Awards | TenderAwards + JOINs | Awarded contracts |
| View Deliveries | Deliveries + JOINs | Delivery status |
| Check Stock | CurrentStock + ItemMaster | Inventory levels |
| View History | StockTransactions | Complete audit log |

---

## Key Insights

### Immutable Records
These should NEVER be deleted, only marked as soft-deleted:
- StockTransactions (complete audit trail)
- ApprovalWorkflow (approval history)
- All financial records (deliveries, awards)

### Real-time vs Historical
- **Real-time:** CurrentStock (latest quantities)
- **Historical:** StockTransactions (complete history)

### Hierarchy Routing
Approvals flow through organizational hierarchy:
- DEC → Wing → Director
- Each level pulls approver from AspNetUsers based on role
- Records reference organizational structure (DEC_MST, WingsInformation)

### Inventory Math
```
Current Stock = Base + All INs - All OUTs

INs: Deliveries, Returns, Adjustments
OUTs: Issuances, Transfers, Losses

Audit trail: Every change logged in StockTransactions
```

---

## Important Notes for Development

1. **Every INSERT/UPDATE should create:**
   - created_at / updated_at timestamps
   - created_by / updated_by user references

2. **Stock changes must update:**
   - StockTransactions (detailed log)
   - CurrentStock (summary level)
   - Both in same transaction (ACID compliance)

3. **Approvals are sequential:**
   - Cannot skip levels
   - Each level requires specific role
   - Rejection stops the process

4. **Foreign keys should be enabled:**
   - Currently some may be NOCHECK
   - Should verify data integrity
   - Enable constraints after cleanup

---

**End of Diagram Document**
