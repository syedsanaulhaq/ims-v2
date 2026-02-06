-- =====================================================
-- SET TEST PASSWORD FOR USER
-- =====================================================
-- This sets a temporary password so we can test if authentication works
-- Password: Test@123

USE [InventoryManagementDB];
GO

DECLARE @Username NVARCHAR(256) = '1730115698727';

PRINT 'Setting test password for user: ' + @Username;

UPDATE AspNetUsers 
SET Password = 'Test@123'
WHERE UserName = @Username;

PRINT '';
PRINT '✅ Password set to: Test@123';
PRINT '';
PRINT 'Now try logging in with:';
PRINT '  Username: ' + @Username;
PRINT '  Password: Test@123';
PRINT '';
PRINT 'If this works, the authentication endpoint is fine.';
PRINT 'If it still fails, there is an issue with the endpoint itself.';
