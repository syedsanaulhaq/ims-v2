-- Check test users and their authentication fields
SELECT 
    UserName,
    FullName,
    Role,
    ISACT,
    CASE 
        WHEN Password IS NOT NULL THEN 'Has Password'
        ELSE 'No Password'
    END as PasswordStatus,
    CASE 
        WHEN PasswordHash IS NOT NULL THEN 'Has PasswordHash (' + LEFT(PasswordHash, 7) + '...)'
        ELSE 'No PasswordHash'
    END as PasswordHashStatus
FROM AspNetUsers 
WHERE UserName IN ('testadmin', 'testmanager', 'testuser', 'admin', '1111111111111')
ORDER BY UserName;
