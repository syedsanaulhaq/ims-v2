import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  ClipboardList,
  CheckCircle,
  Clock,
  Send,
  Undo2,
  Bell,
  TrendingUp,
  Box
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Personal data state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myIssuedItems, setMyIssuedItems] = useState<any[]>([]);
  const [myPendingApprovals, setMyPendingApprovals] = useState<any[]>([]);
  const [myNotifications, setMyNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();
        
        // Fetch user's personal data
        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes,
          notificationsRes
        ] = await Promise.all([
          // My stock issuance requests
          fetch(`${apiBase}/stock-issuance/my-requests`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My issued items (items currently in my possession)
          fetch(`${apiBase}/stock-issuance/my-issued-items`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My pending approvals (if I'm an approver)
          fetch(`${apiBase}/approvals/my-pending`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My notifications
          fetch(`${apiBase}/my-notifications?limit=10`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        ]);

        setMyRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || []));
        setMyIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setMyPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setMyNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);

      } catch (error) {
        console.error('Error fetching personal dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchPersonalData();
  }, []);

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your personal dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalRequests: myRequests.length,
    pendingRequests: myRequests.filter(r => 
      r.request_status === 'Submitted' || 
      r.request_status === 'Pending' ||
      r.ApprovalStatus === 'PENDING'
    ).length,
    approvedRequests: myRequests.filter(r => 
      r.request_status === 'Approved' ||
      r.ApprovalStatus === 'APPROVED'
    ).length,
    itemsInPossession: myIssuedItems.length,
    pendingApprovals: myPendingApprovals.length,
    unreadNotifications: myNotifications.filter(n => !n.is_read).length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.userName || 'User'}!</h1>
        <p className="text-teal-100">Here's what's happening with your inventory activities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/my-requests')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingRequests} pending
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/my-issued-items')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items in Possession</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.itemsInPossession}</div>
            <p className="text-xs text-muted-foreground">
              Currently issued to you
            </p>
          </CardContent>
        </Card>

        {stats.pendingApprovals > 0 && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/approval-dashboard')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your action
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/notifications')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myNotifications.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unreadNotifications} unread
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard/stock-issuance-personal')}
            >
              <Send className="h-8 w-8 text-teal-600" />
              <span className="text-sm">Request Item</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard/stock-return')}
            >
              <Undo2 className="h-8 w-8 text-orange-600" />
              <span className="text-sm">Return Item</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard/my-requests')}
            >
              <ClipboardList className="h-8 w-8 text-blue-600" />
              <span className="text-sm">View Requests</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard/my-issued-items')}
            >
              <Box className="h-8 w-8 text-purple-600" />
              <span className="text-sm">My Items</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Your latest stock issuance requests</CardDescription>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No requests yet. Start by requesting an item!</p>
          ) : (
            <div className="space-y-4">
              {myRequests.slice(0, 5).map((request) => (
                <div key={request.request_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.item_name || 'Item Request'}</h4>
                    <p className="text-sm text-gray-500">
                      Quantity: {request.requested_quantity} | 
                      Date: {formatDateDMY(request.request_date || request.created_at)}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      request.request_status === 'Approved' || request.ApprovalStatus === 'APPROVED' 
                        ? 'default' 
                        : request.request_status === 'Rejected' || request.ApprovalStatus === 'REJECTED'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {request.request_status || request.ApprovalStatus || 'Pending'}
                  </Badge>
                </div>
              ))}
              {myRequests.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/my-requests')}>
                  View All Requests
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Currently in Possession */}
      {myIssuedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items in Your Possession</CardTitle>
            <CardDescription>Items currently issued to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myIssuedItems.slice(0, 5).map((item) => (
                <div key={item.issuance_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.item_name}</h4>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.issued_quantity} | 
                      Issued: {formatDateDMY(item.issue_date)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/dashboard/stock-return')}
                  >
                    Return
                  </Button>
                </div>
              ))}
              {myIssuedItems.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/my-issued-items')}>
                  View All Items
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {myNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>Latest updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myNotifications.slice(0, 5).map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border rounded-lg ${!notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                >
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateDMY(notification.created_at)}</p>
                </div>
              ))}
              {myNotifications.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/notifications')}>
                  View All Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonalDashboard;
