# 🚀 Quick Start Commands - InvMIS

## 📦 NPM Scripts Reference

### **🔥 Full Stack Commands (Recommended)**

These commands automatically switch environment and start both backend + frontend:

```bash
# Development (Port 3001/8080, Hot Reload)
npm run dev:full

# Testing/Staging (Port 5001/8081, Production Build)
npm run test:full

# Production (Port 5000/80, Optimized Build)
npm run prod:full
```

**What they do**:
- ✅ Switch to correct `.env` file
- ✅ Build frontend (test/prod only)
- ✅ Start backend server
- ✅ Start frontend (dev server or preview)
- ✅ Run both concurrently

---

### **🔄 Environment Switching (Only)**

Switch environment without starting servers:

```bash
npm run switch:dev    # Switch to development
npm run switch:test   # Switch to test/staging
npm run switch:prod   # Switch to production
```

After switching, manually start:
```bash
npm run backend    # Start backend
npm run dev        # Start frontend (dev mode)
# OR
npm run preview    # Start frontend (production mode)
```

---

### **⚡ Individual Component Scripts**

```bash
# Frontend only
npm run dev          # Development server (hot reload)
npm run build        # Build for production
npm run preview      # Preview production build

# Backend only
npm run backend      # Start API server

# Both together (manual)
npm run dev:full     # Development mode
```

---

## 🎯 Common Workflows

### **Daily Development**
```bash
npm run dev:full
# Access: http://localhost:8080
# Backend: http://localhost:3001
```

### **Boss Presentation / Demo**
```bash
# 1. Create test database (if not exists)
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-full-clone-test-database.sql

# 2. Start in test mode
npm run test:full

# Access: http://localhost:8081
# Backend: http://localhost:5001
```

### **Production Deployment**
```bash
# Review .env-production first!
npm run prod:full

# Access: http://localhost (port 80)
# Backend: http://localhost:5000
```

---

## 📊 Environment Comparison

| Command | Environment | Database | Backend Port | Frontend Port | Frontend Mode |
|---------|-------------|----------|--------------|---------------|---------------|
| `npm run dev:full` | Development | InventoryManagementDB | 3001 | 8080 | Hot Reload |
| `npm run test:full` | Test | InventoryManagementDB_TEST | 5001 | 8081 | Production Build |
| `npm run prod:full` | Production | InventoryManagementDB | 5000 | 80 | Production Build |

---

## 🛠️ Troubleshooting

### **Port Already in Use**
```powershell
# Kill all Node processes
taskkill /f /im node.exe

# Then restart
npm run dev:full
```

### **Wrong Database Connected**
```bash
# Check current environment
npm run switch:dev    # or test, or prod

# Verify .env file
Get-Content .env | Select-String "DB_NAME=|PORT="
```

### **Environment Not Switching**
```powershell
# Manual switch
.\switch-env.ps1 dev    # or test, or prod

# Then restart servers
npm run dev:full
```

### **Backend Not Loading New Environment**
```powershell
# Kill Node processes
taskkill /f /im node.exe

# Restart with correct environment
npm run test:full
```

---

## 💡 Pro Tips

### **1. Clean Start**
```bash
# Kill everything and restart fresh
taskkill /f /im node.exe
npm run dev:full
```

### **2. Quick Environment Check**
```powershell
# See current environment
Get-Content .env | Select-String "NODE_ENV=|DB_NAME=|PORT="
```

### **3. Database Operations**
```powershell
# Clone production to test
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-full-clone-test-database.sql

# Check databases
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -Q "SELECT name FROM sys.databases WHERE name LIKE '%Inventory%'"
```

### **4. Separate Terminal Workflow**
If you prefer separate terminals:

**Terminal 1 (Backend)**:
```bash
npm run switch:test
npm run backend
```

**Terminal 2 (Frontend)**:
```bash
npm run build    # Only needed once for preview
npm run preview
```

---

## 📝 Script Details

### **dev:full**
- Switches to `.env` (development)
- Starts backend on port 3001
- Starts Vite dev server on port 8080
- Hot reload enabled
- Debug logging enabled

### **test:full**
- Switches to `.env-test` (testing)
- Builds frontend for production
- Starts backend on port 5001
- Starts preview server on port 8081
- Uses InventoryManagementDB_TEST
- Perfect for demos

### **prod:full**
- Switches to `.env-production` (production)
- Builds frontend for production
- Starts backend on port 5000
- Starts preview server on port 80
- All optimizations enabled
- Security features active

---

## 🔐 Security Notes

### **Development**
- ✅ Relaxed CORS
- ✅ Verbose logging
- ✅ Debug mode enabled
- ⚠️ Not for production!

### **Test**
- ✅ Uses cloned database
- ✅ Separate ports
- ✅ Safe for demos
- ℹ️ No impact on production

### **Production**
- ✅ All security enabled
- ✅ Rate limiting active
- ✅ Minimal logging
- ⚠️ Update secrets first!

---

## 🎯 Quick Reference Card

```
DEVELOPMENT:  npm run dev:full   → localhost:8080  (DB: InventoryManagementDB)
TESTING:      npm run test:full  → localhost:8081  (DB: InventoryManagementDB_TEST)
PRODUCTION:   npm run prod:full  → localhost:80    (DB: InventoryManagementDB)

SWITCH ONLY:  npm run switch:dev | switch:test | switch:prod
KILL ALL:     taskkill /f /im node.exe
CHECK ENV:    Get-Content .env | Select-String "NODE_ENV=|DB_NAME="
```

---

## 📂 Related Files

- `.env` - Active environment (current)
- `.env-development` - Development template
- `.env-test` - Test/staging template
- `.env-production` - Production template
- `switch-env.ps1` - Environment switcher script
- `ENVIRONMENT-GUIDE.md` - Detailed environment documentation
- `package.json` - All npm scripts defined here

---

## 🆘 Common Issues

**Q: "npm run test:full doesn't work"**  
A: Make sure InventoryManagementDB_TEST exists. Run the clone script first.

**Q: "Backend connects to wrong database"**  
A: Kill Node processes (`taskkill /f /im node.exe`) and restart.

**Q: "Frontend shows old data"**  
A: Clear browser cache or use incognito mode.

**Q: "Port already in use"**  
A: Kill all Node processes and try again.

---

**Happy coding! 🚀**

For detailed documentation, see `ENVIRONMENT-GUIDE.md`
