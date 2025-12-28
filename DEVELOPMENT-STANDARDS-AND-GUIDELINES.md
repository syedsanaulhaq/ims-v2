# IMS Development Standards & Guidelines

**Version:** 1.0  
**Effective Date:** December 27, 2025  
**Status:** ACTIVE - All development must follow these standards  
**Last Updated:** December 27, 2025

---

## 🎯 PURPOSE

This document is the **single source of truth** for all IMS system development. Every code change, database modification, and feature addition must conform to these standards.

**Applies To:** Both AI assistance and human developers working on this system.

---

## TABLE OF CONTENTS

1. [Architecture Principles](#architecture-principles)
2. [Database Standards](#database-standards)
3. [Code Organization Standards](#code-organization-standards)
4. [Naming Conventions](#naming-conventions)
5. [API Standards](#api-standards)
6. [Frontend Standards](#frontend-standards)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Requirements](#documentation-requirements)
9. [Git & Version Control](#git--version-control)
10. [Feature Development Workflow](#feature-development-workflow)
11. [Code Review Checklist](#code-review-checklist)
12. [Performance Standards](#performance-standards)
13. [Security Standards](#security-standards)
14. [Approval & Deployment](#approval--deployment)

---

## 1. ARCHITECTURE PRINCIPLES

### 1.1 Layered Architecture
The system follows a **5-layer architecture**:

```
Frontend Layer (React)
    ↓
API Layer (Node.js/Express)
    ↓
Service Layer (Business Logic)
    ↓
Data Access Layer (Repository Pattern)
    ↓
Database Layer (SQL Server)
```

**Rule:** Never skip layers. Frontend must call API, API calls Services, Services call Data Access Layer.

### 1.2 Data Flow Direction
```
Master Data (Top) ← Never changes structure
    ↓
Requests & Transactions
    ↓
Approvals & Workflow
    ↓
Stock Management
    ↓
Audit Trail (Bottom) ← Immutable
```

**Rule:** Always follow this hierarchy. Don't create circular dependencies.

### 1.3 Table Organization
Follow the **5-layer table organization**:
- **Layer 1:** Master Data (ItemMaster, categories, vendors, users, organizational)
- **Layer 2:** Request & Transaction Tables (ProcurementRequests, tenders, awards)
- **Layer 3:** Approval & Workflow (ApprovalWorkflow, approval_items)
- **Layer 4:** Stock Management (CurrentStock, StockTransactions, reorder_requests)
- **Layer 5:** Audit Trail (StockTransactions, return logs)

**Rule:** New tables must be assigned to a layer. Get approval before creating new tables.

### 1.4 The Three Core Principles

**Principle 1: Audit Everything**
- Every transaction must be logged
- Use StockTransactions table
- Include: who, what, when, quantity before/after
- Never physically delete transaction records

**Principle 2: Real-time + Historical**
- CurrentStock = Real-time summary
- StockTransactions = Complete history
- Both must be updated together in same transaction

**Principle 3: Soft Deletes**
- Mark records as deleted, don't remove them
- Use: `is_deleted = 1` or `status = 'inactive'`
- Preserve audit trail
- Apply to all transactional tables

---

## 2. DATABASE STANDARDS

### 2.1 Table Naming Convention
**Standard:** Snake_case (lowercase_with_underscores)

```
✅ CORRECT:
- stock_issuance_requests
- stock_issuance_items
- approval_items
- stock_transactions
- reorder_requests

❌ INCORRECT:
- StockIssuanceRequests
- StockIssuanceItems
- ApprovalItems
- StockTrans
```

**Exception:** Existing legacy tables may use different conventions. Don't change them. New tables must follow snake_case.

### 2.2 Column Naming Convention
**Standard:** Lowercase with underscores, descriptive names

```
✅ CORRECT:
- request_id (primary key)
- request_number (unique reference)
- requester_office_id (foreign key)
- request_status (enum-like field)
- requested_quantity (measurement)
- created_at (timestamp)
- created_by (user reference)
- updated_at (timestamp)
- is_deleted (boolean flag)
- is_returnable (boolean flag)

❌ INCORRECT:
- reqID, req_id (use request_id)
- status (too vague, use request_status)
- qty (use requested_quantity)
- created (use created_at)
- updatedBy (use updated_by)
```

### 2.3 Primary Keys
**Standard:** Use appropriate type based on context

```
✅ INT (auto-increment) for:
- Internal system IDs
- Lookup tables
- Sequence matters
Examples: approval_id, delivery_id, award_item_id

✅ UNIQUEIDENTIFIER (GUID) for:
- Cross-system IDs
- External integrations needed
- Distributed systems
Examples: request_id, stock_issuance_requests.id, vendor.id

✅ VARCHAR/NVARCHAR for:
- User-generated codes
- Natural keys (item_code, request_number)
```

**Rule:** Don't mix types in same table. Choose one primary key type and stick to it. Document why.

### 2.4 Foreign Keys
**Standard:** Always include explicit FK constraints

```sql
❌ WRONG: Just reference another table
CREATE TABLE request_items (
    item_id INT
);

✅ CORRECT: Explicit constraint
CREATE TABLE request_items (
    request_item_id INT PRIMARY KEY,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES procurement_requests(request_id),
    FOREIGN KEY (item_id) REFERENCES item_master(item_id)
);
```

**Rule:** Every relationship must have explicit FK constraint. No orphaned records.

### 2.5 Timestamps
**Standard:** Always include both created_at and updated_at

```sql
✅ REQUIRED fields in every table:
- created_at DATETIME DEFAULT GETDATE()
- created_by NVARCHAR(450) (reference to AspNetUsers.Id)
- updated_at DATETIME DEFAULT GETDATE()
- updated_by NVARCHAR(450) (updated in trigger)

-- Trigger to auto-update updated_at
CREATE TRIGGER tr_table_name_updated
ON table_name
AFTER UPDATE
AS
BEGIN
    UPDATE table_name 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM INSERTED)
END
```

### 2.6 Boolean/Status Fields
**Standard:** Be explicit, avoid confusion

```sql
❌ DON'T:
- active BIT (ambiguous: 1=active or 1=inactive?)

✅ DO:
Option 1 - Boolean flags (clear naming):
- is_active BIT DEFAULT 1
- is_deleted BIT DEFAULT 0
- is_returnable BIT DEFAULT 1

Option 2 - Status field (enumerated values):
- request_status VARCHAR(50) DEFAULT 'PENDING'
  -- Values: 'PENDING', 'APPROVED', 'REJECTED', 'ISSUED'
- delivery_status VARCHAR(50)
  -- Values: 'PENDING', 'RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED'
```

**Rule:** When using BIT columns, the name must clearly indicate the positive state.

### 2.7 Soft Deletes
**Standard:** Add soft delete column to all transactional tables

```sql
-- REQUIRED in transactional tables:
- is_deleted BIT DEFAULT 0

-- WHEN QUERYING:
SELECT * FROM table_name 
WHERE is_deleted = 0  -- Always filter

-- WHEN DELETING:
UPDATE table_name 
SET is_deleted = 1, updated_at = GETDATE()
WHERE id = @id

-- NEVER:
DELETE FROM table_name  -- Physical deletion forbidden
```

**Exception:** Master data tables (ItemMaster, categories) may use `status = 'inactive'` instead.

### 2.8 Indexes
**Standard:** Create indexes for frequently queried columns

```sql
✅ MUST HAVE:
- Primary key (automatic)
- Foreign keys (performance)
- Columns in WHERE clauses
- Columns in ORDER BY
- Columns in GROUP BY

-- Example:
CREATE INDEX idx_requests_status 
ON procurement_requests(request_status);

CREATE INDEX idx_items_item_id 
ON stock_issuance_items(item_master_id);

CREATE INDEX idx_transactions_type_date 
ON stock_transactions(transaction_type, transaction_date);
```

### 2.9 Data Integrity Rules
**Standard:** Enforce at database level, NOT just application level

```sql
-- REQUIRED:
1. NOT NULL constraints on all required fields
2. UNIQUE constraints on natural keys (item_code, request_number)
3. CHECK constraints for valid values
4. DEFAULT values for timestamps and status

-- Examples:
ALTER TABLE procurement_requests
ADD CONSTRAINT ck_request_status 
CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED'));

ALTER TABLE stock_transactions
ADD CONSTRAINT ck_transaction_type 
CHECK (transaction_type IN ('IN', 'OUT', 'TRANSFER', 'RETURN', 'ADJUSTMENT'));
```

### 2.10 Disaster Recovery
**Standard:** All modifications must be reversible

```
BEFORE ANY TABLE CHANGE:
1. Create backup: CREATE TABLE table_name_backup AS SELECT * FROM table_name
2. Document change with script and reverse script
3. Test on copy first
4. Have rollback plan

AFTER CHANGE:
1. Verify data integrity
2. Verify constraints still work
3. Check dependent queries
4. Document in DATABASE-SCHEMA-DOCUMENTATION.md
```

---

## 3. CODE ORGANIZATION STANDARDS

### 3.1 Backend File Structure
```
backend/
├── backend-server.cjs          (Main entry point)
├── routes/                      (API route handlers)
│   ├── procurement.cjs
│   ├── stock-issuance.cjs
│   ├── stock-management.cjs
│   ├── approvals.cjs
│   └── deliveries.cjs
├── services/                    (Business logic)
│   ├── procurement-service.cjs
│   ├── stock-service.cjs
│   ├── approval-service.cjs
│   └── delivery-service.cjs
├── repositories/               (Data access)
│   ├── procurement-repo.cjs
│   ├── stock-repo.cjs
│   ├── approval-repo.cjs
│   └── delivery-repo.cjs
├── middleware/                 (Express middleware)
│   ├── auth-middleware.cjs
│   ├── error-handler.cjs
│   ├── validation.cjs
│   └── logging.cjs
├── utils/                      (Utilities)
│   ├── database.cjs
│   ├── validators.cjs
│   ├── constants.cjs
│   └── helpers.cjs
└── config/                     (Configuration)
    ├── database-config.cjs
    └── constants.cjs
```

**Rule:** Organize by feature/domain, not by layer. Keep related code together.

### 3.2 Frontend File Structure
```
src/
├── pages/                      (Page components)
│   ├── procurement/
│   │   ├── ProcurementRequest.tsx
│   │   ├── ProcurementList.tsx
│   │   └── ProcurementDetail.tsx
│   ├── stock/
│   │   ├── StockIssuancePersonal.tsx
│   │   ├── StockReturn.tsx
│   │   └── StockStatus.tsx
│   └── approvals/
│       ├── ApprovalQueue.tsx
│       └── ApprovalDetail.tsx
├── components/                 (Reusable components)
│   ├── forms/
│   │   ├── ItemSelector.tsx
│   │   └── ApprovalForm.tsx
│   ├── tables/
│   │   ├── RequestTable.tsx
│   │   └── StockTable.tsx
│   └── common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Loading.tsx
├── services/                   (API services)
│   ├── procurement-service.ts
│   ├── stock-service.ts
│   ├── approval-service.ts
│   └── api-client.ts
├── hooks/                      (Custom React hooks)
│   ├── useApproval.ts
│   └── useStock.ts
├── types/                      (TypeScript types)
│   ├── procurement.ts
│   ├── stock.ts
│   └── approval.ts
├── utils/                      (Utilities)
│   ├── validators.ts
│   ├── formatters.ts
│   └── constants.ts
└── styles/                     (CSS/styling)
```

**Rule:** Keep related code close. Use feature-based organization.

### 3.3 Code Comments
**Standard:** Document WHY, not WHAT

```javascript
❌ WRONG:
// Loop through items
for (let i = 0; i < items.length; i++) {
    // Add item to list
    list.push(items[i]);
}

✅ CORRECT:
// Ensure items are in the order they were requested
// (Required for approval workflow step sequencing)
const orderedItems = items.map(item => {
    // Assign sequence number for approval level matching
    return {
        ...item,
        sequenceNumber: items.indexOf(item) + 1
    };
});
```

**Rule:** Comment on logic, not syntax. Assume reader knows language.

### 3.4 Function/Method Size
**Standard:** Keep functions small and focused

```
✅ IDEAL:
- 10-30 lines per function
- Does one thing
- Easy to test
- Easy to understand

❌ AVOID:
- 100+ line functions
- Multiple responsibilities
- Hard to test
- Hard to understand

IF FUNCTION > 50 LINES: Break it into smaller functions
```

### 3.5 Error Handling
**Standard:** Consistent error handling throughout

```javascript
✅ DO:
try {
    const result = await service.processRequest(request);
    return res.status(200).json(result);
} catch (error) {
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: error.message 
        });
    }
    // Log unexpected errors
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
        error: 'Internal server error' 
    });
}

❌ DON'T:
- Throw generic errors
- Log without context
- Return raw database errors to client
- Ignore errors silently
```

---

## 4. NAMING CONVENTIONS

### 4.1 Variable Names
```javascript
✅ CORRECT:
- requestId (specific)
- itemQuantity (specific)
- approverUserId (foreign key clear)
- isActive (boolean, clear)
- requestStatus (enum-like)

❌ WRONG:
- req (too short)
- qty (too abbreviated)
- userId (ambiguous: which user?)
- active (ambiguous: active what?)
- status (too vague)
```

### 4.2 Function Names
```javascript
✅ CORRECT:
- getRequestById(id)
- createStockIssuanceRequest(data)
- validateApprovalFlow(request)
- updateStockQuantity(itemId, quantity)
- markRequestAsApproved(requestId)

❌ WRONG:
- get(id)
- create(data)
- validate()
- update()
- mark()
```

**Rule:** Function names should be VERBS. Variables should be NOUNS.

### 4.3 Class/Type Names
```typescript
✅ CORRECT:
- interface IApprovalRequest {}
- class ProcurementService {}
- enum RequestStatus {}
- type StockTransaction = {}

❌ WRONG:
- interface approval_request {}
- class procurement_service {}
- enum request_status {}
```

**Rule:** Classes and interfaces use PascalCase. Enums use PascalCase.

### 4.4 Enum Values
```typescript
✅ CORRECT:
enum RequestStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    ISSUED = "ISSUED"
}

enum TransactionType {
    IN = "IN",
    OUT = "OUT",
    TRANSFER = "TRANSFER",
    RETURN = "RETURN",
    ADJUSTMENT = "ADJUSTMENT"
}

❌ WRONG:
enum requestStatus {
    pending = "pending",
    approved = "approved"
}
```

**Rule:** Enum names PascalCase, values UPPERCASE_WITH_UNDERSCORES.

---

## 5. API STANDARDS

### 5.1 Endpoint Naming
**Standard:** RESTful conventions

```
✅ CORRECT:
GET    /api/procurement/requests              (List)
POST   /api/procurement/requests              (Create)
GET    /api/procurement/requests/:id          (Retrieve)
PUT    /api/procurement/requests/:id          (Update)
DELETE /api/procurement/requests/:id          (Delete)

GET    /api/stock-issuance/requests           (List)
POST   /api/stock-issuance/requests           (Create)
GET    /api/stock-issuance/requests/:id/items (Nested resources)

POST   /api/approvals/forward                 (Action)
POST   /api/approvals/approve                 (Action)
POST   /api/approvals/reject                  (Action)

❌ WRONG:
GET    /api/GetProcurementRequests
GET    /api/procurement/getRequests
GET    /api/procurement_requests
```

**Rules:**
- Use lowercase with hyphens: `/stock-issuance` not `/StockIssuance`
- Use nouns: `/requests` not `/getRequests`
- Use plural: `/requests` not `/request`
- Use nested for relationships: `/requests/:id/items`

### 5.2 HTTP Status Codes
**Standard:** Use correct status codes consistently

```
200 OK              ← Successful GET/PUT
201 CREATED         ← Successful POST that created resource
204 NO CONTENT      ← Successful DELETE
400 BAD REQUEST     ← Validation error
401 UNAUTHORIZED    ← Not authenticated
403 FORBIDDEN       ← Not authorized
404 NOT FOUND       ← Resource doesn't exist
409 CONFLICT        ← Duplicate key, can't create
500 INTERNAL ERROR  ← Unexpected server error
```

### 5.3 Request/Response Format
**Standard:** Consistent JSON structure

```javascript
// REQUEST:
POST /api/stock-issuance/requests
{
    "request_number": "REQ-2025-001",
    "request_type": "personal",
    "requester_office_id": 1,
    "requester_wing_id": 1,
    "requester_user_id": "user-guid",
    "purpose": "Office supplies",
    "urgency_level": "Medium",
    "is_returnable": true,
    "items": [
        {
            "item_master_id": 5,
            "requested_quantity": 10,
            "unit_price": 100.00
        }
    ]
}

// SUCCESS RESPONSE (201):
{
    "success": true,
    "message": "Stock issuance request created",
    "data": {
        "id": "guid-here",
        "request_number": "REQ-2025-001",
        "request_status": "Submitted",
        "created_at": "2025-12-27T14:00:00Z"
    }
}

// ERROR RESPONSE (400):
{
    "success": false,
    "error": "Validation failed",
    "details": {
        "requested_quantity": "Must be greater than 0",
        "requester_office_id": "Office not found"
    }
}
```

### 5.4 Pagination
**Standard:** For list endpoints

```javascript
GET /api/procurement/requests?page=1&limit=20&status=PENDING

RESPONSE:
{
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "pages": 8
    }
}
```

### 5.5 API Versioning
**Standard:** Version in URL if major changes

```
✅ CURRENT:
/api/v1/procurement/requests

✅ IF BREAKING CHANGES:
/api/v2/procurement/requests  ← New version
/api/v1/procurement/requests  ← Old version (deprecated)
```

---

## 6. FRONTEND STANDARDS

### 6.1 Component Structure
**Standard:** Use functional components with hooks

```typescript
✅ CORRECT:
interface IStockIssuanceProps {
    onSubmit: (data: StockIssuanceRequest) => Promise<void>;
    initialData?: StockIssuanceRequest;
}

const StockIssuanceForm: React.FC<IStockIssuanceProps> = ({
    onSubmit,
    initialData
}) => {
    const [formData, setFormData] = useState<StockIssuanceRequest>(
        initialData || getDefaultValues()
    );
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Component JSX */}
        </form>
    );
};

export default StockIssuanceForm;

❌ AVOID:
- Class components (use functional)
- Callback hell (use hooks)
- Global state for everything (use context/Redux strategically)
```

### 6.2 State Management
**Standard:** Use appropriate level

```
Local State (useState):     ← Form data, UI toggles
Context (useContext):       ← User info, theme
Redux/Global:               ← Cross-page data (last resort)
URL Params (useParams):     ← Filter values, page numbers
```

### 6.3 API Service Layer
**Standard:** Separate API logic from components

```typescript
// ✅ DO: services/stock-issuance-service.ts
export async function submitRequest(
    data: StockIssuanceRequest
): Promise<StockIssuanceRequest> {
    const response = await fetch(
        'http://localhost:3001/api/stock-issuance/requests',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }
    );
    
    if (!response.ok) throw new Error('Failed to submit');
    return response.json();
}

// ❌ DON'T: Put fetch directly in component
const StockIssuanceForm = () => {
    const handleSubmit = () => {
        fetch('http://localhost:3001/api/stock-issuance/requests', {...})
    };
};
```

---

## 7. TESTING REQUIREMENTS

### 7.1 Unit Tests
**Standard:** Test business logic

```javascript
// Test file: procurementService.test.js
describe('calculateTotalAmount', () => {
    it('should calculate total with correct quantity and price', () => {
        const total = calculateTotalAmount(10, 100);
        expect(total).toBe(1000);
    });
    
    it('should handle zero quantity', () => {
        const total = calculateTotalAmount(0, 100);
        expect(total).toBe(0);
    });
});
```

**Requirement:** Every service function must have tests.

### 7.2 Integration Tests
**Standard:** Test API endpoints with database

```javascript
describe('POST /api/stock-issuance/requests', () => {
    it('should create request and update stock', async () => {
        // Create request
        const response = await request(app)
            .post('/api/stock-issuance/requests')
            .send(testData);
        
        expect(response.status).toBe(201);
        
        // Verify database
        const dbRecord = await db.stockIssuanceRequests.findById(response.body.id);
        expect(dbRecord).toBeDefined();
    });
});
```

**Requirement:** Every API endpoint must have integration tests.

### 7.3 Test Coverage
**Standard:** Minimum 80% coverage

```
Required Coverage:
- Functions: 80%+
- Branches: 80%+
- Lines: 80%+

Run: npm test -- --coverage
```

### 7.4 End-to-End Tests
**Standard:** Critical workflows only

```
MUST TEST:
✅ Complete procurement flow (request → approval → delivery → stock)
✅ Stock issuance flow
✅ Stock return flow
✅ Reorder auto-trigger

OPTIONAL:
- UI navigation
- Error scenarios
- Edge cases
```

---

## 8. DOCUMENTATION REQUIREMENTS

### 8.1 Code Documentation
**Standard:** JSDoc comments for all functions

```javascript
/**
 * Create a stock issuance request with items
 * 
 * @param {Object} requestData - Request data
 * @param {string} requestData.request_number - Unique request number (e.g., REQ-2025-001)
 * @param {int} requestData.requester_office_id - Office making request
 * @param {Array} requestData.items - Items to issue
 * @param {Function} approvalCallback - Optional: Called after approval
 * 
 * @returns {Promise<{id: string, status: string}>} Created request
 * 
 * @throws {ValidationError} If required fields missing
 * @throws {StockError} If insufficient stock
 * 
 * @example
 * const request = await createStockIssuanceRequest({
 *     request_number: 'REQ-2025-001',
 *     requester_office_id: 1,
 *     items: [{item_master_id: 5, quantity: 10}]
 * });
 */
async function createStockIssuanceRequest(requestData, approvalCallback) {
    // Implementation
}
```

### 8.2 API Documentation
**Standard:** Document in code + README

```markdown
### POST /api/stock-issuance/requests

Create a new stock issuance request.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
    "request_number": "REQ-2025-001",
    "requester_office_id": 1,
    "items": [
        {"item_master_id": 5, "requested_quantity": 10}
    ]
}
```

**Success Response (201):**
```json
{
    "id": "guid",
    "request_number": "REQ-2025-001",
    "request_status": "Submitted"
}
```

**Error Response (400):**
```json
{
    "error": "Validation failed",
    "details": {"requested_quantity": "Must be > 0"}
}
```

**Examples:**
```bash
curl -X POST http://localhost:3001/api/stock-issuance/requests \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"request_number":"REQ-2025-001",...}'
```
```

### 8.3 Database Change Documentation
**Standard:** Every DB change documented

When modifying DATABASE-SCHEMA-DOCUMENTATION.md, include:
- Why the change was made
- Date of change
- Who made it
- Backward compatibility notes
- Migration script (if needed)

```markdown
### Table: stock_issuance_requests (Updated Dec 27, 2025)

**Change:** Added `expected_return_date` column

**Reason:** Track when borrowed items should be returned

**Migration Script:**
```sql
ALTER TABLE stock_issuance_requests
ADD expected_return_date NVARCHAR(MAX) NULL;
```

**Backward Compatible:** Yes (new column is optional)

**Rollback Script:**
```sql
ALTER TABLE stock_issuance_requests
DROP COLUMN expected_return_date;
```
```

---

## 9. GIT & VERSION CONTROL

### 9.1 Branch Naming
**Standard:** Descriptive branch names

```
✅ CORRECT:
- feature/stock-issuance-workflow
- feature/approval-forwarding
- bugfix/stock-calculation-error
- refactor/database-layer
- docs/api-documentation

❌ WRONG:
- feature/work
- fix/issue
- dev
- update
```

**Rule:** Format: `type/description` where type is feature, bugfix, refactor, docs, chore.

### 9.2 Commit Messages
**Standard:** Clear, descriptive commits

```
✅ CORRECT:
"feat: Add stock issuance request creation with approval workflow"
"fix: Correct stock calculation when quantity > 0"
"docs: Update stock management API documentation"
"refactor: Extract approval logic to service layer"

❌ WRONG:
"fix stuff"
"update"
"work in progress"
"asdf"
```

**Format:** `type: description` where type is feat, fix, docs, refactor, test, chore.

### 9.3 Pull Request Requirements
**Standard:** Every change requires PR

```
BEFORE MERGING TO MAIN:
☐ Branch created from main
☐ All tests passing
☐ Code review approved (at least 1)
☐ No merge conflicts
☐ Documentation updated
☐ Database changes documented
☐ Performance impact assessed
```

### 9.4 Code Review
**Standard:** At least one approval required

Reviewer checklist:
- [ ] Code follows standards (naming, structure, comments)
- [ ] No hardcoded values
- [ ] Error handling present
- [ ] Tests adequate (80%+ coverage)
- [ ] Database changes documented
- [ ] No security issues
- [ ] Performance acceptable

---

## 10. FEATURE DEVELOPMENT WORKFLOW

### 10.1 The Process

**Step 1: Plan**
```
1. Identify the feature need
2. Check DATABASE-SCHEMA-DOCUMENTATION.md to understand current structure
3. Check SYSTEM-ARCHITECTURE-OVERVIEW.md to understand workflows
4. Plan what tables need to change
5. Get approval before starting
```

**Step 2: Design**
```
1. Sketch data model changes
2. Design API endpoints (method, path, request, response)
3. Design UI flows
4. Document in issue/PR description
5. Get design review
```

**Step 3: Implement**
```
1. Create feature branch: git checkout -b feature/feature-name
2. Database changes FIRST (with migrations)
3. Backend API changes SECOND
4. Frontend changes THIRD
5. Add tests for each layer
6. Update documentation
```

**Step 4: Test**
```
1. Manual testing in browser
2. Test with real data
3. Test error scenarios
4. Performance test if applicable
5. Database integrity check
```

**Step 5: Document**
```
1. Update API documentation
2. Update DATABASE-SCHEMA-DOCUMENTATION.md
3. Update SYSTEM-ARCHITECTURE-OVERVIEW.md if workflow changed
4. Add code comments
5. Update CHANGELOG.md
```

**Step 6: Review & Merge**
```
1. Create Pull Request
2. Address review comments
3. All tests passing
4. Get approval
5. Merge to main
6. Deploy if applicable
```

### 10.2 Database-First Development
**Standard:** Always modify database first

```
1. CREATE migration script with:
   - Table creation or alteration
   - Indexes
   - Constraints
   - Default values

2. TEST migration:
   - Run on test database
   - Verify structure
   - Verify no data loss
   - Create rollback script

3. DOCUMENT change:
   - Update DATABASE-SCHEMA-DOCUMENTATION.md
   - Add comments
   - List affected tables

4. THEN implement backend/frontend
```

---

## 11. CODE REVIEW CHECKLIST

Every PR must pass this checklist before merge:

### Code Quality
- [ ] Follows naming conventions
- [ ] Functions under 50 lines
- [ ] No commented code
- [ ] Appropriate comments/documentation
- [ ] No hardcoded values (use constants)
- [ ] No console.log (use proper logging)

### Architecture
- [ ] Follows layered architecture
- [ ] Uses appropriate abstraction level
- [ ] No circular dependencies
- [ ] Data flow is clear
- [ ] Separation of concerns maintained

### Database
- [ ] Tables follow naming convention
- [ ] Proper data types used
- [ ] Foreign keys defined
- [ ] Indexes added for performance
- [ ] Soft deletes used appropriately
- [ ] created_at/updated_at present

### API Design
- [ ] RESTful naming conventions
- [ ] Proper HTTP status codes
- [ ] Consistent request/response format
- [ ] Error handling documented
- [ ] Validation present

### Testing
- [ ] Unit tests present (80%+ coverage)
- [ ] Integration tests for APIs
- [ ] Error cases tested
- [ ] All tests passing
- [ ] No flaky tests

### Documentation
- [ ] JSDoc comments present
- [ ] API endpoints documented
- [ ] Database changes documented
- [ ] README updated if applicable
- [ ] Architecture docs updated if workflow changed

### Performance
- [ ] Query performance acceptable
- [ ] No N+1 queries
- [ ] Appropriate indexes present
- [ ] Caching considered
- [ ] Load time acceptable

### Security
- [ ] No SQL injection vulnerabilities
- [ ] Input validation present
- [ ] Authorization checks present
- [ ] No sensitive data in logs
- [ ] No secrets in code

---

## 12. PERFORMANCE STANDARDS

### 12.1 Database Query Performance
**Standard:** All queries must be optimized

```sql
❌ DON'T: N+1 queries
-- Bad: This loops for every request
SELECT * FROM procurement_requests;
-- Then for each: SELECT * FROM request_items WHERE request_id = @id

✅ DO: Single query with JOIN
SELECT pr.*, ri.*, im.item_name
FROM procurement_requests pr
LEFT JOIN request_items ri ON pr.request_id = ri.request_id
LEFT JOIN item_master im ON ri.item_id = im.item_id
```

**Rule:** Always use JOINs instead of loop + query.

### 12.2 API Response Time
**Standard:** APIs must respond within 2 seconds

```
< 500ms   ← Excellent
500-1000ms ← Good
1-2s      ← Acceptable
> 2s      ← Needs optimization
```

### 12.3 Frontend Load Time
**Standard:** Pages must load within 3 seconds

```
< 1s   ← Excellent
1-2s   ← Good
2-3s   ← Acceptable
> 3s   ← Needs optimization
```

### 12.4 Monitoring
**Standard:** Track performance metrics

```
MUST TRACK:
- API response times
- Database query times
- Page load times
- Error rates
- User actions per minute
```

---

## 13. SECURITY STANDARDS

### 13.1 Authentication
**Standard:** All API endpoints except public ones require authentication

```javascript
// ✅ DO: Require authentication
app.post('/api/stock-issuance/requests', authenticateUser, createRequest);

// ❌ DON'T: Leave endpoints unprotected
app.post('/api/stock-issuance/requests', createRequest);
```

### 13.2 Authorization
**Standard:** Check user permissions on every action

```javascript
// ✅ DO: Verify user has permission
async function approveRequest(req, res) {
    const request = await getRequest(req.params.id);
    const user = req.user;
    
    // Check: Is user an approver?
    if (user.role !== 'APPROVER' && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check: Is this request in user's queue?
    if (!canUserApprove(user, request)) {
        return res.status(403).json({ error: 'Cannot approve this request' });
    }
    
    // Proceed
    await markAsApproved(request.id, user.id);
}
```

### 13.3 Data Validation
**Standard:** Validate all inputs

```javascript
// ✅ DO: Comprehensive validation
const schema = {
    request_number: { required: true, pattern: /^REQ-\d{4}-\d{3}$/ },
    requested_quantity: { required: true, min: 1, max: 10000 },
    requester_office_id: { required: true, type: 'int', min: 1 }
};

function validateRequest(data) {
    const errors = {};
    
    if (!data.request_number || !schema.request_number.pattern.test(data.request_number)) {
        errors.request_number = 'Invalid format';
    }
    
    if (!data.requested_quantity || data.requested_quantity < 1) {
        errors.requested_quantity = 'Must be >= 1';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
}
```

### 13.4 SQL Injection Prevention
**Standard:** Always use parameterized queries

```javascript
// ❌ DON'T: String concatenation (SQL injection!)
const query = `SELECT * FROM requests WHERE id = ${req.params.id}`;

// ✅ DO: Parameterized queries
const query = `SELECT * FROM requests WHERE id = @id`;
const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(query);
```

### 13.5 Logging & Monitoring
**Standard:** Log security events

```javascript
// ✅ DO: Log important events
function logSecurityEvent(event, user, details) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: event,
        userId: user.id,
        userRole: user.role,
        details: details,
        ip: req.ip
    }));
}

// Examples to log:
logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', user, { 
    resource: '/api/admin/users' 
});

logSecurityEvent('APPROVAL_GRANTED', user, { 
    requestId: req.params.id 
});
```

---

## 14. APPROVAL & DEPLOYMENT

### 14.1 Change Approval Process
**Before deployment to production:**

```
DATABASE CHANGES:
□ Backup created
□ Migration script tested
□ Rollback script prepared
□ Impact analysis done
□ DBA review approved

CODE CHANGES:
□ Code review approved
□ All tests passing
□ Performance impact assessed
□ Security review completed
□ Documentation updated

DEPLOYMENT:
□ Tested in staging
□ User acceptance approved
□ Deployment plan documented
□ Rollback plan ready
□ Monitoring alerts set
```

### 14.2 Deployment Checklist
```
PRE-DEPLOYMENT:
☐ All tests passing
☐ Database backup taken
☐ Rollback plan documented
☐ Monitoring alerts enabled
☐ Runbook prepared

DURING DEPLOYMENT:
☐ Deploy during maintenance window
☐ Monitor error rates
☐ Monitor response times
☐ Check user complaints
☐ Have rollback ready

POST-DEPLOYMENT:
☐ Verify in production
☐ Check data integrity
☐ Monitor for 24 hours
☐ Get user feedback
☐ Document any issues
```

### 14.3 Rollback Plan
**Standard:** Every change must have a rollback plan

```
IF ISSUES DETECTED:

1. IMMEDIATE: Revert to previous version
   git revert <commit>
   // or
   Restore database from backup

2. NOTIFY: Inform stakeholders
   - Operations team
   - Users (if applicable)
   - Management

3. INVESTIGATE: After system stabilized
   - What went wrong?
   - How do we prevent it?
   - What tests were missing?

4. FIX: In next deployment window
   - Fix root cause
   - Add tests to catch it
   - Document lessons learned
```

---

## 15. CHANGE LOG REQUIREMENTS

**File:** CHANGELOG.md (at project root)

Every PR must update CHANGELOG.md:

```markdown
## [1.2.0] - 2025-12-27

### Added
- Stock issuance approval workflow
- Auto-reorder request generation

### Fixed
- Stock calculation error when quantity > 100
- Approval forwarding not updating status

### Changed
- Stock transaction timestamps to UTC
- Improved error messages for validation

### Removed
- Legacy stock_temp table

### Database
- Created stock_issuance_requests table
- Added indexes on request_status and created_at

### Dependencies
- Updated mssql to 9.0.1
```

---

## 📋 QUICK REFERENCE - KEY RULES

1. **Database First** - Always design database changes before code
2. **Audit Everything** - Every transaction logged in StockTransactions
3. **Real-time + History** - Update CurrentStock AND StockTransactions together
4. **Soft Deletes** - Mark as deleted, don't remove
5. **Snake_case** - Table and column names in snake_case
6. **Test Everything** - 80%+ coverage required
7. **Document Changes** - Update schema doc after every change
8. **Security First** - Authenticate and authorize all actions
9. **Query Optimization** - Use JOINs, not loops
10. **No Hardcoding** - Use constants for all values

---

## 🚀 HOW TO USE THIS DOCUMENT

### For Every Feature:
1. Read the relevant section
2. Follow the checklist
3. Test against standards
4. Pass code review
5. Update documentation

### For AI (GitHub Copilot):
- I will follow these standards in every code suggestion
- I will verify PR against this checklist
- I will refuse to make changes that violate these standards
- I will ask for clarification if standards conflict

### For Human Developers:
- Reference this for consistency
- Suggest improvements if standards unclear
- Enforce standards in code review
- Keep this document updated

---

## 📞 STANDARDS ENFORCEMENT

**Who enforces these standards?**
- **Code Review:** PR reviewers check against Code Quality & Architecture sections
- **Automated Tests:** CI/CD fails if tests < 80% coverage
- **Database Governance:** DBA review for all schema changes
- **Performance Testing:** Automated checks for response time < 2s
- **Security Audit:** Annual security review

**What happens if standards violated?**
- PR rejected with feedback
- Feature development delayed
- Security issues fixed immediately
- Performance issues tracked as bugs

---

## 📚 RELATED DOCUMENTS

- [DATABASE-SCHEMA-DOCUMENTATION.md](./DATABASE-SCHEMA-DOCUMENTATION.md) - Detailed table reference
- [SYSTEM-ARCHITECTURE-OVERVIEW.md](./SYSTEM-ARCHITECTURE-OVERVIEW.md) - Architecture & workflows
- [DATABASE-RELATIONSHIPS-VISUAL.md](./DATABASE-RELATIONSHIPS-VISUAL.md) - Relationship diagrams
- [QUICK-REFERENCE-CARD.md](./QUICK-REFERENCE-CARD.md) - Quick lookup guide

---

**VERSION:** 1.0  
**EFFECTIVE DATE:** December 27, 2025  
**LAST UPDATED:** December 27, 2025  
**STATUS:** ✅ ACTIVE - ALL DEVELOPMENT MUST FOLLOW THESE STANDARDS

---

**This is the foundation for all IMS development. Every code change, database modification, and feature must conform to these standards.**

🎯 **Let's build great software together!**
