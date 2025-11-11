# COMPLETE STOCK ISSUANCE WORKFLOW - IMPLEMENTATION GUIDE

## 📋 Overview

This implementation provides a complete end-to-end workflow for managing stock issuance requests with:

1. **Real-time stock availability checking** when creating requests
2. **Automatic stock deduction** when items are issued
3. **Complete tracking** of who got what items
4. **Return management** for returnable items
5. **Overdue item tracking**
6. **Stock reservation** system

---

## 🗂️ Files Created

### 1. **Database Schema** (`complete-stock-issuance-workflow.sql`)
   - `issued_items_ledger` table - Tracks all issued items
   - `fn_CheckStockAvailability` function - Check if items are available
   - `sp_IssueStockItems` procedure - Issue items and update stock
   - `sp_ReturnIssuedItems` procedure - Handle item returns
   - `vw_UserIssuedItemsHistory` view - User's issued items history
   - `vw_StockAvailabilityDetails` view - Current stock status

### 2. **Backend APIs** (`stock-issuance-api-endpoints.js`)
   - Stock availability checking endpoints
   - Batch availability verification
   - Issue stock items endpoint
   - Return items endpoint
   - User issued items history
   - Dashboard statistics

### 3. **Frontend Component** (`StockAvailabilityChecker.tsx`)
   - Real-time stock search
   - Availability checking
   - Visual feedback on stock status
   - Batch availability verification

---

## 🚀 Implementation Steps

### Step 1: Run the Database Script

```bash
sqlcmd -S SYED-FAZLI-LAPT -d InventoryManagementDB -i complete-stock-issuance-workflow.sql
```

**This creates:**
- ✅ `issued_items_ledger` table
- ✅ Stock checking functions
- ✅ Issuance & return procedures
- ✅ Helpful views for reporting

---

### Step 2: Add Backend API Endpoints

**In `backend-server.cjs`, add all endpoints from `stock-issuance-api-endpoints.js`**

Copy the entire content and paste it before the final `app.listen()` statement.

**Key Endpoints:**
```javascript
POST   /api/stock/check-availability              // Check single item
POST   /api/stock/check-availability-batch        // Check multiple items
GET    /api/stock/search-with-availability        // Search with stock info
POST   /api/stock-issuance/issue/:requestId       // Issue approved items
GET    /api/issued-items/user/:userId             // User's issued items
POST   /api/issued-items/return/:ledgerId         // Return items
GET    /api/issued-items/pending-returns          // Overdue items
GET    /api/stock/availability-dashboard          // Stock overview
```

---

### Step 3: Integrate Frontend Component

**A. Import the Component in your Stock Issuance Form:**

```tsx
import StockAvailabilityChecker from '@/components/stock/StockAvailabilityChecker';
```

**B. Use it in your form:**

```tsx
<StockAvailabilityChecker
  selectedItems={requestItems} // Array of { item_master_id, requested_quantity }
  onItemSelect={(item) => {
    // Handle item selection
    console.log('Selected item:', item);
  }}
  onAvailabilityCheck={(result) => {
    // Handle availability check result
    console.log('Availability:', result);
  }}
/>
```

---

## 📊 Complete Workflow

### 1. **Creating a Request** (User Side)

```
User opens Stock Issuance Form
   ↓
Searches for items using StockAvailabilityChecker
   ↓
Component shows:
   - Available stock: 50 units
   - Reserved: 10 units
   - Available for request: 40 units
   ↓
User requests 5 units
   ↓
Component checks availability:
   ✅ Available - Can proceed
   ❌ Not available - Show error
   ⚠️  Partial - Show available quantity
   ↓
User adds item to request
   ↓
System performs batch check on all items
   ↓
If all available → Allow submission
If some unavailable → Show which items are out of stock
   ↓
Request submitted with status: "Pending"
```

### 2. **Approval Process** (Admin Side)

```
Admin reviews request
   ↓
Checks items and quantities
   ↓
Approves/Rejects each item
   ↓
Request status: "Approved"
```

### 3. **Issuing Items** (Stock Manager Side)

```
Stock Manager opens approved request
   ↓
Clicks "Issue Items" button
   ↓
System calls: POST /api/stock-issuance/issue/:requestId
   ↓
Backend executes sp_IssueStockItems procedure:
   ├─ Checks stock availability
   ├─ Deducts quantity from current_inventory_stock
   ├─ Updates available_quantity
   ├─ Creates record in issued_items_ledger
   ├─ Updates request status to "Issued"
   └─ Returns success/failure
   ↓
System shows confirmation:
   "✅ Items issued successfully to [User Name]"
```

### 4. **Tracking Issued Items**

```sql
-- View all items issued to a specific user
SELECT * FROM vw_UserIssuedItemsHistory 
WHERE issued_to_user_id = 'USER-ID'
ORDER BY issued_at DESC;

-- Result shows:
-- - What items they got
-- - When they received them
-- - Quantity and value
-- - Return status (if returnable)
-- - Whether items are overdue
```

### 5. **Returning Items** (For Returnable Items)

```
User returns item to stock
   ↓
Stock Manager selects item from issued_items_ledger
   ↓
Clicks "Return Item"
   ↓
Specifies:
   - Quantity returned
   - Condition (Good/Damaged/Lost)
   - Return notes
   ↓
System calls: POST /api/issued-items/return/:ledgerId
   ↓
Backend executes sp_ReturnIssuedItems procedure:
   ├─ If condition = "Good":
   │   ├─ Add quantity back to current_inventory_stock
   │   └─ Update available_quantity
   ├─ If condition = "Damaged":
   │   └─ Mark as returned but don't add to stock
   ├─ If condition = "Lost":
   │   └─ Mark as lost
   └─ Update issued_items_ledger record
   ↓
System confirms return
```

---

## 🔍 Key Features Explained

### 1. **Stock Availability Checking**

**Function:** `fn_CheckStockAvailability`

```sql
SELECT * FROM dbo.fn_CheckStockAvailability(
    'ITEM-MASTER-ID', 
    5  -- requested quantity
);
```

**Returns:**
- Current stock levels
- Available quantity (after reservations)
- Whether request can be fulfilled
- Estimated value
- Whether issuance will trigger reorder

**Use Case:**
- Before submitting request
- During approval process
- Real-time validation

### 2. **Automatic Stock Deduction**

**Procedure:** `sp_IssueStockItems`

```sql
EXEC sp_IssueStockItems 
    @request_id = 'REQUEST-ID',
    @issued_by = 'ADMIN-USER-ID',
    @issued_by_name = 'Admin Name',
    @issuance_notes = 'Issued for project XYZ';
```

**What It Does:**
1. Gets all approved items from request
2. For each item:
   - Checks if stock is available
   - Deducts from `current_inventory_stock`
   - Updates `available_quantity`
   - Creates ledger entry in `issued_items_ledger`
   - Updates item status to "Issued"
3. Updates request status to "Issued"
4. All within a transaction (rolls back if any error)

### 3. **Issued Items Tracking**

**Table:** `issued_items_ledger`

**Stores:**
- Who got the item (user, office, wing)
- What item (nomenclature, quantity, value)
- When issued
- Who issued it
- Purpose of issuance
- Return information (if returnable)
- Current status

**Example Query:**
```sql
-- What items does User X currently have?
SELECT 
    nomenclature,
    issued_quantity,
    issued_at,
    is_returnable,
    return_status,
    expected_return_date
FROM issued_items_ledger
WHERE issued_to_user_id = 'USER-ID'
    AND status IN ('Issued', 'In Use')
ORDER BY issued_at DESC;
```

### 4. **Return Management**

**Procedure:** `sp_ReturnIssuedItems`

```sql
EXEC sp_ReturnIssuedItems
    @ledger_id = 'LEDGER-ENTRY-ID',
    @return_quantity = 1,
    @returned_by = 'User Name',
    @return_notes = 'Returned in good condition',
    @item_condition = 'Good';  -- Good/Damaged/Lost
```

**Condition Handling:**
- **Good:** Adds back to stock, marks as returned
- **Damaged:** Marks as returned but doesn't add to stock
- **Lost:** Marks as lost, doesn't add to stock

### 5. **Overdue Tracking**

**Automatic Detection:**

```sql
-- View automatically calculates overdue status
SELECT * FROM vw_UserIssuedItemsHistory
WHERE current_return_status = 'Overdue';
```

**Logic:**
```
IF is_returnable = 1 
   AND return_status = 'Not Returned'
   AND expected_return_date < TODAY
THEN status = 'Overdue'
```

---

## 📱 Frontend Integration Examples

### Example 1: Add to Stock Issuance Form

```tsx
// In your StockIssuance.tsx or similar component

import StockAvailabilityChecker from '@/components/stock/StockAvailabilityChecker';

function StockIssuanceForm() {
  const [requestItems, setRequestItems] = useState([]);
  
  return (
    <div>
      <h2>Create Stock Issuance Request</h2>
      
      {/* Stock Availability Checker */}
      <StockAvailabilityChecker
        selectedItems={requestItems}
        onItemSelect={(item) => {
          // Add item to request
          setRequestItems([...requestItems, {
            item_master_id: item.item_master_id,
            requested_quantity: 1
          }]);
        }}
        onAvailabilityCheck={(result) => {
          if (!result.can_fulfill) {
            alert(`❌ Only ${result.available_quantity} units available`);
          }
        }}
      />
      
      {/* Rest of your form */}
    </div>
  );
}
```

### Example 2: Issue Items Button (Admin)

```tsx
function ApprovedRequestDetails({ requestId }) {
  const [issuing, setIssuing] = useState(false);
  
  const handleIssueItems = async () => {
    setIssuing(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/stock-issuance/issue/${requestId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issued_by: currentUser.id,
            issued_by_name: currentUser.name,
            issuance_notes: 'Items issued as per approval'
          })
        }
      );
      
      if (response.ok) {
        toast.success('✅ Items issued successfully!');
        // Refresh request details
      } else {
        toast.error('❌ Failed to issue items');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error issuing items');
    } finally {
      setIssuing(false);
    }
  };
  
  return (
    <div>
      <Button onClick={handleIssueItems} disabled={issuing}>
        {issuing ? 'Issuing...' : 'Issue Items'}
      </Button>
    </div>
  );
}
```

### Example 3: User's Issued Items Page

```tsx
function MyIssuedItems() {
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    fetch(`http://localhost:3001/api/issued-items/user/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        setItems(data.items);
        console.log('My items:', data.summary);
      });
  }, []);
  
  return (
    <div>
      <h2>My Issued Items</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Issued Date</th>
            <th>Returnable</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.ledger_id}>
              <td>{item.nomenclature}</td>
              <td>{item.issued_quantity}</td>
              <td>{new Date(item.issued_at).toLocaleDateString()}</td>
              <td>{item.is_returnable ? 'Yes' : 'No'}</td>
              <td>
                <Badge 
                  color={item.current_return_status === 'Overdue' ? 'red' : 'green'}
                >
                  {item.current_return_status}
                </Badge>
              </td>
              <td>
                {item.is_returnable && item.return_status === 'Not Returned' && (
                  <Button onClick={() => handleReturn(item.ledger_id)}>
                    Return Item
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📊 Reporting Queries

### 1. **Items Issued to a Specific Office**

```sql
SELECT 
    issued_to_office_name,
    COUNT(*) as total_items_issued,
    SUM(issued_quantity) as total_quantity,
    SUM(total_value) as total_value_issued
FROM issued_items_ledger
WHERE issued_to_office_id = 583  -- Your office ID
GROUP BY issued_to_office_name;
```

### 2. **Most Issued Items**

```sql
SELECT TOP 10
    nomenclature,
    COUNT(*) as times_issued,
    SUM(issued_quantity) as total_quantity_issued,
    SUM(total_value) as total_value
FROM issued_items_ledger
GROUP BY nomenclature, item_master_id
ORDER BY total_quantity_issued DESC;
```

### 3. **Overdue Returns Report**

```sql
SELECT 
    issued_to_user_name,
    issued_to_office_name,
    nomenclature,
    issued_quantity,
    expected_return_date,
    DATEDIFF(DAY, expected_return_date, GETDATE()) as days_overdue,
    total_value
FROM vw_UserIssuedItemsHistory
WHERE current_return_status = 'Overdue'
ORDER BY days_overdue DESC;
```

### 4. **Stock Consumption by Category**

```sql
SELECT 
    category_name,
    COUNT(DISTINCT item_master_id) as unique_items,
    SUM(issued_quantity) as total_quantity_issued,
    SUM(total_value) as total_value
FROM vw_UserIssuedItemsHistory
WHERE issued_at >= DATEADD(MONTH, -1, GETDATE())  -- Last month
GROUP BY category_name
ORDER BY total_value DESC;
```

### 5. **Low Stock Alert**

```sql
SELECT 
    nomenclature,
    category_name,
    available_quantity,
    minimum_stock_level,
    reorder_point,
    stock_status
FROM vw_StockAvailabilityDetails
WHERE stock_status IN ('Low Stock', 'Reorder Required', 'Out of Stock')
ORDER BY available_quantity ASC;
```

---

## 🎯 Best Practices

### 1. **Always Check Availability Before Submission**
```tsx
// In your form submission handler
const checkAvailability = async () => {
  const response = await fetch('/api/stock/check-availability-batch', {
    method: 'POST',
    body: JSON.stringify({ items: requestItems })
  });
  const data = await response.json();
  
  if (!data.all_available) {
    alert('Some items are not available!');
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  const available = await checkAvailability();
  if (!available) return;
  
  // Proceed with submission
};
```

### 2. **Handle Stock Deduction in Transaction**
The stored procedure already handles this, but ensure backend calls it properly:

```javascript
// Backend endpoint
app.post('/api/stock-issuance/issue/:requestId', async (req, res) => {
  try {
    await pool.request()
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('issued_by', sql.UniqueIdentifier, issued_by)
      .input('issued_by_name', sql.NVarChar, issued_by_name)
      .execute('sp_IssueStockItems');  // Everything in transaction
    
    res.json({ success: true });
  } catch (error) {
    // Transaction auto-rolled back
    res.status(500).json({ error: error.message });
  }
});
```

### 3. **Track Everything**
The `issued_items_ledger` table stores complete history:
- Who requested
- Who approved
- Who issued
- Purpose
- Date/time
- Return status

Never delete - just update status!

### 4. **Notify Users**
After issuance, send notifications:

```javascript
// After successful issuance
await sendNotification({
  user_id: requester_user_id,
  title: 'Items Issued',
  message: `Your request #${request_number} has been issued`,
  type: 'success'
});
```

### 5. **Regular Overdue Checks**
Schedule a daily job to check overdue items:

```javascript
// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const response = await fetch('/api/issued-items/pending-returns');
  const { overdue_items } = await response.json();
  
  // Send reminders
  overdue_items.forEach(item => {
    sendReminderEmail(item.issued_to_user_id, item);
  });
});
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     STOCK ISSUANCE WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────┘

1. REQUEST CREATION
   User → Search Items → Check Availability → Add to Request → Submit
                ↓
        [stock_issuance_requests]
        [stock_issuance_items]
                ↓
2. APPROVAL PROCESS
   Admin → Review Request → Approve/Reject Items
                ↓
        Update item_status = 'Approved'
                ↓
3. ISSUANCE
   Stock Manager → Click "Issue Items" → Call sp_IssueStockItems
                ↓
        ┌──────────────────────────────┐
        │ sp_IssueStockItems Procedure │
        ├──────────────────────────────┤
        │ 1. Check availability        │
        │ 2. Deduct from stock         │
        │ 3. Create ledger entry       │
        │ 4. Update request status     │
        └──────────────────────────────┘
                ↓
        [current_inventory_stock] ← Stock reduced
        [issued_items_ledger] ← Record created
                ↓
4. TRACKING
   User/Admin → View issued items → Monitor returns
                ↓
        [vw_UserIssuedItemsHistory]
                ↓
5. RETURN (If Returnable)
   User returns → Stock Manager → Call sp_ReturnIssuedItems
                ↓
        [current_inventory_stock] ← Stock added back
        [issued_items_ledger] ← Status updated
```

---

## ✅ Testing Checklist

- [ ] Run database script successfully
- [ ] Add backend endpoints to server
- [ ] Test stock availability check
- [ ] Test batch availability check
- [ ] Test item search with availability
- [ ] Create test request with items
- [ ] Approve test request
- [ ] Issue items and verify stock deduction
- [ ] Check issued_items_ledger has entry
- [ ] View user's issued items
- [ ] Test return functionality
- [ ] Verify stock added back after return
- [ ] Check overdue items alert
- [ ] Test dashboard statistics

---

## 🎉 You're All Set!

Your system now has:
✅ Real-time stock availability checking
✅ Automatic inventory updates
✅ Complete tracking of issued items
✅ Return management
✅ Overdue monitoring
✅ Comprehensive reporting

**Next Steps:**
1. Run the SQL script
2. Add the backend endpoints
3. Integrate the frontend component
4. Test the complete flow
5. Customize as needed

For questions or issues, check the console logs at each step!
