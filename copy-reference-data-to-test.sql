-- =====================================================
-- COPY REFERENCE DATA FROM PRODUCTION TO TEST
-- =====================================================
-- This copies only essential data needed for testing:
-- - Users
-- - Offices, Wings, Branches  
-- - Categories
-- - System settings
-- =====================================================

USE INVMIS_TEST;
GO

PRINT 'Copying reference data from INVMIS to INVMIS_TEST...';
GO

-- Copy AspNetUsers (Authentication users)
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AspNetUsers')
BEGIN
    INSERT INTO INVMIS_TEST.dbo.AspNetUsers 
    SELECT * FROM INVMIS.dbo.AspNetUsers;
    
    PRINT '✓ Copied AspNetUsers';
END
GO

-- Copy Users (with passwords)
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
BEGIN
    SET IDENTITY_INSERT Users ON;
    
    INSERT INTO INVMIS_TEST.dbo.Users 
    SELECT * FROM INVMIS.dbo.Users;
    
    SET IDENTITY_INSERT Users OFF;
    PRINT '✓ Copied Users';
END
GO

-- Copy Offices
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Offices')
BEGIN
    SET IDENTITY_INSERT Offices ON;
    
    INSERT INTO INVMIS_TEST.dbo.Offices 
    SELECT * FROM INVMIS.dbo.Offices;
    
    SET IDENTITY_INSERT Offices OFF;
    PRINT '✓ Copied Offices';
END
GO

-- Copy Wings
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Wings')
BEGIN
    SET IDENTITY_INSERT Wings ON;
    
    INSERT INTO INVMIS_TEST.dbo.Wings 
    SELECT * FROM INVMIS.dbo.Wings;
    
    SET IDENTITY_INSERT Wings OFF;
    PRINT '✓ Copied Wings';
END
GO

-- Copy Branches
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Branches')
BEGIN
    INSERT INTO INVMIS_TEST.dbo.Branches 
    SELECT * FROM INVMIS.dbo.Branches;
    
    PRINT '✓ Copied Branches';
END
GO

-- Copy Categories
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ItemCategories')
BEGIN
    SET IDENTITY_INSERT ItemCategories ON;
    
    INSERT INTO INVMIS_TEST.dbo.ItemCategories 
    SELECT * FROM INVMIS.dbo.ItemCategories;
    
    SET IDENTITY_INSERT ItemCategories OFF;
    PRINT '✓ Copied Categories';
END
GO

-- Copy Designations
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Designations')
BEGIN
    SET IDENTITY_INSERT Designations ON;
    
    INSERT INTO INVMIS_TEST.dbo.Designations 
    SELECT * FROM INVMIS.dbo.Designations;
    
    SET IDENTITY_INSERT Designations OFF;
    PRINT '✓ Copied Designations';
END
GO

-- Copy Vendors (if needed for testing)
IF EXISTS (SELECT * FROM INVMIS.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Vendors')
BEGIN
    INSERT INTO INVMIS_TEST.dbo.Vendors 
    SELECT * FROM INVMIS.dbo.Vendors;
    
    PRINT '✓ Copied Vendors';
END
GO

PRINT '';
PRINT '=================================================';
PRINT 'REFERENCE DATA COPY COMPLETE!';
PRINT '=================================================';
PRINT '';
PRINT 'Copied:';
PRINT '- AspNetUsers (authentication)';
PRINT '- Users (with login credentials)';
PRINT '- Offices, Wings, Branches';
PRINT '- Item Categories';
PRINT '- Designations';
PRINT '- Vendors';
PRINT '';
PRINT 'NOT Copied (for clean testing):';
PRINT '- Inventory Items';
PRINT '- Stock Transactions';
PRINT '- Stock Requests';
PRINT '- Acquisitions/Tenders';
PRINT '- Deliveries';
PRINT '- Stock Returns';
PRINT '';
PRINT 'INVMIS_TEST is ready for testing from scratch!';
PRINT '=================================================';
GO
