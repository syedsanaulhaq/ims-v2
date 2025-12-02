-- Find all users with IMS_SUPER_ADMIN role
SELECT 
    u.Id,
    u.FullName,
    u.UserName,
    u.Email,
    u.CNIC,
    u.Password,
    r.role_name,
    dbo.fn_IsSuperAdmin(u.Id) as is_super_admin
FROM AspNetUsers u
LEFT JOIN ims_user_roles ur ON u.Id = ur.user_id
LEFT JOIN ims_roles r ON ur.role_id = r.role_id
WHERE r.role_name = 'IMS_SUPER_ADMIN'
   OR u.CNIC IN ('1111111111111', '1220123855243', '3520229385511')
ORDER BY u.FullName;
