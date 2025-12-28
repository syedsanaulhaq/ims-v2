# IMS Database Schema - Complete Documentation

**Database Name:** `InvMISDB`  
**Database Type:** SQL Server (MSSQL)  
**Created:** December 27, 2025

---

## Table of Contents
1. [Master Data Tables](#master-data-tables)
2. [Transaction & Request Tables](#transaction--request-tables)
3. [Approval & Workflow Tables](#approval--workflow-tables)
4. [Stock Management Tables](#stock-management-tables)
5. [Procurement Tables](#procurement-tables)
6. [User Management Tables](#user-management-tables)
7. [Data Flow Diagram](#data-flow-diagram)

---

## Master Data Tables

### 1. **ItemMaster** - Core Item Inventory
**Purpose:** Central repository for all inventory items  
**Primary Key:** `item_id`  

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| item_id | int | NO | Unique item identifier (auto-increment) |
| item_code | varchar(50) | NO | Unique item code/SKU |
| item_name | varchar(200) | NO | Item name/description |
| category_id | uniqueidentifier | YES | Link to categories table |
| sub_category_id | uniqueidentifier | YES | Link to sub_categories table |
| specifications | text | YES | Detailed specifications |
| unit_of_measure | varchar(20) | NO | Unit (e.g., pieces, liters, meters) |
| is_active | bit | YES | Active/inactive status |
| is_deleted | bit | YES | Soft delete flag |
| created_at | datetime | YES | Creation timestamp |

**Used By:**
- Stock issuance requests (items being requested)
- Tenders (items being procured)
- Stock transactions (items being moved)
- Current stock tracking

---

### 2. **categories** - Item Classification
**Purpose:** High-level item groupings  
**Primary Key:** `id` (uniqueidentifier)

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | uniqueidentifier | NO | Unique category ID |
| category_name | nvarchar(255) | YES | Category name |
| description | nvarchar(max) | YES | Category description |
| status | nvarchar(255) | YES | Active/Inactive |
| created_at | datetime2 | YES | Creation timestamp |
| updated_at | datetime2 | YES | Last update timestamp |

**Used By:** ItemMaster, sub_categories

---

### 3. **sub_categories** - Detailed Item Classification
**Purpose:** Secondary classification within categories  
**Primary Key:** `id` (uniqueidentifier)

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | uniqueidentifier | NO | Unique sub-category ID |
| category_id | uniqueidentifier | YES | Foreign key to categories |
| sub_category_name | nvarchar(255) | YES | Sub-category name |
| description | nvarchar(max) | YES | Description |
| status | nvarchar(255) | YES | Active/Inactive |
| created_at | datetime2 | YES | Creation timestamp |
| updated_at | datetime2 | YES | Last update timestamp |

**Used By:** ItemMaster

---

### 4. **DEC_MST** - Organizational Departments
**Purpose:** Department/Executive Committee information  
**Primary Key:** `intAutoID`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| intAutoID | int | NO | Auto-increment ID |
| WingID | int | YES | Parent wing reference |
| DECName | nvarchar(450) | YES | Department name |
| DECAcronym | nvarchar(450) | YES | Department acronym |
| DECAddress | nvarchar(max) | YES | Office address |
| Location | nvarchar(max) | YES | City/Location |
| DECCode | smallint | YES | Department code |
| HODID | varchar(450) | YES | Head of Department user ID |
| HODName | varchar(450) | YES | Head of Department name |
| IS_ACT | bit | YES | Active status |
| CreatedBy | nvarchar(100) | YES | Created by user |
| CreatedAt | datetime | YES | Creation timestamp |
| UpdatedBy | nvarchar(100) | YES | Last updated by |
| UpdatedAt | datetime | YES | Last update timestamp |
| Version | int | YES | Record version |

**Used By:**
- Procurement requests (DEC requesting items)
- Stock issuance requests (organizational hierarchy)
- Tender awards

---

### 5. **WingsInformation** - Organizational Wings
**Purpose:** Top-level organizational structure (from AspNetIdentity)  
**Primary Key:** `Id`

| Column | Type | Purpose |
|--------|------|---------|
| Id | int | Wing ID |
| Name | nvarchar | Full wing name |
| ShortName | nvarchar | Abbreviated name |
| FocalPerson | nvarchar | Contact person |
| ContactNo | nvarchar | Phone number |
| OfficeID | int | Parent office reference |
| HODID | varchar | Head of Wing user ID |
| HODName | varchar | Head of Wing name |
| WingCode | varchar | Wing code |
| IS_ACT | bit | Active status |

**Used By:**
- Stock issuance requests (requester_wing_id)
- Procurement requests
- Organizational hierarchy

---

### 6. **tblOffices** - Physical Office Locations
**Purpose:** Office/branch locations  
**Primary Key:** `strOfficeCode` or similar

| Column | Type | Purpose |
|--------|------|---------|
| strOfficeName | nvarchar | Office name |
| OfficeCode | nvarchar | Unique office code |
| intWingID | int | Parent wing |
| IS_ACT | bit | Active status |

**Used By:**
- Stock issuance (requester_office_id)
- Stock transactions (office_id)
- Reorder requests

---

### 7. **vendors** - Vendor/Supplier Information
**Purpose:** Third-party vendor management  
**Primary Key:** `id` (uniqueidentifier)

| Column | Type | Purpose |
|--------|------|---------|
| id | uniqueidentifier | Unique vendor ID |
| vendor_code | nvarchar | Vendor code |
| vendor_name | nvarchar | Company name |
| contact_person | nvarchar | Contact person |
| email | nvarchar | Email address |
| phone | nvarchar | Phone number |
| address | nvarchar | Office address |
| city | nvarchar | City |
| country | nvarchar | Country |
| tax_number | nvarchar | Tax ID |
| status | nvarchar | Active/Inactive |
| created_at | datetime | Creation timestamp |

**Used By:**
- Tenders (vendor_id)
- Tender Awards (vendor_id)

---

## Transaction & Request Tables

### 8. **stock_issuance_requests** - Stock Issuance Requests
**Purpose:** Track requests to issue items from inventory  
**Primary Key:** `id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | uniqueidentifier | NO | Unique request ID |
| request_number | nvarchar | NO | Reference number (e.g., REQ-2025-001) |
| request_type | nvarchar | NO | Type (personal, departmental, etc.) |
| requester_office_id | int | NO | Office requesting items |
| requester_wing_id | int | NO | Wing requesting items |
| requester_branch_id | nvarchar | YES | Branch ID (if applicable) |
| requester_user_id | uniqueidentifier | YES | User who requested |
| purpose | nvarchar | YES | Purpose/reason for request |
| urgency_level | nvarchar | YES | Priority (Low, Medium, High, Critical) |
| justification | nvarchar | YES | Business justification |
| expected_return_date | nvarchar | YES | When items should be returned |
| is_returnable | bit | YES | Whether items should be returned |
| request_status | nvarchar | YES | Status (Submitted, Pending, Approved, Rejected, Issued) |
| submitted_at | datetime | YES | Submission timestamp |
| created_at | datetime | YES | Creation timestamp |
| updated_at | datetime | YES | Last update timestamp |

**Relationships:**
- Has many: `stock_issuance_items` (items in request)
- Has many: `approvals` (approval workflow)
- References: `tblOffices` (requester_office_id)
- References: `WingsInformation` (requester_wing_id)
- References: `AspNetUsers` (requester_user_id)

**Backend Endpoint:** `/api/stock-issuance/requests`

---

### 9. **stock_issuance_items** - Items in Issuance Requests
**Purpose:** Line items for each stock issuance request  
**Primary Key:** `id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | uniqueidentifier | NO | Unique item line ID |
| request_id | uniqueidentifier | NO | Foreign key to stock_issuance_requests |
| item_master_id | int | NO | Link to ItemMaster |
| nomenclature | nvarchar | YES | Item description/nomenclature |
| requested_quantity | int | NO | Quantity requested |
| unit_price | decimal | YES | Estimated unit price |
| item_type | nvarchar | YES | Type (standard, custom, other) |
| custom_item_name | nvarchar | YES | Name if custom item |
| created_at | datetime | YES | Creation timestamp |
| updated_at | datetime | YES | Last update timestamp |

**Relationships:**
- Foreign key: `stock_issuance_requests` (request_id)
- Foreign key: `ItemMaster` (item_master_id)

**Backend Endpoint:** `/api/stock-issuance/items`

---

### 10. **ProcurementRequests** - Procurement Requests
**Purpose:** Track procurement requests for items  
**Primary Key:** `request_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| request_id | int | NO | Auto-increment ID |
| request_code | varchar(50) | NO | Unique request code |
| request_title | varchar(200) | NO | Request title |
| description | text | YES | Detailed description |
| justification | text | YES | Business case |
| priority | varchar(20) | YES | Priority level |
| status | varchar(50) | YES | Status (Draft, Submitted, Approved, etc.) |
| requested_by | nvarchar(450) | YES | User who requested |
| dec_id | int | NO | DEC making the request |
| required_date | date | YES | Date items needed by |
| created_at | datetime | YES | Creation timestamp |

**Relationships:**
- Has many: `RequestItems` (items in request)
- Has many: `ApprovalWorkflow` (approval process)
- References: `DEC_MST` (dec_id)

---

### 11. **RequestItems** - Items in Procurement Requests
**Purpose:** Line items for procurement requests  
**Primary Key:** `request_item_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| request_item_id | int | NO | Auto-increment ID |
| request_id | int | NO | Foreign key to ProcurementRequests |
| item_id | int | NO | Link to ItemMaster |
| quantity_requested | int | NO | Quantity needed |
| specifications | text | YES | Additional specs |
| justification | text | YES | Why this item |

**Relationships:**
- Foreign key: `ProcurementRequests` (request_id)
- Foreign key: `ItemMaster` (item_id)

---

## Approval & Workflow Tables

### 12. **ApprovalWorkflow** - Approval Records
**Purpose:** Track approval hierarchy and status  
**Primary Key:** `approval_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| approval_id | int | NO | Auto-increment ID |
| request_id | int | NO | Link to ProcurementRequests |
| approver_role | varchar(50) | NO | Role required to approve (e.g., "DEC_HOD", "Wings_Incharge", "Director") |
| approver_id | nvarchar(450) | YES | User ID of approver |
| approval_level | int | NO | Hierarchical level (1, 2, 3, etc.) |
| status | varchar(50) | YES | Status (PENDING, APPROVED, REJECTED, FORWARDED) |
| comments | text | YES | Approval comments/notes |
| approved_at | datetime | YES | When approved |
| created_at | datetime | YES | Creation timestamp |

**Relationships:**
- Foreign key: `ProcurementRequests` (request_id)
- References: `AspNetUsers` (approver_id)
- Referenced by: `approval_items` (stores items approved)

**Note:** This is the core approval workflow table. Different modules use different request_id sources (ProcurementRequests, Tenders, etc.)

---

### 13. **approval_items** - Items Linked to Approvals
**Purpose:** Track which items are part of which approval (if exists)  
**Status:** May need to be created or integrated with ApprovalWorkflow

| Column | Type | Purpose |
|--------|------|---------|
| id | uniqueidentifier | Unique ID |
| approval_id | int | Link to ApprovalWorkflow |
| item_id | int | Link to ItemMaster |
| quantity | int | Quantity being approved |

---

## Stock Management Tables

### 14. **CurrentStock** - Current Inventory Levels
**Purpose:** Real-time stock quantities at offices  
**Primary Key:** `stock_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| stock_id | int | NO | Auto-increment ID |
| item_id | int | NO | Link to ItemMaster |
| current_quantity | int | YES | Current quantity in stock |
| minimum_level | int | YES | Reorder point |
| maximum_level | int | YES | Maximum storage capacity |
| last_updated | datetime | YES | Last transaction timestamp |
| updated_by | nvarchar(450) | YES | Last updated by user |

**Relationships:**
- Foreign key: `ItemMaster` (item_id)

**Updates by:**
- Stock transactions
- Deliveries
- Stock issuance
- Stock returns

---

### 15. **StockTransactions** - Stock Movement Log
**Purpose:** Audit trail of all stock movements  
**Primary Key:** `transaction_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| transaction_id | int | NO | Auto-increment ID |
| item_id | int | NO | Link to ItemMaster |
| transaction_type | varchar(50) | NO | Type (IN, OUT, TRANSFER, RETURN, ADJUSTMENT) |
| quantity_change | int | NO | Quantity moved |
| quantity_before | int | NO | Quantity before transaction |
| quantity_after | int | NO | Quantity after transaction |
| reference_type | varchar(50) | YES | What triggered (DELIVERY, ISSUANCE, RETURN, etc.) |
| reference_id | int | YES | Reference to triggering record |
| reason | varchar(500) | YES | Reason for transaction |
| transaction_date | datetime | YES | When transaction occurred |
| created_by | nvarchar(450) | YES | User who created transaction |

**Used By:**
- Stock issuance process
- Delivery receipts
- Stock return process
- Inventory adjustments

---

### 16. **stock_returns** - Stock Return Requests
**Purpose:** Track items being returned to inventory  
**Primary Key:** `id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | int | NO | Auto-increment ID |
| return_date | date | NO | Date of return |
| returned_by | varchar(255) | NO | User returning items |
| verified_by | varchar(255) | YES | User who verified return |
| return_notes | text | YES | Notes/reason for return |
| return_status | varchar(50) | YES | Status (Pending, Verified, Processed) |
| created_at | datetime | YES | Creation timestamp |

**Relationships:**
- Has many: `stock_return_items` (items being returned)

---

### 17. **stock_return_items** - Items in Return
**Purpose:** Line items for stock returns  
**Primary Key:** `id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | int | NO | Auto-increment ID |
| return_id | int | NO | Link to stock_returns |
| issued_item_id | varchar(255) | NO | Original issued item ID |
| nomenclature | varchar(500) | NO | Item description |
| return_quantity | int | NO | Quantity being returned |
| condition_on_return | varchar(50) | NO | Condition (Good, Damaged, Partial) |
| damage_description | text | YES | Description of damage if any |
| created_at | datetime | YES | Creation timestamp |

---

### 18. **reorder_requests** - Automatic Reorder Triggers
**Purpose:** Tracks when stock falls below minimum levels  
**Primary Key:** `id`

| Column | Type | Purpose |
|--------|------|---------|
| id | uniqueidentifier | Unique ID |
| item_master_id | int | Link to ItemMaster |
| office_id | int | Office with low stock |
| current_stock | int | Current quantity |
| minimum_level | int | Minimum threshold |
| reorder_level | int | Reorder point |
| suggested_quantity | int | System-suggested reorder qty |
| actual_quantity | int | Actually ordered |
| priority | nvarchar | Priority (Low, Medium, High) |
| status | nvarchar | Status (Pending, Ordered, Received) |
| requested_by | nvarchar | User who requested |
| requested_at | datetime | Request timestamp |
| remarks | nvarchar | Additional notes |

---

## Procurement Tables

### 19. **tenders** - Tender/Procurement Tenders
**Purpose:** Track procurement tenders  
**Primary Key:** `id` (uniqueidentifier)

| Column | Type | Purpose |
|--------|------|---------|
| id | uniqueidentifier | Unique tender ID |
| reference_number | nvarchar | Unique tender reference |
| title | nvarchar | Tender title |
| description | text | Detailed description |
| tender_type | nvarchar | Type (Open, Limited, Single, etc.) |
| estimated_value | decimal | Budget estimate |
| submission_deadline | datetime | Bid submission deadline |
| status | varchar(50) | Status (Draft, Published, Closed, etc.) |
| tender_status | varchar(50) | Additional status |
| created_by | nvarchar | User who created |
| office_ids | nvarchar | Offices involved |
| wing_ids | nvarchar | Wings involved |
| dec_ids | nvarchar | DECs involved |
| vendor_id | uniqueidentifier | Awarded vendor (after selection) |
| created_at | datetime2 | Creation timestamp |
| updated_at | datetime2 | Last update |

**Relationships:**
- Has many: `tender_items` (items in tender)
- Has many: `TenderAwards` (awards issued)
- References: `vendors` (vendor_id)

---

### 20. **tender_items** - Items in Tender
**Purpose:** Line items for procurement tender  
**Primary Key:** `id` (uniqueidentifier)

| Column | Type | Purpose |
|--------|------|---------|
| id | uniqueidentifier | Unique item line ID |
| tender_id | uniqueidentifier | Link to tenders |
| item_master_id | int | Link to ItemMaster |
| nomenclature | nvarchar | Item description |
| quantity | int | Quantity required |
| estimated_unit_price | decimal | Budget estimate |
| actual_unit_price | decimal | Actual/final price |
| total_amount | decimal | Total for line |
| specifications | text | Technical specs |
| remarks | nvarchar | Additional notes |
| status | varchar(50) | Item status |
| created_at | datetime2 | Creation timestamp |
| updated_at | datetime2 | Last update |

---

### 21. **TenderAwards** - Tender Awards
**Purpose:** Record winning bidders and contract terms  
**Primary Key:** `award_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| award_id | int | NO | Auto-increment ID |
| award_code | varchar(50) | NO | Unique award code |
| request_id | int | NO | Link to ProcurementRequests |
| award_title | varchar(200) | NO | Award title |
| award_date | date | NO | Date awarded |
| expected_delivery_date | date | NO | Expected delivery |
| contract_number | varchar(100) | YES | Contract ID |
| contract_date | date | YES | Contract date |
| total_contract_amount | decimal | NO | Total contract value |
| tax_amount | decimal | YES | Tax portion |
| final_amount | decimal | NO | Final payable amount |
| payment_terms | text | YES | Payment terms |
| status | varchar(50) | YES | Status (Active, Completed, Cancelled) |
| vendor_id | uniqueidentifier | NO | Selected vendor |
| created_by | nvarchar(450) | YES | Created by user |
| created_at | datetime | YES | Creation timestamp |

**Relationships:**
- Foreign key: `ProcurementRequests` (request_id)
- Has many: `AwardItems` (items in award)
- Foreign key: `vendors` (vendor_id)

---

### 22. **AwardItems** - Items in Award
**Purpose:** Line items for tender awards  
**Primary Key:** `award_item_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| award_item_id | int | NO | Auto-increment ID |
| award_id | int | NO | Link to TenderAwards |
| item_id | int | NO | Link to ItemMaster |
| quantity_awarded | int | NO | Quantity awarded |
| unit_price | decimal | NO | Price per unit |
| total_price | decimal | NO | Total for line |
| brand | varchar(100) | YES | Brand/manufacturer |
| model | varchar(100) | YES | Model number |
| specifications_met | text | YES | How specs are met |
| warranty_months | int | YES | Warranty period |

**Relationships:**
- Foreign key: `TenderAwards` (award_id)
- Foreign key: `ItemMaster` (item_id)
- Referenced by: `DeliveryItems` (items to deliver)

---

## Delivery Tables

### 23. **Deliveries** - Delivery Records
**Purpose:** Track deliveries against awards  
**Primary Key:** `delivery_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| delivery_id | int | NO | Auto-increment ID |
| award_id | int | NO | Link to TenderAwards |
| delivery_code | varchar(50) | NO | Unique delivery reference |
| delivery_date | date | NO | Date delivered |
| delivery_note_number | varchar(100) | YES | Delivery note ID |
| received_by | nvarchar(450) | YES | User who received |
| status | varchar(50) | YES | Status (Pending, Received, Inspected, Rejected) |
| inspection_notes | text | YES | Inspection findings |
| total_items_delivered | int | NO | Total line items |
| total_items_accepted | int | YES | Items accepted |
| total_items_rejected | int | YES | Items rejected |
| created_at | datetime | YES | Creation timestamp |

**Relationships:**
- Foreign key: `TenderAwards` (award_id)
- Has many: `DeliveryItems` (items in delivery)

---

### 24. **DeliveryItems** - Items in Delivery
**Purpose:** Line items for deliveries  
**Primary Key:** `delivery_item_id`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| delivery_item_id | int | NO | Auto-increment ID |
| delivery_id | int | NO | Link to Deliveries |
| award_item_id | int | NO | Link to AwardItems |
| quantity_delivered | int | NO | Quantity delivered |
| quantity_accepted | int | YES | Quantity accepted |
| quantity_rejected | int | YES | Quantity rejected |
| rejection_reason | text | YES | Why rejected (if any) |
| serial_numbers | text | YES | Serial numbers (if applicable) |

**Relationships:**
- Foreign key: `Deliveries` (delivery_id)
- Foreign key: `AwardItems` (award_item_id)

---

## User Management Tables

### 25. **AspNetUsers** - User Authentication & Profiles
**Purpose:** ASP.NET Identity user management  
**Primary Key:** `Id`

| Column | Type | Purpose |
|--------|------|---------|
| Id | nvarchar(450) | Unique user ID (GUID) |
| UserName | nvarchar | Login username |
| Email | nvarchar | Email address |
| FullName | nvarchar | Full name |
| PhoneNumber | nvarchar | Contact number |
| Role | nvarchar | User role |
| intOfficeID | int | Home office |
| intWingID | int | Home wing |
| ISACT | bit | Active status |
| PasswordHash | nvarchar | Hashed password |
| SecurityStamp | nvarchar | Security token |
| ConcurrencyStamp | nvarchar | Version control |
| TwoFactorEnabled | bit | 2FA status |
| LockoutEnabled | bit | Lockout status |
| AccessFailedCount | int | Failed login count |
| LockoutEnd | datetimeoffset | When lockout expires |
| LastLoginDate | datetime | Last login |
| CreatedAt | datetime | Account creation |

**Used By:**
- ApprovalWorkflow (approver_id)
- StockTransactions (created_by)
- Stock issuance requests (requester_user_id)
- All audit trails (created_by, updated_by)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    STOCK ISSUANCE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

User Request
    ↓
stock_issuance_requests
    ├─→ requester_office_id → tblOffices
    ├─→ requester_wing_id → WingsInformation
    └─→ requester_user_id → AspNetUsers

stock_issuance_items (multiple)
    ├─→ request_id → stock_issuance_requests
    └─→ item_master_id → ItemMaster
            ├─→ category_id → categories
            └─→ sub_category_id → sub_categories

ApprovalWorkflow (optional)
    ├─→ approver_id → AspNetUsers
    ├─→ approval_items → ItemMaster (if applicable)
    └─→ Status tracking

CurrentStock Update
    └─→ quantity_change → StockTransactions


┌─────────────────────────────────────────────────────────────────┐
│                  PROCUREMENT/TENDER FLOW                        │
└─────────────────────────────────────────────────────────────────┘

ProcurementRequests (from DEC_MST)
    ├─→ dec_id → DEC_MST
    └─→ ApprovalWorkflow → AspNetUsers

tenders (created from requests)
    ├─→ tender_items → ItemMaster
    └─→ vendors → vendor_id

TenderAwards (winning bids)
    ├─→ award_id → AwardItems → ItemMaster
    ├─→ vendor_id → vendors
    └─→ Deliveries → DeliveryItems


┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY FLOW                                │
└─────────────────────────────────────────────────────────────────┘

TenderAwards
    ↓
Deliveries
    ├─→ delivery_id → DeliveryItems
    │       └─→ award_item_id → AwardItems
    │           └─→ item_id → ItemMaster
    └─→ received_by → AspNetUsers

StockTransactions (IN - for received items)


┌─────────────────────────────────────────────────────────────────┐
│                  STOCK RETURN FLOW                              │
└─────────────────────────────────────────────────────────────────┘

stock_returns
    ├─→ returned_by → AspNetUsers
    ├─→ verified_by → AspNetUsers
    └─→ stock_return_items → ItemMaster

StockTransactions (OUT - for returned items)
CurrentStock (updated)
```

---

## Key Business Rules

1. **Stock Issuance**: 
   - Request → Approval → Item Deduction → Transaction Log

2. **Procurement Cycle**:
   - Request → Approval → Tender → Award → Delivery → Stock In

3. **Approvals**:
   - Hierarchical (approval_level 1, 2, 3...)
   - Requires specific roles
   - Can be forwarded or rejected

4. **Stock Tracking**:
   - All transactions logged in `StockTransactions`
   - `CurrentStock` updated after each transaction
   - Minimum/Maximum levels trigger reorder requests

5. **Soft Deletes**:
   - Many tables use `is_deleted` or `boolDeleted` columns
   - Records not physically deleted, just marked

---

## Important Notes

- **Database Design**: Mix of legacy (int IDs) and modern (uniqueidentifier GUIDs) approaches
- **Naming Convention**: Inconsistent (snake_case vs camelCase) - inherited from multiple development phases
- **Approval System**: Currently integrated with `ProcurementRequests` but being extended for stock issuance
- **User Integration**: Fully integrated with ASP.NET Identity (AspNetUsers table)
- **Audit Trail**: Most tables have created_at/updated_at; consider adding created_by/updated_by everywhere

---

**Document Version:** 1.0  
**Last Updated:** December 27, 2025  
**Status:** DRAFT - Needs field-by-field verification in live database
