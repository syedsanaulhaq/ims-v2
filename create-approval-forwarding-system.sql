-- Approval Forwarding System Implementation
-- Based on requirements: Admin-configured, Flexible forwarding, Role-based finalization

-- 1. Approval Workflows Configuration (Admin manages these)
CREATE TABLE approval_workflows (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_name NVARCHAR(100) NOT NULL,
    request_type NVARCHAR(50) NOT NULL, -- 'stock_issuance', 'tender', 'procurement', etc.
    office_id UNIQUEIDENTIFIER REFERENCES offices(id),
    description NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_by UNIQUEIDENTIFIER REFERENCES users(id),
    created_date DATETIME2 DEFAULT GETDATE(),
    updated_date DATETIME2 DEFAULT GETDATE()
);

-- 2. Authorized Approvers (Admin configures who can approve what)
CREATE TABLE workflow_approvers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_id UNIQUEIDENTIFIER REFERENCES approval_workflows(id),
    user_id UNIQUEIDENTIFIER REFERENCES users(id),
    can_approve BIT DEFAULT 1,
    can_forward BIT DEFAULT 1,
    can_finalize BIT DEFAULT 0, -- Only specific roles can finalize
    approver_role NVARCHAR(100), -- 'Department Head', 'Finance Officer', 'CO', etc.
    added_by UNIQUEIDENTIFIER REFERENCES users(id),
    added_date DATETIME2 DEFAULT GETDATE()
);

-- 3. Request Approval Tracking
CREATE TABLE request_approvals (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL, -- Links to stock_issuance_requests, tenders, etc.
    request_type NVARCHAR(50) NOT NULL,
    workflow_id UNIQUEIDENTIFIER REFERENCES approval_workflows(id),
    
    -- Current status
    current_status NVARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'finalized'
    current_approver_id UNIQUEIDENTIFIER REFERENCES users(id),
    
    -- Original submission
    submitted_by UNIQUEIDENTIFIER REFERENCES users(id),
    submitted_date DATETIME2 DEFAULT GETDATE(),
    
    -- Finalization
    finalized_by UNIQUEIDENTIFIER REFERENCES users(id),
    finalized_date DATETIME2,
    
    -- Rejection
    rejected_by UNIQUEIDENTIFIER REFERENCES users(id),
    rejected_date DATETIME2,
    rejection_reason NVARCHAR(500),
    
    created_date DATETIME2 DEFAULT GETDATE(),
    updated_date DATETIME2 DEFAULT GETDATE()
);

-- 4. Approval History (Tracks the complete approval path)
CREATE TABLE approval_history (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_approval_id UNIQUEIDENTIFIER REFERENCES request_approvals(id),
    
    -- Action details
    action_type NVARCHAR(20) NOT NULL, -- 'submitted', 'forwarded', 'approved', 'rejected', 'finalized'
    action_by UNIQUEIDENTIFIER REFERENCES users(id),
    action_date DATETIME2 DEFAULT GETDATE(),
    
    -- Forwarding details
    forwarded_from UNIQUEIDENTIFIER REFERENCES users(id),
    forwarded_to UNIQUEIDENTIFIER REFERENCES users(id),
    
    -- Comments and notes
    comments NVARCHAR(1000),
    internal_notes NVARCHAR(500),
    
    -- Step tracking
    step_number INT,
    is_current_step BIT DEFAULT 0
);

-- 5. Indexes for performance
CREATE INDEX IDX_approval_workflows_type_office ON approval_workflows(request_type, office_id, is_active);
CREATE INDEX IDX_workflow_approvers_workflow_user ON workflow_approvers(workflow_id, user_id);
CREATE INDEX IDX_request_approvals_request ON request_approvals(request_id, request_type);
CREATE INDEX IDX_request_approvals_current ON request_approvals(current_approver_id, current_status);
CREATE INDEX IDX_approval_history_request ON approval_history(request_approval_id, action_date);

-- 6. Sample data for testing
-- Create a workflow for stock issuance
INSERT INTO approval_workflows (workflow_name, request_type, office_id, description)
VALUES ('Stock Issuance Approval', 'stock_issuance', NULL, 'General approval workflow for stock issuance requests');

-- Add sample approvers (you'll need to adjust user IDs)
-- This would be done by admin interface
/*
INSERT INTO workflow_approvers (workflow_id, user_id, can_approve, can_forward, can_finalize, approver_role)
SELECT 
    w.id,
    u.id,
    1, -- can approve
    1, -- can forward  
    CASE WHEN u.designation IN ('Commanding Officer', 'Finance Officer') THEN 1 ELSE 0 END, -- can finalize
    u.designation
FROM approval_workflows w
CROSS JOIN users u
WHERE w.request_type = 'stock_issuance' 
AND u.designation IN ('Department Head', 'Wing Commander', 'Finance Officer', 'Commanding Officer');
*/

-- 7. Views for easy querying
CREATE VIEW vw_pending_approvals AS
SELECT 
    ra.id as approval_id,
    ra.request_id,
    ra.request_type,
    ra.current_status,
    ra.submitted_by,
    ra.submitted_date,
    
    -- Current approver details
    cu.name as current_approver_name,
    cu.designation as current_approver_designation,
    cu.office_id as current_approver_office,
    
    -- Submitter details
    su.name as submitter_name,
    su.designation as submitter_designation,
    
    -- Workflow details
    aw.workflow_name,
    
    -- Last action
    ah.action_date as last_action_date,
    ah.comments as last_comments
    
FROM request_approvals ra
LEFT JOIN users cu ON ra.current_approver_id = cu.id
LEFT JOIN users su ON ra.submitted_by = su.id
LEFT JOIN approval_workflows aw ON ra.workflow_id = aw.id
LEFT JOIN approval_history ah ON ra.id = ah.request_approval_id AND ah.is_current_step = 1
WHERE ra.current_status = 'pending';

CREATE VIEW vw_approval_trail AS
SELECT 
    ah.request_approval_id,
    ra.request_id,
    ra.request_type,
    ah.step_number,
    ah.action_type,
    ah.action_date,
    
    -- Action by user
    u.name as action_by_name,
    u.designation as action_by_designation,
    
    -- Forwarding details
    uf.name as forwarded_from_name,
    ut.name as forwarded_to_name,
    
    ah.comments,
    ah.is_current_step
    
FROM approval_history ah
LEFT JOIN request_approvals ra ON ah.request_approval_id = ra.id
LEFT JOIN users u ON ah.action_by = u.id
LEFT JOIN users uf ON ah.forwarded_from = uf.id
LEFT JOIN users ut ON ah.forwarded_to = ut.id
ORDER BY ah.request_approval_id, ah.step_number;