-- WING FILTER VERIFICATION SCRIPT
-- This verifies the exact matching between WingsInformation.Id and AspNetUsers.intWingID

PRINT '========== WING FILTER VERIFICATION =========='
PRINT ''

-- 1. Show the combobox data that should be displayed
PRINT '1. COMBOBOX DATA (what frontend should show):'
PRINT 'Format: value=Id, text=Name (ShortName)'
PRINT ''
SELECT 
  '[' + CAST(Id as VARCHAR) + '] ' + Name + 
  CASE WHEN ShortName IS NOT NULL AND ShortName != '' THEN ' (' + ShortName + ')' ELSE '' END as display_text,
  Id as combobox_value
FROM WingsInformation
WHERE IS_ACT = 1
ORDER BY Name

PRINT ''
PRINT '2. TEST FILTER: wing_id=5 (Law)'
PRINT 'Should match AspNetUsers where intWingID = 5'
PRINT ''
SELECT 
  u.Id as user_id,
  u.FullName as full_name,
  u.intWingID,
  w.Name as wing_name,
  w.ShortName
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1 AND u.intWingID = 5 AND u.intWingID > 0
ORDER BY u.FullName

PRINT ''
PRINT '3. TEST FILTER: wing_id=16 (Training, Research and Evaluation)'
PRINT 'Should match AspNetUsers where intWingID = 16'
PRINT ''
SELECT 
  u.Id as user_id,
  u.FullName as full_name,
  u.intWingID,
  w.Name as wing_name,
  w.ShortName
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1 AND u.intWingID = 16 AND u.intWingID > 0
ORDER BY u.FullName

PRINT ''
PRINT '4. VERIFY ID MATCHING:'
PRINT 'Checking if all intWingID values in AspNetUsers match WingsInformation.Id'
PRINT ''
SELECT 
  u.intWingID as asp_wing_id,
  COUNT(u.Id) as user_count,
  CASE 
    WHEN w.Id IS NOT NULL THEN 'MATCH: ' + w.Name + ' (' + ISNULL(w.ShortName, 'N/A') + ')'
    WHEN u.intWingID = 0 THEN 'UNASSIGNED'
    ELSE 'NO MATCH - INVALID ID'
  END as verification
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1
GROUP BY u.intWingID, w.Id, w.Name, w.ShortName
ORDER BY u.intWingID

PRINT ''
PRINT '========== END VERIFICATION =========='
