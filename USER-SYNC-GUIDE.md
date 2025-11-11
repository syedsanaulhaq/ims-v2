# User Sync Guide: DS → IMS

## Overview

Keep IMS AspNetUsers table synchronized with Digital System (DS) database.

---

## ✅ Simple Architecture (Current)

```
┌─────────────────────────┐
│ DigitalSystemDB         │
│ AspNetUsers (MASTER)    │ ←─ Users login here
└────────────┬────────────┘
             │
             │ Periodic Sync
             │ (Daily/Weekly)
             ↓
┌─────────────────────────┐
│ InventoryManagementDB   │
│ AspNetUsers (COPY)      │ ←─ SSO validates here
└─────────────────────────┘
```

**Benefits:**
- ✅ Simple architecture
- ✅ Fast queries (local database)
- ✅ IMS works independently
- ✅ No complex cross-database queries

---

## 🔄 Manual Sync (Run Anytime)

### Run the sync script:

```bash
node sync-users-from-ds.cjs
```

### Expected output:

```
============================================================
  AspNetUsers Sync: DS → IMS
============================================================

🔗 Connecting to DS database: DigitalSystemDB
✅ Connected to DS database

📥 Fetching users from DS database...
✅ Found 15 users in DS database

🔗 Connecting to IMS database: InventoryManagementDB
✅ Connected to IMS database

🔄 Syncing users to IMS database...
  ✅ Added new user: john.doe
  ♻️  Updated user: jane.smith
  ♻️  Updated user: admin.user
  ...

============================================================
✅ User sync completed!
============================================================
📊 Summary:
   • Total users in DS: 15
   • New users added: 1
   • Existing users updated: 14
   • Errors: 0
============================================================

🔌 DS database connection closed
🔌 IMS database connection closed
✅ Script completed successfully
```

---

## ⏰ Scheduled Sync (Automatic)

### Option 1: Windows Task Scheduler

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task**
   - Click "Create Basic Task"
   - Name: "IMS User Sync"
   - Description: "Sync AspNetUsers from DS to IMS"

3. **Set Trigger**
   - Choose frequency: Daily, Weekly, or On startup
   - Recommended: **Daily at 1:00 AM**

4. **Set Action**
   - Action: "Start a program"
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `E:\ECP-Projects\inventory-management-system-ims\ims-v1\sync-users-from-ds.cjs`
   - Start in: `E:\ECP-Projects\inventory-management-system-ims\ims-v1`

5. **Finish**
   - Review settings
   - Check "Open properties dialog"
   - Under "Conditions" → Uncheck "Start only if on AC power"

---

### Option 2: PowerShell Scheduled Job

Create a scheduled task via PowerShell:

```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "node.exe" `
    -Argument "E:\ECP-Projects\inventory-management-system-ims\ims-v1\sync-users-from-ds.cjs" `
    -WorkingDirectory "E:\ECP-Projects\inventory-management-system-ims\ims-v1"

$trigger = New-ScheduledTaskTrigger -Daily -At 1am

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "IMS_UserSync" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Sync AspNetUsers from DS to IMS"
```

---

### Option 3: Node-cron (Within Backend)

Add to `backend-server.cjs` (if you want sync to run with server):

```javascript
const cron = require('node-cron');

// Run sync every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Starting scheduled user sync...');
  try {
    // Import and run sync function
    const { syncUsers } = require('./sync-users-from-ds.cjs');
    await syncUsers();
    console.log('✅ Scheduled sync completed');
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
  }
});
```

Install node-cron:
```bash
npm install node-cron
```

---

## 📅 Recommended Sync Frequency

### For Most Scenarios:
- **Daily at 1-2 AM** - Ensures fresh data every morning

### For High-Traffic:
- **Every 6 hours** - 4 times per day
- Cron: `0 */6 * * *`

### For Low User Changes:
- **Weekly (Sunday night)** - Once per week
- Cron: `0 1 * * 0`

### Manual Trigger:
- After adding new users to DS
- Before important operations
- When SSO login fails for a user

---

## 🔍 Monitoring

### Check Last Sync:

```sql
-- In IMS database
SELECT 
    COUNT(*) as TotalUsers,
    MAX(CAST(ConcurrencyStamp AS DATETIME)) as LastUpdated
FROM AspNetUsers
```

### Compare User Counts:

```sql
-- DS Database
SELECT COUNT(*) as DS_Users FROM DigitalSystemDB.dbo.AspNetUsers

-- IMS Database  
SELECT COUNT(*) as IMS_Users FROM InventoryManagementDB.dbo.AspNetUsers
```

---

## ⚠️ Troubleshooting

### "User not found" error during SSO login

**Cause:** User exists in DS but not synced to IMS yet

**Solution:**
```bash
# Run immediate sync
node sync-users-from-ds.cjs
```

---

### Sync script fails with connection error

**Check:**
1. ✅ DS database name is correct in `.env.sqlserver`
2. ✅ Credentials have access to both databases
3. ✅ SQL Server is running
4. ✅ No firewall blocking connection

**Test connection:**
```bash
sqlcmd -S SYED-FAZLI-LAPT -d DigitalSystemDB -U inventorymanagementuser -P 2016Wfp61@
```

---

### Partial sync (some users not syncing)

**Check script output for specific error messages**

Common issues:
- NULL values in required fields
- Invalid data types
- Constraint violations

**Fix individual user:**
```sql
-- In DS database, check user data
SELECT * FROM AspNetUsers WHERE UserName = 'problematic.user'
```

---

## 📋 Configuration

### Current Settings (`.env.sqlserver`):

```env
# IMS Database
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@

# DS Database (for sync)
DS_SQL_SERVER_HOST=SYED-FAZLI-LAPT
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=inventorymanagementuser
DS_SQL_SERVER_PASSWORD=2016Wfp61@
```

**If DS uses different credentials, update the `DS_*` variables.**

---

## ✅ Best Practices

1. **Regular Sync:** Schedule daily sync at off-peak hours
2. **Monitor Logs:** Check sync output for errors
3. **Test First:** Run manual sync after DS database changes
4. **Backup:** Keep database backups before bulk operations
5. **Alert:** Set up email/SMS alerts for sync failures

---

## 🎯 Quick Commands

```bash
# Run manual sync
node sync-users-from-ds.cjs

# Check IMS users
sqlcmd -S SYED-FAZLI-LAPT -d InventoryManagementDB -Q "SELECT COUNT(*) FROM AspNetUsers"

# Check DS users
sqlcmd -S SYED-FAZLI-LAPT -d DigitalSystemDB -Q "SELECT COUNT(*) FROM AspNetUsers"

# View recent users in IMS
sqlcmd -S SYED-FAZLI-LAPT -d InventoryManagementDB -Q "SELECT TOP 5 UserName, OfficeName FROM AspNetUsers ORDER BY UserName"
```

---

## Summary

**Current Setup:**
- ✅ SSO validates against IMS database (simple, fast)
- ✅ Sync script ready: `sync-users-from-ds.cjs`
- ✅ Can run manually or scheduled
- ✅ No cross-database queries needed

**Your Next Step:**
Set up **daily scheduled task** to run sync automatically!
