-- ============================================================================
-- OFFICE-SCOPED WING FILTERING - VERIFICATION SCRIPT
-- ============================================================================
-- This script verifies that the office-scoped wing filtering is working
-- correctly by checking the database relationships and data.
-- ============================================================================

PRINT '=== VERIFICATION 1: Check WingsInformation Structure ==='
SELECT TOP 10 
  Id, 
  Name, 
  ShortName,
  OfficeID,
  IS_ACT
FROM WingsInformation 
WHERE IS_ACT = 1
ORDER BY OfficeID, Name;

PRINT '=== VERIFICATION 2: Count Wings per Office ==='
SELECT 
  o.intOfficeID,
  o.strOfficeName,
  COUNT(w.Id) as wing_count,
  STRING_AGG(w.Name, ', ') as wing_names
FROM tblOffices o
LEFT JOIN WingsInformation w ON o.intOfficeID = w.OfficeID AND w.IS_ACT = 1
GROUP BY o.intOfficeID, o.strOfficeName
ORDER BY o.intOfficeID;

PRINT '=== VERIFICATION 3: Sample Users with Office and Wing Info ==='
SELECT TOP 20
  u.FullName,
  u.intOfficeID,
  o.strOfficeName,
  u.intWingID,
  w.Name as wing_name,
  u.strDesignation
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
LEFT JOIN WingsInformation w ON u.intWingID = w.Id AND u.intOfficeID = w.OfficeID
WHERE u.ISACT = 1 AND u.intWingID > 0 AND u.intOfficeID > 0
ORDER BY u.intOfficeID, u.intWingID;

PRINT '=== VERIFICATION 4: Users by Office and Wing Count ==='
SELECT 
  o.intOfficeID,
  o.strOfficeName,
  COUNT(u.user_id) as total_users,
  COUNT(CASE WHEN u.intWingID > 0 THEN 1 END) as users_with_wing,
  COUNT(CASE WHEN u.intWingID = 0 THEN 1 END) as users_without_wing
FROM AspNetUsers u
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
WHERE u.ISACT = 1
GROUP BY o.intOfficeID, o.strOfficeName
ORDER BY o.intOfficeID;

PRINT '=== VERIFICATION 5: Example - PEC Punjab (Office 586) Wings and Users ==='
SELECT 
  w.Id,
  w.Name,
  w.ShortName,
  COUNT(u.user_id) as user_count
FROM WingsInformation w
LEFT JOIN AspNetUsers u ON w.Id = u.intWingID AND w.OfficeID = u.intOfficeID AND u.ISACT = 1
WHERE w.OfficeID = 586 AND w.IS_ACT = 1
GROUP BY w.Id, w.Name, w.ShortName
ORDER BY w.Name;

PRINT '=== VERIFICATION 6: Duplicate Wing Names Check ==='
-- This shows which wing names appear in multiple offices
SELECT 
  w.Name,
  COUNT(DISTINCT w.OfficeID) as office_count,
  STRING_AGG(DISTINCT CAST(w.OfficeID as varchar) + ': ' + o.strOfficeName, ', ') as offices
FROM WingsInformation w
LEFT JOIN tblOffices o ON w.OfficeID = o.intOfficeID
WHERE w.IS_ACT = 1
GROUP BY w.Name
HAVING COUNT(DISTINCT w.OfficeID) > 1
ORDER BY office_count DESC;

PRINT '=== VERIFICATION 7: Test Query - Get Wings for Office 583 ==='
-- This is what the /api/wings?office_id=583 endpoint should return
SELECT 
  Id,
  Name,
  ShortName,
  OfficeID,
  FocalPerson,
  ContactNo,
  WingCode,
  IS_ACT
FROM WingsInformation 
WHERE IS_ACT = 1 AND OfficeID = 583
ORDER BY Name;

PRINT '=== VERIFICATION 8: Test Query - Get Wings for Office 586 (PEC Punjab) ==='
-- This is what the /api/wings?office_id=586 endpoint should return
SELECT 
  Id,
  Name,
  ShortName,
  OfficeID,
  FocalPerson,
  ContactNo,
  WingCode,
  IS_ACT
FROM WingsInformation 
WHERE IS_ACT = 1 AND OfficeID = 586
ORDER BY Name;

PRINT '=== VERIFICATION 9: Verify Wing-Office Join Works ==='
-- Test the join logic used in filtering
SELECT TOP 10
  u.user_id,
  u.FullName,
  u.intOfficeID,
  u.intWingID,
  w.Name as wing_name,
  w.OfficeID as wing_office_id
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1 
  AND u.intWingID > 0 
  AND u.intOfficeID > 0
  AND u.intOfficeID = w.OfficeID  -- Key: Wing's office must match user's office
ORDER BY u.intOfficeID, u.intWingID;

PRINT '=== ✅ ALL VERIFICATIONS COMPLETE ==='
PRINT 'The office-scoped wing filtering should now work correctly.'
PRINT 'Users will only see wings for their assigned office.'
