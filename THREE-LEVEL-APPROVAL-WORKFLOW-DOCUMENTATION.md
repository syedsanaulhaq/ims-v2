# THREE-LEVEL INVENTORY APPROVAL WORKFLOW
## Complete System Documentation

**Date:** November 28, 2025  
**Database:** InventoryManagementDB  
**System:** ECP Inventory Management System (IMS v1)

---

## 📊 ROLE SYSTEM ARCHITECTURE

### Role Tables Structure

The system uses **ASP.NET Identity** role-based system:

```sql
-- Role Definitions
AspNetRoles
├── Id (NVARCHAR(450) PK)
├── Name (e.g., 'Administrator', 'DG', 'ADG', 'LW-HoD')
└── NormalizedName

-- User-Role Mapping (Many-to-Many)
AspNetUserRoles
├── UserId (NVARCHAR(450) FK → AspNetUsers.Id)
└── RoleId (NVARCHAR(450) FK → AspNetRoles.Id)

-- Users
AspNetUsers
├── Id (NVARCHAR(450) PK)
├── FullName
├── CNIC
├── Email
├── intOfficeID (INT) → Links to old Offices table
├── intWingID (INT) → Links to old Wings table
└── Role (NVARCHAR - DEPRECATED, use AspNetUserRoles instead)
```

---

## 🎭 ROLE CATEGORIES

### 1. **System Administrators** (Top-Level Authority)
Roles that can approve ALL requests system-wide:
- `Administrator` - Full system access
- `DS Admin` - Digital System administrators
- `SAAdminHR` - Super Admin for HR
- `DG` - Director General
- `ADG` - Additional Director General
- `DG-Trg` - Director General Training

**Current Count:** 17 system administrators

**Query:**
```sql
SELECT * FROM vw_system_admins;
```

---

### 2. **Wing Supervisors** (Department-Level Authority)
Roles that can approve requests for THEIR WING only:
- `LW-HoD` - Legal Wing Head of Department (4 users)
- `EMon Admin` - Election Monitoring Admin (3 users)
- `PMon Admin` - Political Monitoring Admin (4 users)
- Any role with `Admin`, `Manager`, `Director`, or `HoD` in name

**Current Count:** 25 wing supervisors across various wings

**Query:**
```sql
SELECT * FROM vw_wing_supervisors WHERE wing_id = 19; -- Example: Wing 19
```

---

### 3. **General Users** (Request Creators)
- `Employee` - Regular staff members
- `DEC1`, `REC1`, etc. - Department-specific roles
- Any role without administrative privileges

---

## 🔄 APPROVAL WORKFLOW LOGIC

### WHO CAN APPROVE WHAT?

#### **Individual Requests (Personal items)**
```
Flow: User → Wing Supervisor → Admin (if needed) → Issuance
```

**Step 1: User Creates Request**
- User belongs to a wing (e.g., Wing 19 - IT Department)
- System captures: `requester_wing_id = 19`
- Request status: `Pending Supervisor Review`

**Step 2: System Finds Supervisor**
```sql
-- Auto-assignment logic
SELECT TOP 1 user_id, supervisor_name, role_name
FROM vw_wing_supervisors
WHERE wing_id = @requester_wing_id
ORDER BY 
  CASE 
    WHEN role_name LIKE '%HoD%' THEN 1      -- Heads first
    WHEN role_name LIKE '%Manager%' THEN 2
    WHEN role_name LIKE '%Admin%' THEN 3
    ELSE 4
  END;
```

**Step 3: Supervisor Reviews**

**Access:** Supervisor logs in, goes to `/approvals/supervisor`

**What They See:**
- ALL requests from users in their wing
- Stock availability check (Wing Stock vs Admin Stock)

**Supervisor Can:**
- ✅ **APPROVE** - If wing stock sufficient → Issues from Wing Store
- ➡️ **FORWARD to Admin** - If wing stock insufficient → Escalates
- ❌ **REJECT** - Denies request with reason

**Step 4: Admin Reviews (If Forwarded)**

**Access:** Admin logs in, goes to `/approvals/admin`

**What They See:**
- ALL forwarded requests from ALL wings
- Supervisor's forwarding reason
- Admin stock availability

**Admin Can:**
- ✅ **APPROVE** - Issues from Admin Store (may transfer to Wing first)
- ❌ **REJECT** - Final denial

---

#### **Organizational Requests (Wing-level bulk)**
```
Flow: Wing Supervisor → Admin → Issuance
```

**Skips wing-level review** - Goes directly to admin for larger organizational requests.

---

## 🗂️ DATABASE VIEWS & FUNCTIONS

### Key Views Created:

#### 1. `vw_wing_supervisors`
Lists all users who can act as supervisors for their wings.

**Criteria:**
- Has role containing: Admin, DG, ADG, Manager, Director, or HoD
- Has `intWingID` assigned (not NULL or 0)

**Columns:**
```sql
user_id, supervisor_name, wing_id, office_id, Email, role_name, role_id
```

---

#### 2. `vw_system_admins`
Lists all top-level administrators who can approve any request.

**Criteria:**
- Has role: Administrator, DS Admin, SAAdminHR, DG*, or ADG

**Columns:**
```sql
user_id, admin_name, office_id, Email, role_name, role_id
```

---

#### 3. `vw_pending_supervisor_approvals`
Shows requests awaiting supervisor review.

**Filters:**
- `approval_status = 'Pending Supervisor Review'`
- `request_type = 'Individual'`

**Auto-joins:**
- Requester info from `AspNetUsers`
- Office name from `offices` table
- Wing name from `wings` table
- Supervisor info via `fn_GetWingSupervisor()`

---

#### 4. `vw_pending_admin_approvals`
Shows requests forwarded to admin or organizational requests.

**Filters:**
- `approval_status IN ('Forwarded to Admin', 'Pending Admin Review')`
- OR `request_type = 'Organizational'`

**Includes:**
- Forwarding reason from supervisor
- Supervisor details

---

#### 5. `vw_my_issuance_requests`
User view to track their own request status.

**Shows:**
- Request status
- Supervisor who reviewed
- Admin who approved/rejected
- Comments and reasons
- Approval history

---

### Key Functions Created:

#### 1. `fn_GetUserPrimaryRole(@userId)`
Returns the user's primary role (if they have multiple).

**Priority:**
1. Administrator
2. DG roles
3. ADG roles
4. Other Admin roles
5. Others

**Usage:**
```sql
SELECT dbo.fn_GetUserPrimaryRole('869dd81b-a782-494d-b8c2-695369b5ebb6');
-- Returns: 'Administrator'
```

---

#### 2. `fn_IsUserInRole(@userId, @rolePattern)`
Checks if user has a specific role.

**Usage:**
```sql
SELECT dbo.fn_IsUserInRole('user-id-here', '%Admin%');
-- Returns: 1 (true) if user has any admin role
```

---

#### 3. `fn_GetWingSupervisor(@wingId)`
Finds the best supervisor for a given wing.

**Returns:** Table with supervisor details

**Usage:**
```sql
SELECT * FROM dbo.fn_GetWingSupervisor(19);
-- Returns supervisor for Wing 19
```

---

#### 4. `sp_AssignSupervisorToRequest(@requestId)`
Auto-assigns supervisor when request is created.

**Logic:**
1. Gets `requester_wing_id` from request
2. Finds supervisor for that wing
3. Sets status to `'Pending Supervisor Review'`
4. If no supervisor found → routes directly to admin

**Usage:**
```sql
EXEC sp_AssignSupervisorToRequest 'request-guid-here';
```

---

## 🔐 ACCESS CONTROL IN APIS

### Backend API Security:

#### Supervisor Endpoints:
```javascript
// Only shows requests for supervisor's wing
app.get('/api/approvals/supervisor/pending', async (req, res) => {
  const supervisorWingId = req.query.wing_id;
  // SQL: WHERE requester_wing_id = @wingId
});
```

#### Admin Endpoints:
```javascript
// Shows all forwarded requests from all wings
app.get('/api/approvals/admin/pending', async (req, res) => {
  // SQL: WHERE approval_status = 'Forwarded to Admin'
  // No wing filter - admins see everything
});
```

---

## 📍 USER ROLE EXAMPLES FROM DATABASE

### System Administrators (17 users):
```
Syed Sana ul Haq Fazli - Administrator (Wing 0)
Test Account - Administrator (Wing 19)
Muhammad Fahad - Administrator (Wing 19)
Shamshad Khan - DG (Wing 16)
Masood Akhtar Sherwanee - DG (Wing 12)
Syed Nadeem Haider - ADG (Wing 8)
Ch Nadeem Qasim - ADG (Wing 9)
... and 10 more
```

### Wing Supervisors (25 users):
```
Muhammad Arshad - LW-HoD (Wing 5)
Khurram Shahzad - LW-HoD (Wing 5)
Qasim Mahmood Khan - EMon Admin (Wing 6)
Maqsood Hussain Shah - SAAdminHR (Wing 7)
Test Account - Administrator (Wing 19) ← Also supervisor
Muhammad Ehtesham Siddiqui - Administrator (Wing 19)
... and 19 more
```

### General Users:
```
Haider Ali - Employee (Wing ?)
Asif Ali Yasin - DEC1 (Wing ?)
Abdullah Shah - DEC1 (Wing ?)
... thousands more
```

---

## 🎯 PRACTICAL WORKFLOW EXAMPLE

### Scenario: User "Ahmad Khan" (Employee, Wing 19) requests office supplies

**Step 1: Request Creation**
```sql
INSERT INTO stock_issuance_requests (
  requester_user_id = 'ahmad-user-id',
  requester_wing_id = 19,
  request_type = 'Individual',
  approval_status = 'Pending Supervisor Review'
)
```

**Step 2: System Finds Supervisor**
```sql
SELECT * FROM fn_GetWingSupervisor(19)
-- Returns: Test Account (Administrator role, Wing 19)
```

**Step 3: Supervisor "Test Account" Reviews**
- Opens `/approvals/supervisor`
- Sees Ahmad's request
- Checks stock: 
  - Pens: Wing has 50 ✓
  - Laptops: Wing has 0, Admin has 10 ✗

**Action:** Forwards to admin with reason: "No laptops in wing stock"

```sql
UPDATE stock_issuance_requests
SET approval_status = 'Forwarded to Admin',
    supervisor_id = 'test-account-user-id',
    supervisor_action = 'Forwarded',
    forwarding_reason = 'No laptops in wing stock'
WHERE id = 'request-id';
```

**Step 4: Admin "Syed Fazli" (Administrator) Reviews**
- Opens `/approvals/admin`
- Sees forwarded request
- Checks admin stock: Laptops available ✓

**Action:** Approves

```sql
UPDATE stock_issuance_requests
SET approval_status = 'Approved by Admin',
    admin_id = 'fazli-user-id',
    admin_action = 'Approved'
WHERE id = 'request-id';

-- Then deduct from stock_admin
-- Transfer to stock_wing if needed
-- Finally issue to stock_personal
```

---

## 🔍 HOW TO CHECK USER'S ROLE & PERMISSIONS

### From Backend Session:
```javascript
// Get user with roles
const result = await pool.request()
  .input('userId', sql.NVarChar(450), userId)
  .query(`
    SELECT 
      u.Id, u.FullName, u.intWingID, u.intOfficeID,
      dbo.fn_GetUserPrimaryRole(u.Id) as primary_role,
      dbo.fn_IsUserInRole(u.Id, '%Admin%') as is_admin,
      dbo.fn_IsUserInRole(u.Id, 'Administrator') as is_system_admin
    FROM AspNetUsers u
    WHERE u.Id = @userId
  `);

const user = result.recordset[0];

// Check permissions
if (user.is_system_admin) {
  // Can access /approvals/admin
  // Can approve ANY request
}

if (user.is_admin && user.intWingID > 0) {
  // Can access /approvals/supervisor
  // Can approve requests from their wing only
}
```

### Get All User Roles:
```sql
SELECT r.Name
FROM AspNetUserRoles ur
INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE ur.UserId = @userId;
```

---

## 📝 SUMMARY: OLD vs NEW SYSTEM

| Aspect | OLD SYSTEM | NEW SYSTEM |
|--------|-----------|------------|
| **Role Source** | `AspNetUsers.Role` column (single value) | `AspNetUserRoles` table (multiple roles) |
| **Supervisor Detection** | Manual or hardcoded | Auto-detected by role + wing |
| **Admin Detection** | Checked `Role = 'Admin'` | Checks multiple admin roles (Administrator, DG, ADG, etc.) |
| **Approval Levels** | 1 level (direct to admin) | 2 levels (supervisor → admin) |
| **Stock Locations** | 1 central stock | 3 levels (Admin/Wing/Personal) |
| **Role Priority** | None | Weighted priority for multiple roles |
| **Wing-based Routing** | Manual | Automatic based on requester wing |

---

## ✅ DEPLOYMENT STATUS

**Database:**
- ✅ Role-based functions created
- ✅ Views updated to use AspNetUserRoles
- ✅ Auto-assignment procedure created
- ✅ Approval history tracking enhanced

**Backend APIs:**
- ✅ 7 approval endpoints added
- ✅ Role checking integrated
- ✅ Stock availability checking
- ⚠️ Need to update to use new functions

**Frontend:**
- ✅ SupervisorApprovals.tsx created
- ✅ AdminApprovals.tsx created
- ✅ Routes added to App.tsx
- ⚠️ Need to add role checking

**Next Steps:**
1. Update backend APIs to use `dbo.fn_GetUserPrimaryRole()` 
2. Add role middleware for route protection
3. Update session endpoint to include role information
4. Test complete workflow end-to-end

---

**Last Updated:** November 28, 2025  
**Author:** Syed Sana ul Haq Fazli  
**System Version:** IMS v1 (Three-Level Inventory System)
