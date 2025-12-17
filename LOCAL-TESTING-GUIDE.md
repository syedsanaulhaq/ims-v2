# 🧪 LOCAL TESTING GUIDE - Procurement Workflow

## Quick Test Setup (15 minutes)

### Step 1: Run SQL Migration Locally
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Run the migration
sqlcmd -S localhost -d InventoryManagementDB -i create-procurement-tables.sql
```

**Expected Output:**
```
PROCUREMENT TABLES CREATED SUCCESSFULLY
============================================================================
Tables created:
  - procurement_requests
  - procurement_request_items
  - procurement_deliveries
  - procurement_delivery_items

Triggers created: 4
Permissions created and assigned to roles
```

### Step 2: Verify Database
```sql
-- Open SQL Server Management Studio and run:
USE InventoryManagementDB;

-- Check tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'procurement%'
-- Should show 4 tables

-- Check permissions
SELECT COUNT(*) as PermCount FROM ims_permissions 
WHERE permission_key LIKE 'procurement%'
-- Should show 7

-- Check test data (optional)
SELECT * FROM procurement_requests
SELECT * FROM procurement_deliveries
```

### Step 3: Start Backend
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Make sure you're using the latest code
git pull origin stable-nov11-production

# Start the server
npm run dev:start
```

**Expected Logs:**
```
🚀 Server running on http://localhost:3001
📡 Database connected to InventoryManagementDB
✅ All endpoints registered
🔐 Session middleware initialized
```

### Step 4: Start Frontend (in another terminal)
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

---

## 🧪 Testing Workflow

### Test 1: Create Procurement Request

**1. Login as Wing User**
- Open http://localhost:3000
- Login with a user who has `procurement.request` permission
- You should see "Request Stock" in Personal Menu

**2. Create Request**
- Click "Request Stock"
- Click "Add Items"
- Search for "lamp" or any item
- Click to add 3-4 items
- Set quantities (e.g., 100, 50, 75)
- Click each item to add notes/prices
- Select Priority: "High"
- Add Justification: "Test request for department needs"
- Click "Submit Request"

**Expected Result:**
- Success message with request number (PR-2025-12-00001)
- Redirected to "Stock Requests" page
- Request shows status "pending"

**Check Database:**
```sql
SELECT * FROM procurement_requests ORDER BY created_at DESC
SELECT * FROM procurement_request_items ORDER BY created_at DESC
```

---

### Test 2: Admin Reviews & Approves

**1. Login as Admin**
- Logout and login as admin user
- Should see "Review Requests" in Procurement Menu

**2. Review Request**
- Click "Review Requests"
- See pending request in list
- Click "Review"
- Modal opens with items and quantities

**3. Approve Full**
- Keep all quantities as is
- Add Admin Notes: "Approved for immediate dispatch"
- Click "Approve Request"

**Expected Result:**
- Success message
- Request list refreshes
- Request status changes to "approved"

**Check Database:**
```sql
SELECT id, request_number, status, reviewed_by_name, reviewed_at 
FROM procurement_requests 
WHERE request_number = 'PR-2025-12-00001'
```

---

### Test 3: Partial Approval

**1. Create Another Request**
- Login as wing user
- Request 5 items with quantities: 100, 200, 150, 75, 50

**2. Admin Approves Partially**
- Login as admin
- "Review Requests" → Review new request
- Change quantities:
  - Item 1: 100 → 80 (reduced)
  - Item 2: 200 → keep same
  - Item 3: 150 → 100 (reduced)
  - Item 4: 75 → 0 (reject this item)
  - Item 5: keep same
- Add note: "Partial approval - supply constraints"
- Click "Approve Request"

**Expected Result:**
- Request status: "partially_approved"
- Approved quantities saved

**Check Database:**
```sql
SELECT i.item_nomenclature, i.requested_quantity, i.approved_quantity 
FROM procurement_request_items i
WHERE i.procurement_request_id = (
  SELECT id FROM procurement_requests 
  WHERE request_number = 'PR-2025-12-00001'
)
```

---

### Test 4: Admin Creates Delivery

**1. Create Delivery from Approved Request**
```powershell
# Test via API
$headers = @{
    "Content-Type" = "application/json"
    "Cookie" = "your_session_cookie"
}

$body = @{
    procurement_request_id = "REQUEST-ID-HERE"
    delivery_items = @(
        @{
            procurement_request_item_id = "ITEM-ID-1"
            item_master_id = 1
            item_nomenclature = "Lamp"
            delivered_quantity = 100
            unit_of_measurement = "PCS"
            batch_number = "BATCH-001"
            expiry_date = "2026-12-31"
        }
    )
    notes = "Test delivery"
    vehicle_number = "ABC-123"
    driver_name = "John Doe"
    driver_contact = "03001234567"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "http://localhost:3001/api/procurement/deliveries" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Expected Output:**
```json
{
  "success": true,
  "delivery": {
    "id": "UUID",
    "delivery_number": "PD-2025-12-00001",
    "status": "prepared",
    "wing_id": 1,
    "created_at": "2025-12-16T10:30:00"
  }
}
```

**Check Database:**
```sql
SELECT * FROM procurement_deliveries ORDER BY created_at DESC
SELECT * FROM procurement_delivery_items ORDER BY created_at DESC
```

---

### Test 5: Dispatch Delivery (In Transit)

**1. Mark as In Transit**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Cookie" = "your_session_cookie"
}

$response = Invoke-WebRequest `
    -Uri "http://localhost:3001/api/procurement/deliveries/DELIVERY-ID/dispatch" `
    -Method PUT `
    -Headers $headers

$response.Content
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Delivery dispatched successfully"
}
```

**Check Database:**
```sql
SELECT id, delivery_number, status, delivery_date 
FROM procurement_deliveries 
WHERE delivery_number = 'PD-2025-12-00001'
```

---

### Test 6: Wing Supervisor Receives Delivery

**1. Receive Delivery (Confirm Receipt)**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Cookie" = "wing_supervisor_session_cookie"
}

$body = @{
    received_items = @(
        @{
            id = "DELIVERY-ITEM-ID"
            received_quantity = 100
            condition_on_receipt = "good"
            discrepancy_notes = ""
        }
    )
    notes = "Delivery received in good condition"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "http://localhost:3001/api/procurement/deliveries/DELIVERY-ID/receive" `
    -Method PUT `
    -Headers $headers `
    -Body $body

$response.Content
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Delivery received successfully and inventory updated"
}
```

**✅ VERIFY STOCK WAS ADDED:**
```sql
-- Check if stock was added to wing inventory
SELECT * FROM inventory_stock 
WHERE wing_id = 1 
AND item_master_id = 1
ORDER BY last_updated DESC
-- Should show quantity_on_hand = 100 (or added to existing)
```

---

## 🔍 API Testing (Using Postman or curl)

### 1. Get Pending Requests (Admin)
```bash
curl -X GET "http://localhost:3001/api/procurement/requests/pending" \
  -H "Cookie: your_session_cookie"
```

### 2. Create Request (Wing User)
```bash
curl -X POST "http://localhost:3001/api/procurement/requests" \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "wing_id": 1,
    "wing_name": "Admin Wing",
    "items": [{
      "item_master_id": 1,
      "item_nomenclature": "Lamp",
      "item_code": "LAMP001",
      "category_name": "Furniture",
      "subcategory_name": "Lighting",
      "requested_quantity": 100,
      "unit_of_measurement": "PCS"
    }],
    "priority": "high",
    "justification": "Test procurement"
  }'
```

### 3. Get User's Requests
```bash
curl -X GET "http://localhost:3001/api/procurement/requests/my-requests" \
  -H "Cookie: your_session_cookie"
```

### 4. Approve Request (Admin)
```bash
curl -X PUT "http://localhost:3001/api/procurement/requests/REQUEST-ID/approve" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session_cookie" \
  -d '{
    "approved_items": [{
      "id": "ITEM-ID",
      "requested_quantity": 100,
      "approved_quantity": 100
    }],
    "review_notes": "Approved for immediate dispatch"
  }'
```

---

## 🎯 Complete Test Checklist

- [ ] **Database**
  - [ ] Migration runs without errors
  - [ ] All 4 tables created
  - [ ] All 7 permissions created
  - [ ] All 4 triggers created

- [ ] **Backend**
  - [ ] Server starts without errors
  - [ ] No database connection errors in logs
  - [ ] All 15 endpoints registered

- [ ] **Frontend**
  - [ ] Frontend starts without errors
  - [ ] Menu items visible for correct roles
  - [ ] Can navigate to procurement pages

- [ ] **Request Creation**
  - [ ] Wing user can create request
  - [ ] Request number generated correctly (PR-YYYY-MM-XXXXX)
  - [ ] Items saved correctly
  - [ ] Can add multiple items
  - [ ] Can set quantities and priorities

- [ ] **Admin Approval**
  - [ ] Admin sees pending requests
  - [ ] Can review request details
  - [ ] Can adjust quantities
  - [ ] Can approve request
  - [ ] Can reject with reason

- [ ] **Delivery Management**
  - [ ] Can create delivery
  - [ ] Delivery number generated correctly (PD-YYYY-MM-XXXXX)
  - [ ] Can dispatch delivery
  - [ ] Status changes to "in_transit"

- [ ] **Stock Receipt**
  - [ ] Wing supervisor can receive delivery
  - [ ] Delivery status changes to "delivered"
  - [ ] **Stock automatically added to inventory_stock** ✅
  - [ ] Quantity is correct

- [ ] **Error Handling**
  - [ ] Invalid data rejected
  - [ ] Proper error messages shown
  - [ ] Rollback works on failures

---

## 🐛 Troubleshooting

### SQL Migration Fails
```
Error: "Tables already exist"
Solution: Drop existing tables first
  DROP TABLE procurement_delivery_items
  DROP TABLE procurement_deliveries
  DROP TABLE procurement_request_items
  DROP TABLE procurement_requests
```

### Backend API returns 401
```
Error: "Not authenticated"
Solution: Make sure you're logged in and session cookie is sent
Check: Open browser DevTools → Application → Cookies
```

### Stock Not Updated
```
Issue: inventory_stock not updated after delivery
Solution:
  1. Check delivery status is "delivered" (not "in_transit")
  2. Check received_quantity > 0
  3. Check wing_id is valid
  4. Check item_master_id exists
```

### Menu Items Missing
```
Issue: "Request Stock" not in menu
Solution:
  1. Logout and login again
  2. Check user has "procurement.request" permission
     SELECT * FROM ims_user_roles ur
     JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
     JOIN ims_permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = 'YOUR-USER-ID'
  3. Clear browser cache (Ctrl+Shift+Delete)
```

---

## 📊 Test Data Query

```sql
-- See all created requests
SELECT * FROM procurement_requests ORDER BY created_at DESC

-- See all request items
SELECT pr.request_number, pri.item_nomenclature, pri.requested_quantity, pri.approved_quantity
FROM procurement_requests pr
JOIN procurement_request_items pri ON pr.id = pri.procurement_request_id
ORDER BY pr.created_at DESC

-- See all deliveries
SELECT * FROM procurement_deliveries ORDER BY created_at DESC

-- See delivery items
SELECT pd.delivery_number, pdi.item_nomenclature, pdi.delivered_quantity, pdi.received_quantity
FROM procurement_deliveries pd
JOIN procurement_delivery_items pdi ON pd.id = pdi.procurement_delivery_id
ORDER BY pd.created_at DESC

-- See inventory stock updated
SELECT * FROM inventory_stock 
WHERE wing_id = (YOUR_WING_ID) 
ORDER BY last_updated DESC
```

---

## ✅ Success Criteria

After complete testing, you should have:
- ✅ 1 pending request
- ✅ 1 approved request  
- ✅ 1 delivery created
- ✅ 1 delivery in transit
- ✅ 1 delivery completed
- ✅ Stock automatically updated in inventory_stock table
- ✅ All menu items visible
- ✅ No errors in console or backend logs

**Once all tests pass, you're ready to deploy!** 🚀
