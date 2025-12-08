import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  Boxes,
  ArrowRightLeft,
  Building2,
  BarChart3,
  ChevronRight,
  Database,
  FileText,
  PieChart,
  TrendingUp,
  ClipboardList,
  FolderOpen,
  Gavel,
  Eye,
  Plus,
  PackageOpen,
  Warehouse,
  Send,
  Undo2,
  CheckCircle,
  Users,
  Settings,
  ArrowRight,
  Shield,
  LogOut,
  User,
  AlertTriangle,
  ShoppingCart
} from "lucide-react";
import { usePermission } from '@/hooks/usePermission';
import { useSession } from '@/contexts/SessionContext';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  permission?: string;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
}

interface AppSidebarProps {
  limitedMenu?: boolean;
}

const AppSidebar = ({ limitedMenu = false }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user } = useSession();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  
  // Debug: Log user permissions
  useEffect(() => {
    console.log('👤 AppSidebar - User data:', {
      user_id: user?.user_id,
      user_name: user?.user_name,
      ims_permissions: user?.ims_permissions?.length || 0,
      ims_roles: user?.ims_roles?.length || 0,
      is_super_admin: user?.is_super_admin,
      wing_id: user?.wing_id,
    });
  }, [user]);
  
  // Permission hooks
  const { hasPermission: canManageRoles } = usePermission('roles.manage');
  const { hasPermission: canAssignRoles } = usePermission('users.assign_roles');
  const { hasPermission: canViewInventory } = usePermission('inventory.view');
  const { hasPermission: canManageInventory } = usePermission('inventory.manage');
  const { hasPermission: canViewProcurement } = usePermission('procurement.view');
  const { hasPermission: canManageProcurement } = usePermission('procurement.manage');
  const { hasPermission: canRequestIssuance } = usePermission('issuance.request');
  const { hasPermission: canProcessIssuance } = usePermission('issuance.process');
  const { hasPermission: canApprove } = usePermission('approval.approve');
  const { hasPermission: canViewReports } = usePermission('reports.view');
  const { hasPermission: isWingSupervisor } = usePermission('wing.supervisor');
  const { hasPermission: isSuperAdmin } = usePermission('admin.super');

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  // PERSONAL MENU - For all individual users
  const personalMenuGroup: MenuGroup = {
    label: "Personal Menu",
    icon: User,
    items: [
      { title: "My Dashboard", icon: Home, path: "/personal-dashboard", permission: undefined },
      { title: "My Requests", icon: ClipboardList, path: "/dashboard/my-requests", permission: 'issuance.request' },
      { title: "My Issued Items", icon: Package, path: "/dashboard/my-issued-items", permission: 'issuance.request' },
      { title: "Request Item", icon: Send, path: "/dashboard/stock-issuance-personal", permission: 'issuance.request' },
      { title: "Return Item", icon: Undo2, path: "/dashboard/stock-return", permission: 'issuance.request' },
      { title: "My Approvals", icon: CheckCircle, path: "/dashboard/approval-dashboard", permission: 'approval.approve' },
    ]
  };

  // WING MENU - For wing supervisors
  const wingMenuGroup: MenuGroup = {
    label: "Wing Menu",
    icon: Building2,
    items: [
      { title: "Wing Dashboard", icon: BarChart3, path: "/dashboard/wing-dashboard", permission: 'wing.supervisor' },
      { title: "Wing Requests", icon: ClipboardList, path: "/dashboard/wing-requests", permission: 'wing.supervisor' },
      { title: "Wing Inventory", icon: Warehouse, path: "/dashboard/wing-inventory", permission: 'wing.supervisor' },
      { title: "Wing Members", icon: Users, path: "/dashboard/wing-members", permission: 'wing.supervisor' },
    ]
  };

  // INVENTORY MENU - For inventory managers
  const inventoryMenuGroup: MenuGroup = {
    label: "Inventory Menu",
    icon: Package,
    items: [
      { title: "Inventory Dashboard", icon: BarChart3, path: "/dashboard/inventory-dashboard", permission: 'inventory.view' },
      { title: "Item Master", icon: Package, path: "/dashboard/item-master", permission: 'inventory.manage' },
      { title: "Categories", icon: Boxes, path: "/dashboard/categories", permission: 'inventory.manage' },
      { title: "Sub-Categories", icon: Boxes, path: "/dashboard/sub-categories", permission: 'inventory.manage' },
      { title: "Stock Quantities", icon: BarChart3, path: "/dashboard/inventory-stock-quantities", permission: 'inventory.view' },
      { title: "Stock Alerts", icon: AlertTriangle, path: "/dashboard/inventory-alerts", permission: 'inventory.view' },
      { title: "Pending Verifications", icon: Eye, path: "/dashboard/pending-verifications", permission: 'inventory.manage' },
    ]
  };

  // PROCUREMENT MENU - For procurement managers
  const procurementMenuGroup: MenuGroup = {
    label: "Procurement Menu",
    icon: Building2,
    items: [
      { title: "Contract/Tender", icon: FileText, path: "/dashboard/contract-tender", permission: 'procurement.manage' },
      { title: "Spot Purchase", icon: ShoppingCart, path: "/dashboard/spot-purchases", permission: 'procurement.manage' },
      { title: "Stock Acquisition", icon: Warehouse, path: "/dashboard/stock-acquisition-dashboard", permission: 'procurement.view' },
      { title: "Vendor Management", icon: Building2, path: "/dashboard/vendors", permission: 'procurement.manage' },
    ]
  };

  // ISSUANCE MENU - For issuance processors
  const issuanceMenuGroup: MenuGroup = {
    label: "Stock Issuance Menu",
    icon: Warehouse,
    items: [
      { title: "Issuance Dashboard", icon: BarChart3, path: "/dashboard/stock-issuance-dashboard", permission: 'issuance.view' },
      { title: "Process Issuance", icon: ArrowRightLeft, path: "/dashboard/stock-issuance-processing", permission: 'issuance.process' },
      { title: "Historical Issuances", icon: FileText, path: "/dashboard/issuances", permission: 'issuance.view' },
      { title: "Stock Transactions", icon: ArrowRightLeft, path: "/dashboard/stock-transactions", permission: 'issuance.view' },
    ]
  };

  // APPROVAL MENU - For approvers
  const approvalMenuGroup: MenuGroup = {
    label: "Approval Menu",
    icon: CheckCircle,
    items: [
      { title: "My Pending Approvals", icon: CheckCircle, path: "/dashboard/approval-dashboard", permission: 'approval.approve' },
      { title: "Request History", icon: FileText, path: "/dashboard/request-history", permission: 'approval.approve' },
      { title: "Workflow Config", icon: Settings, path: "/dashboard/workflow-admin", permission: 'roles.manage' },
    ]
  };

  // ADMIN MENU - For super admins
  const adminMenuGroup: MenuGroup = {
    label: "Super Admin Menu",
    icon: Shield,
    items: [
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard", permission: 'admin.super' },
      { title: "Roles & Permissions", icon: Shield, path: "/settings/roles", permission: 'roles.manage' },
      { title: "User Management", icon: Users, path: "/settings/users", permission: 'users.assign_roles' },
      { title: "System Settings", icon: Settings, path: "/dashboard/inventory-settings", permission: 'admin.super' },
      { title: "Reports & Analytics", icon: BarChart3, path: "/dashboard/reports", permission: 'reports.view' },
    ]
  };

  // Helper to check permission
  const checkPermission = (permissionKey?: string) => {
    if (!permissionKey) return true;
    
    switch (permissionKey) {
      case 'inventory.view': return canViewInventory;
      case 'inventory.manage': return canManageInventory;
      case 'procurement.view': return canViewProcurement;
      case 'procurement.manage': return canManageProcurement;
      case 'issuance.request': return canRequestIssuance;
      case 'issuance.process': return canProcessIssuance;
      case 'issuance.view': return canRequestIssuance || canProcessIssuance;
      case 'approval.approve': return canApprove;
      case 'roles.manage': return canManageRoles;
      case 'users.assign_roles': return canAssignRoles;
      case 'reports.view': return canViewReports;
      case 'wing.supervisor': return isWingSupervisor;
      case 'admin.super': return isSuperAdmin;
      default: return false;
    }
  };

  // Filter menu groups and items based on permissions
  const getVisibleMenuGroups = () => {
    const groups: MenuGroup[] = [];

    // Always show personal menu
    const visiblePersonalItems = personalMenuGroup.items.filter(item => checkPermission(item.permission));
    if (visiblePersonalItems.length > 0) {
      groups.push({ ...personalMenuGroup, items: visiblePersonalItems });
    }

    // Show wing menu if user is wing supervisor
    if (isWingSupervisor) {
      const visibleWingItems = wingMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleWingItems.length > 0) {
        groups.push({ ...wingMenuGroup, items: visibleWingItems });
      }
    }

    // Show inventory menu if user has inventory permissions
    if (canViewInventory || canManageInventory) {
      const visibleInventoryItems = inventoryMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleInventoryItems.length > 0) {
        groups.push({ ...inventoryMenuGroup, items: visibleInventoryItems });
      }
    }

    // Show procurement menu if user has procurement permissions
    if (canViewProcurement || canManageProcurement) {
      const visibleProcurementItems = procurementMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleProcurementItems.length > 0) {
        groups.push({ ...procurementMenuGroup, items: visibleProcurementItems });
      }
    }

    // Show issuance menu if user has issuance PROCESSING permissions
    if (canProcessIssuance) {
      const visibleIssuanceItems = issuanceMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleIssuanceItems.length > 0) {
        groups.push({ ...issuanceMenuGroup, items: visibleIssuanceItems });
      }
    }

    // Show approval menu if user has APPROVAL permissions (approvers only)
    if (canApprove) {
      const visibleApprovalItems = approvalMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleApprovalItems.length > 0) {
        groups.push({ ...approvalMenuGroup, items: visibleApprovalItems });
      }
    }

    // Show admin menu if user is super admin
    if (isSuperAdmin || canManageRoles) {
      const visibleAdminItems = adminMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleAdminItems.length > 0) {
        groups.push({ ...adminMenuGroup, items: visibleAdminItems });
      }
    }

    return groups;
  };

  const menuGroups = getVisibleMenuGroups();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isGroupActive = (items: MenuItem[]) => {
    return items.some(item => location.pathname === item.path);
  };

  // Handle accordion menu - close others when one opens
  const handleMenuGroupChange = (groupLabel: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenGroup(groupLabel);
    } else {
      setOpenGroup(null);
    }
  };

  // Open the active group on mount
  useEffect(() => {
    const menuGroups = getVisibleMenuGroups();
    const activeGroup = menuGroups.find(group => isGroupActive(group.items));
    if (activeGroup) {
      setOpenGroup(activeGroup.label);
    }
  }, [location.pathname]);

  return (
    <Sidebar
      className="!bg-teal-700 border-r border-teal-600"
      collapsible="none"
      style={{ backgroundColor: '#0d8b81' }}
    >
      <SidebarHeader className="p-4 border-b border-teal-600">
        <div className="flex items-center justify-start">
          <img
            src="/ecp-logo.png"
            alt="ECP Logo"
            className="w-auto object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0 bg-teal-700">
        <SidebarMenu className="space-y-0">
          {menuGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = isGroupActive(group.items);
            const isGroupOpen = openGroup === group.label;

            return (
              <Collapsible 
                key={group.label} 
                open={isGroupOpen}
                onOpenChange={(isOpen) => handleMenuGroupChange(group.label, isOpen)}
                className="space-y-0"
              >
                <CollapsibleTrigger asChild>
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-600 transition-colors duration-150 text-white"
                  >
                    <div className="p-2 rounded-lg bg-teal-600/50">
                      <GroupIcon className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      {group.label.replace(' Menu', '')}
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="transition-all duration-200">
                  <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-0">
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(item.path)}
                              className={`px-4 py-2.5 text-white hover:bg-teal-600 transition-colors duration-150 mx-2 ${
                                isActive(item.path)
                                  ? 'bg-teal-500/60 rounded-lg'
                                  : 'rounded-none'
                              }`}
                            >
                              <Link
                                to={item.path}
                                className="flex items-center gap-3 ml-6"
                              >
                                <span className="text-white text-lg">–</span>
                                <span className="text-sm font-normal text-white">
                                  {item.title}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </SidebarMenu>

        {/* Logout Section */}
        <SidebarGroup className="mt-auto border-t border-teal-600">
          <SidebarGroupContent className="p-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-white hover:bg-red-700 cursor-pointer transition-colors duration-150 rounded-none"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-normal">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
