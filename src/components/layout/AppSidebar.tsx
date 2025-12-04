import React from 'react';
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
      { title: "Admin Dashboard", icon: BarChart3, path: "/dashboard/admin-dashboard", permission: 'admin.super' },
      { title: "Roles & Permissions", icon: Shield, path: "/dashboard/roles", permission: 'roles.manage' },
      { title: "User Management", icon: Users, path: "/dashboard/user-role-assignment", permission: 'users.assign_roles' },
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

    // Show issuance menu if user has issuance permissions
    if (canProcessIssuance || (canRequestIssuance && canProcessIssuance)) {
      const visibleIssuanceItems = issuanceMenuGroup.items.filter(item => checkPermission(item.permission));
      if (visibleIssuanceItems.length > 0) {
        groups.push({ ...issuanceMenuGroup, items: visibleIssuanceItems });
      }
    }

    // Show approval menu if user has approval permissions
    if (canApprove || canManageRoles) {
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

  return (
    <Sidebar
      className="!bg-teal-600 border-r border-teal-500"
      collapsible="icon"
      style={{ backgroundColor: '#0d9488' }}
    >
      <SidebarHeader className="p-4 border-b border-teal-500 bg-teal-600">
        <div className="flex items-center justify-center h-16">
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src="/ecp-logo.png"
              alt="ECP Logo"
              className={state === "collapsed"
                ? "h-8 w-8 object-contain"
                : "h-12 w-auto object-contain max-w-full"
              }
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 bg-teal-600">
        <SidebarMenu className="space-y-4">
          {menuGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = isGroupActive(group.items);

            return (
              <Collapsible key={group.label} defaultOpen={groupActive} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-teal-700 rounded transition-colors group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!justify-center">
                    <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                      <GroupIcon className="w-4 h-4 text-teal-200" />
                      <span className="text-xs font-semibold text-teal-100 uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-200 transition-transform group-data-[state=open]:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(item.path)}
                              className={`text-teal-100 hover:bg-teal-700 hover:text-white group-data-[collapsible=icon]:!justify-center transition-colors ${
                                isActive(item.path)
                                  ? 'bg-teal-700 text-white'
                                  : ''
                              }`}
                            >
                              <Link
                                to={item.path}
                                className="flex items-center gap-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center ml-2"
                              >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm group-data-[collapsible=icon]:hidden">
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
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-teal-100 hover:bg-red-600 hover:text-white cursor-pointer group-data-[collapsible=icon]:!justify-center transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm group-data-[collapsible=icon]:hidden">Logout</span>
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
