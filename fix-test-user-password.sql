-- Add plain text password to test user for development
USE InventoryManagementDB;
GO

UPDATE AspNetUsers 
SET Password = '123456'
WHERE UserName = '1111111111111';

SELECT 
    UserName, 
    FullName, 
    Role, 
    Password,
    CASE WHEN PasswordHash IS NOT NULL THEN 'Has Hash' ELSE 'No Hash' END as HashStatus
FROM AspNetUsers 
WHERE UserName = '1111111111111';

PRINT '✅ Updated user 1111111111111 with plain text password: 123456';
