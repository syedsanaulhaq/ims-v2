-- DEBUG: Wing Filter Issue
-- This script helps verify the wing filter is working correctly

PRINT '========== WING FILTER DEBUG =========='
PRINT ''

-- 1. Check if wing IDs match between tables
PRINT '1. Wing IDs in WingsInformation (active wings):'
SELECT DISTINCT Id FROM WingsInformation WHERE IS_ACT = 1 ORDER BY Id

PRINT ''
PRINT '2. Wing IDs used in AspNetUsers (users with wing assignment):'
SELECT DISTINCT intWingID FROM AspNetUsers WHERE ISACT = 1 AND intWingID IS NOT NULL ORDER BY intWingID

PRINT ''
PRINT '3. Do all AspNetUsers intWingID values have matching WingsInformation records?'
SELECT 
  u.intWingID,
  COUNT(u.Id) as user_count,
  CASE 
    WHEN w.Id IS NULL THEN 'NO MATCH IN WINGSINFO'
    ELSE 'MATCHED: ' + w.Name
  END as wing_info
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1 AND u.intWingID IS NOT NULL
GROUP BY u.intWingID, w.Id, w.Name
ORDER BY u.intWingID

PRINT ''
PRINT '4. Test wing filter - users in wing 5 (Law):'
SELECT TOP 10 u.FullName, u.intWingID, w.Name as wing_name
FROM AspNetUsers u
LEFT JOIN WingsInformation w ON u.intWingID = w.Id
WHERE u.ISACT = 1 AND u.intWingID = 5

PRINT ''
PRINT '5. Count users per wing:'
SELECT 
  w.Name as wing_name,
  w.Id as wing_id,
  COUNT(u.Id) as user_count
FROM WingsInformation w
LEFT JOIN AspNetUsers u ON w.Id = u.intWingID AND u.ISACT = 1
WHERE w.IS_ACT = 1
GROUP BY w.Id, w.Name
ORDER BY user_count DESC

PRINT ''
PRINT '========== ANALYSIS COMPLETE =========='
