# 📊 **COMPLETE PROCUREMENT DATA FLOW TABLE**

## 🎯 **Step-by-Step Data Flow with Real Examples**

| Step | Who Does It | What Happens | Database Action | Real Example |
|------|-------------|--------------|-----------------|--------------|
| **1** | 🙋‍♂️ **IT Department Head** | Creates internal request | `INSERT internal_requests` | "Need 20 laptops for new employees" |
| **2** | 📊 **Store Manager** | Consolidates all requests | `UPDATE internal_requests` | "IT needs 20, Finance needs 5, HR needs 3 = 28 total + 2 extra = 30" |
| **3** | 🏛️ **Procurement Officer** | Creates tender document | `INSERT tenders` | "TEND-2025-001: Supply of 30 Laptops, Est. Rs. 90,000" |
| **4** | 📢 **Procurement Team** | Publishes tender publicly | `UPDATE tenders (status='PUBLISHED')` | "Tender notice in newspapers, website, deadline Sept 25" |
| **5** | 🏭 **Dell Pakistan** | Submits bid | `INSERT tender_bids` | "We offer 30 laptops @ Rs. 2,800 each = Rs. 84,000" |
| **5** | 🏭 **HP Solutions** | Submits bid | `INSERT tender_bids` | "We offer 30 laptops @ Rs. 2,950 each = Rs. 88,500" |
| **5** | 🏭 **Tech World** | Submits bid | `INSERT tender_bids` | "We offer 30 laptops @ Rs. 2,750 each = Rs. 82,500" |
| **6** | ✅ **Evaluation Committee** | Evaluates all bids | `UPDATE tender_bids` | "Dell wins with 93.2/100 score (best technical + reasonable price)" |
| **7** | 🏆 **Procurement Head** | Awards tender | `UPDATE tenders (status='AWARDED')` | "Tender awarded to Dell Pakistan for Rs. 84,000" |
| **8** | 📋 **Store Manager** | Creates purchase order | `INSERT purchase_orders` | "PO-2025-001 to Dell: 30 laptops, Rs. 84,000, deliver by Oct 10" |
| **9** | 📦 **Dell Pakistan** | Delivers goods | `UPDATE purchase_orders` | "30 Dell XPS 13 laptops delivered on Oct 8, 2025" |
| **10** | ✅ **Store Staff** | Verifies & receives goods | `INSERT stock_transactions (+30)` | "All 30 laptops received in good condition, warranty cards included" |
| **11** | 📈 **System** | Updates stock automatically | `UPDATE current_stock_levels` | "Dell XPS 13 stock increased from 5 to 35 units" |
| **12** | 📤 **Store Staff** | Issues to IT Department | `INSERT stock_transactions (-20)` | "20 laptops issued to IT Department via ISS-2025-001" |
| **13** | 📤 **Store Staff** | Issues to Finance Dept | `INSERT stock_transactions (-5)` | "5 laptops issued to Finance Department via ISS-2025-002" |
| **14** | 📤 **Store Staff** | Issues to HR Department | `INSERT stock_transactions (-3)` | "3 laptops issued to HR Department via ISS-2025-003" |
| **15** | 📊 **System** | Final stock update | `UPDATE current_stock_levels` | "Final stock: 35 - 20 - 5 - 3 = 7 laptops remaining in store" |

---

## 💾 **DATABASE TABLES INVOLVED**

### **📋 Request Management:**
```sql
-- Internal requests from departments
internal_requests (
    id, request_number, dec_id, requested_by, 
    items_needed, justification, status, created_at
)

-- Items in each request  
internal_request_items (
    id, request_id, item_description, quantity, 
    estimated_price, specifications, priority
)
```

### **🏢 Tender Management:**
```sql
-- Tender documents
tenders (
    id, tender_number, title, description, estimated_value,
    publish_date, submission_deadline, status, created_by
)

-- Items in each tender
tender_items (
    id, tender_id, item_description, quantity,
    estimated_unit_price, specifications, evaluation_criteria
)

-- Vendor bids
tender_bids (
    id, tender_id, vendor_id, total_bid_amount,
    delivery_days, technical_score, financial_score, status
)
```

### **📋 Purchase Management:**
```sql
-- Purchase orders
purchase_orders (
    id, po_number, vendor_id, tender_id, total_amount,
    order_date, expected_delivery_date, status, created_by
)

-- Items in each PO
purchase_order_items (
    id, purchase_order_id, item_master_id, ordered_quantity,
    unit_price, received_quantity, received_date
)
```

### **📦 Inventory Management:**
```sql
-- All stock movements
stock_transactions (
    id, transaction_number, item_master_id, transaction_type,
    quantity, unit_price, reference_type, reference_id,
    vendor_id, dec_id, created_by, transaction_date
)

-- Current stock levels
current_stock_levels (
    id, item_master_id, current_quantity, reserved_quantity,
    available_quantity, last_transaction_date
)
```

---

## 🔍 **TRACKING ONE LAPTOP'S COMPLETE JOURNEY**

### **From Request to Desk - Database Trail:**

```sql
-- 1. Find original request
SELECT 'STEP 1: Original Request' as step, ir.request_number, d.DEC_Name, ir.justification
FROM internal_requests ir 
JOIN DEC_MST d ON ir.dec_id = d.id
WHERE ir.request_number = 'REQ-2025-001';
-- Result: "REQ-2025-001 | IT Department | Need 20 laptops for new employees"

-- 2. Find which tender included this request
SELECT 'STEP 2: Tender Creation' as step, t.tender_number, t.title, t.estimated_value
FROM tenders t 
WHERE t.tender_number = 'TEND-2025-001';
-- Result: "TEND-2025-001 | Supply of Laptops | Rs. 90,000"

-- 3. Find winning bid
SELECT 'STEP 3: Winning Bid' as step, v.vendor_name, tb.total_bid_amount, tb.technical_score + tb.financial_score as total_score
FROM tender_bids tb
JOIN vendors v ON tb.vendor_id = v.id
WHERE tb.tender_id = (SELECT id FROM tenders WHERE tender_number = 'TEND-2025-001')
  AND tb.status = 'WON';
-- Result: "Dell Pakistan | Rs. 84,000 | 93.2 points"

-- 4. Find purchase order
SELECT 'STEP 4: Purchase Order' as step, po.po_number, po.total_amount, po.expected_delivery_date
FROM purchase_orders po
WHERE po.po_number = 'PO-2025-001';
-- Result: "PO-2025-001 | Rs. 84,000 | Oct 10, 2025"

-- 5. Find goods receipt
SELECT 'STEP 5: Goods Receipt' as step, st.transaction_date, st.quantity, v.vendor_name
FROM stock_transactions st
JOIN vendors v ON st.vendor_id = v.id
WHERE st.reference_number = 'PO-2025-001' AND st.transaction_type = 'RECEIVED';
-- Result: "Oct 8, 2025 | +30 laptops | Dell Pakistan"

-- 6. Find issuance to IT
SELECT 'STEP 6: Issued to Department' as step, st.transaction_date, st.quantity, d.DEC_Name
FROM stock_transactions st  
JOIN DEC_MST d ON st.dec_id = d.id
WHERE st.reference_number = 'ISS-2025-001' AND st.transaction_type = 'ISSUED';
-- Result: "Oct 9, 2025 | -20 laptops | IT Department"

-- 7. Current stock status
SELECT 'STEP 7: Current Status' as step, csl.current_quantity, csl.available_quantity, csl.last_transaction_date
FROM current_stock_levels csl
JOIN item_masters im ON csl.item_master_id = im.id  
WHERE im.nomenclature LIKE '%Dell XPS 13%';
-- Result: "7 units in stock | 7 available | Oct 9, 2025"
```

---

## 🎊 **COMPLETE TRANSPARENCY ACHIEVED**

### **✅ Every Question Can Be Answered:**

| **Question** | **Database Query Result** |
|--------------|---------------------------|
| Who requested this laptop? | IT Department Head via REQ-2025-001 |
| Why was it purchased? | New employee onboarding |
| How was vendor selected? | Public tender TEND-2025-001, Dell won with 93.2/100 score |
| How much did it cost? | Rs. 2,800 per unit (total Rs. 84,000 for 30 units) |
| When was it delivered? | October 8, 2025 |
| Who received it? | Store Staff verified and accepted |
| Where is it now? | With IT Department staff member |
| What's the warranty? | 3 years from Dell Pakistan |
| How many are left? | 7 units remaining in store |
| What was the savings? | Rs. 6,000 saved vs highest bid (Rs. 88,500 - Rs. 82,500) |

### **🔒 Complete Audit Trail:**
- **Every step documented** with date, time, and responsible person
- **Every rupee accounted** from request to delivery  
- **Every item traced** from procurement to final location
- **Every decision justified** with evaluation scores and criteria
- **Every process transparent** with public tender and fair competition

**This is how modern, transparent, and accountable procurement works!** 🏆
