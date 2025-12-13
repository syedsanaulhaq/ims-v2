# Hierarchical Inventory Management System - Complete Guide

## Overview

The Hierarchical Inventory Management System manages inventory across multiple locations:
- **Admin Inventory**: Central warehouse managed by administrators
- **Wing Inventories**: Location-specific inventory for each wing/department

This enables:
1. **Wing-level requests** → Deduct from wing's own inventory
2. **Admin-level requests** → Deduct from admin's central inventory
3. **Forwarding capability** → Wing can forward request to admin if insufficient stock

---

## Database Schema

### 1. `inventory_locations` Table
**Purpose**: Defines all inventory storage locations

```sql
CREATE TABLE inventory_locations (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  location_type NVARCHAR(50),      -- 'ADMIN_INVENTORY' or 'WING_INVENTORY'
  location_name NVARCHAR(255),     -- e.g., "Admin Central Warehouse", "Surgery Ward"
  location_code NVARCHAR(50),      -- Short code for reference
  wing_id INT,                     -- NULL for admin, Wing ID for wing-specific locations
  wing_name NVARCHAR(255),         -- Wing name (populated if wing_id exists)
  is_active BIT,                   -- 1=active, 0=inactive (soft delete)
  created_at DATETIME2,
  updated_at DATETIME2
);
```

**Sample Data:**
```
| location_type | location_name           | wing_id | wing_name       |
|---------------|-------------------------|---------|-----------------|
| ADMIN_INVENTORY | Admin Central Warehouse | NULL    | NULL            |
| WING_INVENTORY | Surgery Ward Inventory  | 1       | Surgery Ward    |
| WING_INVENTORY | ICU Inventory           | 2       | ICU             |
| WING_INVENTORY | Emergency Inventory     | 3       | Emergency Dept  |
```

### 2. `inventory_stock` Table
**Purpose**: Tracks quantity of each item at each location

```sql
CREATE TABLE inventory_stock (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  item_master_id UNIQUEIDENTIFIER,        -- Reference to item_masters
  location_id UNIQUEIDENTIFIER,           -- Reference to inventory_locations
  quantity INT,                           -- Available quantity
  reserved_quantity INT,                  -- Quantity pending/reserved for orders
  available_quantity AS (quantity - reserved_quantity), -- Computed
  last_received_at DATETIME2,
  last_issued_at DATETIME2,
  created_at DATETIME2,
  updated_at DATETIME2,
  UNIQUE (item_master_id, location_id)   -- One record per item per location
);
```

**Example:**
```
| item_code | location_name | quantity | reserved | available |
|-----------|---------------|----------|----------|-----------|
| SYRINGE50 | Admin Warehouse | 500 | 50 | 450 |
| SYRINGE50 | Surgery Ward | 100 | 20 | 80 |
| SYRINGE50 | ICU | 75 | 15 | 60 |
```

### 3. `request_inventory_source` Table
**Purpose**: Tracks which location will fulfill each request

```sql
CREATE TABLE request_inventory_source (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  request_id UNIQUEIDENTIFIER,            -- Stock issuance request ID
  wing_id INT,                            -- Requesting wing (NULL=admin request)
  wing_name NVARCHAR(255),
  source_location_id UNIQUEIDENTIFIER,   -- Which location to deduct from
  source_location_type NVARCHAR(50),     -- ADMIN_INVENTORY or WING_INVENTORY
  request_type NVARCHAR(50),             -- WING_REQUEST, ADMIN_REQUEST, FORWARDED_REQUEST
  fulfillment_status NVARCHAR(30),       -- pending, wing_approved, forwarded_to_admin, admin_approved
  
  -- Wing-level approval tracking
  wing_approved_at DATETIME2,
  wing_approved_by_user_id NVARCHAR(450),
  wing_approved_by_name NVARCHAR(255),
  
  -- Admin-level approval tracking
  admin_approved_at DATETIME2,
  admin_approved_by_user_id NVARCHAR(450),
  admin_approved_by_name NVARCHAR(255),
  
  -- Forwarding tracking
  forwarded_at DATETIME2,
  forwarded_by_user_id NVARCHAR(450),
  forwarded_by_name NVARCHAR(255),
  forward_reason NVARCHAR(MAX),
  
  created_at DATETIME2,
  updated_at DATETIME2
);
```

### 4. `stock_transfer_log` Table
**Purpose**: Immutable audit trail of all inventory movements

```sql
CREATE TABLE stock_transfer_log (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  item_master_id UNIQUEIDENTIFIER,
  item_code NVARCHAR(100),
  item_name NVARCHAR(500),
  from_location_id UNIQUEIDENTIFIER,
  from_location_name NVARCHAR(255),
  to_location_id UNIQUEIDENTIFIER,
  to_location_name NVARCHAR(255),
  transfer_type NVARCHAR(50),           -- ISSUANCE, RECEIPT, TRANSFER, ADJUSTMENT
  quantity_transferred INT,
  reference_type NVARCHAR(50),          -- REQUEST, PURCHASE, RETURN, MANUAL
  reference_id UNIQUEIDENTIFIER,        -- Link to request/order
  user_id NVARCHAR(450),
  user_name NVARCHAR(255),
  reason NVARCHAR(MAX),
  transferred_at DATETIME2,
  created_at DATETIME2 DEFAULT GETDATE()
);
```

---

## Core Stored Procedures

### 1. `sp_InitializeInventoryLocations`
**Purpose**: Create default inventory locations (called during deployment)

```sql
EXEC sp_InitializeInventoryLocations
```

**What it does:**
- Creates ADMIN_INVENTORY location if not exists
- Creates WING_INVENTORY location for each active wing
- Called automatically during schema deployment

### 2. `sp_DeductWithHierarchy`
**Purpose**: Deduct inventory from correct location based on request type

```sql
EXEC sp_DeductWithHierarchy
  @RequestId = '12345678-1234-1234-1234-123456789012',
  @ItemMasterId = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
  @QuantityToDeduct = 10,
  @WingId = 1,  -- NULL for admin, Integer for wing
  @DeductedBy = 'user@domain.com',
  @DeductedByName = 'John Supervisor'
```

**Parameters:**
- `@RequestId`: The stock_issuance_request ID being fulfilled
- `@ItemMasterId`: The item_masters.id to deduct
- `@QuantityToDeduct`: Quantity to deduct
- `@WingId`: Wing ID if wing-level deduction, NULL for admin deduction
- `@DeductedBy`: User ID performing deduction
- `@DeductedByName`: User display name

**Logic:**
```
IF @WingId IS NULL THEN
    Deduct from ADMIN_INVENTORY location
ELSE
    Deduct from WING_INVENTORY location for @WingId
END IF
```

**Returns:**
```
SELECT new_quantity, source_location_id, source_location_name
```

---

## API Endpoints

### 1. GET `/api/hierarchical-inventory/locations`
**Purpose**: Get all available inventory locations

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": "uuid-1",
      "location_type": "ADMIN_INVENTORY",
      "location_name": "Admin Central Warehouse",
      "wing_id": null,
      "wing_name": null,
      "is_active": 1
    },
    {
      "id": "uuid-2",
      "location_type": "WING_INVENTORY",
      "location_name": "Surgery Ward Inventory",
      "wing_id": 1,
      "wing_name": "Surgery Ward",
      "is_active": 1
    }
  ]
}
```

### 2. GET `/api/hierarchical-inventory/stock/:itemId`
**Purpose**: Get stock levels for an item across all locations

**Example:** `GET /api/hierarchical-inventory/stock/item-uuid-123`

**Response:**
```json
{
  "success": true,
  "stock_by_location": [
    {
      "location_id": "uuid-1",
      "location_name": "Admin Central Warehouse",
      "location_type": "ADMIN_INVENTORY",
      "item_code": "SYRINGE50",
      "quantity": 500,
      "reserved_quantity": 50,
      "available_quantity": 450
    },
    {
      "location_id": "uuid-2",
      "location_name": "Surgery Ward Inventory",
      "location_type": "WING_INVENTORY",
      "wing_id": 1,
      "quantity": 100,
      "reserved_quantity": 20,
      "available_quantity": 80
    }
  ]
}
```

### 3. GET `/api/hierarchical-inventory/wing-stock/:wingId`
**Purpose**: Get all inventory at a specific wing

**Example:** `GET /api/hierarchical-inventory/wing-stock/1`

**Response:**
```json
{
  "success": true,
  "wing_id": 1,
  "wing_inventory": [
    {
      "item_code": "SYRINGE50",
      "nomenclature": "Syringe 50ml",
      "quantity": 100,
      "reserved_quantity": 20,
      "available_quantity": 80,
      "location_name": "Surgery Ward Inventory"
    }
  ]
}
```

### 4. GET `/api/hierarchical-inventory/admin-stock`
**Purpose**: Get all inventory in admin central warehouse

**Response:**
```json
{
  "success": true,
  "admin_inventory": [
    {
      "item_code": "SYRINGE50",
      "nomenclature": "Syringe 50ml",
      "quantity": 500,
      "reserved_quantity": 50,
      "available_quantity": 450
    }
  ]
}
```

### 5. POST `/api/hierarchical-inventory/deduct-hierarchical`
**Purpose**: Deduct inventory from appropriate location

**Request Body:**
```json
{
  "requestId": "request-uuid-123",
  "itemMasterId": "item-uuid-456",
  "quantityToDeduct": 10,
  "wingId": 1,
  "deductedBy": "user@domain.com",
  "deductedByName": "John Supervisor",
  "reason": "Approved request #12345"
}
```

**Parameters:**
- `wingId`: Integer for wing-level deduction, null for admin deduction
- `quantityToDeduct`: Number of units to deduct
- `deductedBy`: User ID (typically from session)
- `deductedByName`: User display name for audit trail

**Response (Success):**
```json
{
  "success": true,
  "message": "Inventory deducted from Surgery Ward Inventory",
  "location": "Surgery Ward Inventory",
  "location_type": "WING",
  "item_code": "SYRINGE50",
  "item_name": "Syringe 50ml",
  "new_quantity": 90,
  "deducted": 10
}
```

**Response (Error - Insufficient Stock):**
```json
{
  "error": "Failed to deduct inventory",
  "details": "Insufficient inventory in Surgery Ward Inventory. Available: 5, Requested: 10"
}
```

### 6. POST `/api/hierarchical-inventory/forward-request`
**Purpose**: Forward wing request to admin (e.g., when wing lacks stock)

**Request Body:**
```json
{
  "requestId": "request-uuid-123",
  "wingId": 1,
  "forwardedBy": "user@domain.com",
  "forwardedByName": "Dr. Smith",
  "reason": "Insufficient stock in wing inventory"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request forwarded to admin for approval",
  "request_id": "request-uuid-123",
  "from_wing": "Surgery Ward",
  "reason": "Insufficient stock in wing inventory"
}
```

### 7. GET `/api/hierarchical-inventory/request-source/:requestId`
**Purpose**: Get inventory source tracking for a request

**Example:** `GET /api/hierarchical-inventory/request-source/request-uuid-123`

**Response:**
```json
{
  "success": true,
  "source_info": {
    "id": "source-uuid",
    "request_id": "request-uuid-123",
    "wing_id": 1,
    "wing_name": "Surgery Ward",
    "source_location_type": "WING_INVENTORY",
    "request_type": "WING_REQUEST",
    "fulfillment_status": "wing_approved",
    "wing_approved_at": "2024-01-15T10:30:00Z",
    "wing_approved_by_name": "Dr. Smith",
    "forwarded_at": null,
    "admin_approved_at": null
  }
}
```

### 8. GET `/api/hierarchical-inventory/transfer-log/:itemId`
**Purpose**: Get complete transfer history for an item

**Example:** `GET /api/hierarchical-inventory/transfer-log/item-uuid-456?limit=50`

**Response:**
```json
{
  "success": true,
  "transfer_log": [
    {
      "id": "log-uuid",
      "item_code": "SYRINGE50",
      "item_name": "Syringe 50ml",
      "transfer_type": "ISSUANCE",
      "quantity_transferred": 10,
      "to_location_name": "Surgery Ward Inventory",
      "user_name": "Dr. Smith",
      "reason": "Approved request #12345",
      "transferred_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Workflow Examples

### Scenario 1: Wing-Level Request (Deduct from Wing)

```
1. User creates stock_issuance_request (wing_id=1)
   ↓
2. Wing Supervisor approves request
   ↓
3. Call: POST /api/hierarchical-inventory/deduct-hierarchical
   Body: {
     requestId: "req-123",
     itemMasterId: "item-456",
     quantityToDeduct: 10,
     wingId: 1,           ← WING-LEVEL DEDUCTION
     deductedBy: "user@domain",
     deductedByName: "Dr. Smith"
   }
   ↓
4. System checks: inventory_stock WHERE location for wing_id=1
   ↓
5. If sufficient stock: Deduct 10 units from wing inventory
   If insufficient: Return error "Insufficient inventory in Surgery Ward"
```

### Scenario 2: Admin Request (Deduct from Admin)

```
1. User creates stock_issuance_request (wing_id=NULL)
   ↓
2. Admin approves request
   ↓
3. Call: POST /api/hierarchical-inventory/deduct-hierarchical
   Body: {
     requestId: "req-124",
     itemMasterId: "item-456",
     quantityToDeduct: 20,
     wingId: null,        ← ADMIN-LEVEL DEDUCTION
     deductedBy: "admin@domain",
     deductedByName: "Admin User"
   }
   ↓
4. System checks: inventory_stock WHERE location_type='ADMIN_INVENTORY'
   ↓
5. If sufficient stock: Deduct 20 units from admin inventory
```

### Scenario 3: Forwarding from Wing to Admin

```
1. Wing requests 20 units, but only has 5
   ↓
2. Wing Supervisor calls: POST /api/hierarchical-inventory/forward-request
   Body: {
     requestId: "req-125",
     wingId: 1,
     forwardedBy: "doctor@domain",
     forwardedByName: "Dr. Jones",
     reason: "Insufficient stock in wing (need 20, have 5)"
   }
   ↓
3. System updates request_inventory_source:
     source_location_id → Admin location
     fulfillment_status → "forwarded_to_admin"
   ↓
4. Admin receives forwarded request
   ↓
5. Admin approves and calls: POST /api/hierarchical-inventory/deduct-hierarchical
   Body: {
     requestId: "req-125",
     itemMasterId: "item-456",
     quantityToDeduct: 20,
     wingId: null,        ← DEDUCT FROM ADMIN
     deductedBy: "admin@domain",
     deductedByName: "Admin User"
   }
   ↓
6. System deducts 20 from admin inventory (not wing)
```

---

## Integration with Approval Workflow

The hierarchical inventory system works with the existing approval workflow:

1. **Approval Step** (UNCHANGED)
   - Wing supervisor/admin approves stock_issuance_request
   - Status changes to "APPROVED"

2. **Deduction Step** (NOW LOCATION-AWARE)
   - Before: Called `sp_DeductFromInventory` (global inventory)
   - Now: Call `/api/hierarchical-inventory/deduct-hierarchical` with wingId
   - System automatically deducts from correct location

3. **Forwarding Step** (NEW)
   - If wing doesn't have sufficient stock
   - Call `/api/hierarchical-inventory/forward-request`
   - Request moves to admin for approval
   - Admin deducts from central inventory

---

## SQL Deployment Instructions

### 1. Deploy Schema
```sql
-- Run this entire file in SQL Server
EXEC sp_executesql N'
  -- Table creation statements...
  -- Procedure creation statements...
'

-- Initialize locations
EXEC sp_InitializeInventoryLocations
```

### 2. Verify Installation
```sql
-- Check tables created
SELECT COUNT(*) as location_count FROM inventory_locations;
SELECT COUNT(*) as stock_count FROM inventory_stock;
SELECT COUNT(*) as source_count FROM request_inventory_source;

-- Check procedures
SELECT * FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_NAME IN ('sp_InitializeInventoryLocations', 'sp_DeductWithHierarchy')
```

### 3. Initialize Sample Data (Optional)
```sql
-- Admin location should auto-create
SELECT * FROM inventory_locations WHERE location_type = 'ADMIN_INVENTORY';

-- Wing locations should auto-create
SELECT * FROM inventory_locations WHERE location_type = 'WING_INVENTORY';
```

---

## Backend Integration Checklist

- [ ] Deploy `setup-hierarchical-inventory-system.sql` to database
- [ ] Add `HIERARCHICAL-INVENTORY-ENDPOINTS.cjs` endpoints to `backend-server.cjs`
- [ ] Update approval endpoint to identify `wingId` from request
- [ ] Change deduction from old `sp_DeductFromInventory` to `/api/hierarchical-inventory/deduct-hierarchical`
- [ ] Add forwarding option in approval UI when insufficient wing stock
- [ ] Test wing-level deduction (wingId = integer)
- [ ] Test admin-level deduction (wingId = null)
- [ ] Test forwarding (wing → admin)
- [ ] Verify audit trail in `stock_transfer_log`

---

## Frontend Integration Checklist

- [ ] Display inventory levels per location (Admin + Wing)
- [ ] Show which location will be deducted from in approval dialog
- [ ] Add "Forward to Admin" button if wing inventory insufficient
- [ ] Display forwarding status in request tracking
- [ ] Show transfer history (from `stock_transfer_log`)
- [ ] Add location filter to inventory dashboard

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Admin inventory location not found` | Location not initialized | Run `sp_InitializeInventoryLocations` |
| `Wing inventory location not found` | Wing doesn't have location | Check wing_id is valid in WingsInformation |
| `Insufficient inventory in [location]` | Available < Requested | Forward to admin or replenish wing stock |
| `Missing required fields` | Request body incomplete | Verify all parameters sent |
| `Database connection unavailable` | Connection pool failed | Check SQL Server connection |

---

## Performance Considerations

1. **Indexes**: Created on:
   - `inventory_stock(item_master_id, location_id)` - Primary lookup
   - `request_inventory_source(request_id)` - Fast request lookup
   - `stock_transfer_log(item_master_id, transferred_at)` - Audit queries

2. **Query Optimization**:
   - Wing stock queries filtered by location_id (indexed)
   - Transfer logs use pagination (LIMIT parameter)
   - No N+1 queries in endpoints (all joins done in SQL)

3. **Transaction Safety**:
   - All deductions wrapped in database transactions
   - Rollback on error ensures data consistency
   - Stock transfer logged atomically with deduction

---

## Audit & Compliance

All operations are logged in `stock_transfer_log`:
- **User**: Who performed the deduction
- **Timestamp**: When deduction occurred
- **Item**: What was deducted
- **Quantity**: How much was deducted
- **Location**: From which location
- **Reason**: Why it was deducted
- **Reference**: Link to original request

This provides complete traceability for compliance audits.

---

## Troubleshooting

### Check Current Stock Levels
```sql
SELECT 
  il.location_name, im.item_code, ist.quantity,
  ist.reserved_quantity, ist.available_quantity
FROM inventory_stock ist
JOIN inventory_locations il ON ist.location_id = il.id
JOIN item_masters im ON ist.item_master_id = im.id
ORDER BY il.location_name, im.item_code;
```

### Check Recent Transfers
```sql
SELECT TOP 20
  item_code, transfer_type, quantity_transferred,
  to_location_name, user_name, transferred_at
FROM stock_transfer_log
ORDER BY transferred_at DESC;
```

### Check Request Forwarding Status
```sql
SELECT request_id, request_type, fulfillment_status,
  forwarded_at, forwarded_by_name, forward_reason
FROM request_inventory_source
WHERE request_type = 'FORWARDED_REQUEST'
ORDER BY forwarded_at DESC;
```

---

## Next Steps

1. Deploy database schema (setup-hierarchical-inventory-system.sql)
2. Integrate endpoints into backend-server.cjs
3. Update approval workflow to use hierarchical deduction
4. Test all three scenarios (wing, admin, forwarding)
5. Deploy and monitor for any issues
