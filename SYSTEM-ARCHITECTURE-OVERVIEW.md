# IMS System Architecture - Complete Backend Overview

**Created:** December 27, 2025  
**Database Status:** ✅ Cleaned and Ready for Testing  
**Version:** 1.0

---

## Executive Summary

This document maps the entire backend system, showing how each table is used, what business processes flow through them, and how the frontend and backend interact.

### Database Status
- **Database:** `InvMISDB` (SQL Server)
- **Current Test Data:** ✅ CLEARED (All procurement requests, items, approvals, and transactions deleted)
- **Ready for Testing:** ✅ YES

---

## Part 1: Data Architecture & Table Usage

### Core Data Flows by Business Process

---

## 1. PROCUREMENT REQUEST WORKFLOW
*(Most developed flow in current system)*

```
┌─────────────────────────────────────────────────────────────────┐
│                   PROCUREMENT FLOW OVERVIEW                      │
└─────────────────────────────────────────────────────────────────┘

START: DEC Creates Procurement Request
  ↓
[ProcurementRequests Table]
  - request_code: REQ-2025-001
  - request_title: Office Supplies for Finance
  - dec_id: Reference to DEC_MST
  - status: "Draft"
  ↓
Add Items to Request
  ↓
[RequestItems Table] (Multiple entries)
  - request_id: FK to ProcurementRequests
  - item_id: FK to ItemMaster
  - quantity_requested: 100 units
  ↓
Submit for Approval
  ↓
[ApprovalWorkflow Table]
  - request_id: FK to ProcurementRequests
  - approver_role: "DEC_HOD" → Level 1
  - status: "PENDING"
  ↓
HOD Approves → Forwarded to next level
  ↓
[ApprovalWorkflow] Level 2
  - approver_role: "Wings_Incharge"
  - status: "PENDING"
  ↓
All approvers sign off
  ↓
Status Update
  ↓
[ProcurementRequests]
  - status: "Approved"
  ↓
Create Tender (Optional)
  ↓
[tenders] Table
  - reference_number: TENDER-2025-001
  - tender_type: "Open" or "Limited"
  ↓
Receive Bids → Evaluate → Award
  ↓
[TenderAwards]
  - award_code: AWARD-2025-001
  - vendor_id: Selected vendor
  - total_contract_amount: Final price
  ↓
Vendor Delivers Items
  ↓
[Deliveries]
  - delivery_code: DEL-2025-001
  - delivery_date: When received
  ↓
[DeliveryItems] (Line items)
  ↓
Accept/Inspect/Verify
  ↓
[StockTransactions] (IN)
  - transaction_type: "IN"
  ↓
[CurrentStock] Updated
  - current_quantity: Increased

END: Items in inventory
```

---

### Tables Used in Procurement Flow

| Table | Role | When Used | Key Fields |
|-------|------|-----------|-----------|
| **ProcurementRequests** | Request container | User creates request | request_code, dec_id, status |
| **RequestItems** | Line items | For each item needed | request_id, item_id, quantity_requested |
| **ApprovalWorkflow** | Approval tracking | During approval phase | approval_level, approver_role, status |
| **tenders** | Procurement document | After approval | tender_type, estimated_value, status |
| **tender_items** | Tender line items | In tender | tender_id, item_master_id, quantity |
| **TenderAwards** | Winning bid | After evaluation | award_code, vendor_id, final_amount |
| **AwardItems** | Award details | Per item | award_id, item_id, unit_price |
| **Deliveries** | Receipt document | When supplier delivers | delivery_code, delivery_date, status |
| **DeliveryItems** | Receipt details | Per item delivered | delivery_id, award_item_id, quantity_delivered |
| **StockTransactions** | Audit trail | After each transaction | transaction_type, quantity_change, reference_id |
| **CurrentStock** | Inventory levels | Always updated | item_id, current_quantity, minimum_level |

---

## 2. STOCK ISSUANCE WORKFLOW
*(Under Development)*

```
Expected Flow:

User Requests Items
  ↓
[stock_issuance_requests] - NOT YET CREATED
  - request_number: REQ-2025-STOCK-001
  - requester_office_id: Requesting office
  - requester_user_id: Who requested
  ↓
Add items to request
  ↓
[stock_issuance_items] - NOT YET CREATED
  - request_id: FK to stock_issuance_requests
  - item_master_id: Which item
  - requested_quantity: How many
  ↓
Optional: Forward for approval
  ↓
[ApprovalWorkflow] or [approval_items]
  ↓
Approve/Issue
  ↓
[StockTransactions] (OUT)
  - transaction_type: "OUT"
  - reference_type: "ISSUANCE"
  ↓
[CurrentStock] Updated
  - current_quantity: Decreased
  ↓
User receives items
```

**Status:** Tables defined in backend (backend-server.cjs lines 863+) but may not be created in database yet.

---

## 3. STOCK RETURN WORKFLOW

```
User Returns Items
  ↓
[stock_returns] Table
  - return_date: Date of return
  - returned_by: User returning
  ↓
[stock_return_items] Table (Multiple)
  - return_id: FK to stock_returns
  - issued_item_id: Original item issued
  - return_quantity: Quantity returned
  - condition_on_return: Good/Damaged/Partial
  ↓
Verify Return
  ↓
[StockTransactions] (IN)
  - transaction_type: "RETURN"
  ↓
[CurrentStock] Updated
  - current_quantity: Restored
```

---

## 4. REORDER AUTOMATION

```
Stock Monitoring (Periodic)
  ↓
Check CurrentStock vs Minimum Level
  ↓
If current_quantity < minimum_level:
  ↓
[reorder_requests] Created
  - item_master_id: Item with low stock
  - current_stock: Current qty
  - minimum_level: Threshold
  - suggested_quantity: System-calculated
  - status: "Pending"
  ↓
Notification sent to procurement
  ↓
Create procurement request (see Step 1)
```

---

## Part 2: Master Data Tables & Dependencies

### Organizational Hierarchy

```
tblOffices (Physical Locations)
  ├── OfficeID/strOfficeCode
  ├── strOfficeName
  └── (Contains offices like "Islamabad HQ", "Karachi Branch")

WingsInformation (Department Structure)
  ├── Id (Wing ID)
  ├── Name (e.g., "Finance Wing")
  ├── OfficeID (Parent office)
  └── HODID (Head of Wing - ASP User ID)

DEC_MST (Executive Committees)
  ├── intAutoID (DEC ID)
  ├── WingID (Parent wing)
  ├── DECName (Department name)
  └── HODID (Head of DEC)
```

**Usage:** When users submit procurement or stock requests, they're tagged with their office/wing/DEC for routing and approval hierarchy.

### Item Hierarchy

```
ItemMaster (Core Item Database)
  ├── item_id (Primary key)
  ├── item_code (Unique SKU)
  ├── item_name
  ├── category_id ──→ categories
  │                      ├── category_name
  │                      └── description
  ├── sub_category_id ──→ sub_categories
  │                       ├── sub_category_name
  │                       └── category_id (Parent)
  └── specifications
      - unit_of_measure (Pieces, Liters, Meters, etc.)
      - is_active
      - is_deleted

Usage:
  - When creating procurement requests
  - When issuing stock
  - When receiving deliveries
  - When checking stock levels
```

### Vendor Management

```
vendors Table
  ├── id (uniqueidentifier)
  ├── vendor_code
  ├── vendor_name
  ├── contact_person
  ├── email
  ├── phone
  ├── address
  └── status

Used By:
  - tenders (vendor selection)
  - TenderAwards (vendor assignment)
  - Payment tracking
```

### User Management

```
AspNetUsers (Authentication & Identity)
  ├── Id (User ID - GUID)
  ├── UserName
  ├── Email
  ├── FullName
  ├── PhoneNumber
  ├── Role (e.g., "Admin", "HOD", "User", "Approver")
  ├── intOfficeID (Home office)
  ├── intWingID (Home wing)
  ├── ISACT (Active)
  ├── PasswordHash
  ├── LockoutEnd
  └── LastLoginDate

Used By:
  - ApprovalWorkflow (approver_id)
  - Stock requests (requester_user_id, created_by)
  - All audit trails
  - Permission checking
```

---

## Part 3: Backend API Endpoints & Table Mappings

### Stock Issuance Endpoints
```
POST   /api/stock-issuance/requests
       └─→ Creates record in stock_issuance_requests
           Inputs: request_number, requester_office_id, items[], approvals

POST   /api/stock-issuance/items
       └─→ Creates records in stock_issuance_items
           Inputs: request_id, item_master_id, requested_quantity

GET    /api/stock-issuance/requests
       └─→ Reads from stock_issuance_requests + JOIN stock_issuance_items

GET    /api/stock-issuance/items/:request_id
       └─→ Reads from stock_issuance_items

PUT    /api/stock-issuance/requests/:id
       └─→ Updates stock_issuance_requests status

DELETE /api/stock-issuance/requests/:id
       └─→ Soft delete from stock_issuance_requests
```

### Procurement Endpoints
```
POST   /api/procurement/requests
       └─→ Creates ProcurementRequests record

POST   /api/procurement/items
       └─→ Creates RequestItems records

GET    /api/procurement/requests
       └─→ Reads ProcurementRequests + JOINs

PUT    /api/approval/forward
       └─→ Updates ApprovalWorkflow status
       └─→ Creates next-level approval record
```

### Stock Management Endpoints
```
GET    /api/current-stock
       └─→ Reads CurrentStock

POST   /api/stock-transactions
       └─→ Creates StockTransactions record
       └─→ Updates CurrentStock

GET    /api/stock-transactions
       └─→ Reads StockTransactions (audit log)
```

### Delivery Endpoints
```
POST   /api/deliveries
       └─→ Creates Deliveries record

POST   /api/deliveries/:id/items
       └─→ Creates DeliveryItems records
       └─→ Updates AwardItems

PUT    /api/deliveries/:id/verify
       └─→ Updates Deliveries status
       └─→ Creates StockTransactions (IN)
       └─→ Updates CurrentStock
```

### Master Data Endpoints
```
GET    /api/items
       └─→ Reads ItemMaster

GET    /api/categories
       └─→ Reads categories

GET    /api/vendors
       └─→ Reads vendors

GET    /api/offices
       └─→ Reads tblOffices

GET    /api/wings
       └─→ Reads WingsInformation

GET    /api/decs
       └─→ Reads DEC_MST

GET    /api/users
       └─→ Reads AspNetUsers
```

---

## Part 4: Frontend Components & Their Data Sources

### Stock Issuance Personal Component
**File:** `src/pages/StockIssuancePersonal.tsx`

**What it Does:**
1. User fills form with request details
2. Selects items from dropdown
3. Enters quantities
4. Submits request

**Backend Calls:**
```
1. GET /api/items
   └─→ Populate item dropdown

2. POST /api/stock-issuance/requests
   └─→ Create request record
   └─→ Response: request_id

3. POST /api/stock-issuance/items
   └─→ Add items to request
   └─→ Input: request_id, items[]

4. (Optional) POST /api/approvals/forward
   └─→ Submit for approval workflow
```

**Database Updates:**
- INSERT into stock_issuance_requests
- INSERT into stock_issuance_items
- (Optional) INSERT into ApprovalWorkflow or approval_items

---

### Procurement Request Component
**File:** Unknown (similar pattern)

**Backend Calls:**
```
1. GET /api/decs
   └─→ Show requesting department

2. GET /api/items
   └─→ Item selection

3. POST /api/procurement/requests
   └─→ Create request

4. POST /api/procurement/items
   └─→ Add line items

5. POST /api/approvals/forward
   └─→ Route for approval
```

---

### Stock Status / Dashboard Component

**Backend Calls:**
```
1. GET /api/current-stock
   └─→ Show current inventory levels

2. GET /api/stock-transactions
   └─→ Show recent activity log

3. GET /api/reorder-requests
   └─→ Show items that need reordering
```

---

## Part 5: Key Business Logic Rules

### Rule 1: Approval Hierarchy
**Where:** ApprovalWorkflow table

```
Level 1: DEC Head of Department (approver_role = "DEC_HOD")
  ↓ If approved, status = "APPROVED", create Level 2
  ↓ If rejected, status = "REJECTED", stop

Level 2: Wing In-charge (approver_role = "Wings_Incharge")
  ↓ Similar logic

Level 3: Director (approver_role = "Director")
  ↓ Final approval

Status values: "PENDING", "APPROVED", "REJECTED", "FORWARDED"
```

### Rule 2: Stock Transactions
**Where:** StockTransactions table after each movement

```
transaction_type can be:
  - "IN" (Delivery received, returns processed)
  - "OUT" (Stock issued to user)
  - "TRANSFER" (Moving between offices)
  - "ADJUSTMENT" (Inventory correction)
  - "RETURN" (Items returned to inventory)

Each transaction:
  - Logs quantity_before and quantity_after
  - Records reason
  - Creates audit trail
  - Cannot be deleted (only soft delete)
```

### Rule 3: Stock Levels
**Where:** CurrentStock table

```
Minimum Level: Alert when stock falls below
Reorder Level: Automatically trigger reorder request
Maximum Level: Capacity constraint

If current_quantity < minimum_level:
  └─→ Create reorder_requests record
  └─→ Flag for procurement team
```

### Rule 4: Soft Deletes
**Tables with deletion support:**
- ItemMaster (is_deleted)
- stock_issuance_requests (likely has is_deleted)
- Categories (status field)
- Sub-categories (status field)

**Rule:** Never physically delete records, only mark as deleted/inactive to preserve audit trail

---

## Part 6: Database Reset Scripts

### For Testing: Clear All Test Data
```sql
Location: reset-database-for-testing.sql

Clears:
- ProcurementRequests (and dependent RequestItems)
- ApprovalWorkflow
- StockTransactions
- CurrentStock

What it keeps:
- Master data (ItemMaster, categories, vendors, users, etc.)
- Structure/schema intact

Usage:
  sqlcmd -S localhost -d InvMISDB -i reset-database-for-testing.sql
```

---

## Part 7: Current Development Status

### ✅ COMPLETE & WORKING
- Procurement request workflow
- Approval system (hierarchical)
- Item master and categories
- Stock transactions logging
- Current stock tracking
- Delivery workflow
- Vendor management

### 🔄 IN DEVELOPMENT / NEEDS SETUP
- Stock issuance tables (backend defined, DB tables may not exist)
- Approval items linking (for multi-item approvals)
- Stock return process (UI may not be complete)
- Reorder automation (logic defined, automation not active)

### ⚠️ NEEDS TESTING
- Complete stock issuance flow (end-to-end)
- Cross-wing approvals
- Delivery acceptance verification
- Stock return workflow

---

## Part 8: Known Issues & To-Do Items

1. **Naming Inconsistency**
   - Some tables use snake_case (stock_transactions, stock_issuance_requests)
   - Others use camelCase (ItemMaster, ApprovalWorkflow)
   - Should standardize on one convention

2. **Stock Issuance Tables**
   - Backend expects: stock_issuance_requests, stock_issuance_items
   - Need to verify these exist in database
   - May need to create them if missing

3. **Approval Items Table**
   - Backend code references approval_items table
   - May need to create and populate properly

4. **Audit Trail**
   - Missing created_by/updated_by in some tables
   - Should add user tracking to all major tables

5. **Foreign Key Constraints**
   - Some may be disabled (NOCHECK)
   - Should verify integrity after updates

---

## Part 9: Data Dictionary Quick Reference

### Status Values

**Request Status:**
- Submitted
- Pending
- Approved
- Rejected
- Issued
- Completed

**Approval Status:**
- PENDING
- APPROVED
- REJECTED
- FORWARDED

**Delivery Status:**
- Pending
- Received
- Inspected
- Accepted
- Rejected
- Completed

**Item Status:**
- Active
- Inactive
- Discontinued

---

## Testing Checklist

- [ ] Database connections working
- [ ] All master tables have sample data
- [ ] Create procurement request (check ProcurementRequests table)
- [ ] Add items (check RequestItems table)
- [ ] Submit for approval (check ApprovalWorkflow table)
- [ ] Approve at Level 1 (verify status change, Level 2 created)
- [ ] Complete approval chain
- [ ] Create tender from approved request
- [ ] Create award for tender
- [ ] Create delivery for award
- [ ] Verify stock updated (CurrentStock and StockTransactions)
- [ ] Test stock issuance request
- [ ] Test stock return workflow
- [ ] Check audit trail in StockTransactions

---

**End of Document**

*For detailed field documentation, see DATABASE-SCHEMA-DOCUMENTATION.md*
