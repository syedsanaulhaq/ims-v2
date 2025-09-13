# 🎯 **PRACTICAL EXAMPLE: COMPLETE SYSTEM WORKFLOW**

Let's walk through a **real-world example** of how the inventory system works with actual data for a **Laptop Computer**.

---

## 📱 **ITEM: Dell Laptop - Model XPS 13**

### **Initial Setup**
```sql
-- Step 1: Item Master Creation
INSERT INTO item_masters (id, item_code, nomenclature, category_id, unit, minimum_stock_level, maximum_stock_level, reorder_point)
VALUES ('laptop-001', 'IT-LAPTOP-001', 'Dell XPS 13 Laptop', 'category-it', 'UNIT', 5, 20, 8);
```

### **Timeline of Operations**

---

## 📅 **Day 1: Initial Stock Setup**

**Admin sets up initial inventory:**
```sql
-- Initial stock transaction
EXEC sp_CreateStockTransaction 
    @ItemMasterID = 'laptop-001',
    @TransactionType = 'INITIAL',
    @Quantity = 10,
    @Remarks = 'Initial inventory count',
    @CreatedBy = 'admin-user-001';

-- Database state after:
-- stock_transactions: 1 record (INITIAL, +10)
-- current_stock_levels: current_quantity = 10
```

**📊 Current Stock: 10 units**

---

## 📅 **Day 5: Low Stock Alert Triggers Purchase**

**System detects stock below reorder point (8 units):**
```sql
-- Stock level check
SELECT item_code, current_quantity, reorder_point, stock_status 
FROM vw_InventoryDashboard 
WHERE item_master_id = 'laptop-001';

-- Result: 
-- IT-LAPTOP-001 | 10 | 8 | NORMAL (still above reorder point)
```

**Store Manager creates Purchase Order:**
```sql
-- Create PO
INSERT INTO purchase_orders (id, po_number, supplier_id, status, requested_by)
VALUES ('po-001', 'PO-2025-001', 'supplier-dell', 'DRAFT', 'store-manager-001');

-- Add laptop to PO
INSERT INTO purchase_order_items (id, purchase_order_id, item_master_id, ordered_quantity, unit_price)
VALUES ('po-item-001', 'po-001', 'laptop-001', 15, 1200.00);

-- Send PO to supplier
UPDATE purchase_orders SET status = 'SENT' WHERE id = 'po-001';
```

---

## 📅 **Day 7: IT Department Requests Laptops**

**IT Department Head creates issuance request:**
```sql
-- Create issuance request
INSERT INTO stock_issuances (id, issuance_number, department_id, requested_by, purpose)
VALUES ('iss-001', 'ISS-2025-001', 'dept-it', 'it-head-001', 'New employee laptops');

-- Request 5 laptops
INSERT INTO stock_issuance_items (id, stock_issuance_id, item_master_id, requested_quantity)
VALUES ('iss-item-001', 'iss-001', 'laptop-001', 5);
```

**Store Manager approves request:**
```sql
-- Approve issuance
UPDATE stock_issuances 
SET status = 'APPROVED', approved_by = 'store-manager-001', approved_at = GETDATE()
WHERE id = 'iss-001';

-- Approve quantities  
UPDATE stock_issuance_items 
SET approved_quantity = 5, status = 'APPROVED'
WHERE id = 'iss-item-001';
```

**Store Staff issues laptops:**
```sql
-- Record actual issue
UPDATE stock_issuance_items 
SET issued_quantity = 5, status = 'ISSUED'
WHERE id = 'iss-item-001';

-- Create stock transaction for issued laptops
EXEC sp_CreateStockTransaction 
    @ItemMasterID = 'laptop-001',
    @TransactionType = 'ISSUED',
    @Quantity = 5, -- Will become -5 automatically
    @ReferenceType = 'ISSUANCE',
    @ReferenceID = 'iss-001',
    @DepartmentID = 'dept-it',
    @CreatedBy = 'store-staff-001';

-- Database state after:
-- stock_transactions: 2 records (INITIAL +10, ISSUED -5)
-- current_stock_levels: current_quantity = 5
```

**📊 Current Stock: 5 units** (Below reorder point of 8!)

**🚨 System generates LOW STOCK alert**

---

## 📅 **Day 10: Goods Received from Supplier**

**Dell delivers laptops:**
```sql
-- Update PO with received quantity
UPDATE purchase_order_items 
SET received_quantity = 15 
WHERE id = 'po-item-001';

-- Create stock transaction for received goods
EXEC sp_CreateStockTransaction 
    @ItemMasterID = 'laptop-001',
    @TransactionType = 'RECEIVED',
    @Quantity = 15,
    @UnitPrice = 1200.00,
    @ReferenceType = 'PURCHASE_ORDER',
    @ReferenceID = 'po-001',
    @SupplierID = 'supplier-dell',
    @CreatedBy = 'store-staff-001';

-- Update PO status
UPDATE purchase_orders 
SET status = 'COMPLETED', actual_delivery_date = CAST(GETDATE() AS DATE)
WHERE id = 'po-001';

-- Database state after:
-- stock_transactions: 3 records (INITIAL +10, ISSUED -5, RECEIVED +15)
-- current_stock_levels: current_quantity = 20
```

**📊 Current Stock: 20 units** (At maximum stock level!)

---

## 📅 **Day 15: HR Department Returns Unused Laptop**

**HR returns 1 laptop (employee left):**
```sql
-- Create return request
INSERT INTO stock_returns (id, return_number, department_id, return_reason, returned_by)
VALUES ('ret-001', 'RET-2025-001', 'dept-hr', 'CANCELLED_WORK', 'hr-head-001');

-- Add returned laptop
INSERT INTO stock_return_items (id, stock_return_id, item_master_id, returned_quantity, condition_status)
VALUES ('ret-item-001', 'ret-001', 'laptop-001', 1, 'GOOD');

-- Store staff inspects and accepts
UPDATE stock_return_items 
SET accepted_quantity = 1, status = 'ACCEPTED'
WHERE id = 'ret-item-001';

-- Create stock transaction for return
EXEC sp_CreateStockTransaction 
    @ItemMasterID = 'laptop-001',
    @TransactionType = 'RETURNED',
    @Quantity = 1,
    @ReferenceType = 'RETURN', 
    @ReferenceID = 'ret-001',
    @DepartmentID = 'dept-hr',
    @CreatedBy = 'store-staff-001';

-- Database state after:
-- stock_transactions: 4 records (INITIAL +10, ISSUED -5, RECEIVED +15, RETURNED +1)
-- current_stock_levels: current_quantity = 21
```

**📊 Current Stock: 21 units** (Above maximum! Overstock alert!)

---

## 📅 **Day 20: Damage Write-off**

**1 laptop damaged during transport:**
```sql
-- Create adjustment for damaged laptop
EXEC sp_CreateStockTransaction 
    @ItemMasterID = 'laptop-001',
    @TransactionType = 'ADJUSTMENT',
    @Quantity = -1, -- Negative for write-off
    @Remarks = 'Damaged during internal transport - screen cracked',
    @ReferenceType = 'MANUAL',
    @CreatedBy = 'store-manager-001';

-- Database state after:
-- stock_transactions: 5 records (INITIAL +10, ISSUED -5, RECEIVED +15, RETURNED +1, ADJUSTMENT -1)
-- current_stock_levels: current_quantity = 20
```

**📊 Current Stock: 20 units**

---

## 📊 **COMPLETE TRANSACTION HISTORY**

### **All Transactions for Dell Laptop XPS 13:**
```sql
SELECT 
    transaction_number,
    transaction_date,
    transaction_type,
    quantity,
    reference_type,
    remarks,
    created_by_name
FROM vw_StockMovements 
WHERE item_code = 'IT-LAPTOP-001'
ORDER BY transaction_date;
```

**Results:**
| Date | Type | Qty | Reference | Running Balance | Created By |
|------|------|-----|-----------|----------------|------------|
| Day 1 | INITIAL | +10 | Migration | 10 | Admin |
| Day 7 | ISSUED | -5 | ISS-2025-001 | 5 | Store Staff |
| Day 10 | RECEIVED | +15 | PO-2025-001 | 20 | Store Staff |
| Day 15 | RETURNED | +1 | RET-2025-001 | 21 | Store Staff |
| Day 20 | ADJUSTMENT | -1 | Damage | 20 | Store Manager |

### **Current Stock Calculation:**
```
Current Stock = 10 (initial) - 5 (issued) + 15 (received) + 1 (returned) - 1 (damaged)
             = 20 units
```

---

## 📈 **DASHBOARD VIEWS**

### **Inventory Dashboard for Dell Laptop:**
```sql
SELECT * FROM vw_InventoryDashboard WHERE item_code = 'IT-LAPTOP-001';
```

**Result:**
- **Item**: Dell XPS 13 Laptop
- **Current Stock**: 20 units
- **Available**: 20 units (0 reserved)
- **Status**: OVERSTOCK (above max level of 20)
- **Alert Level**: Normal
- **Last Transaction**: Day 20 (ADJUSTMENT)
- **Transactions (30 days)**: 5

### **Department Consumption Report:**
```sql
-- IT Department laptop usage
SELECT 
    department_name,
    SUM(CASE WHEN transaction_type = 'ISSUED' THEN ABS(quantity) ELSE 0 END) as total_issued,
    SUM(CASE WHEN transaction_type = 'RETURNED' THEN quantity ELSE 0 END) as total_returned,
    SUM(CASE WHEN transaction_type = 'ISSUED' THEN ABS(quantity) ELSE 0 END) - 
    SUM(CASE WHEN transaction_type = 'RETURNED' THEN quantity ELSE 0 END) as net_consumption
FROM vw_StockMovements 
WHERE item_code = 'IT-LAPTOP-001' 
  AND transaction_type IN ('ISSUED', 'RETURNED')
GROUP BY department_name;
```

**Result:**
- **IT Department**: 5 issued, 0 returned = 5 net consumption
- **HR Department**: 0 issued, 1 returned = -1 net consumption

---

## 🎯 **KEY BENEFITS DEMONSTRATED**

### ✅ **Complete Audit Trail**
- Every laptop movement is tracked with date, user, and reason
- Can trace exactly where each laptop went and when

### ✅ **Accurate Stock Levels**  
- Stock always calculated from transactions (never manually updated)
- Real-time accuracy guaranteed

### ✅ **Automated Alerts**
- Low stock alert when below reorder point (8 units)
- Overstock alert when above maximum (20 units)

### ✅ **Department Accountability**
- Track which departments consume most laptops
- Returns are properly credited back

### ✅ **Purchase Planning**
- Historical data shows consumption patterns
- Reorder points prevent stockouts

### ✅ **Financial Control**
- Track laptop values and total investment
- Cost per department and per transaction

---

## 🚀 **REAL-WORLD SCENARIOS HANDLED**

1. **Employee Onboarding** → Stock issuance workflow
2. **Employee Departure** → Stock return workflow  
3. **Bulk Purchase** → Purchase order workflow
4. **Damage/Loss** → Adjustment workflow
5. **Interdepartment Transfer** → Issue + Return workflow
6. **Annual Audit** → Complete transaction history available
7. **Budget Planning** → Consumption reports and trends
8. **Supplier Management** → Purchase order tracking and performance

This system handles **every possible scenario** with **complete traceability** and **automated accuracy**! 🎯
