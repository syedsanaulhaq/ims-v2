# Wing Procurement Workflow Design

## Overview
Wings request stock from central Admin to fill their wing inventory stores. Once allocated and delivered, wing users can request items from their local wing store.

## Workflow Steps

### 1. Wing User Creates Procurement Request
- Wing user (or wing supervisor) creates a request for multiple items
- Specifies quantities needed for wing inventory
- Request status: `pending`
- Request goes to Admin for review

### 2. Admin Reviews Request
- Admin sees all pending procurement requests from all wings
- Can approve (full or partial quantities)
- Can reject with reason
- Can forward to another admin

### 3. Admin Allocates Items
- Upon approval, items are marked for delivery
- Allocation creates a delivery record
- Status: `allocated` → `in_transit`

### 4. Wing Receives Delivery
- Admin marks delivery as completed
- Items are added to wing inventory
- Request status: `delivered` → `completed`

### 5. Wing Inventory Stocked
- Wing users can now request from wing store
- Existing verification workflow applies

## Database Schema

### Table: `procurement_requests`
```sql
CREATE TABLE procurement_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_number NVARCHAR(50) UNIQUE NOT NULL,
    wing_id INT NOT NULL,
    wing_name NVARCHAR(200),
    requested_by_user_id NVARCHAR(450) NOT NULL,
    requested_by_name NVARCHAR(200),
    status NVARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- pending, approved, partially_approved, rejected, allocated, in_transit, delivered, completed
    priority NVARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    justification NVARCHAR(MAX),
    requested_at DATETIME2 DEFAULT GETDATE(),
    reviewed_by_user_id NVARCHAR(450),
    reviewed_by_name NVARCHAR(200),
    reviewed_at DATETIME2,
    review_notes NVARCHAR(MAX),
    delivered_at DATETIME2,
    FOREIGN KEY (wing_id) REFERENCES Wings(id)
);
```

### Table: `procurement_request_items`
```sql
CREATE TABLE procurement_request_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_request_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id INT NOT NULL,
    item_nomenclature NVARCHAR(500),
    requested_quantity DECIMAL(18,2) NOT NULL,
    approved_quantity DECIMAL(18,2),
    unit_of_measurement NVARCHAR(50),
    estimated_unit_price DECIMAL(18,2),
    notes NVARCHAR(500),
    FOREIGN KEY (procurement_request_id) REFERENCES procurement_requests(id),
    FOREIGN KEY (item_master_id) REFERENCES ItemMaster(id)
);
```

### Table: `procurement_deliveries`
```sql
CREATE TABLE procurement_deliveries (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_request_id UNIQUEIDENTIFIER NOT NULL,
    delivery_number NVARCHAR(50) UNIQUE NOT NULL,
    wing_id INT NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending', -- pending, in_transit, delivered, completed
    delivered_by_user_id NVARCHAR(450),
    delivered_by_name NVARCHAR(200),
    delivery_date DATETIME2,
    received_by_user_id NVARCHAR(450),
    received_by_name NVARCHAR(200),
    received_at DATETIME2,
    notes NVARCHAR(MAX),
    FOREIGN KEY (procurement_request_id) REFERENCES procurement_requests(id),
    FOREIGN KEY (wing_id) REFERENCES Wings(id)
);
```

### Table: `procurement_delivery_items`
```sql
CREATE TABLE procurement_delivery_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    procurement_delivery_id UNIQUEIDENTIFIER NOT NULL,
    procurement_request_item_id UNIQUEIDENTIFIER NOT NULL,
    item_master_id INT NOT NULL,
    delivered_quantity DECIMAL(18,2) NOT NULL,
    received_quantity DECIMAL(18,2),
    unit_of_measurement NVARCHAR(50),
    batch_number NVARCHAR(100),
    expiry_date DATE,
    notes NVARCHAR(500),
    FOREIGN KEY (procurement_delivery_id) REFERENCES procurement_deliveries(id),
    FOREIGN KEY (procurement_request_item_id) REFERENCES procurement_request_items(id),
    FOREIGN KEY (item_master_id) REFERENCES ItemMaster(id)
);
```

## API Endpoints

### Wing User Endpoints
- `POST /api/procurement/requests` - Create new procurement request
- `GET /api/procurement/requests/my-requests` - Get user's requests
- `GET /api/procurement/requests/:id` - Get request details
- `PUT /api/procurement/requests/:id/cancel` - Cancel pending request

### Admin Endpoints
- `GET /api/procurement/requests/pending` - Get all pending requests
- `GET /api/procurement/requests` - Get all requests (with filters)
- `PUT /api/procurement/requests/:id/approve` - Approve request
- `PUT /api/procurement/requests/:id/reject` - Reject request
- `POST /api/procurement/deliveries` - Create delivery from approved request
- `PUT /api/procurement/deliveries/:id/complete` - Mark delivery as completed

### Wing Supervisor Endpoints
- `GET /api/procurement/requests/wing/:wingId` - Get wing's requests
- `PUT /api/procurement/deliveries/:id/receive` - Confirm delivery receipt

## Permissions

### New Permission Keys
- `procurement.request` - Create procurement requests (WING_USER, WING_SUPERVISOR)
- `procurement.approve` - Approve/reject requests (ADMIN, SUPER_ADMIN)
- `procurement.manage_delivery` - Create/manage deliveries (ADMIN, SUPER_ADMIN)
- `procurement.receive_delivery` - Confirm delivery receipt (WING_SUPERVISOR)
- `procurement.view_all` - View all procurement requests (ADMIN, SUPER_ADMIN)
- `procurement.view_wing` - View wing's requests (WING_SUPERVISOR)
- `procurement.view_own` - View own requests (WING_USER)

## Frontend Pages

### 1. Procurement Request Form (`/procurement/new-request`)
- Multi-item selection
- Quantity input for each item
- Justification text
- Priority selection

### 2. My Procurement Requests (`/procurement/my-requests`)
- List of user's requests
- Status tracking
- View details
- Cancel option (if pending)

### 3. Admin Procurement Dashboard (`/procurement/admin`)
- Pending requests list
- Approve/reject actions
- Create delivery option
- View all requests with filters

### 4. Deliveries Management (`/procurement/deliveries`)
- List of all deliveries
- Mark as in-transit
- Mark as delivered
- View delivery details

### 5. Wing Procurement History (`/procurement/wing-history`)
- Wing supervisor view
- Wing's request history
- Delivery receipts
- Stock received tracking

## Integration with Existing System

### Links to Current Inventory
- When delivery is completed (admin marks as delivered)
- Items automatically added to `inventory_stock` table for the wing
- Wing inventory levels updated
- Users can then request via existing verification workflow

### Stock Update Logic
```sql
-- When procurement delivery is completed
INSERT INTO inventory_stock (
    item_master_id, wing_id, quantity_on_hand, 
    last_updated, updated_by_user_id
)
SELECT 
    pdi.item_master_id,
    pd.wing_id,
    pdi.received_quantity,
    GETDATE(),
    pd.received_by_user_id
FROM procurement_delivery_items pdi
JOIN procurement_deliveries pd ON pdi.procurement_delivery_id = pd.id
WHERE pd.id = @deliveryId
ON DUPLICATE KEY UPDATE
    quantity_on_hand = quantity_on_hand + pdi.received_quantity,
    last_updated = GETDATE(),
    updated_by_user_id = pd.received_by_user_id;
```

## Status Flow

```
Procurement Request:
pending → approved/rejected → allocated → delivered → completed
           ↓
      partially_approved → (partial allocation) → ...

Delivery:
pending → in_transit → delivered → completed
```

## Notifications

### For Wing Users
- Request approved/rejected
- Delivery in transit
- Delivery completed

### For Admins
- New procurement request submitted
- Request requires review

### For Wing Supervisors
- Delivery awaiting receipt confirmation
- New items added to wing inventory
