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
  const [myVerificationRequests, setMyVerificationRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchWingData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();
        
        // Fetch wing-level data - use the same endpoints as personal dashboard
        // but wing supervisors can see all requests for their wing members
        // My notifications
          fetch(`${apiBase}/my-notifications?limit=10`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // My verification requests (inventory checks I've requested)
          fetch(`${apiBase}/inventory/my-verification-requests?userId=${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(() => ({ data: [] }))
        ]);

        console.log('Wing Dashboard Data:', {
          requests: requestsRes,
          issuedItems: issuedItemsRes,
          approvals: approvalsRes,
          notifications: notificationsRes,
          verifications: result
        });

        setWingRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.requests || requestsRes?.data || []));
        setWingIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setWingPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setWingNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);
        const [
          requestsRes,
          issuedItemsRes,
          approvalsRes,
          notificationsRes,
          verificationsRes
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
            .catch(() => []),
          
          // My verification requests (inventory checks I've requested)
          fetch(`${apiBase}/inventory/my-verification-requests?userId=${user?.user_id}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(() => ({ data: [] }))
        ]);

        console.log('Wing Dashboard Data:', {
          requests: requestsRes,
          issuedItems: issuedItemsRes,
          approvals: approvalsRes,
          notifications: notificationsRes,
          verifications: verificationsRes
        });

        setWingRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.requests || requestsRes?.data || []));
        setWingIssuedItems(Array.isArray(issuedItemsRes) ? issuedItemsRes : (issuedItemsRes?.data || []));
        setWingPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || []));
        setWingNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);
        setMyVerificationRequests(verificationsRes?.data || []);

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
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Wing Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">
          Manage wing-level stock operations and inventory
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

      {/* Quick Stats - 4 Cards in One Line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500" onClick={() => navigate('/dashboard/wing-requests')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="h-5 w-5" />
              Wing Requests
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

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500" onClick={() => navigate('/wing-inventory')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Items in Wing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-2xl font-bold text-blue-600">{stats.itemsInWing}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                In wing possession
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500" onClick={() => navigate('/approval-management')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <CheckCircle className="h-5 w-5" />
              Need Approval
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

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-l-teal-500" onClick={() => navigate('/stock-issuance')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Send className="h-5 w-5" />
              New Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full hover:bg-teal-100 transition-all mt-2">
              Create Request
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Verification Requests */}
      {myVerificationRequests && myVerificationRequests.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  My Verification Requests
                </CardTitle>
                <CardDescription>Inventory checks I've requested</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/pending-verifications')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {myVerificationRequests.map((request) => {
                const isPending = request.status === 'pending';
                const isVerified = request.status && request.status.startsWith('verified');
                const statusColor = isPending ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                   request.status === 'verified_available' ? 'bg-green-100 text-green-800 border-green-300' :
                                   request.status === 'verified_partial' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                   request.status === 'verified_unavailable' ? 'bg-red-100 text-red-800 border-red-300' :
                                   'bg-gray-100 text-gray-800 border-gray-300';

                return (
                  <div 
                    key={request.id} 
                    className="p-4 hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Reference: #{request.id}</h4>
                        <p className="text-sm text-gray-600 mt-1">Item: {request.item_nomenclature || request.item_id}</p>
                      </div>
                      <Badge variant="outline" className={statusColor}>
                        {isPending ? '⏳ Pending' : isVerified ? '✓ Verified' : request.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-semibold">Quantity Requested:</span> {request.quantity_requested || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Requested on:</span> {formatDateDMY(request.requested_at || request.created_at)}
                      </div>
                    </div>
                    {isVerified && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2 bg-indigo-50 p-2 rounded">
                        <div>
                          <span className="font-semibold">Found:</span> {request.physical_count || '-'}
                        </div>
                        <div>
                          <span className="font-semibold">Available:</span> {request.available_quantity || '-'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Wing Requests */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Wing Requests</CardTitle>
              <CardDescription>Latest stock requests from wing members</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/stock-issuance')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {wingRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-gray-600">No wing requests yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {wingRequests.slice(0, 5).map((request) => (
                <div 
                  key={request.request_id || request.id} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/request-details/${request.request_id || request.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{request.justification || request.item_name || 'Stock Request'}</h4>
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
                  <p className="text-sm text-gray-600">
                    {formatDateDMY(request.created_at)} • {request.purpose || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items in Wing */}
      {wingIssuedItems.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Items in Wing Possession</CardTitle>
                <CardDescription>Current inventory assigned to wing members</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/wing-inventory')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {wingIssuedItems.slice(0, 5).map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/item-details/${item.item_id || item.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{item.item_name || item.description}</h4>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">{item.quantity || 0} units</Badge>
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
