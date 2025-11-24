# Deploy to Production Server

## Quick Deployment Steps

### On Production Server (172.20.150.34):

```powershell
# 1. Navigate to project directory
cd C:\ims-v1

# 2. Stop current backend (if running)
Get-Process node | Stop-Process -Force

# 3. Pull latest code from GitHub
git pull origin stable-nov11-production

# 4. Build frontend
npm run build

# 5. Copy built files to web server
xcopy "C:\ims-v1\dist\*" "C:\inetpub\wwwroot\ims\" /E /I /Y

# 6. Start backend server
node backend-server.cjs
```

---

## Latest Changes Deployed

### ✅ Password Authentication Fix (Nov 24, 2025)
- Fixed DS authentication to prioritize `PasswordHash` field
- Updated user `3740560772543` with correct bcrypt password
- Username: `3740560772543`
- Password: `P@ssword@1`

### Files Changed:
- `backend-server.cjs` - Line 7289: Changed to prioritize PasswordHash
- `check-specific-user.cjs` - Script to verify user credentials
- `update-user-password.cjs` - Script to update user passwords

---

## Verification After Deployment

### 1. Check Backend is Running:
```powershell
# Test backend health
Invoke-WebRequest http://localhost:3001/health
```

### 2. Verify Frontend is Accessible:
```
http://172.20.150.34
```

### 3. Test DS Authentication:
```powershell
node check-specific-user.cjs
# Should show: ✅ Password is correct! Authentication should work.
```

### 4. Test Login from DS:
- Login to DS application
- Click "IMS Admin" menu
- Should redirect to IMS without login prompt

---

## Troubleshooting

### Backend Not Starting:
```powershell
# Check if port 3001 is already in use
Get-NetTCPConnection -LocalPort 3001

# Kill process using port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### Frontend Not Loading:
```powershell
# Verify IIS is running
Get-Service W3SVC

# Restart IIS if needed
iisreset
```

### Authentication Issues:
```powershell
# Verify user password in database
node check-specific-user.cjs

# Update user password if needed
node update-user-password.cjs
```

---

## Environment Configuration

### Backend (.env.sqlserver):
```
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB_TEST
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
PORT=3001
```

### Frontend (served from IIS):
- Location: `C:\inetpub\wwwroot\ims\`
- Port: 80 (HTTP)
- API Base URL: `http://172.20.150.34:3001/api`

---

## Maintenance

### Update Password for Another User:
1. Edit `update-user-password.cjs` (lines 18-19):
   ```javascript
   const username = '3740560772543'; // Change to target username
   const password = 'P@ssword@1';    // Change to new password
   ```

2. Run the script:
   ```powershell
   node update-user-password.cjs
   ```

### Backup Before Deployment:
```powershell
# Backup current dist folder
Copy-Item "C:\inetpub\wwwroot\ims" "C:\inetpub\wwwroot\ims_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse
```

---

## Support

For issues or questions, check:
1. Backend logs in PowerShell window
2. Browser console (F12) for frontend errors
3. IIS logs: `C:\inetpub\logs\LogFiles`
