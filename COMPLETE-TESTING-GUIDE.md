# 🚀 COMPLETE TEST ENVIRONMENT SETUP GUIDE
## Inventory Management System - Testing from Scratch

---

## 📋 **Overview**
This guide will help you set up a completely separate TEST database (INVMIS_TEST) where you can test the entire system from scratch without affecting your production data.

---

## ✅ **What You Get**

| Environment | Database | Purpose | Data |
|------------|----------|---------|------|
| **DEVELOPMENT** | INVMIS | Your working development database | Current data |
| **TEST** | INVMIS_TEST | Clean testing environment | Fresh start |
| **PRODUCTION** | INVMIS_PROD | Future production (not created yet) | Live data |

---

## 🔧 **STEP-BY-STEP SETUP**

### **Step 1: Create Test Database** (5 minutes)

1. **Open SQL Server Management Studio (SSMS)**
2. **Connect to your SQL Server**
3. **Run these SQL files IN ORDER:**

#### a) Create Empty Test Database
```sql
-- Run: setup-test-database-simple.sql
-- This creates empty INVMIS_TEST database
```

#### b) Create Database Schema
```sql
-- Open: create-complete-database-schema.sql
-- IMPORTANT: Change the FIRST line to:
USE INVMIS_TEST;

-- Then run the ENTIRE script
-- This creates all tables, constraints, indexes, views
```

#### c) Copy Reference Data
```sql
-- Run: copy-reference-data-to-test.sql
-- This copies ONLY:
--   ✓ AspNetUsers (authentication)
--   ✓ Users (login credentials)
--   ✓ Offices, Wings, Branches
--   ✓ Item Categories
--   ✓ Designations
--   ✓ Vendors

-- Does NOT copy (for clean testing):
--   ✗ Inventory Items
--   ✗ Stock Transactions
--   ✗ Stock Requests
--   ✗ Tenders/Acquisitions
--   ✗ Deliveries
--   ✗ Stock Returns
```

---

### **Step 2: Switch Backend to Test Database** (2 minutes)

**Option A: Using PowerShell Script (Easiest)**
```powershell
# Run in PowerShell:
.\switch-environment.ps1 -Environment test

# This automatically:
# ✓ Backs up current .env
# ✓ Updates DB_DATABASE to INVMIS_TEST
# ✓ Updates NODE_ENV to test
```

**Option B: Manual Update**
1. Navigate to: `backend/.env`
2. Update these lines:
```env
DB_DATABASE=INVMIS_TEST
NODE_ENV=test
```
3. Save the file

---

### **Step 3: Restart Backend Server** (1 minute)

```bash
# In your backend terminal:
# 1. Stop current server (Ctrl+C)
# 2. Start again:
npm run server

# You should see:
# "Connected to SQL Server - Database: INVMIS_TEST"
```

---

### **Step 4: Verify Test Environment** (2 minutes)

1. **Open Browser**: http://localhost:8080
2. **Login** with your credentials (users were copied)
3. **Check Dashboard**:
   - Should show **ZERO** items
   - Should show **ZERO** requests
   - Everything should be clean and empty

4. **Verify You're in TEST Mode**:
   - Backend console shows: "Database: INVMIS_TEST"
   - Dashboard shows empty state
   - Initial Setup is available

✅ **You're now in TEST mode!**

---

## 🧪 **COMPLETE TESTING WORKFLOW**

### **Phase 1: Initial Setup** (10 minutes)
1. Navigate to: **Initial Setup** page
2. Follow the wizard:
   - Set storage location
   - Configure inventory settings
   - Set up categories (if needed)
3. Complete initial setup

### **Phase 2: Add Inventory** (15 minutes)
1. Go to: **Item Master**
2. Add inventory items:
   - Computers
   - Furniture
   - Office supplies
   - Stationery
3. Verify items appear in inventory dashboard

### **Phase 3: Test Stock Requests** (20 minutes)
1. **Create Individual Request**:
   - Go to: Stock Operations
   - Submit a request for yourself
   - Add items
   - Check it appears in "My Requests"

2. **Create Organizational Request**:
   - Submit a request for your office
   - Add multiple items
   - Verify proper naming (Office vs Individual)

3. **Test Approval Workflow**:
   - Go to: Request History
   - Click "Tracking" on a request
   - Verify complete timeline:
     * Submitted step ✓
     * Current step (highlighted) ✓
     * Future steps (grayed) ✓

### **Phase 4: Test Stock Returns** (10 minutes)
1. Go to: **Stock Return** page
2. **Process Returns** tab:
   - Should show issued items
   - Add items to return
   - Set condition (Good/Damaged/Lost)
   - Process return
3. **Check Overdue & Due Soon** tabs

### **Phase 5: Test UI & Navigation** (10 minutes)
1. **Test Menu**:
   - ✓ NO tooltips appear on hover
   - ✓ Submenu expand/collapse works
   - ✓ All links navigate correctly

2. **Test Pages**:
   - Dashboard
   - My Requests
   - Request Details
   - Request History
   - Stock Return
   - Reports & Analytics

3. **Verify Data**:
   - Open DevTools (F12)
   - Console tab
   - Check for errors
   - Verify API calls succeed

---

## 🔄 **SWITCHING BETWEEN ENVIRONMENTS**

### **Switch to TEST**
```powershell
.\switch-environment.ps1 -Environment test
# Restart backend server
```

### **Switch to DEVELOPMENT**
```powershell
.\switch-environment.ps1 -Environment dev
# Restart backend server
```

### **Manual Switch (without script)**
Edit `backend/.env`:
```env
# For TEST:
DB_DATABASE=INVMIS_TEST
NODE_ENV=test

# For DEVELOPMENT:
DB_DATABASE=INVMIS
NODE_ENV=development
```

---

## 🗑️ **RESET TEST DATABASE** (Wipe Everything)

When you want to start testing from scratch again:

```sql
-- Run in SSMS:
USE master;
GO

DROP DATABASE INVMIS_TEST;
GO

-- Then run setup scripts again:
-- 1. setup-test-database-simple.sql
-- 2. create-complete-database-schema.sql (with USE INVMIS_TEST;)
-- 3. copy-reference-data-to-test.sql
```

---

## ✅ **TESTING CHECKLIST**

Print this and check off as you test:

### Initial Setup
- [ ] Backend connected to INVMIS_TEST
- [ ] Login works with existing credentials
- [ ] Dashboard shows empty state
- [ ] Initial setup wizard available

### Inventory Management
- [ ] Can add new items
- [ ] Items appear in Item Master
- [ ] Dashboard updates with item count
- [ ] Categories work correctly

### Stock Requests
- [ ] Can create individual requests
- [ ] Can create organizational requests
- [ ] Requester names display correctly
- [ ] My Requests page shows all requests
- [ ] Request Details page loads properly

### Approval Timeline
- [ ] Shows submission step
- [ ] Shows current approval step (highlighted)
- [ ] Shows future steps (grayed)
- [ ] NO mock data or fake approvers
- [ ] Timeline visually clear (solid/dashed lines)

### Stock Returns
- [ ] Can see issued items
- [ ] Can add items to return
- [ ] Condition selection works
- [ ] Overdue items calculated correctly
- [ ] Due soon items shown properly

### UI & Navigation
- [ ] NO tooltips on menu hover
- [ ] All navigation works
- [ ] No 404 errors
- [ ] Active menu highlighted
- [ ] Browser back/forward works

### Data Verification
- [ ] No mock data in console
- [ ] All API calls succeed
- [ ] No errors in DevTools
- [ ] Real database data only

---

## 📞 **TROUBLESHOOTING**

| Problem | Solution |
|---------|----------|
| **Backend won't start** | Check .env file has correct database name |
| **Can't login** | Verify AspNetUsers/Users tables were copied |
| **Empty categories** | Run reference data copy script again |
| **Wrong database** | Check backend console for database name |
| **Old data showing** | Clear browser cache (Ctrl+Shift+R) |

---

## 🎯 **BENEFITS OF THIS SETUP**

✅ **Safe Testing** - Never affects production data
✅ **Repeatable** - Can wipe and restart anytime
✅ **Fast** - Switch environments in seconds
✅ **Real Conditions** - Same structure as production
✅ **Isolated** - Test without fear of breaking things

---

## 📁 **FILES CREATED**

- `setup-test-database-simple.sql` - Creates empty test database
- `copy-reference-data-to-test.sql` - Copies users and reference data
- `switch-environment.ps1` - PowerShell script for easy switching
- `.env.dev.template` - Development environment template
- `.env.test.template` - Test environment template
- `TEST-DATABASE-SETUP-GUIDE.md` - This guide

---

## 🚀 **READY TO START TESTING!**

1. Run the SQL scripts to create INVMIS_TEST
2. Switch backend to test environment
3. Restart backend server
4. Open http://localhost:8080
5. Start testing from scratch!

**Happy Testing! 🧪**

---
