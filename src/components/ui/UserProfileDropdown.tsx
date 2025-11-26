import React, { useState } from 'react';
import { User, LogOut, Settings, Shield, Mail, MapPin, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      // No need to navigate - logout will redirect to DS login automatically
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: redirect to DS login even if logout API fails
      window.location.href = import.meta.env.VITE_DS_LOGIN_URL || 'http://172.20.150.34/Account/Login';
    }
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approver':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-50">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.FullName}</p>
            <p className="text-xs text-gray-500">{user.Role} (IMS)</p>
          </div>
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
            <span className="text-white font-medium text-sm">
              {user.FullName?.charAt(0) || 'U'}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-72" align="end">
        {/* User Info Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.FullName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.FullName}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user.UserName}
              </p>
              <Badge 
                variant="secondary" 
                className={`mt-1 text-xs ${getRoleBadgeColor(user.Role)}`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {user.Role}
              </Badge>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="p-3 space-y-2 border-b">
          {user.Email && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.Email}</span>
            </div>
          )}
          
          {(user.officeName || user.wingName) && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {[user.officeName, user.wingName].filter(Boolean).join(' - ')}
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>Active Session</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem
            onClick={() => handleMenuItemClick('/dashboard')}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Dashboard Settings
          </DropdownMenuItem>

          {(user.Role === 'Admin' || user.Role === 'Manager') && (
            <DropdownMenuItem
              onClick={() => handleMenuItemClick('/admin-settings')}
              className="cursor-pointer"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Settings
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
