# 🎯 QUICK REFERENCE - InvMIS Staging Presentation

## 🚀 ONE-COMMAND DEPLOYMENT
```powershell
.\deploy-staging-presentation.ps1
```
*Wait 3-5 minutes, browser opens automatically*

---

## 🌐 ACCESS
- **App**: http://localhost:8080
- **API**: http://localhost:3001

---

## 👤 LOGIN
Use your production credentials
(All users copied to test DB)

---

## 🎬 DEMO FLOW (20 minutes)

### 1. Login & Dashboard (2 min)
- Show clean interface
- Highlight navigation

### 2. Inventory (5 min)
- Show empty inventory table
- Create new item
- View item details page

### 3. Stock Operations (5 min)
- Create issuance request
- View request details
- Show approval workflow

### 4. Stock Monitoring (3 min)
- Show stock quantities
- Explain color codes
- Display statistics

### 5. Q&A (5 min)

---

## 🛠️ EMERGENCY FIXES

### Restart Everything
```powershell
taskkill /f /im node.exe
.\deploy-staging-presentation.ps1
```

### Reset Database Only
```powershell
sqlcmd -S SYED-FAZLI-LAPT -U sa -P "1978Jupiter87@#" -i create-and-setup-test-database-complete.sql
```

### Check Status
```powershell
# Backend
curl http://localhost:3001/api/health

# Frontend  
curl http://localhost:8080
```

---

## ✅ PRE-PRESENTATION CHECKLIST
- [ ] Run deployment 30 min early
- [ ] Test login
- [ ] Test item creation
- [ ] Check all pages load
- [ ] Close unnecessary apps
- [ ] Have backup screenshots

---

## 🎯 KEY SELLING POINTS
✅ Modern tech (React + SQL Server)
✅ Clean architecture
✅ User-friendly interface
✅ Production-ready
✅ Secure & scalable

---

## 📊 FEATURES TO HIGHLIGHT
1. **Empty inventory** (clean demo)
2. **Table format** (better UX)
3. **Item details page** (comprehensive)
4. **Stock operations** (full workflow)
5. **Real-time monitoring** (live data)
6. **Approval system** (role-based)

---

## 🆘 IF THINGS GO WRONG
1. Close PowerShell windows
2. Run: `taskkill /f /im node.exe`
3. Run: `.\deploy-staging-presentation.ps1`
4. Wait 5 minutes
5. Continue presentation

---

## 📝 NOTES SPACE
(Write your points here before presentation)

---

**Good Luck! 🚀**
*You got this!*
