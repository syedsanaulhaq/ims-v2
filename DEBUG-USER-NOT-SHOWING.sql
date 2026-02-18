-- ============================================================================
-- TROUBLESHOOTING: User Not Showing in User Management Page
-- ============================================================================
-- User ID: 1730115698727
-- Issue: User shows in local but not on production at http://172.20.150.34/settings/users
-- ============================================================================

USE InventoryManagementDB;
GO

PRINT '====================================================================';
PRINT 'Step 1: Check if user exists in database';
PRINT '====================================================================';

SELECT 
    Id as user_id,
    UserName,
    FullName,
    Email,
    CNIC,
    intOfficeID as office_id,
    intWingID as wing_id,
    intDesignationID as designation_id,
    ISACT as is_active,
    CreatedDate
FROM AspNetUsers
WHERE Id = '1730115698727';

-- Expected: Should return 1 row if user exists
GO

PRINT '';
PRINT '====================================================================';
PRINT 'Step 2: Check user''s active status (ISACT)';
PRINT '====================================================================';

SELECT 
    Id,
    FullName,
    Email,
    ISACT,
    CASE 
        WHEN ISACT = 1 THEN '✅ Active (Will show in UI)'
        WHEN ISACT = 0 THEN '❌ Inactive (Will NOT show in UI)'
        ELSE '⚠️ NULL (Will NOT show in UI)'
    END as Status
FROM AspNetUsers
WHERE Id = '1730115698727';

-- Root Cause Check #1: User Management page ONLY shows users with ISACT = 1
GO

PRINT '';
PRINT '====================================================================';
PRINT 'Step 3: Check wing assignment';
PRINT '====================================================================';

SELECT 
    u.Id,
    u.FullName,
    u.intWingID as wing_id,
    w.Name as wing_name,
    CASE 
        WHEN u.intWingID > 0 THEN '✅ Has Wing (Will show)'
        WHEN u.intWingID IS NULL THEN '✅ Wing is NULL (Will show)'
        WHEN u.intWingID = 0 THEN '❌ Wing is 0 (Will NOT show)'
        WHEN u.intWingID < 0 THEN '❌ Wing is negative (Will NOT show)'
    END as WingStatus
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.Id = '1730115698727';

-- Root Cause Check #2: User Management filters: (intWingID > 0 OR intWingID IS NULL)
GO

PRINT '';
PRINT '====================================================================';
PRINT 'Step 4: Check user''s complete profile';
PRINT '====================================================================';

SELECT 
    u.Id as user_id,
    u.FullName as full_name,
    u.Email,
    u.CNIC as cnic,
    u.intOfficeID as office_id,
    u.intWingID as wing_id,
    u.intDesignationID as designation_id,
    o.strOfficeName as office_name,
    w.Name as wing_name,
    COALESCE(d.strDesignation, 'Not Assigned') as designation_name,
    u.ISACT as is_active,
    dbo.fn_IsSuperAdmin(u.Id) as is_super_admin,
    u.CreatedDate,
    u.LastLoginDate
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.Id = '1730115698727';

GO

PRINT '';
PRINT '====================================================================';
PRINT 'Step 5: Check user''s IMS roles';
PRINT '====================================================================';

SELECT 
    u.FullName,
    u.Email,
    r.role_name,
    r.display_name,
    ur.scope_type,
    ur.scope_wing_id,
    ur.is_active as role_is_active,
    ur.assigned_at
FROM AspNetUsers u
LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
LEFT JOIN ims_roles r ON ur.role_id = r.id
WHERE u.Id = '1730115698727';

-- If no rows returned: User has no IMS roles assigned
GO

PRINT '';
PRINT '====================================================================';
PRINT 'Step 6: Run the EXACT query used by User Management page';
PRINT '====================================================================';

-- This is the exact query from server/routes/permissions.cjs line 429
SELECT DISTINCT
    u.Id as user_id,
    u.FullName as full_name,
    u.Email,
    u.CNIC as cnic,
    u.intOfficeID as office_id,
    u.intWingID as wing_id,
    u.intDesignationID as designation_id,
    o.strOfficeName as office_name,
    w.Name as wing_name,
    COALESCE(d.strDesignation, 'Not Assigned') as designation_name,
    dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.ISACT = 1
  AND (u.intWingID > 0 OR u.intWingID IS NULL)
  AND u.Id = '1730115698727';

-- If NO rows returned: User does NOT meet the filter criteria
-- If 1 row returned: User SHOULD show in UI (might be a frontend/caching issue)
GO

PRINT '';
PRINT '====================================================================';
PRINT 'DIAGNOSIS SUMMARY';
PRINT '====================================================================';
PRINT '';
PRINT 'User Management Page Filter Criteria:';
PRINT '  1. ISACT must be 1 (active user)';
PRINT '  2. intWingID must be > 0 OR NULL (cannot be 0 or negative)';
PRINT '';
PRINT 'Common Reasons User Does Not Show:';
PRINT '  ❌ ISACT = 0 (user is inactive)';
PRINT '  ❌ intWingID = 0 (wing set to zero)';
PRINT '  ❌ intWingID < 0 (wing set to negative value)';
PRINT '';
PRINT '====================================================================';
PRINT 'SOLUTION: Fix user to meet criteria';
PRINT '====================================================================';

-- ============================================================================
-- FIX #1: Activate the user (if ISACT = 0)
-- ============================================================================
PRINT '';
PRINT 'Fix #1: Activate User';
PRINT '';

-- Check current status first
IF EXISTS (SELECT 1 FROM AspNetUsers WHERE Id = '1730115698727' AND ISACT = 0)
BEGIN
    PRINT '⚠️ User is INACTIVE. Activating...';
    
    UPDATE AspNetUsers
    SET ISACT = 1
    WHERE Id = '1730115698727';
    
    PRINT '✅ User activated successfully';
END
ELSE IF EXISTS (SELECT 1 FROM AspNetUsers WHERE Id = '1730115698727' AND ISACT = 1)
BEGIN
    PRINT '✅ User is already ACTIVE (ISACT = 1)';
END
ELSE
BEGIN
    PRINT '❌ User not found in database';
END
GO

-- ============================================================================
-- FIX #2: Fix wing assignment (if intWingID = 0 or < 0)
-- ============================================================================
PRINT '';
PRINT 'Fix #2: Fix Wing Assignment';
PRINT '';

DECLARE @CurrentWingId INT;

SELECT @CurrentWingId = intWingID 
FROM AspNetUsers 
WHERE Id = '1730115698727';

IF @CurrentWingId = 0
BEGIN
    PRINT '⚠️ Wing ID is 0. Setting to NULL to make user visible...';
    
    UPDATE AspNetUsers
    SET intWingID = NULL
    WHERE Id = '1730115698727';
    
    PRINT '✅ Wing ID set to NULL. User should now be visible.';
    PRINT 'ℹ️ Assign proper wing through admin interface later.';
END
ELSE IF @CurrentWingId < 0
BEGIN
    PRINT '⚠️ Wing ID is negative. Setting to NULL to make user visible...';
    
    UPDATE AspNetUsers
    SET intWingID = NULL
    WHERE Id = '1730115698727';
    
    PRINT '✅ Wing ID set to NULL. User should now be visible.';
    PRINT 'ℹ️ Assign proper wing through admin interface later.';
END
ELSE IF @CurrentWingId > 0
BEGIN
    PRINT '✅ Wing ID is valid (> 0)';
END
ELSE IF @CurrentWingId IS NULL
BEGIN
    PRINT '✅ Wing ID is NULL (acceptable)';
END
GO

-- ============================================================================
-- VERIFICATION: Check if user now appears in the query
-- ============================================================================
PRINT '';
PRINT '====================================================================';
PRINT 'FINAL VERIFICATION: Run User Management Query Again';
PRINT '====================================================================';

SELECT DISTINCT
    u.Id as user_id,
    u.FullName as full_name,
    u.Email,
    u.CNIC as cnic,
    u.intOfficeID as office_id,
    u.intWingID as wing_id,
    u.intDesignationID as designation_id,
    o.strOfficeName as office_name,
    w.Name as wing_name,
    COALESCE(d.strDesignation, 'Not Assigned') as designation_name,
    dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.ISACT = 1
  AND (u.intWingID > 0 OR u.intWingID IS NULL)
  AND u.Id = '1730115698727';

PRINT '';
PRINT 'Expected Result:';
PRINT '  ✅ 1 row returned = User WILL show in UI';
PRINT '  ❌ 0 rows returned = User still hidden (check other issues)';
PRINT '';
PRINT '====================================================================';
PRINT 'If user still NOT showing:';
PRINT '  1. Clear browser cache (Ctrl+Shift+R)';
PRINT '  2. Restart backend server';
PRINT '  3. Check if production database is different from local';
PRINT '  4. Verify API endpoint: http://172.20.150.34:3001/api/permissions/users';
PRINT '====================================================================';
GO
