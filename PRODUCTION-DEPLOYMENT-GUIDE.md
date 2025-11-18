# Production Server Deployment Instructions
# Server: 172.20.150.34
# Date: November 18, 2025

## Prerequisites
- Ensure you're logged into the production server (172.20.150.34)
- Backend server should be running on localhost:3001
- Apache (XAMPP) should be running

## Deployment Steps

### Step 1: Navigate to project directory
```powershell
cd C:\ims-v1
```

### Step 2: Pull latest changes
```powershell
git pull origin invmisdb-rebuild-sept14-2025
```

### Step 3: Run the automated deployment script
```powershell
.\deploy-to-production.ps1
```

The script will:
1. Pull latest code from GitHub
2. Check/install dependencies if needed
3. Build the application (npm run build)
4. Backup existing deployment
5. Copy new build to C:\xampp\htdocs\ims

### Alternative: Manual Deployment

If you prefer to deploy manually:

```powershell
# Pull latest changes
git pull origin invmisdb-rebuild-sept14-2025

# Build the application
npm run build

# Backup existing deployment (optional)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "C:\xampp\htdocs\ims" -Destination "C:\xampp\htdocs\ims_backup_$timestamp" -Recurse -Force

# Deploy new build
Copy-Item -Path "dist\*" -Destination "C:\xampp\htdocs\ims" -Recurse -Force
```

## Verification Steps

### 1. Check Apache is running
- Open XAMPP Control Panel
- Ensure Apache is running (green indicator)

### 2. Check Backend is running
```powershell
# In a new PowerShell window
cd C:\ims-v1
node backend-server.cjs
```

### 3. Test the Application
Open a browser and navigate to:
```
http://localhost/ims/
```

### 4. Login and Test Pages
- Username: test-admin-001
- Password: Admin@123

Test these pages specifically:
- Dashboard
- Inventory Details (this was the main CORS issue)
- Stock Operations
- Tender Management

### 5. Check for CORS Errors
- Open Browser Developer Tools (F12)
- Go to Console tab
- Navigate through the application
- Verify NO CORS errors appear
- Check Network tab - API calls should go to `/ims/api/*` not `localhost:3001`

## Troubleshooting

### If build fails:
```powershell
# Clear node_modules and rebuild
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

### If CORS errors still appear:
1. Hard refresh browser: `Ctrl + F5`
2. Clear browser cache
3. Check Apache mod_rewrite is enabled
4. Verify .htaccess file exists in C:\xampp\htdocs\ims

### If backend connection fails:
1. Ensure backend is running on port 3001
2. Check firewall settings
3. Verify SQL Server connection

## Expected Results

✅ Application loads at http://localhost/ims/
✅ Login works correctly
✅ All pages load without CORS errors
✅ API calls use /ims/api/* endpoint
✅ Data loads from SQL Server successfully
✅ No console errors related to API calls

## Rollback Procedure

If deployment has issues:
```powershell
# Find latest backup
Get-ChildItem C:\xampp\htdocs\ims_backup_* | Sort-Object Name -Descending | Select-Object -First 1

# Restore backup (replace timestamp)
Copy-Item -Path "C:\xampp\htdocs\ims_backup_YYYYMMDD_HHMMSS\*" -Destination "C:\xampp\htdocs\ims" -Recurse -Force
```

## Commit Information
- Latest commit: 063b5b1 (feat: Add production deployment script)
- Branch: invmisdb-rebuild-sept14-2025
- Files fixed: 72 files with API URL corrections + 10 files with import fixes

## Support
If you encounter any issues, check:
1. Git commit logs: `git log --oneline -10`
2. Build output for specific errors
3. Browser console for client-side errors
4. Backend logs for server-side errors
