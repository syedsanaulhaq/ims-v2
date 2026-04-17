import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined, defaultText = 'N/A'): string => {
  if (!dateString) return defaultText;
  const date = new Date(dateString);
  if (!isValid(date) || date.getFullYear() < 2000) return defaultText;
  return format(date, 'MMM dd, yyyy');
};

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit: string;
}

interface SubmittedRequest {
  id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  current_status: string;
  current_approver_name?: string;
  items: RequestItem[];
  total_items: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  office_name?: string;
  wing_name?: string;
  approval_items?: {
    id: string;
    nomenclature: string;
    decision_type?: string | null;
  }[];
}

const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'forwarded_to_supervisor' | 'forwarded_to_admin' | 'approved' | 'rejected'>('all');
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    forwarded_to_supervisor: 0,
    forwarded_to_admin: 0,
    approved: 0,
    rejected: 0
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { user: currentUser } = useSession();

  useEffect(() => {
    if (currentUser?.user_id) {
      loadMyRequests();
    }
  }, [currentUser, refreshTrigger]);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.user_id) {
        console.error('No current user found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter requests to show only current user's requests
          const userRequests = data.data.filter((request: any) => {
            const requesterUserId = (request.requester?.user_id || request.requester_user_id || '').toLowerCase();
            const currentUserId = (currentUser.user_id || '').toLowerCase();
            return requesterUserId === currentUserId;
          });
          
          const mappedRequests = await Promise.all(
            userRequests.map(async (request: any) => {
              let approvalItems = [];
              let approvalStatus = '';
              try {
                const approvalResponse = await fetch(
                  `http://localhost:3001/api/approvals/request/${request.id}/items`,
                  { credentials: 'include' }
                );
                if (approvalResponse.ok) {
                  const approvalData = await approvalResponse.json();
                  if (approvalData.success && approvalData.data) {
                    approvalItems = approvalData.data;
                  }
                  // Get the approval status from request_approvals
                  if (approvalData.approval_status) {
                    approvalStatus = approvalData.approval_status;
                  }
                }
              } catch (err) {
                console.log('Could not fetch approval items for request:', request.id);
              }

              // Also try to get the request_approvals status directly
              let currentApproverName = '';
              if (!approvalStatus) {
                try {
                  const raResponse = await fetch(
                    `http://localhost:3001/api/approvals/request/${request.id}/status`,
                    { credentials: 'include' }
                  );
                  if (raResponse.ok) {
                    const raData = await raResponse.json();
                    if (raData.success) {
                      approvalStatus = raData.current_status || '';
                      currentApproverName = raData.current_approver_name || '';
                    }
                  }
                } catch (err) {
                  // fallback to stock_issuance_requests status
                }
              }

              // Determine the effective display status
              let effectiveStatus = request.request_status?.toLowerCase() || 'pending';
              if (approvalStatus) {
                // Map request_approvals.current_status to display status
                if (approvalStatus === 'forwarded_to_admin') effectiveStatus = 'forwarded_to_admin';
                else if (approvalStatus === 'forwarded_to_supervisor') effectiveStatus = 'forwarded_to_supervisor';
                else if (approvalStatus === 'approved' || approvalStatus === 'completed') effectiveStatus = 'approved';
                else if (approvalStatus === 'rejected') effectiveStatus = 'rejected';
                else if (approvalStatus === 'returned') effectiveStatus = 'returned';
                else if (approvalStatus === 'pending') effectiveStatus = 'pending';
              }
              // Also check approval_status from stock_issuance_requests as fallback
              const sirApprovalStatus = (request.approval_status || '').toLowerCase();
              if (effectiveStatus === 'pending' && sirApprovalStatus.includes('forwarded to admin')) {
                effectiveStatus = 'forwarded_to_admin';
              } else if (effectiveStatus === 'pending' && sirApprovalStatus.includes('forwarded to supervisor')) {
                effectiveStatus = 'forwarded_to_supervisor';
              } else if (effectiveStatus === 'pending' && sirApprovalStatus.includes('approved')) {
                effectiveStatus = 'approved';
              }
              
              return {
                id: request.id,
                request_type: request.request_type || 'Individual',
                title: request.purpose || 'Stock Issuance Request',
                description: request.justification || request.purpose || 'Request for inventory items',
                requested_date: request.created_at,
                submitted_date: request.submitted_at,
                current_status: effectiveStatus,
                current_approver_name: currentApproverName || 'N/A',
                items: request.items?.map((item: any) => ({
                  id: item.id,
                  item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
                  requested_quantity: item.requested_quantity || 1,
                  approved_quantity: item.approved_quantity,
                  unit: 'units'
                })) || [],
                approval_items: approvalItems,
                total_items: request.items?.length || 0,
                priority: request.urgency_level || 'Medium',
                office_name: request.office?.name,
                wing_name: request.wing?.name
              };
            })
          );
          
          setRequests(mappedRequests);
          
          // Calculate stats
          setDashboardStats({
            total: mappedRequests.length,
            pending: mappedRequests.filter(r => r.current_status === 'pending').length,
            forwarded_to_supervisor: mappedRequests.filter(r => r.current_status === 'forwarded_to_supervisor').length,
            forwarded_to_admin: mappedRequests.filter(r => r.current_status === 'forwarded_to_admin').length,
            approved: mappedRequests.filter(r => r.current_status === 'approved').length,
            rejected: mappedRequests.filter(r => r.current_status === 'rejected').length
          });
        } else {
          console.error('Failed to load requests:', data.error);
        }
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || request.current_status === activeFilter
      || (activeFilter === 'pending' && (request.current_status === 'pending' || request.current_status === 'submitted'));
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">My Requests</h1>
        <p className="text-lg text-gray-600 mt-2">
          Track all your submitted requests and their approval status
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {dashboardStats.total} Total Requests
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'all' 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 shadow-lg' 
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 font-semibold">All Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboardStats.total}</div>
              <p className="text-xs text-gray-600 mt-2">Total submitted</p>
            </CardContent>
          </Card>
        </button>

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
              <CardTitle className="text-yellow-700 font-semibold">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{dashboardStats.pending}</div>
              <p className="text-xs text-gray-600 mt-2">Awaiting action</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded_to_supervisor')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded_to_supervisor' 
              ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 shadow-lg' 
              : 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700 font-semibold">To Supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{dashboardStats.forwarded_to_supervisor}</div>
              <p className="text-xs text-gray-600 mt-2">With supervisor</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded_to_admin')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded_to_admin' 
              ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-indigo-500 shadow-lg' 
              : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-indigo-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-indigo-700 font-semibold">To Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{dashboardStats.forwarded_to_admin}</div>
              <p className="text-xs text-gray-600 mt-2">With admin</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approved' 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 shadow-lg' 
              : 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboardStats.approved}</div>
              <p className="text-xs text-gray-600 mt-2">Approved requests</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'rejected' 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 shadow-lg' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 font-semibold">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{dashboardStats.rejected}</div>
              <p className="text-xs text-gray-600 mt-2">Rejected requests</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Search Bar */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Search Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests
              <Badge className="ml-2 bg-gray-100 text-gray-800">{filteredRequests.length}</Badge>
            </CardTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No requests found</p>
              <p className="text-sm">{activeFilter === 'all' 
                ? "You haven't submitted any requests yet." 
                : `No ${activeFilter} requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityClass(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge className={getStatusClass(request.current_status)}>
                        {getStatusLabel(request.current_status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="font-medium text-gray-600">Submitted</p>
                      <p>{formatDate(request.submitted_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Required</p>
                      <p>{formatDate(request.requested_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Items</p>
                      <p>{request.total_items}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Type</p>
                      <p>{request.request_type}</p>
                    </div>
                  </div>

                  {['pending', 'forwarded_to_supervisor', 'forwarded_to_admin'].includes(request.current_status) && request.current_approver_name && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
                      <span className="font-medium">With:</span> {request.current_approver_name}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/dashboard/request-details/${request.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {request.current_status === 'pending' && (
                      <Button
                        onClick={() => navigate('/dashboard/approval-dashboard')}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Track Progress
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
const getPriorityClass = (priority: string) => {
  const classes = {
    'Low': 'bg-gray-100 text-gray-800',
    'Medium': 'bg-blue-100 text-blue-800',
    'High': 'bg-orange-100 text-orange-800',
    'Urgent': 'bg-red-100 text-red-800'
  };
  return classes[priority as keyof typeof classes] || classes.Medium;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'submitted': 'Submitted',
    'pending': 'Pending',
    'forwarded_to_supervisor': 'With Supervisor',
    'forwarded_to_admin': 'With Admin',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'returned': 'Returned',
    'completed': 'Completed',
    'finalized': 'Finalized'
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'submitted': 'bg-purple-100 text-purple-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'forwarded_to_supervisor': 'bg-purple-100 text-purple-800',
    'forwarded_to_admin': 'bg-indigo-100 text-indigo-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'returned': 'bg-orange-100 text-orange-800',
    'finalized': 'bg-blue-100 text-blue-800'
  };
  return classes[status] || classes.pending;
};

export default MyRequestsPage;