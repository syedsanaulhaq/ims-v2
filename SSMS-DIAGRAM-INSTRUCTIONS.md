# 🗺️ SQL Server Database Diagram Creation Guide

## ✅ Your Database is Ready!
- **Database**: InvMISDB
- **Tables**: 17 total (16 + sysdiagrams)
- **Relationships**: 12 foreign key constraints
- **Status**: ✅ Diagram support enabled

## 📋 Step-by-Step Instructions

### **STEP 1: Open SQL Server Management Studio**
1. Launch **SQL Server Management Studio (SSMS)**
2. Connect to **localhost** (your SQL Server instance)
3. Wait for connection to establish

### **STEP 2: Navigate to InvMISDB Database**
1. In **Object Explorer** (left panel), expand **"Databases"**
2. Find and expand **"InvMISDB"** 
3. You should see folders like Tables, Views, etc.

### **STEP 3: Locate Database Diagrams**
1. Look for **"Database Diagrams"** folder under InvMISDB
2. **If you DON'T see "Database Diagrams" folder:**
   - Right-click on **"InvMISDB"** database name
   - Select **"Tasks"** → **"Generate Scripts..."**
   - Click **"Cancel"** (this just initializes diagram support)
   - Refresh the database (F5) - Database Diagrams folder should appear

### **STEP 4: Create New Database Diagram**
1. Right-click on **"Database Diagrams"** folder
2. Select **"New Database Diagram"**
3. **If prompted about installing diagram support, click "Yes"**

### **STEP 5: Add Tables to Diagram**
In the **"Add Table"** dialog, you'll see all tables. **Recommended selection:**

**🔸 Essential Tables (select these first):**
- ✅ **ProcurementRequests** (main workflow)
- ✅ **TenderAwards** (financial data)
- ✅ **Deliveries** (delivery tracking)
- ✅ **DEC_MST** (organizational)
- ✅ **ItemMaster** (item catalog)

**🔸 Detail Tables:**
- ✅ **RequestItems**
- ✅ **AwardItems** 
- ✅ **DeliveryItems**
- ✅ **ApprovalWorkflow**

**🔸 Master Data:**
- ✅ **AspNetUsers**
- ✅ **tblOffices**
- ✅ **WingsInformation**
- ✅ **CurrentStock**

**To add tables:**
1. Select a table name
2. Click **"Add"** button
3. Repeat for each table
4. Click **"Close"** when finished

### **STEP 6: Arrange Tables**
Tables will appear in the diagram area. **Drag them to organize:**

```
┌─── TOP AREA ────┐
│ Organizational  │
│ tblOffices      │
│ WingsInfo       │  
│ DEC_MST         │
└─────────────────┘
        │
        ▼
┌─── MIDDLE AREA ──┐
│ Procurement Flow │
│ ProcurementReqs  │
│ RequestItems     │
│ ApprovalWorkflow │
└──────────────────┘
        │
        ▼
┌─── LOWER AREA ───┐
│ Financial & Items│
│ TenderAwards     │
│ AwardItems       │
│ ItemMaster       │
└──────────────────┘
        │
        ▼
┌─── BOTTOM AREA ──┐
│ Deliveries       │
│ DeliveryItems    │
│ CurrentStock     │
└──────────────────┘
```

### **STEP 7: View Relationships**
- **Relationship lines** should appear automatically connecting tables
- If lines are missing, right-click in diagram area → **"Show Relationship Labels"**

### **STEP 8: Save the Diagram**
1. Click **"Save"** button (💾) or press **Ctrl+S**
2. Name it: **"InvMISDB_Complete_Diagram"**
3. Click **"OK"**

## 🔧 Troubleshooting

### ❌ "Database Diagrams" folder not visible
**Solution:**
```sql
-- Run this in SSMS Query window connected to InvMISDB:
USE InvMISDB;
EXEC sp_helpdb;
```
Then refresh the database (F5)

### ❌ Relationship lines not showing
**Solutions:**
1. Right-click in diagram → **"Show Relationship Labels"**
2. Check **"Database Diagram"** toolbar → **"Show Relationship Labels"**
3. Zoom out to see if lines are outside view area

### ❌ Tables overlapping or messy layout
**Solutions:**
1. Use **"Arrange Tables"** button in toolbar
2. Manually drag tables to better positions
3. Right-click → **"Arrange Selection"**

### ❌ Cannot create diagram (permissions)
**Solution:**
- Ensure you're connected as administrator or database owner
- Try connecting with Windows Authentication

## 🎯 Expected Result

You should see a professional database diagram with:
- **📊 All 16 tables** properly arranged
- **🔗 12 relationship lines** connecting related tables  
- **📋 Clear workflow** from procurement → approval → award → delivery
- **💰 Financial data isolation** (only in TenderAwards/AwardItems)
- **📍 Organizational hierarchy** clearly visible

## 🚀 Quick Start Commands

If you prefer, you can also run this query to verify everything is ready:

```sql
USE InvMISDB;

-- Check tables
SELECT COUNT(*) as 'Tables Ready' FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Check relationships  
SELECT COUNT(*) as 'Relationships Ready' FROM sys.foreign_keys;

-- List all tables for diagram
SELECT TABLE_NAME as 'Available Tables' 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
ORDER BY TABLE_NAME;
```

Your InvMISDB database is fully ready for diagram creation! 🎉
