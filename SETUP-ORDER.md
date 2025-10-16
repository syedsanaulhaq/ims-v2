# 🧪 TEST DATABASE SETUP - STEP BY STEP

## ⚠️ IMPORTANT: Run Scripts in This Order!

The test database setup requires **3 scripts in sequence**:

### **Step 1: Create Empty Database** ✅
**File:** `setup-test-database-simple.sql`
**What it does:** Creates an empty `INVMIS_TEST` database
```sql
-- Creates: INVMIS_TEST (empty)
```

---

### **Step 2: Create All Tables** ⚠️ **YOU ARE HERE**
**File:** `create-test-database-schema.sql`  
**What it does:** Copies ALL table structures from `INVMIS` to `INVMIS_TEST`

**Run this NOW in SSMS:**
```sql
-- This will create:
-- - AspNetUsers
-- - Users
-- - Offices, Wings, Branches
-- - ItemCategories
-- - Designations
-- - Vendors
-- - Tenders, TenderItems
-- - Deliveries, DeliveryItems
-- - StockTransactions
-- - StockIssuance
-- - ... and ALL other tables!
```

---

### **Step 3: Copy Reference Data** 
**File:** `copy-reference-data-to-test.sql`  
**What it does:** Copies ONLY user/office/organizational data (no inventory/transactions)

**Run this AFTER Step 2:**
```sql
-- Copies:
-- ✓ Users & Authentication
-- ✓ Offices, Wings, Branches
-- ✓ Categories
-- ✓ Designations
-- ✓ Vendors

-- Does NOT copy:
-- ✗ Inventory Items
-- ✗ Stock Transactions
-- ✗ Tenders/Acquisitions
-- ✗ Deliveries
```

---

## 🎯 Current Status

- [x] **Step 1:** Empty database created ✅
- [ ] **Step 2:** Tables need to be created ⚠️ **DO THIS NOW**
- [ ] **Step 3:** Reference data copy (after Step 2)

---

## 📝 Quick Execution Guide

### In SSMS, run in order:

```sql
-- 1. (Already done) ✅
USE master;
:r setup-test-database-simple.sql

-- 2. Run this NOW ⚠️
USE INVMIS_TEST;
:r create-test-database-schema.sql

-- 3. Then run this
USE INVMIS_TEST;
:r copy-reference-data-to-test.sql
```

---

## 🔍 Verification

### After Step 2 (Schema Creation):
```sql
USE INVMIS_TEST;
SELECT COUNT(*) as TableCount FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
-- Should show 20+ tables
```

### After Step 3 (Data Copy):
```sql
USE INVMIS_TEST;
SELECT 
    (SELECT COUNT(*) FROM AspNetUsers) as Users,
    (SELECT COUNT(*) FROM Offices) as Offices,
    (SELECT COUNT(*) FROM Wings) as Wings,
    (SELECT COUNT(*) FROM ItemCategories) as Categories,
    (SELECT COUNT(*) FROM Tenders) as Tenders, -- Should be 0
    (SELECT COUNT(*) FROM StockIssuance) as StockRequests; -- Should be 0
```

---

## 🚀 After Setup Complete

### Switch Backend to TEST Database:
```powershell
cd backend
.\switch-environment.ps1 -Environment test
```

### Update your .env file:
```
DB_DATABASE=INVMIS_TEST
NODE_ENV=test
```

### Restart backend and test:
```powershell
npm start
```

---

## 🔄 Why This Order Matters

1. **Empty Database First** - Clean slate
2. **Create Tables** - Structure must exist before data
3. **Copy Data** - Reference data goes into existing tables

❌ **If you skip Step 2:** The copy script will fail because tables don't exist!  
✅ **With Step 2:** Tables exist, data copies successfully!

---

## 📚 See Also

- `COMPLETE-TESTING-GUIDE.md` - Full testing workflow
- `TEST-DATABASE-SETUP-GUIDE.md` - Quick reference
- `switch-environment.ps1` - Environment switching tool

