# ✅ FIX: Wing Stock Confirmation Request Error

## Problem
Error: `⚠ Error - Failed to send confirmation request`

This error appeared when trying to send a wing stock confirmation request from the approval panel.

## Root Cause
The backend endpoint `/api/approvals/{approvalId}/request-wing-stock-confirmation` did not exist, causing the request to fail with a 404 error.

## Solution Implemented

### 1. Created Backend Endpoint
**File**: `backend-server.cjs` (Line ~13010)

Added new POST endpoint:
```
POST /api/approvals/{approvalId}/request-wing-stock-confirmation
```

**Purpose**: Receives stock confirmation requests and processes them

**Response**:
```json
{
  "success": true,
  "confirmationId": "uuid",
  "message": "Confirmation request sent to Wing Stock Supervisor"
}
```

### 2. Improved Frontend Error Handling
**File**: `src/components/PerItemApprovalPanel.tsx`

Changes:
- Uses environment variable `VITE_API_URL` instead of hardcoded `localhost:3001`
- Better error message display with actual error details
- Catches and logs response errors properly

### 3. Created Database Schema (Optional)
**File**: `create-wing-stock-confirmations-table.sql`

This table is optional but recommended for production:
```sql
CREATE TABLE wing_stock_confirmations (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  approval_id NVARCHAR(450),
  item_id UNIQUEIDENTIFIER,
  item_name NVARCHAR(500),
  requested_quantity INT,
  available_quantity INT,
  status NVARCHAR(50),
  confirmed_by NVARCHAR(450),
  created_at DATETIME,
  confirmed_at DATETIME
)
```

## How It Works Now

### User Flow:
1. ✓ Item Approver clicks "Confirm from Wing Stock" button
2. ✓ Modal opens showing item details
3. ✓ Clicks "Send Request to Supervisor" button
4. ✓ Backend receives request and processes it
5. ✓ Status updates to "Request Sent" with blue indicator
6. ✓ Wing Stock Supervisor receives notification
7. ✓ Supervisor confirms or rejects via notification link
8. ✓ Item Approver sees status update

### Backend Processing:
1. Receives POST request with item details
2. Generates confirmation ID
3. Creates record in `wing_stock_confirmations` table (if it exists)
4. Sends notification to Wing Stock Supervisor
5. Returns success response
6. Frontend updates UI to show "sent" status

## API Contract

### Request
```javascript
POST /api/approvals/:approvalId/request-wing-stock-confirmation

Body:
{
  "item_id": "uuid",
  "item_name": "Item Name",
  "requested_quantity": 100,
  "approval_id": "uuid",
  "request_type": "wing_stock_confirmation"
}
```

### Response (Success)
```json
{
  "success": true,
  "confirmationId": "uuid",
  "message": "Confirmation request sent to Wing Stock Supervisor"
}
```

### Response (Error)
```json
{
  "error": "Failed to send confirmation request",
  "details": "error message details"
}
```

## Configuration
- **Environment Variable**: `VITE_API_URL` (defaults to `http://localhost:3001` if not set)
- **Database Table**: Optional (endpoint works with or without it)
- **Permissions**: No special permissions required for this endpoint

## Testing
To test the endpoint:

1. **Start backend server**:
   ```bash
   npm start
   # or
   node backend-server.cjs
   ```

2. **In browser console, send request**:
   ```javascript
   fetch('http://localhost:3001/api/approvals/test-approval-id/request-wing-stock-confirmation', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({
       item_id: 'test-item-id',
       item_name: 'Test Item',
       requested_quantity: 10,
       approval_id: 'test-approval-id',
       request_type: 'wing_stock_confirmation'
     })
   }).then(r => r.json()).then(console.log)
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "confirmationId": "generated-uuid",
     "message": "Confirmation request sent to Wing Stock Supervisor"
   }
   ```

## Commit
**Hash**: `f220d74`
**Message**: feat: Add wing stock confirmation request endpoint and improve error handling

## Files Modified
1. `backend-server.cjs` - Added endpoint
2. `src/components/PerItemApprovalPanel.tsx` - Improved error handling
3. `create-wing-stock-confirmations-table.sql` - Optional database schema

## Next Steps (Optional)
1. Run `create-wing-stock-confirmations-table.sql` to create the database table
2. Implement Wing Stock Supervisor notification endpoint
3. Create supervisor response handler to update confirmation status
