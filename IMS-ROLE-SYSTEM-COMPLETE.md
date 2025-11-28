# IMS INTERNAL ROLE SYSTEM - IMPLEMENTATION COMPLETE ✅

**Date:** November 28, 2025  
**Status:** ✅ Database Complete | ⏳ APIs Pending | ⏳ UI Pending

---

## 📊 SYSTEM STATISTICS

### Database Tables Created:
- ✅ `ims_roles` - 6 system roles defined
- ✅ `ims_permissions` - 29 granular permissions
- ✅ `ims_role_permissions` - 69 role-permission mappings
- ✅ `ims_user_roles` - User role assignments with scope
- ✅ `ims_role_audit_log` - Complete audit trail

### Initial Role Assignments:
- **👑 Super Admins:** 2 users (Syed Fazli + Test Account)
- **🔑 IMS Admins:** 8 users (global scope)
- **📋 Wing Supervisors:** 23 users (wing-specific)
- **👥 General Users:** 455 users (default role)
- **📝 Total Audit Logs:** 488 entries

---

## 🎭 ROLE HIERARCHY

### 1. IMS Super Admin (2 users)
**Authority:** Highest - Complete system control
**Scope:** Global
**Can:**
- ✅ Create/modify/delete roles
- ✅ Assign any role to any user
- ✅ All admin permissions
- ✅ Manage system settings
- ✅ View all audit logs

**Cannot:**
- ❌ Nothing - has all permissions

**Users:**
- Syed Sana ul Haq Fazli (sfazli@ecp.gov.pk)
- Test Account (ABC@CDF.COM)

---

### 2. IMS Administrator (8 users)
**Authority:** High - System management
**Scope:** Global
**Can:**
- ✅ Approve admin-level stock requests
- ✅ View/edit all inventory (admin/wing/personal)
- ✅ Transfer stock between all levels
- ✅ Manage categories, vendors, items
- ✅ Generate all reports
- ✅ Assign roles to users (except Super Admin)
- ✅ View all users

**Cannot:**
- ❌ Create/modify roles (only Super Admin)
- ❌ Delete system roles

**Sample Users:**
- Muhammad Ehtesham Siddiqui
- Muhammad Fahad
- Muhammad Naseer
- Aqsa Noreen
- (4 more...)

---

### 3. Wing Supervisor (23 users)
**Authority:** Medium - Wing management
**Scope:** Wing-specific (can have multiple wings)
**Can:**
- ✅ Approve wing-level stock requests
- ✅ View/edit wing inventory (assigned wing only)
- ✅ Forward requests to admin
- ✅ Reject requests
- ✅ Transfer wing stock to personal
- ✅ View wing reports

**Cannot:**
- ❌ View other wings' inventory
- ❌ Approve admin-level requests
- ❌ Access global settings
- ❌ Manage users or roles

**Sample Users by Wing:**
- **Wing 5:** Muhammad Arshad, Khurram Shahzad, Yasir Ali Raja, Saima Tariq Janjua
- **Wing 6:** Qasim Mahmood Khan, Muhammad Khizer Aziz, Syed Abdur Rahman Zafar
- **Wing 7:** Maqsood Hussain Shah
- **Wing 8:** Syed Nadeem Haider
- **Wing 9:** Ch Nadeem Qasim
- (13 more across other wings...)

---

### 4. General User (455 users)
**Authority:** Low - Personal requests only
**Scope:** Global (default role)
**Can:**
- ✅ Create stock issuance requests
- ✅ View own personal inventory
- ✅ View own request status
- ✅ Track request history
- ✅ View own reports

**Cannot:**
- ❌ Approve any requests
- ❌ View others' inventory
- ❌ Access wing/admin inventory
- ❌ Manage anything

**Note:** **Auto-assigned to ALL new users**

---

### 5. Procurement Officer (0 users - optional)
**Authority:** Medium - Procurement specific
**Scope:** Global
**Can:**
- ✅ Create/manage tenders
- ✅ Manage vendors
- ✅ Add stock acquisitions
- ✅ View all inventory
- ✅ Generate procurement reports

**Cannot:**
- ❌ Approve stock issuance requests
- ❌ Transfer stock
- ❌ Manage users

---

### 6. Auditor (0 users - optional)
**Authority:** View-Only
**Scope:** Global
**Can:**
- ✅ View all inventory
- ✅ View all transactions
- ✅ View all requests
- ✅ Generate audit reports
- ✅ View system settings

**Cannot:**
- ❌ Create/edit/delete anything
- ❌ Approve requests
- ❌ Modify data

---

## 🔐 PERMISSION MATRIX

### Inventory Module (5 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `inventory.view_all` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `inventory.view_wing` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `inventory.view_personal` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `inventory.edit_all` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `inventory.edit_wing` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Stock Request Module (8 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `stock_request.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `stock_request.approve_supervisor` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `stock_request.approve_admin` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `stock_request.forward` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `stock_request.reject` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `stock_request.view_all` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `stock_request.view_wing` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `stock_request.view_own` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Stock Transfer Module (2 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `stock_transfer.admin_to_wing` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `stock_transfer.wing_to_personal` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Procurement Module (4 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `tender.create` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `tender.approve` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `vendor.manage` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `acquisition.create` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

### Reports Module (3 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `reports.view_all` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `reports.view_wing` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `reports.view_own` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Settings & Management (7 permissions)
| Permission | Super Admin | IMS Admin | Wing Sup | User | Procure | Audit |
|------------|-------------|-----------|----------|------|---------|-------|
| `roles.manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.assign_roles` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users.view_all` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `categories.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `items.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `settings.edit` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔍 KEY FEATURES

### ✅ Fully Independent from AspNetRoles
- No dependency on DS system roles
- IMS has complete control over permissions
- User can be "Employee" in DS, "Admin" in IMS

### ✅ Scope-Based Access Control
- **Global:** Access across all offices/wings
- **Wing:** Limited to specific wing(s)
- **Office:** Limited to specific office (future)
- **Branch:** Limited to specific branch (future)

**Example:**
```sql
-- User can be:
- Super Admin (Global)
- Wing Supervisor for Wing 19 (IT)
- Wing Supervisor for Wing 5 (Legal)
- General User (for personal requests)
```

### ✅ Multiple Roles per User
A user can have different roles in different contexts:
- General User (personal requests)
- Wing Supervisor for Wing A
- Wing Supervisor for Wing B
- IMS Admin (global level)

### ✅ Granular Permissions
29 fine-grained permissions across 8 modules:
- Inventory (5)
- Stock Request (8)
- Stock Transfer (2)
- Tender/Procurement (4)
- Reports (3)
- Settings & Management (7)

### ✅ Complete Audit Trail
Every role assignment/revocation logged:
- Who assigned
- When assigned
- To whom
- What scope
- Why (notes)

### ✅ Auto-Assignment
- All new users automatically get "General User" role
- No manual intervention needed

### ✅ Protected System Roles
- 6 system roles cannot be deleted
- Only Super Admin can modify role permissions
- Prevents accidental privilege escalation

---

## 🔧 HELPER FUNCTIONS CREATED

### 1. `fn_HasPermission(@userId, @permissionKey)`
```sql
-- Check if user has specific permission
SELECT dbo.fn_HasPermission('user-id', 'stock_request.approve_admin');
-- Returns: 1 (true) or 0 (false)
```

### 2. `fn_GetUserRoles(@userId)`
```sql
-- Get all roles for a user
SELECT * FROM dbo.fn_GetUserRoles('user-id');
-- Returns: role_name, display_name, scope_type, scope_wing_id, etc.
```

### 3. `fn_GetRolePermissions(@roleId)`
```sql
-- Get all permissions for a role
SELECT * FROM dbo.fn_GetRolePermissions('role-guid');
-- Returns: permission_key, module_name, action_name, description
```

### 4. `fn_IsSuperAdmin(@userId)`
```sql
-- Check if user is Super Admin
SELECT dbo.fn_IsSuperAdmin('user-id');
-- Returns: 1 (true) or 0 (false)
```

---

## 📊 VIEWS CREATED

### 1. `vw_ims_user_roles_detail`
Shows all user-role assignments with full details:
```sql
SELECT * FROM vw_ims_user_roles_detail 
WHERE user_name LIKE '%Fazli%';
```

### 2. `vw_ims_user_permissions`
Shows all permissions a user has (flattened view):
```sql
SELECT * FROM vw_ims_user_permissions 
WHERE user_id = 'user-id'
ORDER BY module_name, action_name;
```

---

## 🎯 NEXT STEPS (Implementation)

### Phase 1: Backend API Updates (2-3 days)
**Files to modify:**
- `backend-server.cjs` - Update authentication/authorization

**Changes needed:**
1. Update session endpoint to include IMS roles
2. Create permission check middleware
3. Update approval APIs to use IMS permissions
4. Add role assignment APIs

**Example middleware:**
```javascript
async function requirePermission(permission) {
  return async (req, res, next) => {
    const userId = req.session.userId;
    
    const result = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .input('permission', sql.NVarChar(100), permission)
      .query('SELECT dbo.fn_HasPermission(@userId, @permission) as has_permission');
    
    if (result.recordset[0].has_permission) {
      next();
    } else {
      res.status(403).json({ error: 'Permission denied' });
    }
  };
}

// Usage:
app.post('/api/approvals/admin/approve', 
  requirePermission('stock_request.approve_admin'),
  async (req, res) => { ... }
);
```

### Phase 2: Role Management UI (3-4 days)
**Pages to create:**

1. **Role Management** (`/settings/roles`)
   - List all roles
   - Create custom roles (Super Admin only)
   - Edit role permissions
   - View users in each role

2. **Permission Assignment** (Modal)
   - Checkbox interface for permissions
   - Grouped by module
   - Real-time validation

3. **User Role Assignment** (`/settings/users`)
   - Search users
   - Assign/revoke roles
   - Set scope (Global/Wing/Office)
   - View role history

4. **My Permissions** (`/profile/permissions`)
   - User views their own permissions
   - Explains what they can do
   - Shows assigned roles

### Phase 3: Update Existing Components (1-2 days)
**Components to update:**

1. **SupervisorApprovals.tsx**
   - Check `stock_request.approve_supervisor` permission
   - Filter by user's assigned wings

2. **AdminApprovals.tsx**
   - Check `stock_request.approve_admin` permission

3. **Navigation/Layout**
   - Show/hide menu items based on permissions
   - Dynamic dashboard based on roles

### Phase 4: Testing & Documentation (1-2 days)
- Test all permission combinations
- Verify scope restrictions
- Load testing with multiple roles
- Update user documentation

---

## 📝 CONFIGURATION GUIDE

### How to Assign Roles (Manual SQL)

#### Assign Super Admin:
```sql
INSERT INTO ims_user_roles (user_id, role_id, scope_type, assigned_by, notes)
SELECT 
    'user-id-here',
    id,
    'Global',
    'admin-user-id',
    'Reason for assignment'
FROM ims_roles 
WHERE role_name = 'IMS_SUPER_ADMIN';
```

#### Assign Wing Supervisor for specific wing:
```sql
INSERT INTO ims_user_roles (user_id, role_id, scope_type, scope_wing_id, assigned_by, notes)
SELECT 
    'user-id-here',
    id,
    'Wing',
    19, -- Wing ID
    'admin-user-id',
    'Supervisor for IT Wing'
FROM ims_roles 
WHERE role_name = 'WING_SUPERVISOR';
```

#### Revoke Role:
```sql
UPDATE ims_user_roles
SET is_active = 0
WHERE user_id = 'user-id-here'
  AND role_id = (SELECT id FROM ims_roles WHERE role_name = 'WING_SUPERVISOR')
  AND scope_wing_id = 19;

-- Log in audit
INSERT INTO ims_role_audit_log (user_id, role_id, action, scope_wing_id, performed_by, notes)
VALUES ('user-id', 'role-id', 'REVOKED', 19, 'admin-id', 'No longer supervisor');
```

---

## 🚀 BENEFITS ACHIEVED

✅ **Complete Independence** - No dependency on DS/EMCC roles  
✅ **Flexible Permissions** - 29 granular controls  
✅ **Multi-Wing Support** - Users can manage multiple wings  
✅ **Auto-Assignment** - New users automatically get default role  
✅ **Audit Trail** - Every change is logged  
✅ **Scalable** - Easy to add new roles/permissions  
✅ **Secure** - Protected system roles, fine-grained access  
✅ **User-Friendly** - (Pending UI) Admins will manage via interface  

---

## ⚠️ IMPORTANT NOTES

1. **Super Admin Authority**
   - Only Super Admins can create/modify roles
   - Cannot be restricted or locked out
   - Current: Syed Fazli & Test Account

2. **System Roles Protected**
   - 6 system roles have `is_system_role = 1`
   - Cannot be deleted
   - Can be disabled but not removed

3. **Default Role**
   - All users automatically have "General User"
   - Ensures everyone can create requests
   - Additional roles add more permissions

4. **Scope Precedence**
   - Global scope overrides Wing/Office scope
   - User with IMS Admin + Wing Supervisor has Admin powers globally

5. **Migration**
   - Existing AspNetRoles still exist (for DS system)
   - IMS now uses its own role system
   - No conflict between systems

---

**Status:** ✅ **Database Layer 100% Complete**  
**Next:** Backend APIs + UI Development

**Created by:** Syed Sana ul Haq Fazli  
**Date:** November 28, 2025
