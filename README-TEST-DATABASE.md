# 🎯 ONE-SCRIPT TEST DATABASE SETUP

## ✨ What This Does

**ONE script does EVERYTHING!**

`create-and-setup-test-database-complete.sql` will:

1. ✅ Drop old test database (if exists)
2. ✅ Create new `InventoryManagementDB_TEST` database
3. ✅ Copy ALL table structures from `InventoryManagementDB`
4. ✅ Copy data ONLY for organizational/reference tables:
   - ✓ AspNetUsers (authentication)
   - ✓ Users (with passwords)
   - ✓ Offices
   - ✓ Wings
   - ✓ DECs (Data Entry Centers)
   - ✓ Branches
   - ✓ ItemCategories
   - ✓ Designations
   - ✓ Vendors

5. ✅ Leave EMPTY for clean testing:
   - ⊘ ItemMasters (no inventory items)
   - ⊘ Tenders/Acquisitions
   - ⊘ Deliveries
   - ⊘ StockTransactions
   - ⊘ StockIssuance/Returns
   - ⊘ All other transactional data

---

## 🚀 How to Use

### Step 1: Run the Script in SSMS

```sql
-- Open SSMS and execute this file:
:r E:\ECP-Projects\inventory-management-system-ims\ims-v1\create-and-setup-test-database-complete.sql
```

**OR** just open the file in SSMS and press F5 to execute.

---

### Step 2: Update Your Backend Configuration

**Option A: If using .env file:**
```
DB_DATABASE=InventoryManagementDB_TEST
NODE_ENV=test
```

**Option B: If using config file:**
```javascript
database: 'InventoryManagementDB_TEST'
```

---

### Step 3: Restart Your Backend

```powershell
# Stop current server (Ctrl+C)
# Then restart
npm start
```

---

### Step 4: Test!

✅ Login with existing credentials  
✅ All users, offices, wings available  
✅ Start from scratch with empty inventory  
✅ Test acquisitions, stock management, etc.

---

## 📊 What You Get

| Table Type | Status | Details |
|------------|--------|---------|
| **Users & Auth** | ✅ WITH DATA | Login with existing accounts |
| **Organizational** | ✅ WITH DATA | Offices, Wings, DECs, Branches |
| **Categories** | ✅ WITH DATA | Item categories pre-populated |
| **Vendors** | ✅ WITH DATA | Vendor list available |
| **Inventory** | ⊘ EMPTY | No items yet |
| **Acquisitions** | ⊘ EMPTY | No tenders/purchases |
| **Stock** | ⊘ EMPTY | No transactions |
| **Requests** | ⊘ EMPTY | No issuance requests |

---

## 🔄 When to Use This

✅ **Use test database when:**
- Testing new features
- Training users
- Demonstrating system
- Experimenting with workflows
- Don't want to affect production data

✅ **Switch back to production when:**
- Ready to deploy
- Need real data
- Production use

---

## ⚠️ Important Notes

1. **This DROPS the existing test database** - Any previous test data will be lost
2. **Production data is never touched** - Only reads from `InventoryManagementDB`
3. **Test database name:** `InventoryManagementDB_TEST`
4. **Remember to switch back** to production database after testing!

---

## 🎯 Quick Start

```bash
# 1. Run the script in SSMS (5-10 seconds)
# 2. Update DB_DATABASE=InventoryManagementDB_TEST
# 3. Restart backend
# 4. Test away! 🚀
```

---

## 📚 Files in This Setup

- `create-and-setup-test-database-complete.sql` - **THE ONLY SCRIPT YOU NEED** ⭐
- `README-TEST-DATABASE.md` - This guide
- Old scripts (can ignore):
  - `setup-test-database-simple.sql`
  - `create-test-database-schema.sql`
  - `copy-reference-data-to-test.sql`

**Just use the complete script!** 🎯

