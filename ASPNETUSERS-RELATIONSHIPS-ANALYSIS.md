# 🔍 AspNetUsers Table Relationships Analysis

## 📊 Current Situation

### **AspNetUsers Table Structure:**
- **Id**: `nvarchar(450)` - Primary Key
- **UserName**: `nvarchar(256)` 
- **Email**: `nvarchar(256)`

### **Tables That SHOULD Reference AspNetUsers:**

| Table | Column | Current Data Type | Purpose |
|-------|--------|------------------|---------|
| **ProcurementRequests** | `requested_by` | `int` | User who created the request |
| **ApprovalWorkflow** | `approver_id` | `int` | User who approved/rejected |
| **TenderAwards** | `created_by` | `int` | User who created the tender award |
| **Deliveries** | `received_by` | `int` | User who received the delivery |
| **CurrentStock** | `updated_by` | `int` | User who updated stock |
| **StockTransactions** | `created_by` | `int` | User who created transaction |

### **Legacy Tables (Already have nvarchar references):**
| Table | Column | Data Type | Purpose |
|-------|--------|-----------|---------|
| **DEC_MST** | `CreatedBy`, `UpdatedBy` | `nvarchar(100)` | Creator/modifier |
| **WingsInformation** | `CreatedBy`, `UpdatedBy` | `nvarchar(100)` | Creator/modifier |
| **tblOffices** | `CreatedBy`, `UpdatedBy` | `nvarchar(100)` | Creator/modifier |

## ⚠️ Data Type Mismatch Issue

**Problem:** AspNetUsers.Id is `nvarchar(450)` but most tables use `int` for user references.

**Result:** No foreign key relationships can be created between these tables and AspNetUsers.

## 🔧 Solution Options

### **Option 1: Update New Tables to Use AspNetUsers.Id (Recommended)**
```sql
-- Update data types to match AspNetUsers.Id
ALTER TABLE ProcurementRequests ALTER COLUMN requested_by nvarchar(450);
ALTER TABLE ApprovalWorkflow ALTER COLUMN approver_id nvarchar(450);
ALTER TABLE TenderAwards ALTER COLUMN created_by nvarchar(450);
ALTER TABLE Deliveries ALTER COLUMN received_by nvarchar(450);
ALTER TABLE CurrentStock ALTER COLUMN updated_by nvarchar(450);
ALTER TABLE StockTransactions ALTER COLUMN created_by nvarchar(450);
```

### **Option 2: Create User Mapping Table**
Create an integer-based user ID mapping to AspNetUsers for compatibility.

### **Option 3: Use UserName References** 
Update legacy tables to reference AspNetUsers.UserName instead of custom strings.

## 🎯 Current User Reference Status

### **✅ Tables Ready for AspNetUsers Integration:**
- **DEC_MST**: Uses `nvarchar` - can link to AspNetUsers.UserName
- **WingsInformation**: Uses `nvarchar` - can link to AspNetUsers.UserName  
- **tblOffices**: Uses `nvarchar` - can link to AspNetUsers.UserName

### **❌ Tables Needing Data Type Updates:**
- **ProcurementRequests** (`requested_by` int → nvarchar(450))
- **ApprovalWorkflow** (`approver_id` int → nvarchar(450))
- **TenderAwards** (`created_by` int → nvarchar(450))
- **Deliveries** (`received_by` int → nvarchar(450))
- **CurrentStock** (`updated_by` int → nvarchar(450))
- **StockTransactions** (`created_by` int → nvarchar(450))

## 📋 Recommended Implementation

### **Step 1: Update Data Types**
```sql
-- Update all user reference columns to match AspNetUsers.Id
ALTER TABLE ProcurementRequests ALTER COLUMN requested_by nvarchar(450);
ALTER TABLE ApprovalWorkflow ALTER COLUMN approver_id nvarchar(450); 
ALTER TABLE TenderAwards ALTER COLUMN created_by nvarchar(450);
ALTER TABLE Deliveries ALTER COLUMN received_by nvarchar(450);
ALTER TABLE CurrentStock ALTER COLUMN updated_by nvarchar(450);
ALTER TABLE StockTransactions ALTER COLUMN created_by nvarchar(450);
```

### **Step 2: Create Foreign Key Relationships**
```sql
-- Create proper user relationships
ALTER TABLE ProcurementRequests 
ADD CONSTRAINT FK_ProcurementRequests_AspNetUsers 
FOREIGN KEY (requested_by) REFERENCES AspNetUsers(Id);

ALTER TABLE ApprovalWorkflow 
ADD CONSTRAINT FK_ApprovalWorkflow_AspNetUsers 
FOREIGN KEY (approver_id) REFERENCES AspNetUsers(Id);

ALTER TABLE TenderAwards 
ADD CONSTRAINT FK_TenderAwards_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);

ALTER TABLE Deliveries 
ADD CONSTRAINT FK_Deliveries_AspNetUsers 
FOREIGN KEY (received_by) REFERENCES AspNetUsers(Id);

ALTER TABLE CurrentStock 
ADD CONSTRAINT FK_CurrentStock_AspNetUsers 
FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id);

ALTER TABLE StockTransactions 
ADD CONSTRAINT FK_StockTransactions_AspNetUsers 
FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id);
```

### **Step 3: Legacy Table Integration**
```sql
-- For legacy tables, you could create relationships using UserName
-- (if the nvarchar fields contain usernames)
ALTER TABLE DEC_MST 
ADD CONSTRAINT FK_DEC_MST_CreatedBy_AspNetUsers 
FOREIGN KEY (CreatedBy) REFERENCES AspNetUsers(UserName);
```

## 🎉 Expected Result After Implementation

**Foreign Key Relationships with AspNetUsers: 6-12 new relationships**

### **Complete User Audit Trail:**
- Track who requested each procurement
- Track who approved each request  
- Track who created tender awards
- Track who received deliveries
- Track all stock updates and transactions
- Full ERP system integration with user authentication

### **Enhanced Database Diagram:**
Your SQL Server diagram will show complete user integration across the entire inventory workflow!

## 📊 Current Status Summary

- **AspNetUsers records**: 425 users available
- **Current user relationships**: 0 (due to data type mismatch)  
- **Potential user relationships**: 6-12 after data type fixes
- **Total relationships after fix**: 22-28 foreign key constraints

Would you like me to implement the data type updates to establish these user relationships?

---
**📅 Analysis Date**: September 14, 2025  
**🔧 Status**: Ready for Implementation  
**🗄️ Database**: InvMISDB  
**👥 Users Available**: 425 in AspNetUsers table
