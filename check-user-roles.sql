-- Check user's roles in the system
-- Looking for user: 3740506012171

-- Check if user exists and their roles
SELECT 
  u.user_id,
  u.user_name,
  u.email,
  COALESCE(r.role_name, 'NO ROLE ASSIGNED') as role_name,
  COALESCE(r.role_id, 'N/A') as role_id,
  CASE 
    WHEN r.role_name = 'WING_STORE_KEEPER' THEN '✅ STORE KEEPER ROLE FOUND'
    ELSE '❌ NOT A STORE KEEPER'
  END as role_status
FROM AspNetUsers u
LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
LEFT JOIN ims_roles r ON ur.role_id = r.role_id
WHERE u.Id = '3740506012171'
ORDER BY r.role_name

-- Also check all WING_STORE_KEEPER users
PRINT ''
PRINT '=== All users with WING_STORE_KEEPER role ==='
SELECT 
  u.user_id,
  u.user_name,
  u.email,
  r.role_name
FROM AspNetUsers u
JOIN ims_user_roles ur ON u.Id = ur.user_id
JOIN ims_roles r ON ur.role_id = r.role_id
WHERE r.role_name = 'WING_STORE_KEEPER'
