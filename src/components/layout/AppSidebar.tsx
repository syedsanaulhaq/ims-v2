
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Settings,
  ShoppingCart,
  Truck as TruckIcon,
  Users,
  SendHorizontal,
  Undo,
  CheckCircle,
  History,
  Receipt
} from "lucide-react";
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
  const { state } = useSidebar();

  const allMenuItems = [
    {
      title: "Inventory Manager",
      icon: Package,
      path: "/inventory",
      hasSubmenu: true,
      submenu: [
        { title: "Inventory Dashboard", path: "/dashboard/inventory-dashboard", icon: BarChart3 },
        { title: "Categories", path: "/dashboard/categories", icon: FolderOpen },
        { title: "Item Master", path: "/dashboard/item-master", icon: Database },
        { title: "Inventory Settings", path: "/dashboard/inventory-settings", icon: Settings }
      ]
    },
    {
      title: "Stock Manager",
      icon: Warehouse,
      path: "/stock",
      hasSubmenu: true,
      submenu: [
        { title: "Stock Dashboard", path: "/dashboard/stock-dashboard", icon: BarChart3 },
        { title: "Contract/Tender", path: "/dashboard/contract-tender", icon: FileText },
        { title: "Spot Purchase", path: "/dashboard/spot-purchases", icon: ShoppingCart },
        { title: "Stock Acquisition", path: "/dashboard/stock-acquisition", icon: TruckIcon },
        { title: "Vendors", path: "/dashboard/vendors", icon: Users },
        { title: "Item Masters", path: "/dashboard/item-masters", icon: Package }
      ]
    },
    {
      title: "Issuance Manager",
      icon: ArrowRightLeft,
      path: "/issuance",
      hasSubmenu: true,
      submenu: [
        { title: "Issuance Dashboard", path: "/dashboard/issuance-dashboard", icon: BarChart3 },
        { title: "Stock Issuance", path: "/dashboard/stock-issuance", icon: SendHorizontal },
        { title: "Stock Returns", path: "/dashboard/stock-returns", icon: Undo },
        { title: "Approval Management", path: "/dashboard/approval-management", icon: CheckCircle },
        { title: "Issue History", path: "/dashboard/issue-history", icon: History }
      ]
    },
    {
      title: "Reports & Analytics",
      icon: BarChart3,
      path: "/reports",
      hasSubmenu: true,
      submenu: [
        { title: "Reports Dashboard", path: "/dashboard/reports-dashboard", icon: BarChart3 },
        { title: "Inventory Reports", path: "/reports/inventory", icon: Package },
        { title: "Transaction Reports", path: "/reports/transactions", icon: Receipt },
        { title: "Analytics", path: "/reports/analytics", icon: TrendingUp }
      ]
    }
  ];

  // Filter menu items based on limitedMenu prop
  const menuItems = limitedMenu 
    ? allMenuItems.filter(item => 
        item.title === "Inventory Manager"
      )
    : allMenuItems;

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
                            <div className="flex items-center space-x-2">
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium text-xs whitespace-nowrap group-data-[collapsible=icon]:hidden">{item.title}</span>
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
                                    <div className="flex items-center space-x-2">
                                      {subItem.icon && <subItem.icon className="w-3 h-3 flex-shrink-0" />}
                                      <span className="text-xs whitespace-nowrap truncate">{subItem.title}</span>
                                    </div>
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
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-xs whitespace-nowrap group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
