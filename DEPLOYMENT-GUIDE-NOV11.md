# Production Deployment Instructions - November 11, 2025 Stable Version

## ✅ This is the CLEAN, WORKING version from November 11, 2025

### Features Included:
- ✅ Complete DS Pattern SSO implementation
- ✅ Stock Issuance Workflow
- ✅ All approval features (forwarding, hierarchy, etc.)
- ✅ Clean code - NO deployment path issues
- ✅ Running on ROOT (/) in development
- ✅ Deploys to /ims in production

---

## 🚀 Deployment Steps (Run on Server)

### Option 1: Automated Deployment (Recommended)

```powershell
# 1. Navigate to project directory on server
cd C:\ims-v1

# 2. Pull latest stable version
git fetch origin
git checkout stable-nov11-production
git pull origin stable-nov11-production

# 3. Run deployment script
.\deploy-to-server.ps1
```

### Option 2: Manual Deployment

```powershell
# 1. Navigate to project
cd C:\ims-v1

# 2. Pull code
git checkout stable-nov11-production
git pull

# 3. Install dependencies
npm install

# 4. Build production
$env:NODE_ENV = "production"
npm run build

# 5. Deploy to htdocs/ims
Copy-Item -Path "dist\*" -Destination "C:\xampp\htdocs\ims\" -Recurse -Force

# 6. Start backend
node backend-server.cjs

# 7. Restart Apache
C:\xampp\apache_start.bat
```

---

## 🌐 Access URLs

- **Frontend:** http://172.20.150.34/
- **Backend API:** http://172.20.150.34:3001

---

## 📋 Verification Checklist

- [ ] Frontend loads at /ims/ path
- [ ] Login works (testadmin / admin123)
- [ ] Dashboard displays correctly
- [ ] API calls work (check browser console)
- [ ] Backend running on port 3001
- [ ] Apache running on port 80
- [ ] No console errors

---

## 🔧 Configuration Details

### Development (Local)
- Base path: `/` (root)
- Frontend: http://localhost:8080/
- Backend: http://localhost:3001/
- Command: `npm run dev:full`

### Production (Server)
- Base path: `/` (root)
- Frontend: http://172.20.150.34/
- Backend: http://172.20.150.34:3001/
- Command: `.\deploy-to-server.ps1`

---

## 🆘 Troubleshooting

### Backend Not Starting
```powershell
# Check if port is in use
netstat -ano | findstr :3001

# Kill existing process
Get-Process -Name node | Stop-Process -Force

# Restart backend
cd C:\ims-v1
node backend-server.cjs
```

### Frontend 404 Errors
```powershell
# Verify files deployed
ls C:\xampp\htdocs\ims\

# Check Apache is running
Get-Process -Name httpd

# Restart Apache
C:\xampp\apache_stop.bat
C:\xampp\apache_start.bat
```

### CORS Errors
- Backend includes: `http://172.20.150.34` in CORS origins
- Check .env.production has correct VITE_API_URL
- Verify backend is accessible at http://172.20.150.34:3001

---

## 📌 Important Notes

1. **This version runs on ROOT in development** - Access at http://localhost:8080/
2. **Deploys to /ims subdirectory in production** - Preserves LMS and other apps
3. **Backend must be running** on port 3001 for API calls to work
4. **Clean milestone** - No deployment path chaos, no hardcoded URLs

---

## 🎯 Next Steps After Deployment

1. Test all features on server
2. Create users if needed
3. Verify database connection
4. Check notifications
5. Test stock operations
6. Verify tender management

---

## 📝 Branch Information

- **Branch:** `stable-nov11-production`
- **Commit:** bece8f1 + deployment config
- **Date:** November 11, 2025
- **Status:** ✅ Production Ready

---

**For issues, check backend logs and browser console first!**
