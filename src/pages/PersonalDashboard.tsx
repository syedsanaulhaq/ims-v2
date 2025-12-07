import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY, formatDateTimeDMY } from '@/utils/dateUtils';
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
  Box
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Personal data state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myIssuedItems, setMyIssuedItems] = useState<any[]>([]);
  const [myPendingApprovals, setMyPendingApprovals] = useState<any[]>([]);
  const [myNotifications, setMyNotifications] = useState<any[]>([]);
  const [searchRequestsFilter, setSearchRequestsFilter] = useState('');

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
          fetch(`${apiBase}/my-requests`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My issued items (items currently in my possession)
          fetch(`${apiBase}/issued-items/user/${user?.user_id}`, { credentials: 'include' })
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

        console.log('Personal Dashboard Data:', {
          requests: requestsRes,
          issuedItems: issuedItemsRes,
          approvals: approvalsRes,
          notifications: notificationsRes
        });

        setMyRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.requests || requestsRes?.data || []));
        setMyIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setMyPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setMyNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);

      } catch (error) {
        console.error('Error fetching personal dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user?.user_id) {
      fetchPersonalData();
    }
  }, [user?.user_id]);

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
    pendingRequests: myRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'submitted' || status === 'pending' || status === 'under_review';
    }).length,
    approvedRequests: myRequests.filter(r => {
      const status = (r.request_status || r.current_status || '').toLowerCase();
      return status === 'approved' || status === 'completed';
    }).length,
    itemsInPossession: myIssuedItems.length,
    pendingApprovals: myPendingApprovals.length,
    unreadNotifications: myNotifications.filter(n => !n.is_read).length
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Personal Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">
          Welcome back, {user?.userName || 'User'}! Here's your inventory activity overview
        </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500" onClick={() => navigate('/dashboard/my-requests')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="h-5 w-5" />
              My Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-orange-600">{stats.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pending</span>
                <span className="font-semibold text-orange-500">{stats.pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Approved</span>
                <span className="font-semibold text-green-600">{stats.approvedRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500" onClick={() => navigate('/dashboard/my-issued-items')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Items in Possession
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-blue-600">{stats.itemsInPossession}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Currently issued to you
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500" onClick={() => navigate('/dashboard/approval-dashboard')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <CheckCircle className="h-5 w-5" />
              My Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-2xl font-bold text-purple-600">{stats.pendingApprovals}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.pendingApprovals > 0 ? 'Awaiting your action' : 'No pending approvals'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-l-teal-500" onClick={() => navigate('/notifications')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-teal-600">{myNotifications.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Unread</span>
                <span className="font-semibold text-teal-500">{stats.unreadNotifications}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-28 flex flex-col items-center justify-center space-y-3 hover:bg-teal-50 hover:border-teal-500 transition-all"
              onClick={() => navigate('/dashboard/stock-issuance-personal')}
            >
              <Send className="h-10 w-10 text-teal-600" />
              <span className="text-sm font-semibold">Request Item</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-28 flex flex-col items-center justify-center space-y-3 hover:bg-orange-50 hover:border-orange-500 transition-all"
              onClick={() => navigate('/dashboard/stock-return')}
            >
              <Undo2 className="h-10 w-10 text-orange-600" />
              <span className="text-sm font-semibold">Return Item</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-28 flex flex-col items-center justify-center space-y-3 hover:bg-blue-50 hover:border-blue-500 transition-all"
              onClick={() => navigate('/dashboard/my-requests')}
            >
              <ClipboardList className="h-10 w-10 text-blue-600" />
              <span className="text-sm font-semibold">View Requests</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-28 flex flex-col items-center justify-center space-y-3 hover:bg-purple-50 hover:border-purple-500 transition-all"
              onClick={() => navigate('/dashboard/my-issued-items')}
            >
              <Box className="h-10 w-10 text-purple-600" />
              <span className="text-sm font-semibold">My Items</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Requests</CardTitle>
              <CardDescription>Your latest stock issuance requests</CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search requests by title, description, or item name..."
              value={searchRequestsFilter}
              onChange={(e) => setSearchRequestsFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No requests yet. Start by requesting an item!</p>
          ) : (
            <div className="space-y-4">
                {myRequests
                .filter((request) => {
                  const searchLower = searchRequestsFilter.toLowerCase();
                  const title = request.title || '';
                  const description = request.description || request.purpose || '';
                  const submittedBy = request.current_approver_name || '';
                  const itemNames = (request.items || []).map(i => i.item_name || '').join(' ');
                  
                  return (
                    title.toLowerCase().includes(searchLower) ||
                    description.toLowerCase().includes(searchLower) ||
                    submittedBy.toLowerCase().includes(searchLower) ||
                    itemNames.toLowerCase().includes(searchLower)
                  );
                })
                .slice(0, 5)
                .map((request) => (
                <div 
                  key={request.id || request.request_id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Request Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-900">{request.title || 'Stock Issuance Request'}</h4>
                      <p className="text-sm text-gray-600 mt-1">{request.description || request.purpose || 'N/A'}</p>
                      {request.current_approver_name && (
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">Submitted by:</span> {request.current_approver_name}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={
                        request.request_status === 'Approved' || request.current_status === 'APPROVED' 
                          ? 'default' 
                          : request.request_status === 'Rejected' || request.current_status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {request.request_status || request.current_status || 'Pending'}
                    </Badge>
                  </div>

                  {/* Request Items */}
                  {request.items && request.items.length > 0 ? (
                    <div className="mb-3 bg-gray-50 rounded p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">REQUESTED ITEMS:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {request.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded px-3 py-2">
                            <div className="text-sm text-gray-700 font-medium truncate">{item.item_name || 'Unknown Item'}</div>
                            <div className="text-sm font-semibold text-blue-600 mt-1">Qty: {item.requested_quantity}</div>
                          </div>
                        ))}
                      </div>
                      {request.items.length > 3 && (
                        <p className="text-xs text-gray-500 pt-2">+{request.items.length - 3} more items</p>
                      )}
                    </div>
                  ) : null}

                  {/* Request Meta and Button */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      <span>Date: {formatDateTimeDMY(request.submitted_date || request.requested_date || request.created_date)}</span>
                      {request.total_items > 0 && <span className="ml-4">Items: {request.total_items}</span>}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/request-details/${request.id || request.request_id}`)}
                    >
                      View Details
                    </Button>
                  </div>
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
