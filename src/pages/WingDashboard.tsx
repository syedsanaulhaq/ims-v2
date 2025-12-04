import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import { 
  Package, 
  ClipboardList,
  CheckCircle,
  Clock,
  Send,
  Undo2,
  Bell,
  TrendingUp,
  Box,
  Building2
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const WingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Wing data state
  const [wingRequests, setWingRequests] = useState<any[]>([]);
  const [wingIssuedItems, setWingIssuedItems] = useState<any[]>([]);
  const [wingPendingApprovals, setWingPendingApprovals] = useState<any[]>([]);
  const [wingNotifications, setWingNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchWingData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();
        
        // Fetch wing-level data (similar to personal dashboard but for wing)
        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes,
          notificationsRes
        ] = await Promise.all([
          // Wing stock issuance requests
          fetch(`${apiBase}/wing-requests`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing issued items
          fetch(`${apiBase}/issued-items/wing/${user?.intWingID}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing pending approvals
          fetch(`${apiBase}/approvals/wing-pending`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing notifications
          fetch(`${apiBase}/wing-notifications?limit=10`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        ]);

        console.log('Wing Dashboard Data:', {
          requests: requestsRes,
          issuedItems: issuedItemsRes,
          approvals: approvalsRes,
          notifications: notificationsRes
        });

        setWingRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.requests || requestsRes?.data || []));
        setWingIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setWingPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setWingNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);

      } catch (error) {
        console.error('Error fetching wing dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user?.intWingID) {
      fetchWingData();
    }
  }, [user?.intWingID]);

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading wing dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalRequests: wingRequests.length,
    pendingRequests: wingRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'submitted' || status === 'pending' || status === 'under_review';
    }).length,
    approvedRequests: wingRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'approved' || status === 'completed';
    }).length,
    itemsInWing: wingIssuedItems.length,
    pendingApprovals: wingPendingApprovals.length,
    unreadNotifications: wingNotifications.filter(n => !n.is_read).length
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Wing Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">Manage wing-level stock requests and inventory</p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-700">
              <ClipboardList className="h-4 w-4" />
              Stock Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
            <p className="text-xs text-gray-600 mt-1">Total requests</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-yellow-700">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedRequests}</div>
            <p className="text-xs text-gray-600 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-purple-700">
              <Package className="h-4 w-4" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.itemsInWing}</div>
            <p className="text-xs text-gray-600 mt-1">In wing possession</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700">
              <Bell className="h-4 w-4" />
              Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pendingApprovals}</div>
            <p className="text-xs text-gray-600 mt-1">Need your review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wing Requests */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Wing Stock Requests</CardTitle>
                <CardDescription>Recent requests from wing members</CardDescription>
              </div>
              <Button size="sm" onClick={() => navigate('/stock-issuance')}>
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {wingRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No stock requests yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {wingRequests.slice(0, 8).map((request) => (
                  <div key={request.request_id || request.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{request.justification || request.item_name || 'Stock Request'}</h4>
                      <Badge 
                        variant={
                          (request.request_status || '').toLowerCase() === 'approved' 
                            ? 'default' 
                            : (request.request_status || '').toLowerCase() === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {request.request_status || 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDateDMY(request.created_at)} • {request.purpose || 'No description'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Pending Approvals Card */}
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <CardTitle className="text-lg">Need Your Approval</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {stats.pendingApprovals === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-gray-600">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</p>
                  <p className="text-xs text-gray-600 mb-4">Pending approvals</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/approval-management')}>
                    Review Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <CardTitle className="text-lg">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {wingNotifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
              ) : (
                <div className="space-y-3">
                  {wingNotifications.slice(0, 5).map((notif, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Bell className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-700">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateDMY(notif.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items in Wing */}
      {wingIssuedItems.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Items in Wing Possession</CardTitle>
                <CardDescription>Current inventory assigned to wing</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/wing-inventory')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {wingIssuedItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{item.item_name || item.description}</h4>
                    <Badge variant="outline">{item.quantity || 0} units</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{item.category || 'Uncategorized'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WingDashboard;
