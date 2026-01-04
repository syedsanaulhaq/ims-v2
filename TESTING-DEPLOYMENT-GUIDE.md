# IMS Testing Stage Deployment Guide

## Quick Deployment Steps

### Step 1: Create Testing Directory
```powershell
# Create a new directory for testing (or use existing one)
mkdir C:\ims-testing
cd C:\ims-testing
```

### Step 2: Clone or Copy Code
**Option A: Fresh Clone**
```powershell
git clone https://github.com/syedsanaulhaq/ims-v2.git .
git checkout stable-nov11-production
```

**Option B: Copy from existing installation**
```powershell
# Copy from development environment
Copy-Item E:\ECP-Projects\inventory-management-system-ims\ims-v1\* C:\ims-testing\ -Recurse -Force
```

### Step 3: Install Dependencies
```powershell
cd C:\ims-testing
npm install
```

### Step 4: Configure Environment
Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=testing
```

Or update existing config if present.

### Step 5: Restore Database
```powershell
# Run the SQL restoration script
$scriptPath = "C:\ims-testing\restore-database-production.sql"
$serverName = "SYED-FAZLI-LAPT"
$database = "InventoryManagementDB"
$userId = "inventorymanagementuser"
$password = "2016Wfp61@"

$sqlScript = Get-Content $scriptPath -Raw
$batches = $sqlScript -split "^\s*GO\s*$" -Options Multiline

$sqlConnection = New-Object System.Data.SqlClient.SqlConnection
$sqlConnection.ConnectionString = "Server=$serverName;Database=$database;User Id=$userId;Password=$password;"

try {
    Write-Host "Restoring database..." -ForegroundColor Cyan
    $sqlConnection.Open()
    
    foreach ($batch in $batches) {
        if ($batch.Trim() -ne "") {
            $sqlCommand = New-Object System.Data.SqlClient.SqlCommand
            $sqlCommand.Connection = $sqlConnection
            $sqlCommand.CommandText = $batch
            $sqlCommand.CommandTimeout = 300
            $sqlCommand.ExecuteNonQuery()
        }
    }
    
    Write-Host "Database restoration successful!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
finally {
    $sqlConnection.Close()
}
```

### Step 6: Build
```powershell
cd C:\ims-testing
npm run build
```

### Step 7: Start Testing Server
```powershell
npm run staging:start
```

Or for full control:
```powershell
concurrently "npm run backend" "npm run preview"
```

---

## Verify Testing Setup

### Check Backend
```powershell
# In another PowerShell window
curl http://localhost:3001/api/health
```

### Check Frontend
Access in browser:
```
http://localhost:5173
or
http://localhost:5174
```

---

## Testing Checklist

- [ ] Frontend loads correctly
- [ ] Backend is responding
- [ ] Database connection working
- [ ] Can login with test user
- [ ] Can create individual stock request
- [ ] Can create wing request
- [ ] Wing request shows in Wing HOD approval dashboard
- [ ] Can approve/reject requests
- [ ] Items display correctly in approvals

---

## Useful Testing Commands

```powershell
# Stop all Node processes
taskkill /f /im node.exe

# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# View backend logs (if running in separate window)
npm run backend

# View frontend logs
npm run preview
```

---

## Testing Database Queries

```sql
-- Check wing requests created
SELECT * FROM stock_issuance_requests WHERE request_type = 'Organizational'

-- Check approvals assigned
SELECT * FROM request_approvals WHERE current_approver_id IS NOT NULL

-- Check approval items
SELECT * FROM approval_items

-- Check wing HOD
SELECT Id, Name, HODName, HODName FROM WingsInformation WHERE Id = 19
```

---

## Rollback to Production

If testing completes successfully, production (C:\ims-v2) is already updated with latest code and database schema.

Just restart production server:
```powershell
cd C:\ims-v2
npm run prod:start
```

---

**Ready to test! 🚀**
