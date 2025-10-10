# Approval System Setup Guide

## 🚀 Step-by-Step Guide to Using the Approval Forwarding System

### **Current Status:**
✅ Database schema deployed  
✅ Backend API running (localhost:3001)  
✅ Frontend components ready  
✅ Sample workflow created  
✅ Sample approvers added  

---

## **Step 1: Access Admin Setup** 
Go to: `http://localhost:8080/workflow-admin`

**What you'll do:**
- View existing workflows
- Add more approvers if needed
- Set permissions (who can finalize)

---

## **Step 2: Submit a Stock Request**
Go to: `http://localhost:8080/stock-issuance`

**What happens:**
- Fill out stock issuance form
- Click "Submit Request" 
- System automatically submits to approval workflow
- First approver gets notified

---

## **Step 3: Approver Actions**
Go to: `http://localhost:8080/approval-dashboard`

**Available Actions:**
- **Forward** → Send to another approver
- **Approve** → Approve and keep in system
- **Reject** → Send back to submitter with reason
- **Finalize** → Complete the approval (only authorized users)

---

## **Step 4: Check Status**
Go to: `http://localhost:8080/approval-manager`

**What you'll see:**
- Your pending approvals
- Approval history
- Request status

---

## **🎯 Current Workflow Setup:**

**Stock Issuance Workflow:**
- Workflow ID: `D806EC95-FB78-4187-8FC2-87B897C124A4`
- Request Type: `stock_issuance`
- Approvers: 2 users from AspNetUsers

**Sample Approvers:**
1. **Asif Ali Yasin** (DEC1) - Can finalize ✅
2. **Abdullah Shah** (DEC1) - Can approve/forward

---

## **🔄 Demo Flow:**

1. **You (Admin)** → Submit stock request
2. **System** → Assigns to first approver  
3. **First Approver** → Forwards to second approver
4. **Second Approver** → Finalizes the request
5. **System** → Request ready for processing

---

## **🌐 URLs to Test:**

- **Stock Issuance**: http://localhost:8080/stock-issuance
- **Approval Dashboard**: http://localhost:8080/approval-dashboard  
- **Workflow Admin**: http://localhost:8080/workflow-admin
- **Approval Manager**: http://localhost:8080/approval-manager

---

## **🔧 Backend API Status:**

All endpoints working on `localhost:3001`:
- ✅ `/api/approval-workflows` - List workflows
- ✅ `/api/aspnet-users/active` - Get users
- ✅ `/api/approvals/my-pending` - Get pending approvals
- ✅ `/api/approvals/submit` - Submit for approval

---

## **🎯 What to Test Next:**

1. **Submit a stock request** and watch it appear in approval dashboard
2. **Forward between approvers** to test flexible forwarding
3. **Reject a request** to test return-to-submitter flow
4. **Finalize a request** to complete the approval cycle

**Ready to test the complete approval workflow!** 🚀