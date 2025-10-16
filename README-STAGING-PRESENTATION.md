# 🎯 InvMIS Staging Deployment for Presentation

## 📋 Overview
This guide will help you deploy InvMIS to a **staging environment** using a **clean test database** - perfect for presenting to your boss!

## ✨ What This Deployment Does

### ✅ Includes (Copied from Production):
- All user accounts with authentication
- Organizational structure (Offices, Wings, DECs)
- Categories and vendors
- System configuration

### 🆕 Empty Tables (Clean Slate for Demo):
- **Inventory items** (empty - ready for demo)
- **Stock transactions** (empty)
- **Tenders/Acquisitions** (empty)
- **Deliveries** (empty)
- **Stock issuance requests** (empty)

This gives you a **perfect environment** to demonstrate the system from scratch without affecting production data!

## 🚀 Quick Start (5 Minutes)

### Option 1: Automated Deployment (Recommended)
```powershell
# Open PowerShell in the ims-v1 directory
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Run the deployment script
.\deploy-staging-presentation.ps1
```

The script will:
1. ✅ Check prerequisites (Node.js, SQL Server)
2. 🗄️ Create test database (InventoryManagementDB_TEST)
3. ⚙️ Configure environment for staging
4. 📦 Install dependencies
5. 🏗️ Build frontend
6. 🚀 Start backend (port 3001)
7. 🌐 Start frontend (port 8080)
8. 🎉 Open browser automatically

### Option 2: Manual Deployment

```powershell
# 1. Create test database
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-and-setup-test-database-complete.sql

# 2. Update environment
Copy-Item .env.staging .env
# Edit .env and change: DB_NAME=InventoryManagementDB_TEST

# 3. Install dependencies (if needed)
npm install --legacy-peer-deps

# 4. Build frontend
npm run build

# 5. Start backend (in one terminal)
node invmis-api-server.cjs

# 6. Start frontend (in another terminal)
npm run preview
```

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:8080 | Main application interface |
| **Backend API** | http://localhost:3001 | REST API server |
| **Health Check** | http://localhost:3001/api/health | System status |

## 👤 Login Credentials

Use your existing production credentials. All users have been copied to the test database:

```
Username: [your production username]
Password: [your production password]
```

## 🎬 Recommended Presentation Flow

### 1. **Introduction** (2 minutes)
- Open http://localhost:8080
- Show login screen
- Login with credentials

### 2. **Dashboard Overview** (3 minutes)
- Navigate to dashboard
- Show clean, empty inventory
- Highlight navigation menu

### 3. **Inventory Management** (5 minutes)
- **Navigate to**: Inventory Details
- **Show**: Empty inventory table (ready for demo)
- **Demonstrate**: Create new item
  - Go to item creation form
  - Fill in details (name, code, category, specifications)
  - Set stock levels (min/max/reorder point)
  - Save item
- **Show**: Newly created item in inventory table

### 4. **Item Details** (3 minutes)
- **Click**: View Details button on item
- **Show**: Comprehensive item information page
  - Stock information card
  - Quick info (category, status, dates)
  - Specifications and description
  - Color-coded stock levels

### 5. **Stock Operations** (5 minutes)
- **Navigate to**: Stock Operations
- **Create**: New stock issuance request
  - Select items
  - Specify quantities
  - Add justification
  - Submit request
- **Show**: Request in list with status
- **Click**: View Details to show request details page

### 6. **Stock Quantities** (3 minutes)
- **Navigate to**: Stock Quantities
- **Show**: Real-time stock monitoring
  - Summary cards (Total, Out of Stock, Low Stock)
  - Color-coded quantities
  - Status badges

### 7. **Approval System** (3 minutes)
- **Show**: Pending approvals (if any)
- **Demonstrate**: Approval workflow
- **Highlight**: Role-based access control

### 8. **Conclusion** (2 minutes)
- Summarize key features
- Emphasize clean architecture
- Mention SQL Server integration

## 🎯 Key Features to Highlight

### ✨ What Makes InvMIS Special:

1. **Clean Architecture**
   - SQL Server backend (not Supabase)
   - Direct database integration
   - Efficient API design

2. **User-Friendly Interface**
   - Modern React UI with shadcn/ui
   - Responsive design
   - Intuitive navigation

3. **Comprehensive Inventory Management**
   - Item master data
   - Stock tracking
   - Real-time quantities
   - Min/Max/Reorder levels

4. **Stock Operations**
   - Issuance requests
   - Approval workflows
   - Request tracking
   - Detailed view pages

5. **Approval System**
   - Role-based approvals
   - Forwarding capability
   - Audit trail

6. **Organizational Structure**
   - Offices, Wings, DECs
   - User management
   - Multi-level hierarchy

## 🛠️ Troubleshooting

### Backend Not Starting?
```powershell
# Check if port 3001 is in use
Get-NetTCPConnection -LocalPort 3001

# Kill any process on that port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force

# Restart backend
node invmis-api-server.cjs
```

### Frontend Not Loading?
```powershell
# Check if port 8080 is in use
Get-NetTCPConnection -LocalPort 8080

# Rebuild frontend
npm run build

# Restart preview server
npm run preview
```

### Database Connection Issues?
```powershell
# Test SQL Server connection
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -Q "SELECT @@VERSION"

# Recreate test database
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-and-setup-test-database-complete.sql
```

### API Not Responding?
```powershell
# Test API health
Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing

# Check backend logs in the console window
```

## 🔄 Reset/Restart Commands

### Reset Entire Environment
```powershell
# Stop all Node processes
taskkill /f /im node.exe

# Recreate test database (fresh start)
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-and-setup-test-database-complete.sql

# Restart deployment
.\deploy-staging-presentation.ps1
```

### Restart Backend Only
```powershell
# Stop Node processes
taskkill /f /im node.exe

# Start backend
node invmis-api-server.cjs
```

### Restart Frontend Only
```powershell
# Ctrl+C in frontend window, then:
npm run preview
```

## 📊 System Status Checks

### Check Running Services
```powershell
# List Node processes
Get-Process -Name node

# Check ports
Get-NetTCPConnection -LocalPort 3001,8080

# Test API
curl http://localhost:3001/api/health

# Test Frontend
curl http://localhost:8080
```

## 🎓 Demo Tips

### Before Presentation:
1. ✅ Run full deployment 30 minutes early
2. ✅ Test login credentials
3. ✅ Create 1-2 sample items for backup
4. ✅ Test all navigation paths
5. ✅ Have browser bookmarks ready
6. ✅ Close unnecessary applications
7. ✅ Set display to presentation mode

### During Presentation:
1. 💡 Keep both console windows visible (shows activity)
2. 💡 Explain each action before clicking
3. 💡 Highlight color-coded elements
4. 💡 Show real-time updates
5. 💡 Mention future enhancements
6. 💡 Be ready to answer questions

### After Presentation:
1. 📝 Note feedback
2. 📝 Document requested features
3. 🔄 Can reset database for next demo
4. 🗄️ Keep test database for development

## 📁 Important Files

| File | Purpose |
|------|---------|
| `deploy-staging-presentation.ps1` | Automated deployment script |
| `create-and-setup-test-database-complete.sql` | Test database setup |
| `.env.staging` | Staging environment config |
| `invmis-api-server.cjs` | Backend API server |
| `README-STAGING-PRESENTATION.md` | This file |

## 🆘 Emergency Contacts

If something goes wrong during presentation:

1. **Quick Fix**: Close everything, run `deploy-staging-presentation.ps1` again
2. **Database Reset**: Run the SQL script to recreate clean database
3. **Fallback**: Have screenshots/video of working system ready

## 🎉 Success Checklist

Before starting presentation, verify:

- [ ] Test database created (InventoryManagementDB_TEST)
- [ ] Backend running on port 3001
- [ ] Frontend accessible at http://localhost:8080
- [ ] Can login successfully
- [ ] Inventory page loads (empty)
- [ ] Can create new item
- [ ] Item details page works
- [ ] Stock operations page loads
- [ ] All navigation works
- [ ] No console errors

## 📈 Next Steps After Presentation

1. **Gather Feedback** - Note all suggestions
2. **Production Deployment** - If approved, plan production rollout
3. **Training** - Schedule user training sessions
4. **Documentation** - Create user manuals
5. **Support Plan** - Set up helpdesk/support system

## 🎯 Key Selling Points

When presenting to your boss, emphasize:

✅ **Modern Technology Stack** - React, TypeScript, SQL Server
✅ **Clean Architecture** - Separation of concerns, API-driven
✅ **User-Friendly** - Intuitive interface, easy navigation
✅ **Scalable** - Can handle growing data and users
✅ **Secure** - Authentication, role-based access
✅ **Maintainable** - Clean code, proper documentation
✅ **Production-Ready** - Tested, deployed, working
✅ **Cost-Effective** - Uses existing infrastructure

---

## 📞 Support

**Deployment Time**: ~5 minutes automated, ~10 minutes manual

**Ready to Deploy**: Just run `.\deploy-staging-presentation.ps1`

**Good luck with your presentation! 🎉🚀**
