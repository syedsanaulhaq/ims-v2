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
  LogOut
} from "lucide-react";
import { usePermission } from '@/hooks/usePermission';
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

interface AppSidebarProps {
  limitedMenu?: boolean;
}

const AppSidebar = ({ limitedMenu = false }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  
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

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear any local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      navigate('/login');
    }
  };

  const allMenuItems = [
    {
      title: "Main Dashboard",
      icon: Home,
      path: "/",
      hasSubmenu: false,
      alwaysShow: true // Always visible to all users
    },
    {
      title: "Quick Access",
      icon: TrendingUp,
      path: "/quick",
      hasSubmenu: true,
      alwaysShow: true, // Always show for general users
      submenu: [
        { title: "My Requests", path: "/dashboard/my-requests", alwaysShow: true },
        { title: "My Issued Items", path: "/dashboard/my-issued-items", alwaysShow: true },
        { title: "Request Item", path: "/dashboard/stock-issuance-personal", alwaysShow: true },
        { title: "Return Item", path: "/dashboard/stock-return", alwaysShow: true },
        { title: "Notifications", path: "/notifications", alwaysShow: true }
      ]
    },
    {
      title: "Complete Stock",
      icon: BarChart3,
      path: "/dashboard",
      hasSubmenu: false,
      showIfPermission: 'inventory.view' // Show if user can view inventory
    },
    {
      title: "Inventory Manager",
      icon: Package,
      path: "/inventory",
      hasSubmenu: true,
      showIfPermission: 'inventory.view',
      submenu: [
        { title: "Inventory Dashboard", path: "/dashboard/inventory-dashboard", permission: 'inventory.view' },
        { title: "Item Manager", path: "/dashboard/item-master", permission: 'inventory.manage' },
        { title: "Categories", path: "/dashboard/categories", permission: 'inventory.manage' },
        { title: "Sub-Categories", path: "/dashboard/sub-categories", permission: 'inventory.manage' },
      ]
    },
    {
      title: "Procurement Manager",
      icon: Building2,
      path: "/procurement",
      hasSubmenu: true,
      showIfPermission: 'procurement.view',
      submenu: [
        { title: "Contract/Tender", path: "/dashboard/contract-tender", permission: 'procurement.manage' },
        { title: "Spot Purchase", path: "/dashboard/spot-purchases", permission: 'procurement.manage' },
        { title: "Stock Acquisition", path: "/dashboard/stock-acquisition-dashboard", permission: 'procurement.view' },
        { title: "Vendor Management", path: "/dashboard/vendors", permission: 'procurement.manage' }
      ]
    },
    {
      title: "Issuance Manager",
      icon: Warehouse,
      path: "/issuance",
      hasSubmenu: true,
      showIfPermission: 'issuance.request',
      submenu: [
        { title: "Personal Request", path: "/dashboard/stock-issuance-personal", permission: 'issuance.request' },
        { title: "Wing Request", path: "/dashboard/stock-issuance-wing", permission: 'issuance.request' },
        { title: "Issuance Dashboard", path: "/dashboard/stock-issuance-dashboard", permission: 'issuance.view' },
        { title: "My Issued Items", path: "/dashboard/my-issued-items", permission: 'issuance.request' },
        { title: "IMS-Personal", path: "/dashboard/personal-inventory", permission: 'issuance.request' },
        { title: "IMS-Wing", path: "/dashboard/wing-inventory", permission: 'issuance.view' },
        { title: "Stock Returns", path: "/dashboard/stock-return", permission: 'issuance.request' },
        { title: "Issue Processing", path: "/dashboard/stock-issuance-processing", permission: 'issuance.process' },
        { title: "Historical Issuances", path: "/dashboard/issuances", permission: 'issuance.view' }
      ]
    },
    {
      title: "Approval System",
      icon: CheckCircle,
      path: "/approval",
      hasSubmenu: true,
      showIfPermission: 'approval.approve',
      submenu: [
        { title: "My Pending Approvals", path: "/dashboard/approval-dashboard", permission: 'approval.approve' },
        { title: "My Requests", path: "/dashboard/my-requests", alwaysShow: true },
        { title: "Request History", path: "/dashboard/request-history", alwaysShow: true },
        { title: "Workflow Configuration", path: "/dashboard/workflow-admin", permission: 'approval.manage' }
      ]
    },
    {
      title: "Role Management",
      icon: Shield,
      path: "/settings",
      hasSubmenu: true,
      showIfPermission: 'roles.manage',
      submenu: [
        { title: "Roles & Permissions", path: "/settings/roles", permission: 'roles.manage' },
        { title: "User Role Assignment", path: "/settings/users", permission: 'users.assign_roles' }
      ]
    },
    {
      title: "Reports & Analytics",
      icon: BarChart3,
      path: "/reports",
      hasSubmenu: true,
      showIfPermission: 'reports.view',
      submenu: [
        { title: "Overview", path: "/reports?tab=overview", permission: 'reports.view' },
        { title: "Inventory Report", path: "/reports?tab=inventory", permission: 'reports.view' },
        { title: "Transaction Report", path: "/reports?tab=transactions", permission: 'reports.view' },
        { title: "Analytics", path: "/reports?tab=analytics", permission: 'reports.view' }
      ]
    }
  ];

  // Helper function to check if user has permission
  const checkPermission = (permissionKey: string) => {
    switch (permissionKey) {
      case 'inventory.view': return canViewInventory;
      case 'inventory.manage': return canManageInventory;
      case 'procurement.view': return canViewProcurement;
      case 'procurement.manage': return canManageProcurement;
      case 'issuance.request': return canRequestIssuance;
      case 'issuance.process': return canProcessIssuance;
      case 'issuance.view': return canRequestIssuance || canProcessIssuance;
      case 'approval.approve': return canApprove;
      case 'approval.manage': return canManageRoles; // Workflow config requires role management
      case 'roles.manage': return canManageRoles;
      case 'users.assign_roles': return canAssignRoles;
      case 'reports.view': return canViewReports;
      default: return false;
    }
  };

  // Filter menu items based on limitedMenu prop and permissions
  const menuItems = limitedMenu
    ? allMenuItems.filter(item =>
        item.title === "Main Dashboard" || item.title === "Complete Stock"
      )
    : allMenuItems.filter(item => {
        // Always show items marked as alwaysShow
        if (item.alwaysShow) return true;
        
        // Check if item requires a permission
        if (item.showIfPermission) {
          const hasRequiredPermission = checkPermission(item.showIfPermission);
          
          // If parent has permission, filter submenu items
          if (hasRequiredPermission && item.submenu) {
            item.submenu = item.submenu.filter(subItem => {
              if (subItem.alwaysShow) return true;
              if (subItem.permission) {
                return checkPermission(subItem.permission);
              }
              return true;
            });
            // Only show parent if there are visible submenu items
            return item.submenu.length > 0;
          }
          
          return hasRequiredPermission;
        }
        
        return true;
      });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isParentActive = (submenu: any[]) => {
    return submenu?.some(item => location.pathname === item.path);
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                if (item.hasSubmenu) {
                  const hasActiveChild = isParentActive(item.submenu);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible defaultOpen={hasActiveChild}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`w-full justify-between text-teal-100 hover:bg-teal-700 hover:text-white data-[state=open]:bg-teal-700 data-[state=open]:text-white ${
                              hasActiveChild ? 'bg-teal-700 text-white' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-8 mt-2 group-data-[collapsible=icon]:hidden">
                            {item.submenu?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.path}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(subItem.path)}
                                  className={`text-teal-200 hover:bg-teal-700 hover:text-white ${
                                    isActive(subItem.path)
                                      ? 'bg-teal-800 text-white'
                                      : ''
                                  }`}
                                >
                                  <Link to={subItem.path}>
                                    <span className="ml-1">- {subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      className={`text-teal-100 hover:bg-teal-700 hover:text-white ${
                        isActive(item.path)
                          ? 'bg-teal-700 text-white'
                          : ''
                      }`}
                    >
                      <Link to={item.path}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-teal-100 hover:bg-red-600 hover:text-white cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">Logout</span>
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