# Complete System Deployment - December 2025

## Overview

This deployment includes:
1. **Hierarchical Inventory System** - Wing vs Admin inventory management
2. **Wing Dashboard Enhancements** - Inventory verification workflow
3. **Integration with Approval Workflow** - End-to-end request fulfillment

---

## Deployment Files

### Database Scripts
- ✅ `setup-hierarchical-inventory-system.sql` - Hierarchical inventory schema (4 tables, 2 procedures)
- ✅ `DEPLOY-DB-CHANGES.sql` - Wing dashboard & verification workflow (1 table, 1 view)

### Backend Code
- ✅ `HIERARCHICAL-INVENTORY-ENDPOINTS.cjs` - 8 location-aware inventory endpoints
- ✅ `DEPLOY-DB-CHANGES.sql` - Database verification tables

### Documentation
- ✅ `HIERARCHICAL-INVENTORY-GUIDE.md` - Complete technical reference
- ✅ `HIERARCHICAL-INVENTORY-INTEGRATION.md` - Step-by-step integration

---

## Phase 1: Database Schema Deployment

### Step 1.1: Deploy Hierarchical Inventory Schema

**Action**: Execute `setup-hierarchical-inventory-system.sql` in SQL Server Management Studio

```bash
# OR from PowerShell using sqlcmd
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i setup-hierarchical-inventory-system.sql
```

**What it creates:**
```
Tables:
  ✅ inventory_locations (Admin + Wing-specific storage locations)
  ✅ inventory_stock (Per-location quantity tracking)
  ✅ request_inventory_source (Request → Location mapping)
  ✅ stock_transfer_log (Immutable audit trail)

Procedures:
  ✅ sp_InitializeInventoryLocations (Auto-creates Admin + Wing locations)
  ✅ sp_DeductWithHierarchy (Core location-aware deduction)
```

**Verify:**
```sql
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_name IN ('inventory_locations', 'inventory_stock', 'request_inventory_source', 'stock_transfer_log');
-- Should return: 4

SELECT COUNT(*) as location_count FROM inventory_locations;
-- Should return: 1 (Admin) + number of active wings
```

### Step 1.2: Deploy Wing Dashboard Enhancement Schema

**Action**: Execute `DEPLOY-DB-CHANGES.sql` in SQL Server Management Studio

```bash
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i DEPLOY-DB-CHANGES.sql
```

**What it creates:**
```
Tables:
  ✅ inventory_verification_requests (Verification workflow)

Views:
  ✅ View_Pending_Inventory_Verifications (Dashboard data)
```

**Verify:**
```sql
SELECT COUNT(*) FROM inventory_verification_requests;
-- Should return: 0 (empty table initially)

SELECT * FROM View_Pending_Inventory_Verifications;
-- Should execute without errors
```

---

## Phase 2: Backend Integration

### Step 2.1: Add Hierarchical Inventory Endpoints

**File**: `backend-server.cjs`

**Action**: Add all 8 endpoints from `HIERARCHICAL-INVENTORY-ENDPOINTS.cjs`

Find this section:
```javascript
// ============================================================================
// STOCK ISSUANCE ENDPOINTS
// ============================================================================
```

Add after all existing inventory endpoints:

```javascript
// ============================================================================
// HIERARCHICAL INVENTORY MANAGEMENT ENDPOINTS
// Wing vs Admin location-aware deduction + forwarding
// ============================================================================

// [COPY ALL 8 ENDPOINTS FROM HIERARCHICAL-INVENTORY-ENDPOINTS.cjs HERE]
```

**Endpoints added:**
```
GET  /api/hierarchical-inventory/locations
GET  /api/hierarchical-inventory/stock/:itemId
GET  /api/hierarchical-inventory/wing-stock/:wingId
GET  /api/hierarchical-inventory/admin-stock
POST /api/hierarchical-inventory/deduct-hierarchical         ← MAIN DEDUCTION
POST /api/hierarchical-inventory/forward-request             ← FORWARDING
GET  /api/hierarchical-inventory/request-source/:requestId
GET  /api/hierarchical-inventory/transfer-log/:itemId
```

### Step 2.2: Update Approval Workflow Endpoints

**File**: `backend-server.cjs`

**Find**: The approval endpoint (typically `POST /api/stock-issuance/approve-and-allocate`)

**Replace deduction logic:**

**Before:**
```javascript
// Old: Direct inventory deduction
const deductionResult = await pool.request()
  .input('itemMasterId', sql.UniqueIdentifier, itemId)
  .input('quantity', sql.Int, quantityNeeded)
  .query('EXEC sp_DeductFromInventory ...');
```

**After:**
```javascript
// New: Location-aware hierarchical deduction
const wingId = req.body.wingId || null; // From request object

const deductionResponse = await fetch('http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: stockIssuanceId,
    itemMasterId: itemId,
    quantityToDeduct: quantityNeeded,
    wingId: wingId,  // KEY: Determines which location to deduct from
    deductedBy: userId,
    deductedByName: userName,
    reason: `Approved request #${requestNumber}`
  })
});

if (!deductionResponse.ok) {
  const error = await deductionResponse.json();
  throw new Error(error.details || error.error);
}

const deductionResult = await deductionResponse.json();
console.log(`✅ Deducted from ${deductionResult.location}`);
```

---

## Phase 3: Testing

### Test 1: Verify Schema Deployed

```bash
# Open SQL Server Management Studio and run:
SELECT name FROM sys.tables WHERE name LIKE 'inventory_%' OR name = 'request_inventory_source' OR name = 'stock_transfer_log';
SELECT name FROM sys.objects WHERE type = 'P' AND name LIKE '%Inventory%';
SELECT * FROM inventory_locations;
```

**Expected Results:**
- 4 inventory-related tables
- 2 procedures (sp_InitializeInventoryLocations, sp_DeductWithHierarchy)
- 1 Admin location + N Wing locations

### Test 2: Verify Endpoints Available

```bash
# Test location listing
curl http://localhost:3000/api/hierarchical-inventory/locations

# Expected: JSON with array of locations
```

### Test 3: Test Wing-Level Deduction

```bash
# Create a test request first, then:
curl -X POST http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-request-id",
    "itemMasterId": "test-item-id",
    "quantityToDeduct": 5,
    "wingId": 1,
    "deductedBy": "test@domain.com",
    "deductedByName": "Test User"
  }'

# Expected: success with new quantity in wing location
```

### Test 4: Test Admin-Level Deduction

```bash
curl -X POST http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-request-id-2",
    "itemMasterId": "test-item-id",
    "quantityToDeduct": 10,
    "wingId": null,
    "deductedBy": "admin@domain.com",
    "deductedByName": "Admin User"
  }'

# Expected: success with new quantity in admin location
```

### Test 5: Test Forwarding (Wing → Admin)

```bash
curl -X POST http://localhost:3000/api/hierarchical-inventory/forward-request \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-request-id",
    "wingId": 1,
    "forwardedBy": "doctor@domain.com",
    "forwardedByName": "Dr. Smith",
    "reason": "Insufficient stock in wing"
  }'

# Expected: success with forwarding recorded
```

### Test 6: Verify Audit Trail

```sql
-- Check if transfers logged
SELECT TOP 10
  item_code, transfer_type, quantity_transferred,
  to_location_name, user_name, transferred_at
FROM stock_transfer_log
ORDER BY transferred_at DESC;
```

---

## Phase 4: Frontend Updates (Optional but Recommended)

### Step 4.1: Display Location Information

Update approval dialog/page to show:
```
Approving for: Surgery Ward
Inventory will be deducted from: Surgery Ward Inventory
Current availability: 80 units
```

### Step 4.2: Add Forwarding Option

If wing inventory insufficient:
```
⚠️ Warning: Only 5 units available in wing inventory
[Continue with wing inventory] [Forward to Admin]
```

### Step 4.3: Show Transfer History

Add admin dashboard panel:
```
Recent Inventory Transfers
- 10 units SYRINGE50 from Admin to Surgery Ward (Jan 15)
- 5 units GLOVES from Surgery to Emergency (Jan 14)
...
```

---

## Phase 5: Integration Testing

### Test Scenario 1: Wing Request → Approve → Deduct from Wing

```
1. Create request (wing_id = 1, item = SYRINGE50, qty = 10)
2. Wing supervisor approves
3. System deducts from Surgery Ward inventory
4. Verify: Surgery Ward quantity decreased by 10
```

### Test Scenario 2: Admin Request → Approve → Deduct from Admin

```
1. Create request (wing_id = null, item = SYRINGE50, qty = 20)
2. Admin approves
3. System deducts from Admin Central Warehouse
4. Verify: Admin quantity decreased by 20
```

### Test Scenario 3: Wing Insufficient → Forward to Admin

```
1. Wing has only 5 units, request is 20 units
2. Wing supervisor clicks "Forward to Admin"
3. Request moves to admin approval
4. Admin approves
5. System deducts 20 from Admin inventory (not wing)
6. Verify: Wing quantity unchanged, Admin qty decreased by 20
```

---

## Rollback Plan

If issues occur:

### Option 1: Stop Using Hierarchical System (Keep Schema)

```javascript
// In backend-server.cjs, comment out hierarchical endpoints:
// app.get('/api/hierarchical-inventory/locations', ...);
// app.post('/api/hierarchical-inventory/deduct-hierarchical', ...);
// ... comment all 8 endpoints ...

// Revert approval endpoint to use old sp_DeductFromInventory
```

### Option 2: Drop New Tables (Preserve Audit)

```sql
-- Optional: Keep stock_transfer_log for audit, drop rest
DROP TABLE request_inventory_source;
DROP TABLE inventory_stock;
DROP TABLE inventory_locations;
DROP PROCEDURE sp_DeductWithHierarchy;
DROP PROCEDURE sp_InitializeInventoryLocations;
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Backup SQL Server database
- [ ] Backup backend source code
- [ ] Review `setup-hierarchical-inventory-system.sql`
- [ ] Review `DEPLOY-DB-CHANGES.sql`
- [ ] Verify backend server running

### Database Deployment
- [ ] Execute `setup-hierarchical-inventory-system.sql`
- [ ] Verify 4 tables created
- [ ] Verify 2 procedures created
- [ ] Execute `DEPLOY-DB-CHANGES.sql`
- [ ] Verify inventory_verification_requests created
- [ ] Check View_Pending_Inventory_Verifications works

### Backend Integration
- [ ] Add 8 hierarchical inventory endpoints
- [ ] Update approval workflow endpoint
- [ ] Restart backend server
- [ ] Verify endpoints respond (curl tests)

### Testing
- [ ] Test location listing
- [ ] Test wing-level deduction
- [ ] Test admin-level deduction
- [ ] Test forwarding workflow
- [ ] Verify audit trail in stock_transfer_log
- [ ] Full end-to-end test with real request

### Post-Deployment
- [ ] Monitor backend console for errors
- [ ] Check SQL Server query performance
- [ ] Verify no impacts to existing features
- [ ] Document any custom configurations
- [ ] Commit changes to git

---

## Deployment Performance

Expected timing:
- Schema deployment: **1-2 minutes** (4 tables + indexes)
- Endpoint integration: **5-10 minutes** (copy-paste 8 endpoints)
- Testing: **10-15 minutes** (all 6 test scenarios)
- **Total: 20-30 minutes**

---

## Monitoring Post-Deployment

### Watch Backend Console

```
✅ Hierarchical inventory management endpoints registered
💰 HIERARCHICAL DEDUCTION: X units from WING inventory
   ✅ Target location: Surgery Ward Inventory
   ✅ Deducted X units. New quantity: Y
   ✅ Logged stock transfer
```

### Monitor SQL Server

```sql
-- Check daily transfers
SELECT COUNT(*) as daily_transfers FROM stock_transfer_log
WHERE transferred_at >= CAST(GETDATE() AS DATE);

-- Check request forwarding
SELECT COUNT(*) as forwarded_requests FROM request_inventory_source
WHERE request_type = 'FORWARDED_REQUEST';

-- Monitor location stock
SELECT location_name, SUM(quantity) as total_quantity
FROM inventory_stock
JOIN inventory_locations ON inventory_stock.location_id = inventory_locations.id
GROUP BY location_name;
```

---

## Support & Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Endpoint not found" | Endpoints not added | Copy all 8 endpoints from HIERARCHICAL-INVENTORY-ENDPOINTS.cjs |
| "Location not found" | Schema not deployed | Execute setup-hierarchical-inventory-system.sql |
| "Insufficient inventory" | Wing doesn't have stock | Use forward-request endpoint to move to admin |
| "Database connection error" | SQL Server offline | Verify connection string in backend config |

### Debug Queries

```sql
-- Check all locations initialized
SELECT id, location_type, location_name, wing_name, is_active
FROM inventory_locations
ORDER BY location_type, location_name;

-- Check stock by location
SELECT 
  l.location_name, 
  i.item_code,
  s.quantity,
  s.available_quantity
FROM inventory_stock s
JOIN inventory_locations l ON s.location_id = l.id
JOIN item_masters i ON s.item_master_id = i.id
ORDER BY l.location_name, i.item_code;

-- Check recent transfers
SELECT TOP 20
  item_code, transfer_type, quantity_transferred,
  to_location_name, user_name, transferred_at
FROM stock_transfer_log
ORDER BY transferred_at DESC;

-- Check forwarded requests
SELECT 
  request_id, wing_name, request_type, fulfillment_status,
  forwarded_at, forwarded_by_name, forward_reason
FROM request_inventory_source
WHERE request_type = 'FORWARDED_REQUEST'
ORDER BY forwarded_at DESC;
```

---

## Next: Production Deployment

1. ✅ Dev environment: Complete all tests
2. ✅ Staging: Run full workflow tests
3. ✅ Production: Execute during maintenance window
4. ✅ Monitor: Watch for 24-48 hours post-deployment
5. ✅ Document: Update operations manual with new endpoints

---

## Files Involved

| File | Type | Status | Lines |
|------|------|--------|-------|
| setup-hierarchical-inventory-system.sql | SQL | ✅ Ready | 450 |
| DEPLOY-DB-CHANGES.sql | SQL | ✅ Ready | 200 |
| HIERARCHICAL-INVENTORY-ENDPOINTS.cjs | JS | ✅ Ready | 650+ |
| HIERARCHICAL-INVENTORY-GUIDE.md | Docs | ✅ Ready | 500+ |
| HIERARCHICAL-INVENTORY-INTEGRATION.md | Docs | ✅ Ready | 300+ |
| backend-server.cjs | JS | 🔄 Needs update | TBD |

---

## Quick Start (TLDR)

1. **Deploy DB**: Execute `setup-hierarchical-inventory-system.sql` + `DEPLOY-DB-CHANGES.sql`
2. **Add Backend**: Copy 8 endpoints from `HIERARCHICAL-INVENTORY-ENDPOINTS.cjs` into `backend-server.cjs`
3. **Update Approval**: Change deduction logic to call `/api/hierarchical-inventory/deduct-hierarchical` with `wingId`
4. **Test**: Use provided curl examples to verify all 3 scenarios (wing, admin, forwarding)
5. **Commit**: Push changes to git

**Estimated time: 25 minutes**

---

**Deployment Ready** ✅
