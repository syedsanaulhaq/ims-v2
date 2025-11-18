# Production Server Deployment Instructions
## Deploy API URL Fixes (November 18, 2025)

### Overview
This deployment fixes all CORS errors by replacing hardcoded API URLs with environment-aware URLs that use the Apache proxy in production.

### What This Fixes
- ✅ All CORS errors on all pages
- ✅ Inventory Details page (was showing errors)
- ✅ Stock Operations, Tenders, Categories, and all other pages
- ✅ 72 files updated across the entire application

---

## 🚀 Quick Deployment (Recommended)

### On Production Server (172.20.150.34):

1. **Open PowerShell as Administrator**
   ```powershell
   # Right-click PowerShell -> Run as Administrator
   ```

2. **Navigate to repository**
   ```powershell
   cd C:\ims-v1
   ```

3. **Run the deployment script**
   ```powershell
   .\deploy-api-url-fixes.ps1
   ```

4. **Follow the on-screen instructions**
   - Script will automatically:
     - Pull latest changes from GitHub
     - Build the application
     - Create backup of current deployment
     - Deploy to `C:\xampp\htdocs\ims\`
     - Verify Apache is running

5. **Test the deployment**
   - Open: http://localhost/ims/
   - Press **Ctrl+F5** to hard refresh
   - Login with test-admin-001
   - Click on "Inventory Details" - should load without CORS errors
   - Check browser console (F12) - should see NO red CORS errors
   - Verify API calls use `/ims/api/*` (not `localhost:3001`)

---

## 🔧 Manual Deployment (Alternative)

If you prefer to run steps manually:

### Step 1: Pull Changes
```powershell
cd C:\ims-v1
git checkout invmisdb-rebuild-sept14-2025
git pull origin invmisdb-rebuild-sept14-2025
```

### Step 2: Rebuild Application
```powershell
npm run build
```

### Step 3: Deploy to Apache
```powershell
# Backup current deployment (optional)
Copy-Item C:\xampp\htdocs\ims C:\xampp\htdocs\ims_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss') -Recurse

# Deploy new build
Remove-Item C:\xampp\htdocs\ims -Recurse -Force
Copy-Item dist C:\xampp\htdocs\ims -Recurse
```

### Step 4: Test
- Open browser: http://localhost/ims/
- Hard refresh: Ctrl+F5
- Test all pages

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Dashboard loads correctly
- [ ] Inventory Details page works (no CORS errors)
- [ ] Stock Operations page works
- [ ] Tender Management works
- [ ] Browser console shows NO CORS errors
- [ ] Network tab shows API calls to `/ims/api/*` (not `localhost:3001`)
- [ ] Logo displays correctly at `/ims/ecp-logo.png`

---

## 🐛 Troubleshooting

### If you see CORS errors:
1. Check backend is running:
   ```powershell
   # Should see node process running on port 3001
   netstat -ano | findstr :3001
   ```

2. Verify Apache proxy works:
   ```powershell
   # Should return user session data
   curl http://localhost/ims/api/session
   ```

3. Check .htaccess file exists:
   ```powershell
   Test-Path C:\xampp\htdocs\ims\.htaccess
   # Should return: True
   ```

### If build fails:
1. Clear node_modules and rebuild:
   ```powershell
   Remove-Item node_modules -Recurse -Force
   npm install
   npm run build
   ```

### If pages don't load:
1. Hard refresh browser (Ctrl+F5)
2. Clear browser cache completely
3. Try incognito/private window

### Restore Previous Version:
```powershell
# If deployment has issues, restore backup
Remove-Item C:\xampp\htdocs\ims -Recurse -Force
Copy-Item C:\xampp\htdocs\ims_backup_YYYYMMDD_HHMMSS C:\xampp\htdocs\ims -Recurse
```

---

## 📊 Technical Details

### What Changed:
- **Commit**: 357a96e and 5d8c13f
- **Branch**: invmisdb-rebuild-sept14-2025
- **Files Modified**: 72
- **Lines Changed**: 858 insertions, 205 deletions

### Key Changes:
1. All services now import `getApiBaseUrl()` from `@/services/invmisApi.ts`
2. Pages use `const apiBase = getApiBaseUrl()` instead of hardcoded URLs
3. All `fetch('http://localhost:3001/api/...')` replaced with ``fetch(`${apiBase}/...`)``
4. Environment detection:
   - **Development**: Uses `http://localhost:3001/api`
   - **Production**: Uses `/ims/api` (Apache proxy)

### Files Fixed:
- Pages: Dashboard, InventoryDetails, ItemMaster, Categories, Tenders, Stock Operations, etc.
- Components: ApprovalForwarding, Stock Transactions, Tender components, Setup wizards
- Services: All API service files (inventory, stock, approvals, deliveries, etc.)

---

## 📞 Support

If you encounter issues:
1. Check this document's troubleshooting section
2. Review the deployment script output for errors
3. Check Apache error logs: `C:\xampp\apache\logs\error.log`
4. Check backend console output for API errors

---

**Deployment Date**: November 18, 2025  
**Deployed By**: [Your Name]  
**Status**: ✅ Ready for deployment
