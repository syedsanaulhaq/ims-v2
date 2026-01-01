-- ============================================================================
-- IMS (Inventory Management System) Database Restoration Script
-- Production Server Deployment
-- Created: January 1, 2026
-- ============================================================================

-- Use the target database
USE InventoryManagementDB;
GO

-- ============================================================================
-- PART 1: CRITICAL TABLES FOR WING REQUEST APPROVAL SYSTEM
-- ============================================================================

-- Ensure stock_issuance_requests table has all required columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'stock_issuance_requests')
BEGIN
    CREATE TABLE stock_issuance_requests (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_number NVARCHAR(50),
        request_type NVARCHAR(50) DEFAULT 'Individual', -- 'Individual' or 'Organizational'
        requester_office_id INT,
        requester_wing_id INT,
        requester_branch_id NVARCHAR(50),
        requester_user_id UNIQUEIDENTIFIER,
        purpose NVARCHAR(MAX),
        urgency_level NVARCHAR(50),
        justification NVARCHAR(MAX),
        expected_return_date DATETIME,
        is_returnable BIT DEFAULT 1,
        request_status NVARCHAR(50) DEFAULT 'Submitted',
        submitted_at DATETIME DEFAULT GETDATE(),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table: stock_issuance_requests';
END
ELSE
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'request_type')
    BEGIN
        ALTER TABLE stock_issuance_requests ADD request_type NVARCHAR(50) DEFAULT 'Individual';
        PRINT 'Added column: stock_issuance_requests.request_type';
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_issuance_requests' AND COLUMN_NAME = 'requester_wing_id')
    BEGIN
        ALTER TABLE stock_issuance_requests ADD requester_wing_id INT;
        PRINT 'Added column: stock_issuance_requests.requester_wing_id';
    END
END
GO

-- Ensure request_approvals table exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'request_approvals')
BEGIN
    CREATE TABLE request_approvals (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER,
        request_type NVARCHAR(50),
        workflow_id UNIQUEIDENTIFIER,
        current_approver_id NVARCHAR(450),
        current_status NVARCHAR(50) DEFAULT 'pending',
        submitted_by NVARCHAR(450),
        submitted_date DATETIME DEFAULT GETDATE(),
        finalized_by NVARCHAR(450),
        finalized_date DATETIME,
        rejected_by NVARCHAR(450),
        rejected_date DATETIME,
        rejection_reason NVARCHAR(MAX),
        created_date DATETIME DEFAULT GETDATE(),
        updated_date DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (request_id) REFERENCES stock_issuance_requests(id)
    );
    PRINT 'Created table: request_approvals';
END
GO

-- Ensure stock_issuance_items table exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'stock_issuance_items')
BEGIN
    CREATE TABLE stock_issuance_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER,
        item_master_id UNIQUEIDENTIFIER,
        nomenclature NVARCHAR(MAX),
        requested_quantity INT,
        unit NVARCHAR(50),
        item_type NVARCHAR(50), -- 'standard' or 'custom'
        custom_item_name NVARCHAR(MAX),
        unit_price DECIMAL(18,2),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (request_id) REFERENCES stock_issuance_requests(id)
    );
    PRINT 'Created table: stock_issuance_items';
END
GO

-- Ensure approval_items table exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'approval_items')
BEGIN
    CREATE TABLE approval_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_approval_id UNIQUEIDENTIFIER,
        item_master_id UNIQUEIDENTIFIER,
        nomenclature NVARCHAR(MAX),
        custom_item_name NVARCHAR(MAX),
        requested_quantity INT,
        allocated_quantity INT DEFAULT 0,
        unit NVARCHAR(50),
        decision_type NVARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVE_FROM_STOCK, APPROVE_FOR_PROCUREMENT, REJECT, RETURN, FORWARD_TO_SUPERVISOR, FORWARD_TO_ADMIN
        rejection_reason NVARCHAR(MAX),
        forwarding_reason NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (request_approval_id) REFERENCES request_approvals(id)
    );
    PRINT 'Created table: approval_items';
END
GO

-- Ensure approval_workflows table exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'approval_workflows')
BEGIN
    CREATE TABLE approval_workflows (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workflow_name NVARCHAR(255),
        description NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table: approval_workflows';
END
GO

-- Ensure workflow_approvers table exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'workflow_approvers')
BEGIN
    CREATE TABLE workflow_approvers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workflow_id UNIQUEIDENTIFIER,
        user_id NVARCHAR(450),
        can_approve BIT DEFAULT 1,
        added_date DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
    );
    PRINT 'Created table: workflow_approvers';
END
GO

-- ============================================================================
-- PART 2: WING INFORMATION TABLE
-- ============================================================================

-- Ensure WingsInformation table has HOD columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'WingsInformation')
BEGIN
    CREATE TABLE WingsInformation (
        Id INT PRIMARY KEY,
        Name NVARCHAR(255),
        ShortName NVARCHAR(50),
        FocalPerson NVARCHAR(255),
        ContactNo NVARCHAR(50),
        Creator NVARCHAR(450),
        CreateDate DATETIME,
        Modifier NVARCHAR(450),
        ModifyDate DATETIME,
        OfficeID INT,
        IS_ACT BIT,
        HODID NVARCHAR(450),
        HODName NVARCHAR(255),
        WingCode INT,
        CreatedBy NVARCHAR(450),
        CreatedAt DATETIME,
        UpdatedBy NVARCHAR(450),
        UpdatedAt DATETIME,
        Version INT
    );
    PRINT 'Created table: WingsInformation';
END
ELSE
BEGIN
    -- Add missing HOD columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'WingsInformation' AND COLUMN_NAME = 'HODID')
    BEGIN
        ALTER TABLE WingsInformation ADD HODID NVARCHAR(450);
        PRINT 'Added column: WingsInformation.HODID';
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'WingsInformation' AND COLUMN_NAME = 'HODName')
    BEGIN
        ALTER TABLE WingsInformation ADD HODName NVARCHAR(255);
        PRINT 'Added column: WingsInformation.HODName';
    END
END
GO

-- ============================================================================
-- PART 3: ASPNETUSERS TABLE
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AspNetUsers')
BEGIN
    CREATE TABLE AspNetUsers (
        Id NVARCHAR(450) PRIMARY KEY,
        FullName NVARCHAR(255),
        Email NVARCHAR(255),
        EmailConfirmed BIT,
        PasswordHash NVARCHAR(MAX),
        PhoneNumber NVARCHAR(50),
        PhoneNumberConfirmed BIT,
        TwoFactorEnabled BIT,
        LockoutEnd DATETIMEOFFSET,
        LockoutEnabled BIT,
        AccessFailedCount INT,
        UserName NVARCHAR(255),
        NormalizedUserName NVARCHAR(255),
        NormalizedEmail NVARCHAR(255),
        ConcurrencyStamp NVARCHAR(MAX),
        intWingID INT,
        EmployeeID NVARCHAR(50)
    );
    PRINT 'Created table: AspNetUsers';
END
ELSE
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'intWingID')
    BEGIN
        ALTER TABLE AspNetUsers ADD intWingID INT;
        PRINT 'Added column: AspNetUsers.intWingID';
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'FullName')
    BEGIN
        ALTER TABLE AspNetUsers ADD FullName NVARCHAR(255);
        PRINT 'Added column: AspNetUsers.FullName';
    END
END
GO

-- ============================================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for wing request lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_stock_issuance_requests_wing_id' AND object_id = OBJECT_ID('stock_issuance_requests'))
BEGIN
    CREATE INDEX IX_stock_issuance_requests_wing_id ON stock_issuance_requests(requester_wing_id);
    PRINT 'Created index: IX_stock_issuance_requests_wing_id';
END

-- Index for request type lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_stock_issuance_requests_type' AND object_id = OBJECT_ID('stock_issuance_requests'))
BEGIN
    CREATE INDEX IX_stock_issuance_requests_type ON stock_issuance_requests(request_type);
    PRINT 'Created index: IX_stock_issuance_requests_type';
END

-- Index for approval lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_request_approvals_request_id' AND object_id = OBJECT_ID('request_approvals'))
BEGIN
    CREATE INDEX IX_request_approvals_request_id ON request_approvals(request_id);
    PRINT 'Created index: IX_request_approvals_request_id';
END

-- Index for current approver lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_request_approvals_approver_id' AND object_id = OBJECT_ID('request_approvals'))
BEGIN
    CREATE INDEX IX_request_approvals_approver_id ON request_approvals(current_approver_id);
    PRINT 'Created index: IX_request_approvals_approver_id';
end

-- Index for approval items lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_approval_items_approval_id' AND object_id = OBJECT_ID('approval_items'))
BEGIN
    CREATE INDEX IX_approval_items_approval_id ON approval_items(request_approval_id);
    PRINT 'Created index: IX_approval_items_approval_id';
END

GO

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'DATABASE RESTORATION COMPLETE';
PRINT '============================================================================';
PRINT 'Tables verified/created:';
PRINT '  ✓ stock_issuance_requests (with request_type and requester_wing_id)';
PRINT '  ✓ request_approvals';
PRINT '  ✓ stock_issuance_items';
PRINT '  ✓ approval_items';
PRINT '  ✓ approval_workflows';
PRINT '  ✓ workflow_approvers';
PRINT '  ✓ WingsInformation (with HODID and HODName)';
PRINT '  ✓ AspNetUsers (with intWingID)';
PRINT '';
PRINT 'Indexes created for performance optimization';
PRINT '============================================================================';
PRINT 'Ready for wing request approval system deployment';
PRINT '============================================================================';
GO
