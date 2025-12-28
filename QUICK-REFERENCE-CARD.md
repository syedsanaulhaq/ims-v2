# IMS Quick Reference Card

**Print this or keep it handy!**

---

## 📍 The 25 Tables (Organized by Purpose)

### ORGANIZATIONAL STRUCTURE
- `DEC_MST` - Departments
- `WingsInformation` - Organizational wings
- `tblOffices` - Office locations
- `AspNetUsers` - User accounts

### INVENTORY MASTER
- `ItemMaster` - Core items
- `categories` - Item categories
- `sub_categories` - Sub-categories
- `vendors` - Suppliers

### PROCUREMENT CYCLE
- `ProcurementRequests` → `RequestItems` → `ApprovalWorkflow` → `tenders` → `tender_items` → `TenderAwards` → `AwardItems` → `Deliveries` → `DeliveryItems` → `StockTransactions` (IN) → `CurrentStock`

### STOCK ISSUANCE
- `stock_issuance_requests` → `stock_issuance_items` → (Approval?) → `StockTransactions` (OUT) → `CurrentStock`

### STOCK RETURN  
- `stock_returns` → `stock_return_items` → `StockTransactions` (RETURN) → `CurrentStock`

### STOCK MONITORING
- `CurrentStock` (Real-time)
- `StockTransactions` (History/Audit)
- `reorder_requests` (Auto-triggers)

---

## 🔄 The 4 Workflows (Simplified)

### 1️⃣ PROCUREMENT
```
Request → Items → Approve → Tender → Award → Deliver → Stock In
Tables:  ProcReq   ReqItems Approval tenders Awards Deliveries
```

### 2️⃣ STOCK ISSUANCE  
```
Request → Items → (Approve) → Issue → Stock Out
Tables:  SIReq SIItems Approval Transaction
```

### 3️⃣ STOCK RETURN
```
Return → Items → Verify → Stock In
Tables: StockReturn StockReturnItems Transaction
```

### 4️⃣ REORDER AUTO
```
Low Stock Alert → Create ProcurementRequest (Loop back to #1)
Tables: CurrentStock, reorder_requests
```

---

## ✅ What's Where

| Need | Location | File |
|------|----------|------|
| System overview | SYSTEM-STATUS-AND-TESTING-READINESS.md | 14 KB |
| Architecture & workflows | SYSTEM-ARCHITECTURE-OVERVIEW.md | 17 KB |
| All table details | DATABASE-SCHEMA-DOCUMENTATION.md | 28 KB |
| Table relationships | DATABASE-RELATIONSHIPS-VISUAL.md | 18 KB |
| Clear test data | reset-database-for-testing.sql | Run once |

---

## 🗝️ Key Tables to Know

| Table | Primary Purpose | Key Fields |
|-------|-----------------|------------|
| **ApprovalWorkflow** | Route requests for approval | approval_level, approver_role, status |
| **StockTransactions** | Audit trail (NEVER DELETE) | transaction_type, quantity_before/after |
| **CurrentStock** | Real-time inventory | item_id, current_quantity, minimum_level |
| **ItemMaster** | What we have | item_code, item_name, unit_of_measure |
| **ProcurementRequests** | What to buy | request_code, dec_id, status |
| **TenderAwards** | Who we bought from | award_code, vendor_id, final_amount |

---

## 🎯 The 3-Level Approval Chain

```
Level 1: DEC_HOD (Head of Department)
   ↓ If approves → Creates Level 2
   ↓ If rejects → STOP
   
Level 2: Wings_Incharge  
   ↓ If approves → Creates Level 3
   ↓ If rejects → STOP
   
Level 3: Director
   ↓ Final approval or rejection
```

Every request goes through ALL 3 levels.

---

## 💾 Data Cleanup Command

```bash
sqlcmd -S localhost -d InvMISDB -i reset-database-for-testing.sql
```

**What it clears:**
- ProcurementRequests & RequestItems
- StockTransactions
- CurrentStock
- ApprovalWorkflow

**What it keeps:**
- ItemMaster (items)
- categories (classifications)
- vendors (suppliers)
- AspNetUsers (users)
- All master data

---

## 📊 Stock Math Formula

```
Current Stock = Base + INs - OUTs

INs:   Deliveries received (+)
       Returns processed (+)
       Adjustments (+)
       
OUTs:  Stock issued (-)
       Transfers (-)
       Losses (-)

Every change → StockTransactions (audit trail)
```

---

## 🔐 Soft Delete Fields

These tables mark records as deleted instead of removing them:
- `ItemMaster.is_deleted`
- `categories.status` (set to 'inactive')
- `sub_categories.status`
- Most business process tables

**Rule:** Check for soft delete status in WHERE clauses!

---

## 🌳 Organizational Hierarchy

```
tblOffices (Physical locations)
    ↓ Has Wing
WingsInformation (e.g., "Finance Wing")
    ↓ Contains Departments
DEC_MST (e.g., "Finance Department")
    ↓ Has Users
AspNetUsers (Actual people)
    ↓ Have Roles
Roles: Admin, HOD, Wings_Incharge, Director, User
```

---

## 🚨 Critical Rules

1. **NEVER** physically delete from StockTransactions
2. **ALWAYS** update both CurrentStock AND StockTransactions together
3. **ALWAYS** check soft delete status (is_deleted, status='inactive')
4. **ALWAYS** log approver and timestamp when approving
5. **ALWAYS** validate foreign keys exist before inserting

---

## 🔍 Quick Diagnostic Queries

```sql
-- Check current stock levels
SELECT item_id, current_quantity, minimum_level 
FROM CurrentStock 
WHERE current_quantity < minimum_level

-- View recent transactions
SELECT TOP 10 * FROM StockTransactions 
ORDER BY transaction_date DESC

-- Check pending approvals
SELECT * FROM ApprovalWorkflow 
WHERE status = 'PENDING'

-- View active items
SELECT * FROM ItemMaster 
WHERE is_deleted = 0 AND is_active = 1
```

---

## 📱 API Endpoints (Main Ones)

```
GET    /api/items                      - List items
GET    /api/current-stock              - View inventory
GET    /api/stock-transactions         - View history

POST   /api/procurement/requests       - Create procurement
POST   /api/procurement/items          - Add procurement items

POST   /api/stock-issuance/requests    - Issue stock
POST   /api/stock-issuance/items       - Add issuance items

POST   /api/approval/forward           - Forward for approval
POST   /api/approval/approve           - Approve request
```

---

## 🎓 5-Minute Learn

1. **Data Flows UP** (user request)
   - Procurement Request → Items → Approval → Tender → Award → Delivery → Stock In

2. **Data Flows DOWN** (fulfillment)
   - Stock Issuance → Items → Stock Out

3. **Everything Audited**
   - Every change logged in StockTransactions
   - Every approval tracked in ApprovalWorkflow

4. **Real-time Tracking**
   - CurrentStock always current
   - StockTransactions always complete

5. **Soft Deletes Used**
   - Records marked inactive, not deleted
   - Preserves audit trail

---

## 🆘 Troubleshooting

| Problem | Check |
|---------|-------|
| Data not appearing | Soft delete status? is_deleted = 0? status != 'inactive'? |
| Stock not updating | Both CurrentStock AND StockTransactions updated? |
| Can't create request | All required fields filled? Foreign keys exist? |
| Approval stuck | Check ApprovalWorkflow.status, check all 3 levels |
| Wrong stock amount | Check ALL transactions, not just recent ones |

---

## 📋 Before Testing

- [ ] Database connected
- [ ] Tables verified to exist
- [ ] Test data cleared (run cleanup script)
- [ ] Master data populated (items, users, etc.)
- [ ] Constraints enabled
- [ ] Documentation read

---

## 🚀 Start Testing

1. Create procurement request in UI
2. Add items to request
3. Submit for approval
4. Watch ApprovalWorkflow table
5. Verify data moves through system
6. Check StockTransactions for audit trail
7. Verify CurrentStock updated

---

## 📞 Find Details In:

**For...** | **Read this file**
----------|------------------
System overview | SYSTEM-STATUS-AND-TESTING-READINESS.md
How workflows work | SYSTEM-ARCHITECTURE-OVERVIEW.md
Table details | DATABASE-SCHEMA-DOCUMENTATION.md
How tables connect | DATABASE-RELATIONSHIPS-VISUAL.md
Full summary | COMPLETE-SYSTEM-ANALYSIS-SUMMARY.md

---

**Database Status:** ✅ CLEAN & READY  
**Documentation:** ✅ COMPLETE  
**Testing:** 🚀 READY TO START

**Go test it! 🎯**

---

*Quick Reference Card v1.0 - December 27, 2025*
