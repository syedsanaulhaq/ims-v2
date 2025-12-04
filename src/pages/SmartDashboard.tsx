import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import PersonalDashboard from './PersonalDashboard';
import WingDashboard from './WingDashboard';
import Dashboard from './Dashboard'; // System-wide dashboard
import LoadingSpinner from '@/components/common/LoadingSpinner';

/**
 * SmartDashboard - Routes users to appropriate dashboard based on their role/permissions
 * 
 * Priority:
 * 1. Super Admin / IMS Admin -> System Dashboard (full system stats)
 * 2. Wing Supervisor -> Wing Dashboard (wing-level stats)
 * 3. General User -> Personal Dashboard (personal stats only)
 */
const SmartDashboard = () => {
  const { hasPermission: canViewInventory, loading: loadingInventoryView } = usePermission('inventory.view');
  const { hasPermission: canManageInventory, loading: loadingInventoryManage } = usePermission('inventory.manage');
  const { hasPermission: canManageRoles, loading: loadingRoles } = usePermission('roles.manage');
  const { hasPermission: canViewReports, loading: loadingReports } = usePermission('reports.view');
  
  // Wait for all permission checks to complete
  const isLoading = loadingInventoryView || loadingInventoryManage || loadingRoles || loadingReports;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Super Admin / IMS Admin - has inventory management and role management permissions
  // Show full system dashboard
  if (canManageRoles || (canManageInventory && canViewReports)) {
    return <Dashboard />;
  }
  
  // Wing Supervisor - has inventory view permission
  // Show wing-level dashboard
  if (canViewInventory) {
    return <WingDashboard />;
  }
  
  // General User - default fallback
  // Show personal dashboard
  return <PersonalDashboard />;
};

export default SmartDashboard;
