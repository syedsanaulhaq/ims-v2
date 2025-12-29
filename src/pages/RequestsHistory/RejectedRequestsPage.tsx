import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, RefreshCw, Search, ArrowLeft, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RequestItem {
  id: string;
  item_name: string;
  requested_quantity: number;
  unit: string;
}

interface ApprovalRequest {
  id: string;
  request_id: string;
  request_type: string;
  title: string;
  description: string;
  requested_date: string;
  submitted_date: string;
  requester_name: string;
  requester_office?: string;
  my_action: string;
  my_action_date?: string;
  my_comments?: string;
  current_status: string;
  final_status: string;
  items: RequestItem[];
  total_items: number;
  priority: string;
}

const safeFormat = (dateValue: string | Date | null | undefined, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return '-';
  }
};

const RejectedRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadApprovalHistory();
  }, []);

  const loadApprovalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/my-approval-history', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter only rejected requests
          const rejectedRequests = data.requests.filter(
            (req: ApprovalRequest) => req.final_status === 'rejected'
          );
          setRequests(rejectedRequests);
        }
      }
    } catch (error) {
      console.error('Error loading approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetails = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading rejected requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/requests-history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="text-red-600" size={32} />
              Rejected Request
            </h1>
            <p className="text-gray-600 mt-2">
              Requests that were rejected
            </p>
          </div>
        </div>
        <Button
          onClick={loadApprovalHistory}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <XCircle size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rejected requests</h3>
              <p className="text-gray-600">
                You don't have any rejected requests.
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
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <span>Requested by: {request.requester_name}</span>
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Submitted Date</p>
                    <p>{safeFormat(request.submitted_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Required Date</p>
                    <p>{safeFormat(request.requested_date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Total Items</p>
                    <p>{request.total_items} items</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Priority</p>
                    <Badge variant="outline">{request.priority}</Badge>
                  </div>
                </div>

                {/* My Action */}
                {request.my_comments && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium">Reason for Rejection:</p>
                    <p className="text-sm text-gray-700 mt-2">{request.my_comments}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="font-medium text-gray-600 mb-2">Items:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {request.items.slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-600">
                            {item.requested_quantity} {item.unit}
                          </span>
                        </div>
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedRequest.title}</h2>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Request ID</p>
                  <p className="font-mono text-xs">{selectedRequest.request_id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Submitted</p>
                  <p>{safeFormat(selectedRequest.submitted_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Required Date</p>
                  <p>{safeFormat(selectedRequest.requested_date, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Total Items</p>
                  <p>{selectedRequest.total_items} items</p>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-600 mb-2">Description</p>
                <p className="text-gray-700">{selectedRequest.description}</p>
              </div>

              {selectedRequest.my_comments && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Reason for Rejection</p>
                  <p className="text-gray-700">{selectedRequest.my_comments}</p>
                </div>
              )}

              <div>
                <p className="font-medium text-gray-600 mb-2">Items Requested</p>
                <div className="space-y-2">
                  {selectedRequest.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-gray-600">{item.requested_quantity} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={closeModal} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedRequestsPage;
