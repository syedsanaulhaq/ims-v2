# Git Commit Plan - Hierarchical Inventory System Deployment

## Overview
This document outlines the git commits for the complete hierarchical inventory system and wing dashboard enhancements deployed December 2025.

---

## Commit 1: Database Schema - Hierarchical Inventory System

**Hash**: TBD  
**Branch**: stable-nov11-production  
**Date**: December 13, 2025

```
feat: Add hierarchical inventory management system schema

BREAKING CHANGE: Introduces location-aware inventory tracking

- New tables:
  • inventory_locations: Defines storage locations (Admin vs Wing-specific)
  • inventory_stock: Per-location quantity tracking with available_quantity computed column
  • request_inventory_source: Maps requests to their deduction location
  • stock_transfer_log: Immutable audit trail of all inventory movements

- New stored procedures:
  • sp_InitializeInventoryLocations: Creates Admin + Wing locations automatically
  • sp_DeductWithHierarchy: Location-aware deduction logic based on @WingId parameter

- Features:
  • Wing-level inventory separate from admin central warehouse
  • Automatic forwarding capability (wing → admin)
  • Complete audit trail of all inventory movements
  • Computed available_quantity (quantity - reserved_quantity)
  • Indexes on critical query paths

- Database changes:
  • 4 new tables with proper constraints and FK relationships
  • 2 new stored procedures with transaction support
  • Automatic initialization of locations via sp_InitializeInventoryLocations

- Migration:
  • Execute: setup-hierarchical-inventory-system.sql
  • Verification: SELECT * FROM inventory_locations; (should show Admin + Wing locations)

Files:
  - setup-hierarchical-inventory-system.sql (450 lines)

Related issues: #IMS-2025-WING-INVENTORY
```

---

## Commit 2: Database Schema - Wing Dashboard Enhancements

**Hash**: TBD  
**Branch**: stable-nov11-production  
**Date**: December 13, 2025

```
feat: Add inventory verification workflow for wing dashboard

- New tables:
  • inventory_verification_requests: Tracks verification workflow for wing supervisors

- New views:
  • View_Pending_Inventory_Verifications: Dashboard view for verification requests

- Features:
  • Wing supervisors can request inventory verification
  • Inventory supervisors can verify physical count
  • Tracks verification status and notes
  • Links to original stock issuance requests
  • Complete audit trail of verification process

- Database changes:
  • 1 new table with proper constraints and indexes
  • 1 new view with comprehensive data including item details

- Migration:
  • Execute: DEPLOY-DB-CHANGES.sql
  • Verification: SELECT * FROM inventory_verification_requests; (should be empty initially)

Files:
  - DEPLOY-DB-CHANGES.sql (200 lines)

Related issues: #IMS-2025-WING-DASHBOARD
```

---

## Commit 3: Backend API - Hierarchical Inventory Endpoints

**Hash**: TBD  
**Branch**: stable-nov11-production  
**Date**: December 13, 2025

```
feat: Add hierarchical inventory management API endpoints

- New endpoints (8 total):
  • GET  /api/hierarchical-inventory/locations
  • GET  /api/hierarchical-inventory/stock/:itemId
  • GET  /api/hierarchical-inventory/wing-stock/:wingId
  • GET  /api/hierarchical-inventory/admin-stock
  • POST /api/hierarchical-inventory/deduct-hierarchical
  • POST /api/hierarchical-inventory/forward-request
  • GET  /api/hierarchical-inventory/request-source/:requestId
  • GET  /api/hierarchical-inventory/transfer-log/:itemId

- Features:
  • Location-aware deduction (determines wing vs admin based on wingId parameter)
  • Forwarding support (wing → admin when insufficient stock)
  • Complete error handling and validation
  • Transaction-based operations with rollback support
  • Comprehensive debug logging for troubleshooting
  • Audit trail integration (automatic stock_transfer_log entries)

- Implementation details:
  • All endpoints use parameterized queries (SQL injection safe)
  • Database transactions ensure data consistency
  • Detailed error messages for debugging
  • Console logging at each step for monitoring
  • Returns location and quantity info in responses

- Testing:
  • All endpoints ready for curl/Postman testing
  • Sample request/response bodies documented
  • Error scenarios documented

Files:
  - HIERARCHICAL-INVENTORY-ENDPOINTS.cjs (650+ lines)

Related issues: #IMS-2025-HIERARCHICAL-API
```

---

## Commit 4: Backend Integration - Approval Workflow Updates

**Hash**: TBD  
**Branch**: stable-nov11-production  
**Date**: December 13, 2025

```
feat: Integrate hierarchical inventory with approval workflow

BREAKING CHANGE: Approval endpoints now use location-aware deduction

- New helper functions:
  • approveWingRequest(): Wing supervisor approves, deducts from wing
  • approveAdminRequest(): Admin approves, deducts from admin
  • forwardRequestToAdmin(): Forward wing request to admin
  • smartApprovalWorkflow(): Auto-decides based on availability

- New endpoints:
  • POST /api/approval/wing-approve
  • POST /api/approval/admin-approve
  • POST /api/approval/forward-to-admin
  • POST /api/approval/smart-workflow

- Features:
  • Wing requests automatically deduct from wing inventory
  • Admin requests deduct from admin central warehouse
  • Automatic forwarding when wing lacks stock
  • Smart workflow auto-detects availability
  • Tracks approval location and source

- Updated logic:
  • approveAndAllocate() now calls /api/hierarchical-inventory/deduct-hierarchical
  • Passes wingId to determine deduction location
  • Handles insufficient stock with forwarding option
  • Updates request status with location info

- Error handling:
  • Graceful handling when wing inventory insufficient
  • Detailed error messages for debugging
  • Transaction rollback on any error

Files:
  - backend-server.cjs (modified approval endpoints)
  - APPROVAL-WORKFLOW-HIERARCHICAL-INTEGRATION.cjs (reference implementation)

Related issues: #IMS-2025-APPROVAL-INTEGRATION
```

---

## Commit 5: Documentation - Complete System Guide

**Hash**: TBD  
**Branch**: stable-nov11-production  
**Date**: December 13, 2025

```
docs: Add comprehensive hierarchical inventory system documentation

- New documentation files:
  • HIERARCHICAL-INVENTORY-GUIDE.md: Complete technical reference
  • HIERARCHICAL-INVENTORY-INTEGRATION.md: Step-by-step integration guide
  • COMPLETE-SYSTEM-DEPLOYMENT.md: End-to-end deployment checklist
  • APPROVAL-WORKFLOW-HIERARCHICAL-INTEGRATION.cjs: Code examples

- Documentation content:
  • Database schema explanation (4 tables + 2 procedures)
  • API endpoint reference with examples
  • Workflow scenarios (wing, admin, forwarding)
  • Integration checklist
  • Testing procedures
  • Troubleshooting guide
  • Performance considerations
  • Audit trail documentation
  • Rollback procedures

- Covers:
  • What: System architecture and design
  • How: Integration steps and code examples
  • Why: Business logic and workflow decisions
  • Testing: All test scenarios with expected results
  • Troubleshooting: Common issues and solutions
  • Monitoring: How to watch system post-deployment

Files:
  - HIERARCHICAL-INVENTORY-GUIDE.md (500+ lines)
  - HIERARCHICAL-INVENTORY-INTEGRATION.md (300+ lines)
  - COMPLETE-SYSTEM-DEPLOYMENT.md (400+ lines)
  - APPROVAL-WORKFLOW-HIERARCHICAL-INTEGRATION.cjs (150+ lines, examples)

Related issues: #IMS-2025-DOCUMENTATION
```

---

## Summary Table

| Commit | Type | File(s) | Size | Status |
|--------|------|---------|------|--------|
| 1 | feat-db | setup-hierarchical-inventory-system.sql | 450 L | ✅ Ready |
| 2 | feat-db | DEPLOY-DB-CHANGES.sql | 200 L | ✅ Ready |
| 3 | feat-api | HIERARCHICAL-INVENTORY-ENDPOINTS.cjs | 650+ L | ✅ Ready |
| 4 | feat-backend | backend-server.cjs (modified) | ~100 L | 📋 Template |
| 5 | docs | Multiple markdown + examples | 1500+ L | ✅ Ready |

---

## Deployment Sequence

1. **Code Review**: Review all 5 commits
2. **Database Backup**: Backup SQL Server database
3. **Deploy Commit 1**: Run setup-hierarchical-inventory-system.sql
4. **Deploy Commit 2**: Run DEPLOY-DB-CHANGES.sql
5. **Deploy Commit 3**: Add endpoints to backend-server.cjs (from HIERARCHICAL-INVENTORY-ENDPOINTS.cjs)
6. **Deploy Commit 4**: Update approval endpoints (see APPROVAL-WORKFLOW-HIERARCHICAL-INTEGRATION.cjs)
7. **Deploy Commit 5**: Documentation already in repo
8. **Test**: Run all test scenarios
9. **Push**: Push all commits to stable-nov11-production

---

## Git Commands

### View all pending changes
```bash
cd /path/to/repo
git status
```

### Stage all files
```bash
git add -A
```

### Commit with detailed message
```bash
git commit -m "feat: Add hierarchical inventory system

- New tables: inventory_locations, inventory_stock, request_inventory_source, stock_transfer_log
- New procedures: sp_InitializeInventoryLocations, sp_DeductWithHierarchy
- 8 new API endpoints for location-aware deduction and forwarding
- Complete documentation and integration guide

Files:
- setup-hierarchical-inventory-system.sql
- DEPLOY-DB-CHANGES.sql
- HIERARCHICAL-INVENTORY-ENDPOINTS.cjs
- backend-server.cjs (updated approval workflow)
- Documentation files
"
```

### Push to remote
```bash
git push origin stable-nov11-production
```

### View commit history
```bash
git log --oneline -10
```

---

## Rollback Plan

If issues occur after deployment:

### Rollback Commit 5 (Docs only)
```bash
git revert <commit-hash>
```

### Rollback Commit 4 (Backend)
```bash
git revert <commit-hash>
# Restore old approval endpoints from previous commit
git checkout HEAD~1 -- backend-server.cjs
```

### Rollback Commits 1-3 (Database & API)
```bash
# Rollback and restore schema to previous state
git revert <commit-hash>
# Manual SQL rollback: DROP new tables, DROP new procedures
```

---

## Post-Deployment Verification

After all commits deployed:

1. ✅ Run: `SELECT COUNT(*) FROM inventory_locations;` (should be > 1)
2. ✅ Run: `SELECT * FROM View_Pending_Inventory_Verifications;` (should execute)
3. ✅ Test: `curl http://localhost:3000/api/hierarchical-inventory/locations`
4. ✅ Test: Wing approval workflow
5. ✅ Test: Admin approval workflow
6. ✅ Test: Forwarding workflow
7. ✅ Check: `SELECT COUNT(*) FROM stock_transfer_log;` (should have entries)
8. ✅ Monitor: Backend console for 24 hours

---

## Files in This Commit Plan

| File | Commits Involved | Status |
|------|------------------|--------|
| setup-hierarchical-inventory-system.sql | 1 | ✅ Created |
| DEPLOY-DB-CHANGES.sql | 2 | ✅ Exists |
| HIERARCHICAL-INVENTORY-ENDPOINTS.cjs | 3 | ✅ Created |
| backend-server.cjs | 4 | 🔄 Template provided |
| HIERARCHICAL-INVENTORY-GUIDE.md | 5 | ✅ Created |
| HIERARCHICAL-INVENTORY-INTEGRATION.md | 5 | ✅ Created |
| COMPLETE-SYSTEM-DEPLOYMENT.md | 5 | ✅ Created |
| APPROVAL-WORKFLOW-HIERARCHICAL-INTEGRATION.cjs | 5 | ✅ Created |

---

## Timeline

- **Creation**: December 13, 2025
- **Testing**: December 13-14, 2025 (dev environment)
- **Staging**: December 15-16, 2025 (staging environment)
- **Production**: December 17, 2025 (production deployment)
- **Monitoring**: December 17-19, 2025 (post-deployment monitoring)

---

## Sign-off

- [ ] Code review completed
- [ ] Database backup created
- [ ] Test scenarios passed
- [ ] Documentation reviewed
- [ ] Ready for production deployment

---

**Status**: 🟢 Ready for deployment
