# Fix Production Server - Authentication Not Working

## Problem
Postman returning `{"success": false, "message": "Invalid username or password"}`

## Root Cause
Production server (172.20.150.34) is running **OLD CODE** that hasn't been updated with the password hash fix.

---

## Solution: Update Production Server

### 1. Connect to Production Server
```
Remote Desktop to: 172.20.150.34
```

### 2. Stop Current Backend
```powershell
# Open PowerShell as Administrator
Get-Process node | Stop-Process -Force
```

### 3. Pull Latest Code
```powershell
cd C:\ims-v1

# Pull latest code with backend fix
git pull origin stable-nov11-production

# Verify you got commit 61dd2e0 (the fix)
git log --oneline -5
```

You should see:
```
595dece Add testing scripts and Postman collection
61dd2e0 Fix DS auth to prioritize PasswordHash field
01e5576 Add comprehensive deployment documentation
e18cbbe Add diagnostic scripts for database verification
...
```

### 4. Check Database Connection

**IMPORTANT:** Verify production backend is connecting to the correct database!

Open `backend-server.cjs` and check line ~100-120 for database config:

```javascript
const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',  // <-- Should be YOUR SQL Server
  database: 'InventoryManagementDB_TEST',  // <-- Should be YOUR production database
  ...
};
```

**If database name is different**, you need to check user password in that database!

### 5. Update User Password in Production Database

Run this script on the production server:

```powershell
cd C:\ims-v1

# This will update the password with bcrypt hash
node update-user-password.cjs
```

Expected output:
```
✅ Password updated successfully!
🔐 Password verification: ✅ VALID
✅ SUCCESS! User can now login with:
   Username: 3740560772543
   Password: P@ssword@1
```

### 6. Start Backend
```powershell
cd C:\ims-v1

# Start backend in foreground (to see logs)
node backend-server.cjs
```

You should see:
```
🚀 IMS Backend Server
📍 Running on: http://localhost:3001
✅ SQL Server pool connected
```

### 7. Test with Postman

Now test again with Postman:
- URL: `http://172.20.150.34:3001/api/auth/ds-authenticate`
- Method: POST
- Body (raw JSON):
```json
{
    "UserName": "3740560772543",
    "Password": "P@ssword@1"
}
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "message": "Authentication successful",
    "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## If Still Not Working

### Check Backend Logs
Look at the PowerShell window where backend is running. You should see:
```
🔐 DS Authentication Request Received
🔍 Authenticating user with UserName: 3740560772543
✅ User found: Muhammad Saad Ali (3740560772543)
   Password field: EXISTS (length: 60)
   PasswordHash field: EXISTS (length: 60)
🔓 Password verification: ✅ Valid
✅ JWT token generated for user: 3740560772543
```

If you see `❌ Password verification failed`, the password hash is still wrong.

### Verify Database User Manually
```powershell
# Copy check-server-user.cjs to production server
# Edit line 8-10 to match production database name
# Run it:
node check-server-user.cjs
```

Should show:
```
✅ Authentication SHOULD WORK
Backend is checking: PasswordHash
```

---

## Quick Checklist

- [ ] Git pull completed (commit 595dece or later)
- [ ] User password updated with update-user-password.cjs
- [ ] Backend restarted with `node backend-server.cjs`
- [ ] Postman test returns 200 OK with JWT token
- [ ] Backend logs show "✅ Password verification: ✅ Valid"

---

## Contact Points

If authentication still fails after these steps, check:

1. **Database Name**: Production might use `InventoryManagementDB` (not `_TEST`)
2. **SQL Server**: Production might use different server name
3. **User Active**: ISACT column must be 1 (not 0 or NULL)
4. **Password Hash**: Must be bcrypt format starting with `$2b$10$`

Run diagnostic: `node check-server-user.cjs` (edit database config first)
