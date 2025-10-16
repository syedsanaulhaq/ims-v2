# 🧪 Test Environment Setup Guide

## ⚠️ IMPORTANT: Test Environment Uses `.env-test` File

**The test environment does NOT use `.env` directly!**

Instead, it uses:
- **Source Configuration**: `.env-test` (committed to Git)
- **Active Configuration**: `.env` (copied from `.env-test` when switching)
- **Switch Command**: `.\switch-env.ps1 test`

---

## 📁 Environment File Structure

```
ims-v1/
├── .env                    # ← ACTIVE (copied from .env-test/.env-dev/.env-prod)
├── .env-development        # ← Source for dev environment
├── .env-test              # ← Source for TEST environment ✅
├── .env-production        # ← Source for production environment
└── switch-env.ps1         # ← Script to copy env files
```

### ⚡ How It Works

1. **`.env-test`** contains test environment settings:
   ```env
   NODE_ENV=test
   VITE_API_URL=http://localhost:5001
   API_URL=http://localhost:5001
   PORT=5001
   FRONTEND_PORT=4173
   SQL_SERVER_HOST=SYED-FAZLI-LAPT
   SQL_SERVER_DATABASE=InventoryManagementDB_TEST
   SQL_SERVER_USER=inventoryusertest
   SQL_SERVER_PASSWORD=2016Wfp61@
   SQL_SERVER_PORT=1433
   SQL_SERVER_ENCRYPT=false
   SQL_SERVER_TRUST_CERT=true
   ```

2. **`switch-env.ps1 test`** copies `.env-test` → `.env`

3. **Applications read from `.env`** (the active copy)

4. **Vite build** bakes environment variables from `.env` at build time

---

## 🚀 Quick Start for Test Environment

### Step 1: Create Test Database with Production Data

```powershell
# Run the database clone script
sqlcmd -S localhost -U sa -P "1978Jupiter87@#" -i clone-database-with-data.sql
```

This creates `InventoryManagementDB_TEST` as an exact copy of production.

### Step 2: Setup SQL User (Already Done)

```sql
-- User: inventoryusertest
-- Password: 2016Wfp61@
-- Permissions: db_datareader, db_datawriter, db_ddladmin
```

### Step 3: Switch to Test Environment

```powershell
# This copies .env-test to .env
.\switch-env.ps1 test
```

**Output will show:**
```
[SUCCESS] Switched to test environment!
[INFO] Active file: .env-test -> .env

=== Environment Settings ===
[INFO]   Environment: test
[INFO]   Database: InventoryManagementDB_TEST
[INFO]   Backend Port: 5001
[INFO]   Frontend Port: 4173
```

### Step 4: Start Test Environment

```powershell
# Option A: Start everything at once
npm run test:full

# Option B: Start separately
# Terminal 1 - Backend
node invmis-api-server.cjs

# Terminal 2 - Frontend
npm run build
npm run preview
```

### Step 5: Access the Application

- **Frontend**: http://localhost:4173
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

---

## 🔍 Verify Configuration

### Check Active Environment File

```powershell
# Display current .env contents
Get-Content .env | Select-String "NODE_ENV|SQL_SERVER_DATABASE|PORT"
```

**Expected output for test:**
```
NODE_ENV=test
SQL_SERVER_DATABASE=InventoryManagementDB_TEST
PORT=5001
```

### Check Backend Connection

```powershell
# Start backend and look for this message:
# ✅ Connected to SQL Server: InventoryManagementDB_TEST
# 📊 Database has 425 users
# 🚀 InvMIS API Server running on port 5001
```

### Check Frontend API URL

Open browser console at http://localhost:4173 and check network requests:
- Should connect to: `http://localhost:5001/api/...`
- Should NOT connect to: `https://api.yourdomain.com`

---

## ⚠️ Common Issues & Solutions

### Issue 1: Frontend Connects to Wrong API URL

**Symptom:**
```
TypeError: Failed to fetch
GET https://api.yourdomain.com/api/session
```

**Cause:** Frontend was built before switching to test environment

**Solution:**
```powershell
# Kill any running processes
taskkill /f /im node.exe

# Rebuild with correct environment
npm run test:full
```

### Issue 2: Backend Connects to Wrong Database

**Symptom:** Backend shows "Connected to: InventoryManagementDB" instead of "InventoryManagementDB_TEST"

**Cause:** `.env` not properly copied from `.env-test`

**Solution:**
```powershell
# Re-run environment switch
.\switch-env.ps1 test

# Verify
Get-Content .env | Select-String "SQL_SERVER_DATABASE"

# Should show: SQL_SERVER_DATABASE=InventoryManagementDB_TEST
```

### Issue 3: Environment Variables Not Updating

**Symptom:** Changes to `.env` don't take effect

**Cause:** Vite bakes environment variables at **build time**

**Solution:**
```powershell
# You MUST rebuild after changing .env
npm run build
npm run preview
```

---

## 📝 Environment Comparison

| Setting | Development | Test | Production |
|---------|------------|------|------------|
| **Config File** | `.env-development` | `.env-test` | `.env-production` |
| **Database** | InventoryManagementDB | InventoryManagementDB_TEST | InventoryManagementDB |
| **SQL User** | Windows Auth | inventoryusertest | (production user) |
| **Backend Port** | 3001 | 5001 | 5000 |
| **Frontend Port** | 8080 | 4173 | 80 |
| **API URL** | http://localhost:3001 | http://localhost:5001 | https://api.yourdomain.com |
| **NODE_ENV** | development | test | production |

---

## 🔄 Switching Between Environments

```powershell
# Switch to development
.\switch-env.ps1 dev
npm run dev:full

# Switch to test
.\switch-env.ps1 test
npm run test:full

# Switch to production
.\switch-env.ps1 prod
npm run prod:full
```

**Remember:** Each switch:
1. Backs up current `.env` to `.env.backup.TIMESTAMP`
2. Copies `.env-{environment}` to `.env`
3. Displays configuration summary

---

## 🎯 Test Environment Benefits

✅ **Full Production Data**: Exact copy with 278 users, 15 items, tenders, etc.
✅ **Safe Testing**: No risk to production database
✅ **Realistic Demo**: Show boss actual data structure
✅ **Isolated**: Separate SQL user, ports, and database
✅ **Version Controlled**: `.env-test` committed to Git

---

## 📊 Verify Test Database

```powershell
# Check test database has data
sqlcmd -S localhost -U inventoryusertest -P "2016Wfp61@" -d InventoryManagementDB_TEST -Q "
SELECT 'AspNetUsers' as Table, COUNT(*) as Rows FROM AspNetUsers
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'item_masters', COUNT(*) FROM item_masters
UNION ALL
SELECT 'tenders', COUNT(*) FROM tenders
"
```

**Expected output:**
```
Table          Rows
AspNetUsers    147
users          278
item_masters   15
tenders        1
```

---

## 🆘 Need to Recreate Test Database?

```powershell
# Option 1: Full clone with all data
sqlcmd -S localhost -U sa -P "1978Jupiter87@#" -i clone-database-with-data.sql

# Option 2: Empty test database (for clean testing)
sqlcmd -S localhost -U sa -P "1978Jupiter87@#" -i create-and-setup-test-database-complete.sql
```

---

## ✅ Checklist for Test Environment

Before presenting to boss:

- [ ] Test database cloned successfully
- [ ] `.env-test` configured correctly
- [ ] `.\switch-env.ps1 test` executed
- [ ] Verified `.env` contains test settings
- [ ] Backend connects to InventoryManagementDB_TEST
- [ ] Frontend built with correct API URL (http://localhost:5001)
- [ ] Can login at http://localhost:4173
- [ ] All features working (inventory, tenders, etc.)
- [ ] No errors in browser console

---

## 🎬 Presentation Day Commands

```powershell
# 1. Switch to test environment
.\switch-env.ps1 test

# 2. Kill any running processes
taskkill /f /im node.exe

# 3. Start everything
npm run test:full

# 4. Wait for servers to start (30-60 seconds)

# 5. Open browser
start http://localhost:4173

# 6. Login and demonstrate!
```

---

## 📞 Support

If issues occur:
1. Check `.env` file contents
2. Verify test database exists
3. Restart backend/frontend
4. Rebuild frontend after environment changes
5. Check console logs for errors

**Remember: Test environment = `.env-test` → `.env` → Application**
