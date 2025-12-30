import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'submitted' | 'pending' | 'approved' | 'rejected'>('all');
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    submitted: 0,
    pending: 0,
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
      
      const response = await fetch('http://localhost:3001/api/stock-issuance/requests', {
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
                }
              } catch (err) {
                console.log('Could not fetch approval items for request:', request.id);
              }
              
              return {
                id: request.id,
                request_type: request.request_type || 'Individual',
                title: request.purpose || 'Stock Issuance Request',
                description: request.justification || request.purpose || 'Request for inventory items',
                requested_date: request.created_at,
                submitted_date: request.submitted_at,
                current_status: request.request_status?.toLowerCase() || 'pending',
                current_approver_name: 'N/A',
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
            submitted: mappedRequests.filter(r => r.current_status === 'submitted').length,
            pending: mappedRequests.filter(r => r.current_status === 'pending').length,
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
    
    const matchesFilter = activeFilter === 'all' || request.current_status === activeFilter;
    
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
          onClick={() => setActiveFilter('submitted')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'submitted' 
              ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 shadow-lg' 
              : 'bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700 font-semibold">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{dashboardStats.submitted}</div>
              <p className="text-xs text-gray-600 mt-2">Just submitted</p>
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
              <p className="text-xs text-gray-600 mt-2">Awaiting approval</p>
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
                        {request.current_status.charAt(0).toUpperCase() + request.current_status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="font-medium text-gray-600">Submitted</p>
                      <p>{format(new Date(request.submitted_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Required</p>
                      <p>{format(new Date(request.requested_date), 'MMM dd, yyyy')}</p>
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

                  {request.current_status === 'pending' && request.current_approver_name && (
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

const getStatusClass = (status: string) => {
  const classes = {
    'submitted': 'bg-purple-100 text-purple-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'finalized': 'bg-blue-100 text-blue-800'
  };
  return classes[status as keyof typeof classes] || classes.pending;
};

export default MyRequestsPage;

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

interface ReturnedRequest {
  id: string;
  request_id: string;
  request_type: string;
  current_status: string;
  submitted_date: string;
  current_approver_name?: string;
  approver_designation?: string;
  approval_comments?: string;
  submitted_by_name: string;
  workflow_name?: string;
  returned_date: string;
  return_reason?: string;
}

interface ItemTracking {
  id: string;
  nomenclature: string;
  decision_type?: string;
  history: {
    action: string;
    timestamp: string;
    actor_name?: string;
    comments?: string;
  }[];
}

const RequestTrackingPage: React.FC = () => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [returnedRequests, setReturnedRequests] = useState<ReturnedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItemTracking, setSelectedItemTracking] = useState<ItemTracking | null>(null);
  const [itemTrackingLoading, setItemTrackingLoading] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useSession();

  useEffect(() => {
    if (currentUser?.user_id) {
      loadMyRequests();
      loadReturnedRequests();
    }
  }, [currentUser]);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.user_id) {
        console.error('No current user found');
        setLoading(false);
        return;
      }
      
      // Use the same API that works for other components
      const response = await fetch('http://localhost:3001/api/stock-issuance/requests', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Current user ID:', currentUser.user_id);
          console.log('Current user ID type:', typeof currentUser.user_id);
          console.log('Total requests:', data.data.length);
          
          // Log first request to see structure
          if (data.data.length > 0) {
            console.log('First request sample:', {
              id: data.data[0].id,
              requester: data.data[0].requester,
              requester_user_id_direct: data.data[0].requester_user_id,
              requester_user_id_nested: data.data[0].requester?.user_id,
              requester_user_id_type: typeof data.data[0].requester?.user_id
            });
          }
          
          // Filter requests to show only current user's requests (case-insensitive GUID comparison)
          const userRequests = data.data.filter((request: any) => {
            const requesterUserId = (request.requester?.user_id || request.requester_user_id || '').toLowerCase();
            const currentUserId = (currentUser.user_id || '').toLowerCase();
            const matches = requesterUserId === currentUserId;
            console.log(`Request ${request.id}: requester.user_id=${request.requester?.user_id}, matches=${matches}`);
            return matches;
          });
          
          console.log('User requests:', userRequests.length);
          
          // Fetch approval items for each request
          const mappedRequests = await Promise.all(
            userRequests.map(async (request: any) => {
              let approvalItems = [];
              try {
                // Fetch approval items for this request
                const approvalResponse = await fetch(
                  `http://localhost:3001/api/approvals/request/${request.id}/items`,
                  { credentials: 'include' }
                );
                if (approvalResponse.ok) {
                  const approvalData = await approvalResponse.json();
                  if (approvalData.success && approvalData.data) {
                    approvalItems = approvalData.data;
                  }
                }
              } catch (err) {
                console.log('Could not fetch approval items for request:', request.id);
              }
              
              return {
                id: request.id,
                request_type: request.request_type || 'Individual',
                title: request.purpose || 'Stock Issuance Request',
                description: request.justification || request.purpose || 'Request for inventory items',
                requested_date: request.created_at,
                submitted_date: request.submitted_at,
                current_status: request.request_status?.toLowerCase() || 'pending',
                current_approver_name: 'N/A',
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

  const loadReturnedRequests = async () => {
    try {
      if (!currentUser?.user_id) {
        console.error('No current user found for returned requests');
        return;
      }

      const response = await fetch('http://localhost:3001/api/approvals/my-returned-requests', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Returned requests loaded:', data.data.length);
          setReturnedRequests(data.data);
        } else {
          console.error('Failed to load returned requests:', data.error);
        }
      } else {
        console.error('Failed to fetch returned requests');
      }
    } catch (error) {
      console.error('Error loading returned requests:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'submitted': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      'finalized': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      'in_progress': { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: RefreshCw }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Urgent': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || priorityColors.Medium}>
        {priority}
      </Badge>
    );
  };

  const getItemStatusBadge = (decisionType: string | null | undefined) => {
    const itemStatusColors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVE_FROM_STOCK': 'bg-green-100 text-green-800',
      'APPROVE_FOR_PROCUREMENT': 'bg-green-100 text-green-800',
      'REJECT': 'bg-red-100 text-red-800',
      'RETURN': 'bg-orange-100 text-orange-800',
      'FORWARD_TO_SUPERVISOR': 'bg-blue-100 text-blue-800',
      'FORWARD_TO_ADMIN': 'bg-blue-100 text-blue-800',
      'null': 'bg-yellow-100 text-yellow-800',
      '': 'bg-yellow-100 text-yellow-800'
    };

    const key = decisionType || 'null';
    const color = itemStatusColors[key] || 'bg-gray-100 text-gray-800';
    
    const displayText = !decisionType ? 'Pending' : 
      decisionType === 'PENDING' ? 'Pending' :
      decisionType.includes('APPROVE') ? 'Approved' :
      decisionType === 'REJECT' ? 'Rejected' :
      decisionType === 'RETURN' ? 'Returned' :
      decisionType.includes('FORWARD') ? 'Forwarded' :
      decisionType;

    return <Badge className={`${color} cursor-pointer hover:opacity-80 transition-opacity`}>{displayText}</Badge>;
  };

  const handleItemStatusClick = async (item: any) => {
    setItemTrackingLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/approvals/item/${item.id}/tracking`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedItemTracking(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching item tracking:', error);
    } finally {
      setItemTrackingLoading(false);
    }
  };

  const handleViewDetails = (request: SubmittedRequest) => {
    // Navigate to approval details or tracking page
    if (request.current_status === 'pending' || request.current_status === 'approved') {
      navigate(`/dashboard/approval-dashboard`);
    } else {
      // For completed/rejected requests, show a detailed view
      navigate(`/dashboard/request-details/${request.id}`);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.current_status === statusFilter;
    const matchesType = typeFilter === 'all' || request.request_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-600 mt-2">
            Track all your submitted requests and their approval status
          </p>
        </div>
        <Button onClick={loadMyRequests} variant="outline" className="flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['submitted', 'approved', 'rejected', 'finalized'].map(status => {
          const count = requests.filter(r => r.current_status.toLowerCase() === status).length;
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">
                      {status.replace('_', ' ')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Organizational">Organizational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returned Requests Section */}
      {returnedRequests.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Requests Returned for Revision
              <Badge className="bg-orange-100 text-orange-800">{returnedRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {returnedRequests.map((request) => (
                <Card key={request.id} className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            Returned
                          </Badge>
                          <span className="font-medium text-gray-900">
                            {request.request_type} Request
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Returned by: <span className="font-medium">{request.current_approver_name}</span>
                          {request.approver_designation && (
                            <span className="text-gray-500"> ({request.approver_designation})</span>
                          )}
                        </p>
                        {request.return_reason && (
                          <p className="text-sm text-orange-800 bg-orange-100 p-2 rounded border-l-4 border-orange-400 mb-2">
                            <strong>Return Reason:</strong> {request.return_reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Returned on: {new Date(request.returned_date).toLocaleDateString()} at {new Date(request.returned_date).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={() => navigate(`/stock-issuance/returned-requests/edit/${request.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View & Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Clock size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {requests.length === 0 
                  ? "You haven't submitted any requests yet."
                  : "No requests match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {getPriorityBadge(request.priority)}
                    {getStatusBadge(request.current_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Request ID</p>
                    <p className="font-mono text-xs">{request.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Submitted Date</p>
                    <p>{format(new Date(request.submitted_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Required Date</p>
                    <p>{format(new Date(request.requested_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Total Items</p>
                    <p>{request.total_items} items</p>
                  </div>
                </div>

                {/* Current Approver */}
                {request.current_approver_name && request.current_status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm">
                      <span className="font-medium">Currently with:</span> {request.current_approver_name}
                    </p>
                  </div>
                )}

                {/* Items Summary with Status */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items with Status:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.approval_items ? (
                      request.approval_items.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded p-3 text-sm border border-gray-200">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="font-medium">{item.nomenclature}</span>
                            <div onClick={() => handleItemStatusClick(item)} className="cursor-pointer">
                              {getItemStatusBadge(item.decision_type)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      request.items.slice(0, 4).map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.item_name}</span>
                            <span className="text-gray-600">
                              {item.requested_quantity} {item.unit}
                            </span>
                          </div>
                          {item.approved_quantity !== undefined && (
                            <div className="text-xs text-green-600 mt-1">
                              Approved: {item.approved_quantity} {item.unit}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {request.approval_items && request.approval_items.length > 4 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{request.approval_items.length - 4} more items
                    </p>
                  )}
                  {!request.approval_items && request.items.length > 4 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{request.items.length - 4} more items
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={() => handleViewDetails(request)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  {request.current_status === 'pending' && (
                    <Button
                      onClick={() => navigate('/dashboard/approval-dashboard')}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Track Progress
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {requests.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredRequests.length} of {requests.length} requests
              </div>
              <div className="flex items-center gap-4">
                <span>User: {currentUser?.user_name}</span>
                <span>•</span>
                <span>Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Tracking Modal */}
      {selectedItemTracking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedItemTracking.nomenclature}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Status Tracking History</p>
              </div>
              <button
                onClick={() => setSelectedItemTracking(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itemTrackingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600">Current Status:</p>
                    <div className="mt-2">
                      {getItemStatusBadge(selectedItemTracking.decision_type)}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">History:</p>
                    <div className="space-y-3">
                      {selectedItemTracking.history && selectedItemTracking.history.length > 0 ? (
                        selectedItemTracking.history.map((entry, idx) => (
                          <div key={idx} className="border-l-2 border-blue-300 pl-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm capitalize">
                                {entry.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.actor_name && (
                              <p className="text-xs text-gray-600">By: {entry.actor_name}</p>
                            )}
                            {entry.comments && (
                              <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                                {entry.comments}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No history available</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RequestTrackingPage;