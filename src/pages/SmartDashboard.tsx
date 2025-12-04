import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import PersonalDashboard from './PersonalDashboard';
import WingDashboard from './WingDashboard';
import Dashboard from './Dashboard'; // System-wide dashboard

/**
 * SmartDashboard - Routes users to appropriate dashboard based on their role/permissions
 * 
 * Priority:
 * 1. Super Admin / IMS Admin -> System Dashboard (full system stats)
 * 2. Wing Supervisor -> Wing Dashboard (wing-level stats)
 * 3. General User -> Personal Dashboard (personal stats only)
 */
const SmartDashboard = () => {
  const { hasPermission: canViewInventory } = usePermission('inventory.view');
  const { hasPermission: canManageInventory } = usePermission('inventory.manage');
  const { hasPermission: canManageRoles } = usePermission('roles.manage');
  const { hasPermission: canViewReports } = usePermission('reports.view');
  
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
