# 🔄 **COMPLETE APPROVAL WORKFLOW SYSTEM**

## 📋 **Hierarchical Approval Process: From DEC Request to PO Creation**

This document explains the **complete approval workflow** where requests flow through multiple approval levels before reaching the authority who can arrange Purchase Orders.

---

## 🏢 **APPROVAL HIERARCHY STRUCTURE**

### **Organizational Approval Chain:**
```
📋 DEC Level (Department/Section)
├── DEC Head (e.g., IT Department Head)
└── Requests: Laptops, furniture, etc.

⬆️ APPROVAL FLOW ⬆️

🏗️ Wing Level  
├── Wing In-charge (e.g., Technical Wing Head)
└── Reviews and approves departmental requests

⬆️ APPROVAL FLOW ⬆️

🏢 Office Level
├── Office In-charge (e.g., Assistant Director Admin)  
└── Reviews wing-level consolidated requests

⬆️ APPROVAL FLOW ⬆️

🎯 Administrative Level
├── General Manager Admin (GG Admin)
└── Final approval for major purchases

⬆️ APPROVAL FLOW ⬆️

💼 Procurement Authority
├── Deputy Director/Director Level
└── **CAN ARRANGE PURCHASE ORDERS**
```

---

## 📅 **STEP-BY-STEP APPROVAL WORKFLOW**

### **STEP 1: 📋 DEC REQUEST CREATION**
```
IT Department Head says:
"My department needs 20 laptops and 5 office desks for new employees"
```

**Database Action:**
```sql
-- Create initial request at DEC level
INSERT INTO approval_requests (
    request_number, dec_id, requested_by, request_type, 
    total_estimated_value, current_approval_level, status, created_at
)
VALUES (
    'REQ-2025-001', 'dec-it-id', 'it-head-user-id', 'PROCUREMENT',
    250000.00, 'DEC_LEVEL', 'PENDING_APPROVAL', GETDATE()
);

-- Add requested items
INSERT INTO approval_request_items (
    request_id, item_description, quantity, estimated_unit_price, justification
)
VALUES 
    ('req-001', '20 Dell Laptops XPS 13', 20, 75000.00, 'New employee workstations'),
    ('req-001', '5 Office Desks with Drawers', 5, 40000.00, 'Workstation furniture for new staff');
```

### **STEP 2: 🏗️ WING LEVEL APPROVAL**
```
Technical Wing In-charge reviews:
"I see IT needs laptops and desks. Let me check if other departments 
in my wing also have similar needs before approving..."

Engineering Department: "We also need 10 laptops"
Maintenance Department: "We need 3 office chairs"

Wing In-charge decides: "I'll consolidate these requests and approve"
```

**Database Action:**
```sql
-- Wing In-charge reviews and approves
UPDATE approval_requests 
SET 
    current_approval_level = 'WING_LEVEL',
    status = 'APPROVED_AT_WING',
    wing_approved_by = 'wing-head-user-id',
    wing_approved_at = GETDATE(),
    wing_comments = 'Approved. Consolidated with Engineering (10 laptops) and Maintenance (3 chairs)'
WHERE request_number = 'REQ-2025-001';

-- Add consolidated items from other departments
INSERT INTO approval_request_items (request_id, item_description, quantity, estimated_unit_price, added_by_wing)
VALUES 
    ('req-001', '10 Dell Laptops XPS 13', 10, 75000.00, 1),
    ('req-001', '3 Executive Office Chairs', 3, 25000.00, 1);
```

### **STEP 3: 🏢 OFFICE LEVEL APPROVAL**
```
Assistant Director Admin reviews:
"Technical Wing is requesting laptops, desks, and chairs worth Rs. 4,25,000.
This is above my approval limit of Rs. 3,00,000. 
I need to forward this to GG Admin for final approval."
```

**Database Action:**
```sql
-- Office In-charge reviews but cannot approve (above limit)
UPDATE approval_requests 
SET 
    current_approval_level = 'OFFICE_LEVEL',
    status = 'FORWARDED_TO_ADMIN',
    office_reviewed_by = 'ad-admin-user-id',
    office_reviewed_at = GETDATE(),
    office_comments = 'Amount Rs. 4,25,000 exceeds my approval limit of Rs. 3,00,000. Forwarding to GG Admin.',
    needs_higher_approval = 1
WHERE request_number = 'REQ-2025-001';
```

### **STEP 4: 🎯 GG ADMIN LEVEL APPROVAL**
```
General Manager Admin reviews:
"This is a justified request for new employees. Technical wing has consolidated
their requirements properly. I approve this for procurement."
```

**Database Action:**
```sql
-- GG Admin gives final approval
UPDATE approval_requests 
SET 
    current_approval_level = 'ADMIN_LEVEL',
    status = 'APPROVED_BY_ADMIN',
    admin_approved_by = 'gg-admin-user-id',
    admin_approved_at = GETDATE(),
    admin_comments = 'Approved for procurement. New employee requirements justified.',
    final_approved_amount = 425000.00
WHERE request_number = 'REQ-2025-001';
```

### **STEP 5: 💼 PROCUREMENT AUTHORITY ACTION**
```
Deputy Director/Procurement Head says:
"Request has been approved by GG Admin for Rs. 4,25,000. 
The amount requires tender process. I'll initiate tender proceedings."
```

**Database Action:**
```sql
-- Procurement authority can now create tender
UPDATE approval_requests 
SET 
    current_approval_level = 'PROCUREMENT_LEVEL',
    status = 'APPROVED_FOR_TENDER',
    procurement_assigned_to = 'procurement-head-user-id',
    procurement_assigned_at = GETDATE()
WHERE request_number = 'REQ-2025-001';

-- Create tender based on approved request
INSERT INTO tenders (
    tender_number, title, estimated_value, source_request_id,
    publish_date, submission_deadline, status, created_by
)
VALUES (
    'TEND-2025-001', 'Supply of IT Equipment and Furniture', 425000.00, 'req-001',
    '2025-09-15', '2025-09-30 17:00:00', 'DRAFT', 'procurement-head-user-id'
);
```

---

## 📊 **APPROVAL LEVELS & LIMITS**

### **Approval Authority Matrix:**

| Level | Position | Approval Limit | Can Approve | Must Forward If |
|-------|----------|---------------|-------------|-----------------|
| **DEC** | Department Head | Rs. 50,000 | Office supplies, minor items | Amount > Rs. 50,000 |
| **WING** | Wing In-charge | Rs. 1,50,000 | Department requests, consolidation | Amount > Rs. 1,50,000 |
| **OFFICE** | Assistant Director | Rs. 3,00,000 | Wing requests, office needs | Amount > Rs. 3,00,000 |
| **ADMIN** | General Manager | Rs. 10,00,000 | Major procurement, office equipment | Amount > Rs. 10,00,000 |
| **DIRECTOR** | Director/Secretary | Unlimited | Any amount | Never (highest authority) |

### **Approval Routes Based on Amount:**

```sql
-- Automatic routing based on estimated value
CASE 
    WHEN estimated_value <= 50000 THEN 'DEC_HEAD_ONLY'
    WHEN estimated_value <= 150000 THEN 'WING_APPROVAL_REQUIRED'  
    WHEN estimated_value <= 300000 THEN 'OFFICE_APPROVAL_REQUIRED'
    WHEN estimated_value <= 1000000 THEN 'ADMIN_APPROVAL_REQUIRED'
    ELSE 'DIRECTOR_APPROVAL_REQUIRED'
END as approval_route
```

---

## 🔄 **COMPLETE WORKFLOW WITH APPROVAL CHAIN**

### **Enhanced Database Schema for Approvals:**

```sql
-- Main approval requests table
CREATE TABLE approval_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_number NVARCHAR(50) UNIQUE NOT NULL,
    dec_id UNIQUEIDENTIFIER NOT NULL,
    requested_by UNIQUEIDENTIFIER NOT NULL,
    
    -- Request Details
    request_type NVARCHAR(20) NOT NULL, -- 'PROCUREMENT', 'MAINTENANCE', 'SERVICE'
    total_estimated_value DECIMAL(15,2) NOT NULL,
    priority NVARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    
    -- Approval Flow
    current_approval_level NVARCHAR(20) NOT NULL, -- 'DEC_LEVEL', 'WING_LEVEL', 'OFFICE_LEVEL', 'ADMIN_LEVEL', 'PROCUREMENT_LEVEL'
    status NVARCHAR(30) NOT NULL, -- 'PENDING_APPROVAL', 'APPROVED_AT_WING', 'FORWARDED_TO_ADMIN', 'APPROVED_BY_ADMIN', 'APPROVED_FOR_TENDER', 'REJECTED'
    
    -- DEC Level
    dec_comments NVARCHAR(1000),
    
    -- Wing Level Approval
    wing_approved_by UNIQUEIDENTIFIER NULL,
    wing_approved_at DATETIME2 NULL,
    wing_comments NVARCHAR(1000),
    
    -- Office Level Approval  
    office_reviewed_by UNIQUEIDENTIFIER NULL,
    office_reviewed_at DATETIME2 NULL,
    office_comments NVARCHAR(1000),
    needs_higher_approval BIT DEFAULT 0,
    
    -- Admin Level Approval
    admin_approved_by UNIQUEIDENTIFIER NULL,
    admin_approved_at DATETIME2 NULL,
    admin_comments NVARCHAR(1000),
    final_approved_amount DECIMAL(15,2) NULL,
    
    -- Procurement Assignment
    procurement_assigned_to UNIQUEIDENTIFIER NULL,
    procurement_assigned_at DATETIME2 NULL,
    tender_id UNIQUEIDENTIFIER NULL, -- Links to tenders table
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    FOREIGN KEY (dec_id) REFERENCES DEC_MST(id),
    FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (wing_approved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (office_reviewed_by) REFERENCES AspNetUsers(Id), 
    FOREIGN KEY (admin_approved_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (procurement_assigned_to) REFERENCES AspNetUsers(Id)
);

-- Items in each approval request
CREATE TABLE approval_request_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    item_description NVARCHAR(500) NOT NULL,
    quantity INT NOT NULL,
    estimated_unit_price DECIMAL(15,4) NOT NULL,
    total_estimated_cost AS (quantity * estimated_unit_price) PERSISTED,
    
    -- Additional Details
    specifications NVARCHAR(1000),
    justification NVARCHAR(500),
    priority NVARCHAR(10) DEFAULT 'NORMAL',
    
    -- Tracking
    added_by_wing BIT DEFAULT 0, -- Item added during wing consolidation
    approved_quantity INT NULL, -- Final approved quantity (may differ from requested)
    
    FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE
);

-- Approval history/audit trail
CREATE TABLE approval_history (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    approval_level NVARCHAR(20) NOT NULL,
    action NVARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED', 'FORWARDED', 'RETURNED'
    approved_by UNIQUEIDENTIFIER NOT NULL,
    comments NVARCHAR(1000),
    approved_amount DECIMAL(15,2) NULL,
    action_date DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (request_id) REFERENCES approval_requests(id),
    FOREIGN KEY (approved_by) REFERENCES AspNetUsers(Id)
);
```

---

## 🎯 **PRACTICAL EXAMPLE: COMPLETE APPROVAL FLOW**

### **Request Journey: IT Department → GG Admin → Procurement**

| Step | Level | Person | Action | Amount | Status | Comments |
|------|-------|--------|--------|--------|--------|----------|
| **1** | DEC | IT Head | Creates Request | Rs. 2,50,000 | PENDING | "20 laptops + 5 desks for new employees" |
| **2** | WING | Tech Wing Head | Reviews & Consolidates | Rs. 4,25,000 | APPROVED_AT_WING | "Added Engineering (10 laptops) + Maintenance (3 chairs)" |
| **3** | OFFICE | AD Admin | Reviews Amount | Rs. 4,25,000 | FORWARDED | "Exceeds my Rs. 3,00,000 limit. Forwarding to GG Admin" |
| **4** | ADMIN | GG Admin | Final Approval | Rs. 4,25,000 | APPROVED_BY_ADMIN | "Justified for new employees. Approved for procurement" |
| **5** | PROCUREMENT | Procurement Head | Creates Tender | Rs. 4,25,000 | TENDER_CREATED | "Amount requires public tender. TEND-2025-001 created" |

### **Database Query to Track Request:**
```sql
-- Complete approval trail for one request
SELECT 
    ar.request_number,
    ar.current_approval_level,
    ar.status,
    ar.total_estimated_value,
    
    -- DEC Details
    d.DEC_Name as requesting_department,
    u_req.UserName as requested_by_name,
    
    -- Wing Approval
    u_wing.UserName as wing_approved_by_name,
    ar.wing_approved_at,
    ar.wing_comments,
    
    -- Office Review
    u_office.UserName as office_reviewed_by_name, 
    ar.office_reviewed_at,
    ar.office_comments,
    
    -- Admin Approval
    u_admin.UserName as admin_approved_by_name,
    ar.admin_approved_at, 
    ar.final_approved_amount,
    ar.admin_comments
    
FROM approval_requests ar
LEFT JOIN DEC_MST d ON ar.dec_id = d.id
LEFT JOIN AspNetUsers u_req ON ar.requested_by = u_req.Id
LEFT JOIN AspNetUsers u_wing ON ar.wing_approved_by = u_wing.Id  
LEFT JOIN AspNetUsers u_office ON ar.office_reviewed_by = u_office.Id
LEFT JOIN AspNetUsers u_admin ON ar.admin_approved_by = u_admin.Id
WHERE ar.request_number = 'REQ-2025-001';
```

---

## 🚀 **BENEFITS OF HIERARCHICAL APPROVAL SYSTEM**

### ✅ **Proper Authorization:**
- Each level approves within their authority limits
- Higher amounts automatically routed to appropriate authority
- No unauthorized commitments

### ✅ **Consolidation Opportunities:**
- Wing heads can consolidate similar requests
- Bulk purchasing reduces costs
- Better planning and coordination

### ✅ **Budget Control:**
- Multi-level review prevents overspending
- Higher authorities review larger commitments
- Clear approval limits for each position

### ✅ **Audit Trail:**
- Complete record of who approved what and when
- Clear justification at each level
- Transparent decision-making process

### ✅ **Efficiency:**
- Smaller amounts approved quickly at lower levels
- Only major purchases require higher approval
- Clear routing based on amount thresholds

---

## 📊 **APPROVAL WORKFLOW DASHBOARD VIEWS**

### **For DEC Heads:**
- My pending requests
- Requests approved/rejected
- Average approval time

### **For Wing In-charges:**
- Requests from my departments
- Consolidation opportunities
- My approval history

### **For Office Administrators:**
- Requests in my approval queue
- Amount-wise distribution
- Forward to higher authority alerts

### **For GG Admin:**
- High-value requests pending approval
- Monthly approval summary
- Budget impact analysis

### **For Procurement:**
- Approved requests ready for tender
- Tender creation pipeline
- Procurement performance metrics

This **hierarchical approval system** ensures **proper authorization**, **budget control**, and **complete accountability** while maintaining **efficiency** in the procurement process! 🎊
