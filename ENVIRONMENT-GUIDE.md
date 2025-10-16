# 🌍 Environment Configuration Guide

## 📁 Environment Files Structure

InvMIS now uses a clean three-environment setup:

```
.env              ← ACTIVE (Current environment in use)
.env-development  ← Development configuration
.env-test         ← Testing/Staging configuration
.env-production   ← Production configuration
```

---

## 🎯 Environment Overview

### 1. **Development** (`.env` / `.env-development`)
**Purpose**: Local development and debugging

| Setting | Value |
|---------|-------|
| **Database** | `InventoryManagementDB` |
| **Backend Port** | `3001` |
| **Frontend Port** | `8080` |
| **Logging** | Verbose (debug) |
| **Security** | Relaxed for development |
| **Hot Reload** | Enabled |

**Use When**:
- Developing new features
- Debugging issues
- Local testing
- Daily development work

---

### 2. **Test/Staging** (`.env-test`)
**Purpose**: Testing with production-like data before deployment

| Setting | Value |
|---------|-------|
| **Database** | `InventoryManagementDB_TEST` (Full clone) |
| **Backend Port** | `5001` |
| **Frontend Port** | `8081` |
| **Logging** | Moderate (info level) |
| **Security** | Moderate |
| **Data** | Cloned from production |

**Use When**:
- Boss presentations
- User acceptance testing
- Demo with real data
- Pre-production validation
- Training sessions

**Setup**:
```powershell
# Create test database (full clone)
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-full-clone-test-database.sql
```

---

### 3. **Production** (`.env-production`)
**Purpose**: Live production deployment

| Setting | Value |
|---------|-------|
| **Database** | `InventoryManagementDB` |
| **Backend Port** | `5000` |
| **Frontend Port** | `80` |
| **Logging** | Minimal (error only) |
| **Security** | Strict (all protections enabled) |
| **Data** | Real production data |

**Use When**:
- Live deployment
- Real operations
- Actual business use

**⚠️ Before Using**:
- Change `JWT_SECRET` to secure key
- Change `SESSION_SECRET` to secure key
- Update domain URLs
- Enable SSL/TLS
- Review all security settings

---

## 🔄 Switching Environments

### **Easy Method** (Recommended):

```powershell
# Switch to development
.\switch-env.ps1 dev

# Switch to test/staging
.\switch-env.ps1 test

# Switch to production
.\switch-env.ps1 prod
```

The script will:
- ✅ Backup current `.env`
- ✅ Copy selected environment to `.env`
- ✅ Show current settings
- ✅ Display next steps

### **Manual Method**:

```powershell
# Development
Copy-Item .env-development .env

# Test
Copy-Item .env-test .env

# Production
Copy-Item .env-production .env
```

---

## 🚀 Quick Start Examples

### **Development Workflow**:
```powershell
# 1. Switch to development
.\switch-env.ps1 dev

# 2. Start backend
node invmis-api-server.cjs

# 3. Start frontend (new terminal)
npm run dev

# 4. Access at: http://localhost:8080
```

### **Testing/Demo Workflow**:
```powershell
# 1. Create test database (if not exists)
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-full-clone-test-database.sql

# 2. Switch to test environment
.\switch-env.ps1 test

# 3. Start backend
node invmis-api-server.cjs

# 4. Start frontend (new terminal)
npm run build
npm run preview

# 5. Access at: http://localhost:8081
```

### **Production Deployment**:
```powershell
# 1. Review and update .env-production
# - Change secrets
# - Update URLs
# - Verify security settings

# 2. Switch to production
.\switch-env.ps1 prod

# 3. Start backend
node invmis-api-server.cjs

# 4. Start frontend
npm run build
# Deploy dist/ folder to web server

# 5. Access at production URL
```

---

## 📊 Environment Comparison Table

| Feature | Development | Test | Production |
|---------|------------|------|------------|
| **Database** | InventoryManagementDB | InventoryManagementDB_TEST | InventoryManagementDB |
| **Data** | Dev data | Cloned production | Live production |
| **Backend Port** | 3001 | 5001 | 5000 |
| **Frontend Port** | 8080 | 8081 | 80 |
| **Logging** | Debug (verbose) | Info (moderate) | Error (minimal) |
| **SQL Logging** | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| **Debug Mode** | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| **Hot Reload** | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| **Rate Limiting** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **Caching** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **Compression** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **Helmet Security** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **JWT Expiry** | 24h | 24h | 8h |
| **Password Rounds** | 10 | 10 | 12 |

---

## 🔐 Security Notes

### **Development**:
- ✅ Relaxed settings for ease of development
- ✅ Verbose logging for debugging
- ✅ CORS wide open for testing
- ⚠️ Not for production use!

### **Test**:
- ✅ Moderate security
- ✅ Uses cloned data (safe testing)
- ✅ Separate ports to avoid conflicts
- ℹ️ Good for demos and UAT

### **Production**:
- ✅ All security features enabled
- ✅ Rate limiting active
- ✅ Minimal logging
- ⚠️ Must change default secrets!
- ⚠️ Must use HTTPS/SSL
- ⚠️ Review CORS origins

---

## 📝 Best Practices

### **1. Never Commit Secrets**
- `.env` files are in `.gitignore`
- Always use environment variables
- Never hardcode passwords

### **2. Regular Updates**
- Keep production secrets rotated
- Update test database regularly
- Sync configurations across team

### **3. Testing**
- Always test in TEST environment first
- Use full clone for realistic testing
- Never test directly in production

### **4. Documentation**
- Document any configuration changes
- Keep team informed of environment updates
- Maintain this guide

---

## 🛠️ Troubleshooting

### **Environment not switching?**
```powershell
# Check current environment
Get-Content .env | Select-String "NODE_ENV="

# Force switch
Copy-Item .env-development .env -Force
```

### **Database connection errors?**
```powershell
# Verify database exists
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -Q "SELECT name FROM sys.databases WHERE name LIKE '%Inventory%'"

# Test connection
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -Q "SELECT @@VERSION"
```

### **Port already in use?**
```powershell
# Check what's using the port
Get-NetTCPConnection -LocalPort 3001 -State Listen

# Kill process
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

### **Backend not reading .env?**
```powershell
# Restart Node.js completely
taskkill /f /im node.exe

# Start backend again
node invmis-api-server.cjs
```

---

## 📂 File Locations

| File | Purpose |
|------|---------|
| `.env` | **Active environment** (current) |
| `.env-development` | Development configuration |
| `.env-test` | Test/staging configuration |
| `.env-production` | Production configuration |
| `switch-env.ps1` | Environment switcher script |
| `.env.backup.*` | Automatic backups (timestamped) |

---

## 🎯 Quick Reference Commands

```powershell
# Switch environments
.\switch-env.ps1 dev
.\switch-env.ps1 test
.\switch-env.ps1 prod

# Check current environment
Get-Content .env | Select-String "NODE_ENV=|DB_NAME=|PORT="

# Create test database
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-full-clone-test-database.sql

# Start backend
node invmis-api-server.cjs

# Start frontend (dev)
npm run dev

# Start frontend (preview)
npm run build && npm run preview

# Kill all Node processes
taskkill /f /im node.exe
```

---

## 🎉 Summary

✅ **Three clean environments**: Development, Test, Production  
✅ **Easy switching**: Use `switch-env.ps1` script  
✅ **Safe testing**: Full production clone in TEST  
✅ **Proper isolation**: Separate ports and databases  
✅ **Security-ready**: Production config with best practices  

**Current Setup**:
- `.env` = Development (InventoryManagementDB, port 3001/8080)
- `.env-test` = Testing (InventoryManagementDB_TEST, port 5001/8081)
- `.env-production` = Production (InventoryManagementDB, port 5000/80)

**Happy coding! 🚀**
