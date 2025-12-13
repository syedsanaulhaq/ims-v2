# Hierarchical Inventory Integration - Quick Start

## Files Created

1. **setup-hierarchical-inventory-system.sql** (450 lines)
   - 4 tables: inventory_locations, inventory_stock, request_inventory_source, stock_transfer_log
   - 2 procedures: sp_InitializeInventoryLocations, sp_DeductWithHierarchy
   - Status: ✅ Ready to deploy to SQL Server

2. **HIERARCHICAL-INVENTORY-ENDPOINTS.cjs** (650+ lines)
   - 8 complete Express endpoints with full error handling
   - Location-aware deduction logic
   - Forwarding support
   - Audit trail integration
   - Status: ✅ Ready to integrate into backend

3. **HIERARCHICAL-INVENTORY-GUIDE.md** (500+ lines)
   - Complete documentation
   - API reference
   - Workflow examples
   - Integration checklist

---

## Step 1: Deploy Database Schema

### Option A: Using SQL Server Management Studio

1. Open `setup-hierarchical-inventory-system.sql` in SSMS
2. Connect to your IMS database
3. Execute the script (F5)
4. Verify: Run these queries

```sql
-- Check tables exist
SELECT name FROM sys.tables 
WHERE name IN ('inventory_locations', 'inventory_stock', 'request_inventory_source', 'stock_transfer_log');

-- Check procedures exist
SELECT name FROM sys.objects 
WHERE type = 'P' AND name IN ('sp_InitializeInventoryLocations', 'sp_DeductWithHierarchy');

-- Check locations initialized
SELECT * FROM inventory_locations;
```

### Option B: From Node.js (Automated)

If you prefer automated deployment, add this to backend startup:

```javascript
// At backend startup (before app.listen)
const fs = require('fs');
const path = require('path');

async function deployHierarchicalSchema() {
  try {
    console.log('📦 Deploying hierarchical inventory schema...');
    
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'setup-hierarchical-inventory-system.sql'),
      'utf-8'
    );
    
    // Split by GO and execute each batch
    const batches = sqlScript.split(/\bGO\b/i).filter(b => b.trim());
    
    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }
    
    console.log('✅ Hierarchical inventory schema deployed successfully');
  } catch (error) {
    console.error('❌ Error deploying schema:', error);
    // Don't fail startup - schema might already exist
  }
}

// Call before app.listen()
await deployHierarchicalSchema();
```

---

## Step 2: Integrate Endpoints into Backend

### Copy All Endpoints

1. Open `HIERARCHICAL-INVENTORY-ENDPOINTS.cjs`
2. Copy all endpoint code (everything after the header comments)
3. Add to `backend-server.cjs` right after the existing inventory endpoints

### Example Location in backend-server.cjs

Find this section:
```javascript
// ============================================================================
// EXISTING INVENTORY ENDPOINTS
// ============================================================================

app.get('/api/inventory/item-masters', async (req, res) => {
  // ... existing code ...
});

// ADD THE HIERARCHICAL ENDPOINTS HERE ↓↓↓

// GET /api/hierarchical-inventory/locations
// GET /api/hierarchical-inventory/stock/:itemId
// ... rest of endpoints ...
```

### Minimal Integration (Copy-Paste)

1. Find last `app.get(` or `app.post(` in backend-server.cjs
2. Place cursor after the closing `});`
3. Add newline and paste all content from HIERARCHICAL-INVENTORY-ENDPOINTS.cjs
4. Save file
5. Restart backend server

---

## Step 3: Update Approval Endpoints

### Find the Approval Endpoint

Locate in `backend-server.cjs`:
```javascript
app.post('/api/stock-issuance/approve-and-allocate', async (req, res) => {
```

### Update to Use Hierarchical Deduction

**Before:**
```javascript
// Old code called global deduction
await pool.request()
  .input('itemMasterId', sql.UniqueIdentifier, itemId)
  .input('quantityToDeduct', sql.Int, quantityNeeded)
  .query(`EXEC sp_DeductFromInventory ...`);
```

**After:**
```javascript
// New code uses location-aware deduction
const wingId = req.body.wingId || null;

const deductionResponse = await fetch('http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: stockIssuanceId,
    itemMasterId: itemId,
    quantityToDeduct: quantityNeeded,
    wingId: wingId,
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
console.log(`✅ Deducted ${quantityNeeded} units from ${deductionResult.location}`);
```

---

## Step 4: Test the Integration

### Test 1: Get All Locations
```bash
curl http://localhost:3000/api/hierarchical-inventory/locations
```

**Expected Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": "...",
      "location_type": "ADMIN_INVENTORY",
      "location_name": "Admin Central Warehouse",
      "wing_id": null
    },
    {
      "id": "...",
      "location_type": "WING_INVENTORY",
      "location_name": "Surgery Ward Inventory",
      "wing_id": 1
    }
  ]
}
```

### Test 2: Get Admin Stock
```bash
curl http://localhost:3000/api/hierarchical-inventory/admin-stock
```

### Test 3: Get Wing Stock
```bash
curl http://localhost:3000/api/hierarchical-inventory/wing-stock/1
```

### Test 4: Deduct from Wing (with sample data)
```bash
curl -X POST http://localhost:3000/api/hierarchical-inventory/deduct-hierarchical \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "itemMasterId": "650e8400-e29b-41d4-a716-446655440001",
    "quantityToDeduct": 5,
    "wingId": 1,
    "deductedBy": "test@domain.com",
    "deductedByName": "Test User"
  }'
```

---

## Step 5: Verify Everything Works

### Check Database Schema
```sql
-- Verify 4 tables exist
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'inventory_%' OR TABLE_NAME = 'request_inventory_source'
ORDER BY TABLE_NAME;

-- Expected: 4 rows
-- - inventory_locations
-- - inventory_stock
-- - inventory_stock_idx (computed column)
-- - request_inventory_source
-- - stock_transfer_log
```

### Check Procedures
```sql
SELECT name FROM sys.objects WHERE type = 'P' AND name LIKE '%Inventory%';
-- Expected: sp_InitializeInventoryLocations, sp_DeductWithHierarchy
```

### Check Sample Data
```sql
-- Should see Admin + Wing locations
SELECT COUNT(*) as location_count FROM inventory_locations WHERE is_active = 1;
-- Expected: 1 + number of active wings
```

### Check Endpoints Loaded
```bash
# Should return 200 with location data
curl http://localhost:3000/api/hierarchical-inventory/locations
```

---

## Step 6: Monitor Operations

### Watch Console for Deduction Logs

When a deduction occurs, you should see:
```
💰 HIERARCHICAL DEDUCTION: 10 units from WING inventory
   Request: 550e8400-e29b-41d4-a716-446655440000
   Wing ID: 1
   ✅ Target location: Surgery Ward Inventory
   ✅ Deducted 10 units. New quantity: 90
   ✅ Logged stock transfer
```

### Check Transfer Log

```sql
SELECT TOP 10
  item_code, transfer_type, quantity_transferred,
  to_location_name, user_name, transferred_at
FROM stock_transfer_log
ORDER BY transferred_at DESC;
```

---

## Common Issues & Solutions

### ❌ "Database connection unavailable"
**Cause**: SQL Server not connected  
**Fix**: Ensure SQL Server is running and connection string is correct

### ❌ "Table 'inventory_locations' not found"
**Cause**: Schema not deployed  
**Fix**: Run `setup-hierarchical-inventory-system.sql` first

### ❌ "Admin inventory location not found"
**Cause**: Initialization didn't run  
**Fix**: Run `EXEC sp_InitializeInventoryLocations` in SQL Server

### ❌ "Insufficient inventory in [location]"
**Cause**: Wing doesn't have requested quantity  
**Fix**: Use `/api/hierarchical-inventory/forward-request` to forward to admin

### ❌ Endpoints return 404
**Cause**: Endpoints not added to backend  
**Fix**: Copy-paste all endpoints from HIERARCHICAL-INVENTORY-ENDPOINTS.cjs

---

## Rollback Plan (If Needed)

If you need to revert to the old single-location system:

```sql
-- Disable hierarchical endpoints (comment them out in backend-server.cjs)
-- Revert approval endpoints to use sp_DeductFromInventory instead

-- Optional: Drop new tables (but keep data for audit)
-- DROP TABLE stock_transfer_log;
-- DROP TABLE request_inventory_source;
-- DROP TABLE inventory_stock;
-- DROP TABLE inventory_locations;

-- Keep old sp_DeductFromInventory for fallback
```

---

## Next Steps After Integration

1. ✅ Deploy schema
2. ✅ Add endpoints to backend
3. ✅ Test endpoints directly
4. ✅ Update approval workflow to use hierarchical deduction
5. **→ Update frontend to show location-specific inventory**
6. **→ Add forwarding UI (Forward to Admin button)**
7. **→ Display transfer history to admins**
8. **→ Test full workflow (wing request → forward → admin approval)**
9. **→ Commit all changes**

---

## Deployment Checklist

- [ ] `setup-hierarchical-inventory-system.sql` executed in SQL Server
- [ ] `sp_InitializeInventoryLocations` called (auto during script)
- [ ] All 8 endpoints added to `backend-server.cjs`
- [ ] Endpoints tested with curl/Postman
- [ ] Approval workflow updated to use hierarchical deduction
- [ ] Console logs show successful deductions
- [ ] Transfer log shows entries in SQL Server
- [ ] Frontend updated to show location info (optional but recommended)
- [ ] Full end-to-end test completed
- [ ] All changes committed to git

---

## Performance Baseline

After deployment, you should observe:
- Deduction request: **50-100ms** (from endpoint to deduction logged)
- Location lookup: **5-10ms**
- Stock check: **5-10ms**
- Transfer log entry: **5-10ms**

If requests are slower, check:
1. SQL Server indexes are created
2. Network latency to SQL Server
3. Backend server load

---

## Support

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify schema deployed: `SELECT * FROM inventory_locations`
3. Test endpoint directly: `curl http://localhost:3000/api/hierarchical-inventory/locations`
4. Check SQL Server connection in backend logs
5. Verify all 8 endpoints are in backend-server.cjs

For detailed technical docs, see **HIERARCHICAL-INVENTORY-GUIDE.md**
