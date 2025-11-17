-- Check existing users
SELECT TOP 5 
    Id, 
    UserName, 
    CNIC,
    PasswordHash,
    FullName,
    Email
FROM AspNetUsers
ORDER BY UserName;

-- Check if test user exists
SELECT * FROM AspNetUsers WHERE CNIC = '1111111111111';
