import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  approvalForwardingService, 
  RequestApproval 
} from '../services/approvalForwardingService';
import PerItemApprovalPanel from './PerItemApprovalPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CheckCircle, Clock, RefreshCw, Settings, Users, ChevronDown, ChevronUp } from "lucide-react";

interface RequestSummary {
  id: string;
  request_id: string;
  request_type: string;
  submitted_by_name: string;
  submitted_date: string;
  current_approver_name?: string;
  request_status: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'return' | 'reject' | 'pending';
  total_items: number;
  approved_items: number;
  rejected_items: number;
  returned_items: number;
  forwarded_items: number;
  pending_items: number;
  approval: RequestApproval;
}

const ApprovalDashboardRequestBased: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approve_wing_count: 0,
    reject_count: 0,
    forward_admin_count: 0,
    forward_supervisor_count: 0,
    return_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approve_wing' | 'reject' | 'forward_admin' | 'forward_supervisor' | 'return'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, user, activeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userId = (user as any)?.user_id || (user as any)?.Id;
      
      // Get all approvals for this user from all statuses
      const allStatuses = ['pending', 'approved', 'rejected', 'forwarded', 'returned'] as const;
      const allApprovals: RequestApproval[] = [];
      
      for (const status of allStatuses) {
        const approvals = await approvalForwardingService.getMyApprovalsByStatus(userId, status as any);
        allApprovals.push(...approvals);
      }

      // Fetch full details for each approval (which includes items)
      const requestMap = new Map<string, RequestSummary>();
      const statusCounts = {
        pending_count: 0,
        approve_wing_count: 0,
        reject_count: 0,
        forward_admin_count: 0,
        forward_supervisor_count: 0,
        return_count: 0
      };

      for (const approval of allApprovals) {
        const requestId = approval.request_id;
        
        // Skip if we already have this request
        if (requestMap.has(requestId)) {
          continue;
        }

        try {
          // Fetch full approval details including items
          const apiUrl = 'http://localhost:3001';
          const detailResponse = await fetch(`${apiUrl}/api/approvals/${approval.id}`, {
            credentials: 'include'
          });

          if (!detailResponse.ok) {
            console.warn(`Failed to fetch details for approval ${approval.id}`);
            continue;
          }

          const detailData = await detailResponse.json();
          const fullApproval = detailData.data || detailData;

          // Get request status
          const requestStatus = getRequestStatusFromApproval(approval);
          
          const summary: RequestSummary = {
            id: approval.id,
            request_id: requestId,
            request_type: approval.request_type,
            submitted_by_name: approval.submitted_by_name || approval.submitted_by || 'Unknown',
            submitted_date: approval.submitted_date,
            current_approver_name: approval.current_approver_name,
            request_status: requestStatus,
            total_items: 0,
            approved_items: 0,
            rejected_items: 0,
            returned_items: 0,
            forwarded_items: 0,
            pending_items: 0,
            approval: { ...approval, items: fullApproval.items || [] } as any
          };

          // Count items by status
          const items = fullApproval.items || [];
          summary.total_items = items.length;

          items.forEach((item: any) => {
            const itemStatus = item.decision_type || 'PENDING';
            if (itemStatus === 'APPROVE_FROM_STOCK' || itemStatus === 'APPROVE_FOR_PROCUREMENT') {
              summary.approved_items++;
            } else if (itemStatus === 'REJECT') {
              summary.rejected_items++;
            } else if (itemStatus === 'RETURN') {
              summary.returned_items++;
            } else if (itemStatus === 'FORWARD') {
              summary.forwarded_items++;
            } else {
              summary.pending_items++;
            }
          });

          requestMap.set(requestId, summary);
          
          // Count request statuses
          if (requestStatus === 'pending') statusCounts.pending_count++;
          else if (requestStatus === 'approve_wing') statusCounts.approve_wing_count++;
          else if (requestStatus === 'reject') statusCounts.reject_count++;
          else if (requestStatus === 'forward_admin') statusCounts.forward_admin_count++;
          else if (requestStatus === 'forward_supervisor') statusCounts.forward_supervisor_count++;
          else if (requestStatus === 'return') statusCounts.return_count++;
        } catch (error) {
          console.error(`Error fetching details for approval ${approval.id}:`, error);
        }
      }

      // Convert to array and filter by active filter
      let filteredRequests = Array.from(requestMap.values());
      
      if (activeFilter !== 'pending') {
        filteredRequests = filteredRequests.filter(r => r.request_status === activeFilter);
      } else {
        filteredRequests = filteredRequests.filter(r => r.request_status === 'pending' || r.pending_items > 0);
      }

      setRequests(filteredRequests);
      setDashboardStats(statusCounts);
    } catch (error) {
      console.error('Error loading request-based dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRequestStatusFromApproval = (approval: RequestApproval): RequestSummary['request_status'] => {
    // Try to infer request status from approval's current_status or other metadata
    const status = (approval as any).request_status || (approval as any).my_action || approval.current_status;
    
    if (status === 'approve_wing' || status === 'approved') return 'approve_wing';
    if (status === 'reject' || status === 'rejected') return 'reject';
    if (status === 'forward_admin' || status === 'forwarded_to_admin') return 'forward_admin';
    if (status === 'forward_supervisor' || status === 'forwarded_to_supervisor') return 'forward_supervisor';
    if (status === 'return' || status === 'returned') return 'return';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approve_wing':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'forward_admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'forward_supervisor':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'return':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approve_wing':
        return '✓ Approved';
      case 'reject':
        return '✗ Rejected';
      case 'forward_admin':
        return '⏭ Forward to Admin';
      case 'forward_supervisor':
        return '↗ Forward to Supervisor';
      case 'return':
        return '↩ Returned';
      default:
        return 'Pending';
    }
  };

  const handleActionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setExpandedRequest(null);
  };

  const getFilteredRequests = () => {
    if (!searchTerm.trim()) {
      return requests;
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    return requests.filter((request) => 
      request.request_id.toLowerCase().includes(lowerSearch) ||
      request.submitted_by_name?.toLowerCase().includes(lowerSearch) ||
      request.request_type.toLowerCase().includes(lowerSearch) ||
      request.current_approver_name?.toLowerCase().includes(lowerSearch)
    );
  };

  const handleConfigureWorkflows = () => {
    navigate('/dashboard/workflow-admin');
  };

  const handleManageApprovers = () => {
    navigate('/dashboard/workflow-admin');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your approval dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">My Approvals (Request-wise)</h1>
        <p className="text-lg text-gray-600 mt-2">
          Manage requests by approval status
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {dashboardStats.pending_count} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats - Request-Based */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'pending' 
              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 shadow-lg' 
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-700 font-semibold text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{dashboardStats.pending_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approve_wing')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approve_wing' 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 shadow-lg' 
              : 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold text-sm">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboardStats.approve_wing_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('reject')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'reject' 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 shadow-lg' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 font-semibold text-sm">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardStats.reject_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forward_admin')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forward_admin' 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 shadow-lg' 
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 font-semibold text-sm">To Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.forward_admin_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forward_supervisor')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forward_supervisor' 
              ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 shadow-lg' 
              : 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700 font-semibold text-sm">To Supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{dashboardStats.forward_supervisor_count}</div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('return')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'return' 
              ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 shadow-lg' 
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 font-semibold text-sm">Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dashboardStats.return_count}</div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Search and Requests List Container */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Requests List */}
        <Card className="border border-gray-200 flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Requests - {getStatusLabel(activeFilter === 'pending' ? 'pending' : activeFilter)} ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getFilteredRequests().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{searchTerm ? 'No matching requests' : 'No requests found for this status'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredRequests().map((request) => (
                <Card key={request.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.request_id}
                          </h3>
                          <Badge className="text-xs">
                            {request.request_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(request.request_status)}`}
                          >
                            {getStatusLabel(request.request_status)}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <div>Submitted by: <span className="font-medium text-gray-900">{request.submitted_by_name}</span></div>
                          <div>
                            Submitted: {new Date(request.submitted_date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>

                        {/* Item Summary */}
                        <div className="flex flex-wrap gap-3 text-xs mb-3">
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <span className="font-medium text-gray-700">Total:</span>
                            <span className="text-gray-900 font-bold">{request.total_items}</span>
                          </div>
                          {request.approved_items > 0 && (
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded text-green-800">
                              <span>✓</span>
                              <span className="font-bold">{request.approved_items}</span>
                            </div>
                          )}
                          {request.rejected_items > 0 && (
                            <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded text-red-800">
                              <span>✗</span>
                              <span className="font-bold">{request.rejected_items}</span>
                            </div>
                          )}
                          {request.returned_items > 0 && (
                            <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded text-orange-800">
                              <span>↩</span>
                              <span className="font-bold">{request.returned_items}</span>
                            </div>
                          )}
                          {request.pending_items > 0 && (
                            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded text-yellow-800">
                              <span>⏳</span>
                              <span className="font-bold">{request.pending_items}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        className="ml-4 flex items-center gap-1"
                      >
                        {expandedRequest === request.id ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View Items
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Expanded Items View */}
                    {expandedRequest === request.id && (
                      <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                        <PerItemApprovalPanel
                          approvalId={request.id}
                          onActionComplete={handleActionComplete}
                          activeFilter={'all' as any}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Search Sidebar */}
        <div className="lg:w-80">
          <Card className="border border-gray-200 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Requests
                </label>
                <input
                  type="text"
                  placeholder="Request ID, requester, type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Search
                </button>
              )}
              {searchTerm && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Found <span className="font-semibold">{getFilteredRequests().length}</span> request(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={handleConfigureWorkflows}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                <div className="font-semibold text-gray-900">Configure Workflows</div>
              </div>
              <div className="text-sm text-gray-600">Set up approval workflows for different request types</div>
            </button>
            
            <button 
              onClick={handleManageApprovers}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-green-600 group-hover:text-green-700" />
                <div className="font-semibold text-gray-900">Manage Approvers</div>
              </div>
              <div className="text-sm text-gray-600">Add or remove approvers from workflows</div>
            </button>
            
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className="h-5 w-5 text-purple-600 group-hover:text-purple-700" />
                <div className="font-semibold text-gray-900">Refresh Dashboard</div>
              </div>
              <div className="text-sm text-gray-600">Refresh to see latest approval requests</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalDashboardRequestBased;
