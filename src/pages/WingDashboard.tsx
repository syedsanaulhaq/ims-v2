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
        
        // Fetch wing-level data - use the same endpoints as personal dashboard
        // but wing supervisors can see all requests for their wing members
        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes,
          notificationsRes
        ] = await Promise.all([
          // All stock issuance requests (not filtered, for wing overview)
          fetch(`${apiBase}/stock-issuance/requests`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My issued items (wing supervisor's own items)
          fetch(`${apiBase}/issued-items/user/${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My pending approvals (if wing supervisor is an approver)
          fetch(`${apiBase}/approvals/my-pending`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My notifications
          fetch(`${apiBase}/my-notifications?limit=10`, { credentials: 'include' })
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

    if (user?.user_id) {
      fetchWingData();
    }
  }, [user?.user_id]);

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
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Wing Dashboard</h1>
            <p className="text-teal-100">Manage and monitor wing-level stock operations and inventory</p>
          </div>
          <Building2 className="h-16 w-16 opacity-20" />
        </div>
        <div className="flex items-center gap-4 mt-6">
          <Badge className="bg-teal-500 hover:bg-teal-600 text-white">
            <CheckCircle className="h-3 w-3 mr-2" />
            System Active
          </Badge>
          <Badge variant="outline" className="bg-white/10 text-white border-white/20">
            <Clock className="h-3 w-3 mr-2" />
            Updated {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-blue-500 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRequests}</p>
              </div>
              <ClipboardList className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-yellow-500 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingRequests}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-green-500 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approvedRequests}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-purple-500 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">In Stock</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.itemsInWing}</p>
              </div>
              <Package className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-red-500 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">For Review</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApprovals}</p>
              </div>
              <Bell className="h-12 w-12 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wing Stock Requests */}
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-xl text-gray-900">Stock Requests</CardTitle>
                  <CardDescription className="text-gray-600 text-sm">Recent requests from wing members</CardDescription>
                </div>
              </div>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => navigate('/stock-issuance')}>
                <Send className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {wingRequests.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium">No stock requests yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {wingRequests.slice(0, 8).map((request, idx) => (
                  <div key={request.request_id || request.id || idx} className="p-4 hover:bg-gray-50 transition-colors border-l-4 border-l-transparent hover:border-l-teal-500">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{request.justification || request.item_name || 'Stock Request'}</h4>
                      <Badge 
                        className={
                          (request.request_status || '').toLowerCase() === 'approved' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : (request.request_status || '').toLowerCase() === 'rejected'
                            ? 'bg-red-100 text-red-800 hover:bg-red-100'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                        }
                      >
                        {request.request_status || 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      📅 {formatDateDMY(request.created_at)} • {request.purpose || 'No description'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="border-b border-orange-200 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                <Undo2 className="h-5 w-5" />
                Need Your Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {stats.pendingApprovals === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-gray-700 font-medium">All caught up!</p>
                  <p className="text-sm text-gray-600 mt-1">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-4xl font-bold text-orange-600">{stats.pendingApprovals}</p>
                    <p className="text-sm text-gray-600 mt-1">Awaiting your decision</p>
                  </div>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/approval-management')}>
                    Review Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {wingNotifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No notifications at this time</p>
              ) : (
                <div className="space-y-3">
                  {wingNotifications.slice(0, 5).map((notif, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Bell className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 font-medium">{notif.message}</p>
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

      {/* Items in Wing Inventory */}
      {wingIssuedItems.length > 0 && (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-xl text-gray-900">Wing Inventory</CardTitle>
                  <CardDescription className="text-gray-600 text-sm">Items currently in wing possession</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => navigate('/wing-inventory')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {wingIssuedItems.slice(0, 8).map((item, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.item_name || item.description}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.category || 'Uncategorized'}</p>
                  </div>
                  <Badge variant="outline" className="ml-4 font-semibold text-purple-700 border-purple-300">
                    {item.quantity || 0} units
                  </Badge>
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
