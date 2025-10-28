import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Clock, CheckCircle, XCircle, RefreshCw, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { sessionService } from '@/services/sessionService';
import { useNavigate } from 'react-router-dom';

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
}

const RequestTrackingPage: React.FC = () => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  const currentUser = sessionService.getCurrentUser();

  useEffect(() => {
    loadMyRequests();
  }, []);

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
          // Filter requests to show only current user's requests
          const userRequests = data.data.filter((request: any) => 
            request.requester_user_id === currentUser.user_id
          );
          
          // Map the stock issuance data to our request format
          const mappedRequests = userRequests.map((request: any) => ({
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
            total_items: request.items?.length || 0,
            priority: request.urgency_level || 'Medium',
            office_name: request.office?.name,
            wing_name: request.wing?.name
          }));
          
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

                {/* Items Summary */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items Requested:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.items.slice(0, 4).map((item, index) => (
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
                    ))}
                  </div>
                  {request.items.length > 4 && (
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
    </div>
  );
};

export default RequestTrackingPage;