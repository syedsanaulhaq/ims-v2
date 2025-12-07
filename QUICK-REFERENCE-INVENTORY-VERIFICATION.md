# Quick Reference: Inventory Verification + Issuance Workflow

## What Was Built

A complete workflow for verifying inventory before approving stock requests, with automatic intelligent issuance.

## Key Files

| File | Purpose |
|------|---------|
| `/add-inventory-verification-workflow.sql` | Database tables/views for tracking verifications |
| `/add-issuance-workflow-procedures.sql` | SQL procedures for issuance logic |
| `/src/components/InventoryCheckModal.tsx` | Modal for supervisors to check & verify inventory |
| `/src/pages/PendingVerificationsPage.tsx` | Dashboard for inventory supervisors to confirm items |
| `/backend-server.cjs` | 5 new API endpoints for issuance operations |
| `/src/components/ApprovalForwarding.tsx` | Enhanced with inventory check button + auto-issuance |

## User Flows

### Wing Supervisor:
1. ✅ Open approval request
2. ✅ Click "Check Inventory" on any item
3. ✅ See wing/admin stock levels
4. ✅ Choose: Request verification OR confirm available
5. ✅ Click "Approve" 
6. ✅ System auto-issues items from best source

### Inventory Supervisor:
1. ✅ Go to PendingVerificationsPage
2. ✅ See list of verification requests
3. ✅ Click "Verify Item"
4. ✅ Select result: Available / Partial / Unavailable
5. ✅ Enter actual quantity (if partial)
6. ✅ Add notes (location, condition, etc.)
7. ✅ Click "Submit Verification"

## New API Endpoints

```
POST   /api/issuance/determine-source         → Which store to issue from
POST   /api/issuance/issue-from-wing          → Deduct from wing & create transaction
POST   /api/issuance/issue-from-admin         → Deduct from admin & create transaction
POST   /api/issuance/handle-verification-result → Record verification confirmation
POST   /api/issuance/finalize                 → Mark request as complete
GET    /api/issuance/status/:request_id       → Get completion status
```

## Database Stored Procedures

```
sp_DetermineIssuanceSource()     → Returns which store has the item
sp_IssueFromWingStore()         → Issues from wing + updates inventory
sp_IssueFromAdminStore()        → Issues from admin + updates inventory
sp_HandleVerificationResult()   → Updates item status based on verification
sp_FinalizeIssuance()           → Marks request as finalized
View_Issuance_Status            → Shows progress (total/issued/rejected/pending)
```

## Workflow Process

```
Request Submitted
        ↓
Wing Supervisor Reviews
        ├→ (Optional) Check Inventory
        │  ├→ (Optional) Request Verification
        │  │  ↓
        │  │  Inventory Supervisor Verifies
        │  │  ↓
        │  └→ Results Return
        ↓
Approve Button Clicked
        ↓ [AUTOMATIC]
Determine Source for Each Item
        ↓
Issue from Wing OR Admin OR Both
        ↓
Create Stock Transactions
        ↓
Finalize Request
        ↓
Complete ✅
```

## Key Decision Logic

**How is source determined?**
```
if Wing Stock >= Needed:
  → Issue from wing_store
else if Admin Stock >= Needed:
  → Issue from admin_store
else if Wing + Admin >= Needed:
  → Issue mixed (as much from wing, rest from admin)
else:
  → Mark as Procurement Required
```

## Testing Quick Start

1. **Create test request** with 3 items
2. **Open in approvals** → Click "Check Inventory"
3. **See stock levels** (e.g., Wing: 10, Admin: 5)
4. **Choose action**:
   - Click "Ask Inventory Supervisor" → Go to PendingVerificationsPage
   - Or click "Confirm Available" → Jump to approval
5. **Approve request** → Watch issuance happen automatically
6. **Check inventory** → Should be deducted

## Common Questions

**Q: What if item not in wing stock?**
A: System automatically checks admin store, issues from there instead.

**Q: What if partially available?**
A: Inventory supervisor can confirm partial quantity, system issues that amount and marks rest for procurement.

**Q: Can I skip verification?**
A: Yes! Click "Confirm Available & Proceed" to approve without verification request.

**Q: Is issuance automatic?**
A: Yes! Happens automatically when supervisor clicks "Approve". No manual issuance needed.

**Q: Where can inventory supervisors see requests?**
A: Route: `/dashboard/pending-verifications` (PendingVerificationsPage component)

**Q: What if approval is rejected?**
A: No issuance occurs. Request stays in rejected state.

## Monitoring & Debugging

**Check database tables:**
```sql
SELECT * FROM inventory_verification_requests WHERE status = 'pending'
SELECT * FROM stock_issuance_items WHERE item_status = 'issued'
SELECT * FROM View_Issuance_Status WHERE request_id = '...'
```

**Check backend logs:**
- Look for "📦 Starting issuance workflow" messages
- Look for "✅ Issuance workflow completed" success messages
- Check for "sp_DetermineIssuanceSource" execution

**Check frontend:**
- Open browser DevTools Console
- Search for "issuance" or "verification" messages
- Watch network tab for API calls to `/api/issuance/*`

## Integration with Existing System

✅ **Non-breaking** - All existing features still work
✅ **Optional** - Verification can be skipped
✅ **Automatic** - Issuance happens after approval
✅ **Audit Trail** - All actions logged in database

---

**Last Updated**: 2025-01-XX
**Status**: ✅ Complete & Ready for Testing
**Components**: 6 files created/modified
**API Endpoints**: 5 new issuance endpoints
**Database Objects**: 5 procedures + 1 view
