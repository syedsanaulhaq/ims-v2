import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  Package, 
  CheckCircle, 
  AlertCircle,
  Truck,
  User,
  Calendar,
  FileText,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  AlertTriangle,
  Info
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { stockIssuanceService } from '@/services/stockIssuanceService';
import { stockTransactionsLocalService } from '@/services/stockTransactionsLocalService';
import { inventoryLocalService } from '@/services/inventoryLocalService';
import { getApiBaseUrl } from '@/services/invmisApi';


interface ApprovedRequest {
  id: number;
  request_number: string;
  request_type: string;
  requester_name: string;
  office_name: string;
  wing_name: string;
  created_at: string;
  approved_at: string;
  priority_level: string;
  urgency_level: string;
  purpose: string;
  justification: string;
  approver_name: string;
  items: any[];
  has_stock_issues: boolean;
  estimated_processing_time: string;
}

const StockIssuanceProcessing: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovedRequest | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [issuedBy, setIssuedBy] = useState('');
  const [issuanceNotes, setIssuanceNotes] = useState('');

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const fetchApprovedRequests = async () => {
    try {
      setIsLoading(true);
      
      // Get approved requests from stockIssuanceService
      const data = await stockIssuanceService.getApprovedRequests();

      // Transform data with basic information (simplified for unified architecture)
      const transformedRequests = data.map((request) => ({
        id: request.id,
        request_number: request.request_number,
        request_type: request.request_type,
        requester_name: request.requester_name,
        office_name: request.office_name,
        wing_name: request.wing_name,
        created_at: request.created_at,
        approved_at: request.approved_at,
        priority_level: request.priority_level,
        urgency_level: request.urgency_level,
        purpose: request.purpose,
        justification: request.justification,
        approver_name: 'Admin', // Simplified for unified architecture
        items: [], // Will be populated from separate items endpoint if needed
        has_stock_issues: false, // Simplified stock checking
        estimated_processing_time: '2-3 business days'
      }));

      setApprovedRequests(transformedRequests);
    } catch (error: any) {
      setError('Failed to load approved requests: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processIssuance = async () => {
    if (!selectedRequest || !issuedBy) {
      setError('Please select a request and provide issuer name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the new Stock Issuance Workflow API
      const response = await fetch(`${apiBase}/stock-issuance/issue/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issued_by: '4dae06b7-17cd-480b-81eb-da9c76ad5728', // TODO: Get from current user context
          issued_by_name: issuedBy,
          issuance_notes: issuanceNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to issue items');
      }

      const result = await response.json();
      
      setSuccess(`✅ ${result.message || 'Stock issued successfully!'} Request: ${selectedRequest.request_number}`);
      
      // Reset form and refresh data
      setSelectedRequest(null);
      setShowProcessingModal(false);
      setIssuedBy('');
      setIssuanceNotes('');
      
      // Refresh approved requests
      await fetchApprovedRequests();

    } catch (error: any) {
      setError('Failed to process issuance: ' + error.message);
      console.error('❌ Issuance error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Stock Issuance Processing</h1>
          <p className="text-gray-600 mt-1">Process approved stock issuance requests</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50" variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approved Requests List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Approved Requests ({approvedRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No approved requests pending processing</p>
                    </div>
                  ) : (
                    approvedRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedRequest?.id === request.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{request.request_number}</h3>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Approved
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <User className="h-4 w-4 inline mr-1" />
                          {request.requester_name} • {request.office_name}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Approved: {formatDateDMY(request.approved_at)}
                        </p>
                        <p className="text-sm text-gray-700">{request.purpose}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Processing Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Processing Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRequest ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedRequest.request_number}</h3>
                      <p className="text-gray-600">{selectedRequest.purpose}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Requester:</span>
                        <p>{selectedRequest.requester_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Office:</span>
                        <p>{selectedRequest.office_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Approved By:</span>
                        <p>{selectedRequest.approver_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span>
                        <p>{selectedRequest.priority_level}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="issuedBy">Issued By *</Label>
                        <Input
                          id="issuedBy"
                          value={issuedBy}
                          onChange={(e) => setIssuedBy(e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="issuanceNotes">Issuance Notes</Label>
                        <Input
                          id="issuanceNotes"
                          value={issuanceNotes}
                          onChange={(e) => setIssuanceNotes(e.target.value)}
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={processIssuance}
                      disabled={!issuedBy || isLoading}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Process Issuance
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select an approved request to process</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockIssuanceProcessing;
