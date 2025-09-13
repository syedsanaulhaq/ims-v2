# 🔄 **FLEXIBLE MANUAL APPROVAL WORKFLOW SYSTEM**

## 📋 **Dynamic Approval Flow Configuration**

Instead of rigid amount-based routing, this system allows you to **manually configure approval workflows** that can be easily maintained and modified based on your organizational needs.

---

## 🎯 **CONFIGURABLE WORKFLOW CONCEPT**

### **Example Workflow Configurations:**

#### **Workflow 1: Standard Procurement Flow**
```
DEC Request → DG Admin → AD Admin → Procurement
```

#### **Workflow 2: High-Value Equipment Flow**  
```
DEC Request → Wing Head → DG Admin → Director → AD Admin → Procurement
```

#### **Workflow 3: Emergency Purchase Flow**
```
DEC Request → DG Admin → Procurement (Skip AD Admin for urgency)
```

#### **Workflow 4: Infrastructure Projects Flow**
```
DEC Request → Wing Head → Office Head → DG Admin → Finance Director → AD Admin → Procurement
```

---

## 🏗️ **WORKFLOW CONFIGURATION SYSTEM**

### **1. Workflow Template Definition:**
```sql
-- Define different workflow templates
INSERT INTO workflow_templates (template_name, description, is_active) VALUES
('STANDARD_PROCUREMENT', 'Standard procurement workflow for regular items', 1),
('HIGH_VALUE_EQUIPMENT', 'High-value equipment requiring additional approvals', 1),
('EMERGENCY_PURCHASE', 'Fast-track emergency procurement', 1),
('INFRASTRUCTURE_PROJECT', 'Major infrastructure and construction projects', 1),
('IT_EQUIPMENT', 'Specialized workflow for IT equipment procurement', 1);
```

### **2. Workflow Steps Configuration:**
```sql
-- Configure steps for Standard Procurement workflow
INSERT INTO workflow_steps (template_id, step_order, step_name, role_required, is_mandatory) VALUES
('template-std', 1, 'DEC_SUBMISSION', 'DEC_HEAD', 1),
('template-std', 2, 'DG_ADMIN_REVIEW', 'DG_ADMIN', 1),  
('template-std', 3, 'AD_ADMIN_APPROVAL', 'AD_ADMIN', 1),
('template-std', 4, 'PROCUREMENT_ACTION', 'PROCUREMENT_HEAD', 1);

-- Configure steps for High-Value Equipment workflow  
INSERT INTO workflow_steps (template_id, step_order, step_name, role_required, is_mandatory) VALUES
('template-hv', 1, 'DEC_SUBMISSION', 'DEC_HEAD', 1),
('template-hv', 2, 'WING_CONSOLIDATION', 'WING_HEAD', 1),
('template-hv', 3, 'DG_ADMIN_REVIEW', 'DG_ADMIN', 1),
('template-hv', 4, 'DIRECTOR_APPROVAL', 'DIRECTOR', 1),
('template-hv', 5, 'AD_ADMIN_FINAL', 'AD_ADMIN', 1),
('template-hv', 6, 'PROCUREMENT_ACTION', 'PROCUREMENT_HEAD', 1);
```

### **3. Request-to-Workflow Assignment:**
```sql
-- Assign workflow based on request type, amount, or manual selection
INSERT INTO request_workflow_assignments (request_id, workflow_template_id, assigned_by, assignment_reason) VALUES
('req-001', 'template-std', 'dec-head-id', 'Standard office supplies request'),
('req-002', 'template-hv', 'dec-head-id', 'High-value IT equipment purchase'),
('req-003', 'template-emg', 'dec-head-id', 'Emergency repair equipment needed');
```

---

## 💾 **FLEXIBLE WORKFLOW DATABASE SCHEMA**

### **Core Workflow Tables:**

```sql
-- 1. Workflow Templates (Master Workflows)
CREATE TABLE workflow_templates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_name NVARCHAR(100) UNIQUE NOT NULL,
    display_name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000),
    
    -- Applicability Rules
    min_amount DECIMAL(15,2) NULL,
    max_amount DECIMAL(15,2) NULL,
    applicable_request_types NVARCHAR(500), -- JSON or CSV: 'PROCUREMENT,MAINTENANCE,SERVICE'
    applicable_categories NVARCHAR(500), -- JSON or CSV of category IDs
    
    -- Status and Control
    is_active BIT DEFAULT 1,
    is_default BIT DEFAULT 0,
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id)
);

-- 2. Workflow Steps (Steps in each workflow)  
CREATE TABLE workflow_steps (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_template_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Step Configuration
    step_order INT NOT NULL,
    step_name NVARCHAR(100) NOT NULL,
    step_display_name NVARCHAR(200) NOT NULL,
    step_description NVARCHAR(500),
    
    -- Role and Permission Requirements
    required_role NVARCHAR(50) NOT NULL, -- 'DEC_HEAD', 'WING_HEAD', 'DG_ADMIN', 'AD_ADMIN', 'DIRECTOR', 'PROCUREMENT_HEAD'
    alternative_roles NVARCHAR(200), -- CSV of alternative roles that can perform this step
    
    -- Step Behavior
    is_mandatory BIT DEFAULT 1,
    can_be_skipped BIT DEFAULT 0,
    skip_conditions NVARCHAR(500), -- JSON conditions for when step can be skipped
    
    -- Timing and SLA
    expected_completion_hours INT DEFAULT 24,
    escalation_hours INT DEFAULT 48,
    
    -- Step Actions Available
    can_approve BIT DEFAULT 1,
    can_reject BIT DEFAULT 1,  
    can_return BIT DEFAULT 1,
    can_forward BIT DEFAULT 1,
    can_modify BIT DEFAULT 0,
    
    FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
);

-- 3. Workflow Role Assignments (Who can perform which roles)
CREATE TABLE workflow_role_assignments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_name NVARCHAR(50) NOT NULL,
    
    -- Scope Limitations
    dec_id UNIQUEIDENTIFIER NULL, -- Specific to DEC
    wing_id UNIQUEIDENTIFIER NULL, -- Specific to Wing  
    office_id UNIQUEIDENTIFIER NULL, -- Specific to Office
    
    -- Authority Limits
    max_approval_amount DECIMAL(15,2) NULL,
    can_skip_steps BIT DEFAULT 0,
    can_modify_workflow BIT DEFAULT 0,
    
    -- Status
    is_active BIT DEFAULT 1,
    effective_from DATE DEFAULT CAST(GETDATE() AS DATE),
    effective_to DATE NULL,
    
    -- Delegation Support
    delegates_to UNIQUEIDENTIFIER NULL, -- User who can act on behalf
    delegation_active BIT DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (delegates_to) REFERENCES AspNetUsers(Id)
);

-- 4. Request Workflow Instances (Active workflow for each request)
CREATE TABLE request_workflow_instances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    workflow_template_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Workflow Status
    current_step_id UNIQUEIDENTIFIER NULL,
    current_step_order INT DEFAULT 1,
    overall_status NVARCHAR(30) DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'ON_HOLD'
    
    -- Assignment and Timing
    assigned_by UNIQUEIDENTIFIER NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    started_at DATETIME2 DEFAULT GETDATE(),
    completed_at DATETIME2 NULL,
    
    -- Workflow Modifications
    is_modified BIT DEFAULT 0,
    modification_reason NVARCHAR(500),
    
    FOREIGN KEY (request_id) REFERENCES approval_requests(id),
    FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id),
    FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id),
    FOREIGN KEY (assigned_by) REFERENCES AspNetUsers(Id)
);

-- 5. Workflow Step Executions (Audit trail of each step)
CREATE TABLE workflow_step_executions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_instance_id UNIQUEIDENTIFIER NOT NULL,
    workflow_step_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Execution Details
    assigned_to UNIQUEIDENTIFIER NOT NULL, -- User responsible for this step
    executed_by UNIQUEIDENTIFIER NULL, -- User who actually performed the action
    execution_order INT NOT NULL, -- In case step is repeated
    
    -- Action Taken
    action_taken NVARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED', 'RETURNED', 'FORWARDED', 'SKIPPED'
    comments NVARCHAR(1000),
    
    -- Timing
    assigned_at DATETIME2 DEFAULT GETDATE(),
    started_at DATETIME2 NULL, -- When user opened/started working on it
    completed_at DATETIME2 NULL,
    
    -- SLA Tracking
    is_overdue BIT DEFAULT 0,
    hours_taken INT NULL,
    
    -- Status
    step_status NVARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'
    
    FOREIGN KEY (workflow_instance_id) REFERENCES request_workflow_instances(id),
    FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id),
    FOREIGN KEY (assigned_to) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (executed_by) REFERENCES AspNetUsers(Id)
);
```

---

## 🔧 **WORKFLOW MANAGEMENT INTERFACE**

### **1. Workflow Template Builder:**
```
Admin Interface to Create/Edit Workflows:

┌─ Workflow Template: "Standard Procurement Flow" ─┐
│                                                   │
│ Step 1: [DEC Submission]     → [DEC_HEAD]       │
│         ↓                                        │  
│ Step 2: [DG Admin Review]    → [DG_ADMIN]       │
│         ↓                                        │
│ Step 3: [AD Admin Approval]  → [AD_ADMIN]       │  
│         ↓                                        │
│ Step 4: [Procurement Action] → [PROCUREMENT]     │
│                                                   │
│ [Add Step] [Remove Step] [Reorder Steps]         │
└───────────────────────────────────────────────────┘
```

### **2. Request Workflow Assignment:**
```
When DEC Creates Request:

┌─ Request: REQ-2025-001 ─┐
│ Select Workflow:        │
│ ○ Standard Procurement  │
│ ○ High Value Equipment  │ 
│ ○ Emergency Purchase    │
│ ○ Infrastructure        │
│ ○ Custom Workflow...    │
│                         │
│ [Assign Workflow]       │
└─────────────────────────┘
```

### **3. Dynamic Step Assignment:**
```sql
-- Automatically assign current step to appropriate user
DECLARE @CurrentStepRole NVARCHAR(50);
DECLARE @AssignedUser UNIQUEIDENTIFIER;

-- Get current step role requirement
SELECT @CurrentStepRole = required_role 
FROM workflow_steps 
WHERE id = @CurrentStepID;

-- Find user with that role for this request's organizational context
SELECT @AssignedUser = wra.user_id
FROM workflow_role_assignments wra
WHERE wra.role_name = @CurrentStepRole
  AND wra.is_active = 1
  AND (wra.dec_id = @RequestDecID OR wra.dec_id IS NULL)
  AND (wra.wing_id = @RequestWingID OR wra.wing_id IS NULL);

-- Assign step to user
UPDATE workflow_step_executions 
SET assigned_to = @AssignedUser
WHERE workflow_instance_id = @WorkflowInstanceID 
  AND workflow_step_id = @CurrentStepID;
```

---

## 📊 **PRACTICAL WORKFLOW EXAMPLES**

### **Example 1: Your Specified Flow**
```
DEC Request → DG Admin → AD Admin → Procurement
```

**Configuration:**
```sql
INSERT INTO workflow_templates (template_name, display_name, description) 
VALUES ('YOUR_STANDARD_FLOW', 'Standard DEC to Procurement Flow', 'DEC → DG Admin → AD Admin → Procurement');

INSERT INTO workflow_steps (workflow_template_id, step_order, step_name, required_role) VALUES
('template-your', 1, 'DEC_SUBMISSION', 'DEC_HEAD'),
('template-your', 2, 'DG_ADMIN_REVIEW', 'DG_ADMIN'), 
('template-your', 3, 'AD_ADMIN_APPROVAL', 'AD_ADMIN'),
('template-your', 4, 'PROCUREMENT_ACTION', 'PROCUREMENT_HEAD');
```

### **Example 2: Complex Infrastructure Flow**
```
DEC Request → Wing Head → Office Head → DG Admin → Director → Finance Director → AD Admin → Procurement
```

### **Example 3: Emergency Bypass Flow**
```  
DEC Request → DG Admin → Procurement (Skip AD Admin for emergencies)
```

---

## 🎯 **WORKFLOW EXECUTION PROCESS**

### **Step 1: Request Creation**
```sql
-- DEC creates request and selects workflow
EXEC sp_CreateRequestWithWorkflow 
    @DecID = 'dec-it-id',
    @WorkflowTemplateID = 'template-your',
    @Title = 'IT Equipment Request',
    @RequestID = @NewRequestID OUTPUT;
```

### **Step 2: Automatic Step Assignment**
```sql
-- System automatically assigns first step to DG Admin (not DEC in your flow)
-- Finds user with DG_ADMIN role
-- Sends notification to DG Admin
```

### **Step 3: DG Admin Action**  
```sql
-- DG Admin approves and forwards to AD Admin
EXEC sp_ExecuteWorkflowStep
    @WorkflowInstanceID = 'instance-001',
    @Action = 'APPROVED',
    @Comments = 'Justified request. Forwarding to AD Admin.',
    @ExecutedBy = 'dg-admin-user-id';
```

### **Step 4: AD Admin Action**
```sql  
-- AD Admin final approval
EXEC sp_ExecuteWorkflowStep
    @WorkflowInstanceID = 'instance-001', 
    @Action = 'APPROVED',
    @Comments = 'Final approval granted. Ready for procurement.',
    @ExecutedBy = 'ad-admin-user-id';
```

### **Step 5: Procurement Action**
```sql
-- Procurement creates tender
EXEC sp_ExecuteWorkflowStep
    @WorkflowInstanceID = 'instance-001',
    @Action = 'COMPLETED', 
    @Comments = 'Tender TEND-2025-001 created.',
    @ExecutedBy = 'procurement-user-id';
```

---

## 🚀 **BENEFITS OF FLEXIBLE WORKFLOW SYSTEM**

### ✅ **Complete Flexibility:**
- Define any approval flow you need
- Easy to modify workflows without code changes
- Support for multiple parallel workflows

### ✅ **Easy Maintenance:**  
- Admin interface to create/edit workflows
- Visual workflow builder
- No technical knowledge required

### ✅ **Role-Based Assignment:**
- Automatically assigns steps to correct users
- Support for delegation and backup approvers
- Organization-specific role assignments

### ✅ **Full Audit Trail:**
- Track every step execution
- Time taken at each step
- SLA monitoring and alerts

### ✅ **Exception Handling:**
- Skip steps when needed
- Return to previous steps
- Emergency bypass workflows

---

## 🎊 **WORKFLOW MANAGEMENT DASHBOARD**

### **For Administrators:**
- Create and manage workflow templates
- Assign roles to users  
- Monitor workflow performance
- Modify workflows as needed

### **For Users:**
- View pending tasks assigned to them
- Execute workflow steps (approve/reject/forward)
- Track request status in real-time
- Receive notifications for overdue items

### **For Requesters:**
- Select appropriate workflow when creating request
- Track request progress through each step
- See who is currently handling the request
- Estimated completion time based on SLA

This **flexible workflow system** gives you **complete control** over approval flows while maintaining **full traceability** and **easy maintenance**! 🎯

Would you like me to implement this flexible system that allows you to configure the exact flow: **DEC → DG Admin → AD Admin → Procurement**?
