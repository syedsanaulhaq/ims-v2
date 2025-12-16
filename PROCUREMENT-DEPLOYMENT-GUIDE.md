# 🚀 Procurement Workflow - Deployment Guide

## Quick Start Deployment

### Prerequisites
- SQL Server connection to InventoryManagementDB
- Node.js and npm installed
- Git repository access

---

## Step 1: Deploy Database Schema (5 minutes)

### Command
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1
sqlcmd -S <your-server-name> -d InventoryManagementDB -i create-procurement-tables.sql
```

### Expected Output
```
PROCUREMENT TABLES CREATED SUCCESSFULLY
============================================================================
Tables created:
  - procurement_requests
  - procurement_request_items
  - procurement_deliveries
  - procurement_delivery_items

Triggers created:
  - trg_procurement_request_number
  - trg_procurement_delivery_number
  - trg_procurement_requests_update
  - trg_procurement_deliveries_update

Permissions created and assigned to roles
```

### Verify
```sql
-- Check tables created
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'procurement%'

-- Check permissions
SELECT * FROM ims_permissions 
WHERE permission_key LIKE 'procurement%'

-- Check role assignments
SELECT r.role_name, p.permission_key 
FROM ims_role_permissions rp
JOIN ims_roles r ON rp.role_id = r.id
JOIN ims_permissions p ON rp.permission_id = p.id
WHERE p.permission_key LIKE 'procurement%'
ORDER BY r.role_name, p.permission_key
```

---

## Step 2: Deploy Backend (2 minutes)

The backend code is already in `backend-server.cjs` with all 15 endpoints.

### Commands
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Install any missing dependencies (optional)
npm install

# Restart backend server
npm run dev:start
```

### Expected Logs
```
🚀 Server running on http://localhost:3001
📡 Database connected to InventoryManagementDB
✅ Procurement endpoints ready
```

### Test Endpoints
```powershell
# Test creating a procurement request
$headers = @{"Content-Type"="application/json"; "Cookie"="your_session_cookie"}
$body = @{
    wing_id = 1
    wing_name = "Test Wing"
    items = @(
        @{
            item_master_id = 1
            item_nomenclature = "Test Item"
            item_code = "TST001"
            category_name = "Test"
            subcategory_name = "Testing"
            requested_quantity = 100
            unit_of_measurement = "PCS"
        }
    )
    priority = "normal"
    justification = "Test request"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/procurement/requests" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

---

## Step 3: Deploy Frontend (2 minutes)

The frontend code is already integrated in App.tsx and AppSidebar.tsx.

### Commands
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Install any missing dependencies
npm install

# Build for production
npm run build

# Or run development server
npm run dev
```

---

## Step 4: Verify Deployment

### Check Database
```sql
-- Verify tables exist
SELECT COUNT(*) as TableCount FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'procurement%'
-- Should return: 4

-- Verify permissions exist
SELECT COUNT(*) as PermissionCount FROM ims_permissions 
WHERE permission_key LIKE 'procurement%'
-- Should return: 7

-- Verify triggers exist
SELECT COUNT(*) as TriggerCount FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_NAME LIKE 'trg_procurement%'
-- Should return: 4
```

### Test API Endpoints
```powershell
$baseUrl = "http://localhost:3001"

# Test getting pending requests (admin only)
curl -X GET "$baseUrl/api/procurement/requests/pending" `
     -H "Cookie: your_session_cookie"

# Test getting user's requests
curl -X GET "$baseUrl/api/procurement/requests/my-requests" `
     -H "Cookie: your_session_cookie"
```

### Check Frontend
1. Log in as different user types:
   - **Wing User** → Should see: "Request Stock", "Stock Requests" in Personal Menu
   - **Admin** → Should see: "Review Requests" in Procurement Menu

2. Create a test request:
   - Wing user: Click "Request Stock"
   - Add items
   - Click "Submit Request"

3. Review request:
   - Admin: Click "Review Requests"
   - Select pending request
   - Click "Review"
   - Adjust quantities and approve

---

## Troubleshooting

### Database Migration Fails
```
Error: "Incorrect syntax near 'X'"
```
**Solution:** 
- Check SQL Server version (SQL Server 2016+ required)
- Ensure user has CREATE TABLE, CREATE TRIGGER permissions
- Check that InventoryManagementDB exists and is online

### API Endpoints Return 401
```
Error: "Not authenticated"
```
**Solution:**
- Check session cookie is being sent
- Verify user is logged in
- Check CORS headers in browser console

### Menu Items Don't Appear
```
"Request Stock" not visible
```
**Solution:**
- Check user has `procurement.request` permission
- Clear browser cache
- Verify AppSidebar.tsx was deployed
- Check browser console for JavaScript errors

### Stock Not Added on Receipt
```
Wing inventory not updated after delivery
```
**Solution:**
- Check `inventory_stock` table exists
- Verify received quantity is > 0
- Check delivery status changed to "delivered"
- Look for errors in backend logs

---

## Configuration

### Environment Variables (if needed)
```env
PROCUREMENT_REQUEST_APPROVAL_TIMEOUT=7d
PROCUREMENT_DELIVERY_TIMEOUT=14d
PROCUREMENT_AUTO_CLOSE_COMPLETED=true
```

### Permissions Override (if custom)
Edit `create-procurement-tables.sql` before running to customize which roles get which permissions.

---

## Rollback Plan

If deployment fails:

### Step 1: Stop Services
```powershell
# Stop backend
# Kill Node.js process or press Ctrl+C

# Stop frontend
# Kill frontend dev server
```

### Step 2: Revert Database (if needed)
```sql
-- Drop new tables
DROP TABLE IF EXISTS procurement_delivery_items
DROP TABLE IF EXISTS procurement_deliveries
DROP TABLE IF EXISTS procurement_request_items
DROP TABLE IF EXISTS procurement_requests

-- Drop triggers
DROP TRIGGER IF EXISTS trg_procurement_request_number
DROP TRIGGER IF EXISTS trg_procurement_delivery_number
DROP TRIGGER IF EXISTS trg_procurement_requests_update
DROP TRIGGER IF EXISTS trg_procurement_deliveries_update

-- Remove permissions
DELETE FROM ims_role_permissions WHERE permission_id IN (
    SELECT id FROM ims_permissions WHERE permission_key LIKE 'procurement%'
)
DELETE FROM ims_permissions WHERE permission_key LIKE 'procurement%'
```

### Step 3: Revert Code
```powershell
git reset --hard HEAD~5  # Reset last 5 commits
git pull origin stable-nov11-production
```

---

## Post-Deployment Checklist

- [ ] Database tables created successfully
- [ ] All triggers created
- [ ] Permissions assigned to roles
- [ ] Backend server started without errors
- [ ] Frontend builds without errors
- [ ] Menu items visible for correct roles
- [ ] Wing user can create procurement request
- [ ] Admin can review and approve requests
- [ ] Delivery can be created and dispatched
- [ ] Wing supervisor can receive delivery
- [ ] Stock automatically updated in inventory

---

## Support & Monitoring

### Logs to Check
```
Backend: E:\ECP-Projects\inventory-management-system-ims\ims-v1\logs\server.log
Frontend: Browser console (F12)
Database: SQL Server error log
```

### Key Metrics
- Pending requests count
- Approval rate
- Average approval time
- Delivery completion rate

### Contact
For issues during deployment:
1. Check logs for specific error messages
2. Verify database connectivity
3. Verify permissions are correctly assigned
4. Review browser console for JavaScript errors
5. Check API endpoints are returning correct responses

---

**Deployment Time:** ~10 minutes  
**Downtime Required:** ~2 minutes (backend restart)  
**Rollback Time:** ~5 minutes  

**Ready to Deploy?** ✅ YES
