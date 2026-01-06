-- Verify Wing and Designation Mapping for Settings/Users Page
-- This script confirms the data integrity for the wing filter combobox fix

PRINT '========== WING AND DESIGNATION DATA VERIFICATION ==========';
PRINT '';

-- 1. Check WingsInformation table has data
PRINT '1. WingsInformation Table (source for wing filter dropdown):';
SELECT 
  Id,
  Name,
  ShortName,
  WingCode,
  IS_ACT
FROM WingsInformation
WHERE IS_ACT = 1
ORDER BY Name;

PRINT '';
PRINT '2. User-Wing Mapping (AspNetUsers joined with WingsInformation):';
SELECT TOP 20
  u.Id as user_id,
  u.FullName as full_name,
  u.intWingID as wing_id,
  w.Name as wing_name,
  w.Id as wings_table_id,
  u.Email
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1
ORDER BY u.FullName;

PRINT '';
PRINT '3. User-Designation Mapping (AspNetUsers joined with tblUserDesignations):';
SELECT TOP 20
  u.Id as user_id,
  u.FullName as full_name,
  u.intDesignationID as designation_id,
  d.designation_name,
  u.Email
FROM AspNetUsers u
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.ISACT = 1
ORDER BY u.FullName;

PRINT '';
PRINT '4. Complete User-Wing-Designation View:';
SELECT TOP 30
  u.Id as user_id,
  u.FullName as full_name,
  u.Email,
  u.CNIC,
  u.intWingID as wing_id,
  w.Name as wing_name,
  w.Id as wings_info_id,
  u.intDesignationID as designation_id,
  d.designation_name,
  u.intOfficeID as office_id,
  o.strOfficeName as office_name
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
LEFT JOIN tblOffices o ON u.intOfficeID = o.intOfficeID
WHERE u.ISACT = 1
ORDER BY u.FullName;

PRINT '';
PRINT '5. Summary Statistics:';
PRINT '';
PRINT 'Total Active Wings:';
SELECT COUNT(*) as total_active_wings FROM WingsInformation WHERE IS_ACT = 1;

PRINT 'Total Active Users:';
SELECT COUNT(*) as total_active_users FROM AspNetUsers WHERE ISACT = 1;

PRINT 'Users by Wing:';
SELECT 
  COALESCE(w.Name, 'Not Assigned') as wing_name,
  COUNT(u.Id) as user_count
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1
GROUP BY w.Name
ORDER BY user_count DESC;

PRINT '';
PRINT 'Users by Designation:';
SELECT 
  COALESCE(d.designation_name, 'Not Assigned') as designation_name,
  COUNT(u.Id) as user_count
FROM AspNetUsers u
LEFT JOIN tblUserDesignations d ON u.intDesignationID = d.intDesignationID
WHERE u.ISACT = 1
GROUP BY d.designation_name
ORDER BY user_count DESC;

PRINT '';
PRINT '========== VERIFICATION COMPLETE ==========';
