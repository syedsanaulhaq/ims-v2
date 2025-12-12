import React from 'react';
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import UserInfo from "@/components/common/UserInfo";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import UserProfileDropdown from "@/components/ui/UserProfileDropdown";
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Bell,
  Mail,
  Moon,
  User
} from "lucide-react";

const Navbar = () => {
  const { toast } = useToast();
  const { logout } = useAuth();

  const handleBackToDS = async () => {
    try {
      // Logout from IMS to clear session
      await logout();
      // Close the IMS tab - focus will return to DS tab
      window.close();
    } catch (error) {
      console.error('Error during logout:', error);
      // Close the tab anyway
      window.close();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4">
        
        {/* Left Section - Sidebar Trigger & Title */}
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-gray-600 hover:bg-gray-100" />
          <div className="flex items-center space-x-2">
            <div className="w-2 h-6 bg-teal-600"></div>
            <h1 className="text-xl font-semibold text-gray-800">Inventory Management System</h1>
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center space-x-4">
          
          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* Messages */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Mail className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Moon className="w-5 h-5" />
          </button>

          {/* Back to DS Button */}
          <Button 
            onClick={handleBackToDS} 
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DS
          </Button>

          {/* User Profile Dropdown */}
          <UserProfileDropdown />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
