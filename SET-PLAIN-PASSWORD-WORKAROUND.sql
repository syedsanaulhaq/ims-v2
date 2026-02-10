-- =====================================================
-- SET PLAIN PASSWORD FIELD FOR USER (WORKAROUND)
-- =====================================================
-- This sets the plain Password field so authentication works
-- while we debug the ASP.NET Identity password hash issue

USE [InventoryManagementDB];
GO

DECLARE @Username NVARCHAR(256) = '1730115698727';
DECLARE @Password NVARCHAR(100) = 'P@ssword@1';

PRINT 'Setting plain password for user: ' + @Username;
PRINT 'Password: ' + @Password;
PRINT '';

UPDATE AspNetUsers 
SET Password = @Password
WHERE UserName = @Username;

PRINT '✅ Password field updated';
PRINT '';

-- Verify
SELECT 
    UserName,
    FullName,
    Password,
    SUBSTRING(PasswordHash, 1, 30) as PasswordHash_First30Chars
FROM AspNetUsers
WHERE UserName = @Username;

PRINT '';
PRINT 'Now try logging in with P@ssword@1';
PRINT 'The endpoint will check Password field first before trying the hash';
