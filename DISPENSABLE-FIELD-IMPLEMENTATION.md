# Dispensable/Indispensable Field Implementation

## Overview
Added a field to the `categories` table to classify items as either **Dispensable** or **Indispensable**.

---

## 📋 Database Changes

### SQL Migration File Created
**File:** `add-dispensable-field-to-categories.sql`

**Changes:**
- Added `item_type` column to `categories` table
- Data type: `NVARCHAR(20)`
- Default value: `'Dispensable'`
- Constraint: CHECK (item_type IN ('Dispensable', 'Indispensable'))
- Nullable: Yes (defaults to 'Dispensable')

**To Apply:**
```sql
-- Run this file in SQL Server Management Studio or via sqlcmd
sqlcmd -S SYED-FAZLI-LAPT -d InventoryManagementDB -i add-dispensable-field-to-categories.sql
```

---

## 🎨 Frontend Changes

### 1. CategoriesManagement.tsx
**Updated:**
- ✅ Added `item_type` field to Category interface
- ✅ Added `item_type` to category form state (default: 'Dispensable')
- ✅ Added dropdown in create/edit dialog with two options:
  - Dispensable
  - Indispensable
- ✅ Added "Item Type" column to categories table
- ✅ Color-coded badges:
  - **Dispensable**: Green badge (bg-green-50, text-green-700)
  - **Indispensable**: Orange badge (bg-orange-50, text-orange-700)
- ✅ Updated handleEditCategory to include item_type

### 2. Categories.tsx
**Updated:**
- ✅ Added `item_type` field to Category interface

---

## 📊 Table Structure

### Categories Table
```
┌─────────────┬──────────────┬─────────────┬─────────────┬──────────┐
│ category_id │ category_name│ description │  item_type  │  status  │
├─────────────┼──────────────┼─────────────┼─────────────┼──────────┤
│ CAT-001     │ Office Supp. │ ...         │ Dispensable │ Active   │
│ CAT-002     │ Electronics  │ ...         │Indispensable│ Active   │
└─────────────┴──────────────┴─────────────┴─────────────┴──────────┘
```

---

## 🎯 Usage

### Creating a New Category
1. Go to Categories Management page
2. Click "Category" button
3. Fill in:
   - Category Name
   - Description
   - **Item Type** (Dispensable/Indispensable) ← NEW
   - Status
4. Click Save

### Item Type Definitions
- **Dispensable**: Items that can be consumed/used up (e.g., Office Supplies, Stationery)
- **Indispensable**: Items that are permanent/non-consumable (e.g., Furniture, Equipment, Electronics)

---

## 🔄 Migration Impact

### Existing Data
- All existing categories will default to **"Dispensable"**
- You can manually update them via the edit dialog

### API Impact
- Backend API endpoints should now include `item_type` in:
  - POST /api/categories (create)
  - PUT /api/categories/:id (update)
  - GET /api/categories (list)

---

## ✅ Testing Checklist

- [ ] Run SQL migration script
- [ ] Verify column exists: `SELECT * FROM categories`
- [ ] Create new category with item_type = 'Dispensable'
- [ ] Create new category with item_type = 'Indispensable'
- [ ] Edit existing category and change item_type
- [ ] Verify badges show correct colors in table
- [ ] Test API endpoints (if backend updated)

---

## 🚀 Next Steps

1. **Run the SQL migration** to add the column
2. **Update backend API** to handle item_type field
3. **Test the UI** in the Categories Management page
4. **Update existing categories** to classify them correctly

---

## Files Modified

1. `add-dispensable-field-to-categories.sql` (NEW)
2. `src/pages/CategoriesManagement.tsx`
3. `src/pages/Categories.tsx`

---

**Date:** November 3, 2025
**Status:** ✅ Ready for Testing
