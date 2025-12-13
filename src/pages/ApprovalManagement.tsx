import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Package,
  AlertCircle,
  MessageSquare,
  Send,
  Eye,
  FileText
} from 'lucide-react';
import approvalService, { ApprovalRequest, ApprovalItem, ApprovalAction } from '@/services/approvalService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IssuanceRequest {
  id: string;
  request_number: string;
  request_type: string;
  requester_name: string;
  requester_email: string;
  requester_department: string;
  purpose: string;
  urgency_level: string;
  request_status: string;
  submitted_at: string;
  expected_return_date: string;
  is_returnable: boolean;
  items: RequestItem[];
  total_items: number;
  total_quantity: number;
  total_value: number;
  has_custom_items?: boolean;
  inventory_items?: RequestItem[];
  custom_items?: RequestItem[];
}

interface RequestItem {
  id: string;
  item_master_id?: string;
  nomenclature: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_price: number;
  item_status: string;
  rejection_reason?: string;
  item_type: 'inventory' | 'custom';
  custom_item_name?: string;
  current_stock?: number;
  inventory_info?: any;
  stock_status?: 'sufficient' | 'insufficient' | 'out_of_stock' | 'unknown';
}

interface ItemDecision {
  itemId: string;
  decision: 'approve_wing' | 'forward_admin' | 'reject' | null;
  approvedQuantity: number;
  reason?: string;
}

const ApprovalManagement: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<IssuanceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<IssuanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');

  // Approval form fields
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');

  // Per-item decision tracking
  const [itemDecisions, setItemDecisions] = useState<Map<string, ItemDecision>>(new Map());

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      
      const requests = await approvalService.getPendingRequests();
      
      // Transform to match the expected interface
      const transformedRequests = requests.map(request => ({
        ...request,
        id: request.id, // Already a string from the service
        items: request.items.map(item => ({
          ...item,
          id: item.id, // Already a string from the service
          item_type: (item.item_type === 'inventory' || item.item_type === 'custom') 
            ? item.item_type 
            : 'inventory' as 'inventory' | 'custom'
        })),
        inventory_items: request.inventory_items?.map(item => ({
          ...item,
          id: item.id,
          item_type: (item.item_type === 'inventory' || item.item_type === 'custom') 
            ? item.item_type 
            : 'inventory' as 'inventory' | 'custom'
        })),
        custom_items: request.custom_items?.map(item => ({
          ...item,
          id: item.id,
          item_type: (item.item_type === 'inventory' || item.item_type === 'custom') 
            ? item.item_type 
            : 'custom' as 'inventory' | 'custom'
        }))
      }));

      setPendingRequests(transformedRequests);
    } catch (error: any) {
      setError('Failed to load pending requests: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      'Critical': 'destructive',
      'High': 'secondary',
      'Normal': 'outline',
      'Low': 'outline'
    };
    return <Badge variant={variants[urgency as keyof typeof variants] as any}>{urgency}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Submitted': 'secondary',
      'Under Review': 'default',
      'Approved': 'default',
      'Rejected': 'destructive'
    };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{status}</Badge>;
  };

  const getStockStatusBadge = (stockStatus: string, currentStock: number | null, requestedQty: number) => {
    if (stockStatus === 'unknown') {
      return <Badge variant="outline" className="text-gray-500">Stock Unknown</Badge>;
    }
    
    switch (stockStatus) {
      case 'sufficient':
        return <Badge variant="default" className="bg-green-100 text-green-800">✓ Stock: {currentStock}</Badge>;
      case 'insufficient':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">⚠ Stock: {currentStock} (Need: {requestedQty})</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">✗ Out of Stock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const updateItemApproval = (itemId: string, approvedQty: number, status: string) => {
    if (!selectedRequest) return;
    
    const updatedItems = selectedRequest.items.map(item =>
      item.id === itemId ? { ...item, approved_quantity: approvedQty, item_status: status } : item
    );
    
    setSelectedRequest({ ...selectedRequest, items: updatedItems });
  };

  const setItemDecision = (itemId: string, decision: 'approve_wing' | 'forward_admin' | 'reject', approvedQty: number, reason?: string) => {
    const newDecisions = new Map(itemDecisions);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason
    });
    setItemDecisions(newDecisions);
  };

  const getItemDecision = (itemId: string): ItemDecision | undefined => {
    return itemDecisions.get(itemId);
  };

  const hasDecisionForAllItems = (request: IssuanceRequest): boolean => {
    return request.items.every(item => getItemDecision(item.id)?.decision !== null);
  };

  const getDecisionSummary = (request: IssuanceRequest) => {
    const decisions = request.items.map(item => getItemDecision(item.id));
    return {
      approveWing: decisions.filter(d => d?.decision === 'approve_wing').length,
      forwardAdmin: decisions.filter(d => d?.decision === 'forward_admin').length,
      reject: decisions.filter(d => d?.decision === 'reject').length,
      undecided: decisions.filter(d => !d || !d.decision).length
    };
  };

  const processApproval = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !approverName) {
      setError('Please select a request and provide approver name');
      return;
    }

    // Validate all items have decisions
    if (action === 'approve' && selectedRequest.items.length > 0 && !hasDecisionForAllItems(selectedRequest)) {
      setError('Please make a decision for each item before submitting');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Build item allocations based on individual decisions
      const itemAllocations = selectedRequest.items.map(item => {
        const decision = getItemDecision(item.id);
        
        // Determine decision type based on supervisor's choice
        let decisionType: 'APPROVE_FROM_STOCK' | 'APPROVE_FOR_PROCUREMENT' | 'REJECT' = 'REJECT';
        let allocatedQty = 0;

        if (decision?.decision === 'approve_wing') {
          // Wing supervisor approved from wing inventory
          decisionType = 'APPROVE_FROM_STOCK';
          allocatedQty = decision.approvedQuantity || item.requested_quantity;
        } else if (decision?.decision === 'forward_admin') {
          // Wing supervisor forwarded to admin
          // This will be marked as requiring procurement/admin approval
          decisionType = 'APPROVE_FOR_PROCUREMENT';
          allocatedQty = decision.approvedQuantity || item.requested_quantity;
        } else {
          // Rejected
          decisionType = 'REJECT';
          allocatedQty = 0;
        }

        return {
          requested_item_id: item.id,
          inventory_item_id: item.item_master_id,
          allocated_quantity: allocatedQty,
          decision_type: decisionType,
          rejection_reason: decision?.decision === 'reject' 
            ? (decision.reason || 'Request rejected by wing supervisor') 
            : undefined,
          procurement_required_quantity: decision?.decision === 'forward_admin' 
            ? (decision.approvedQuantity || item.requested_quantity)
            : undefined
        };
      });

      const approvalAction: ApprovalAction = {
        request_id: selectedRequest.id,
        approver_name: approverName,
        approver_designation: approverDesignation || 'Wing Supervisor',
        approval_comments: approvalComments || `Per-item decisions made by ${approverName}`,
        item_allocations: itemAllocations
      };

      // Always process as approve when using per-item decisions
      const result = await approvalService.approveRequest(approvalAction);

      if (result.success) {
        setSuccess(result.message || 'Per-item approval decisions submitted successfully');
        
        // Reset form and refresh data
        setSelectedRequest(null);
        setApproverName('');
        setApproverDesignation('');
        setApprovalComments('');
        setItemDecisions(new Map());
        
        setTimeout(() => {
          fetchPendingRequests();
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to process approval');
      }
    } catch (error: any) {
      setError('Failed to process approval: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quickApprove = async (request: IssuanceRequest) => {
    if (!approverName) {
      setError('Please set approver name first');
      return;
    }

    setSelectedRequest(request);
    await processApproval('approve');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Approval Management</h1>
          <p className="text-gray-600 mt-1">Review and approve stock issuance requests</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Requests List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Approvals ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Approver Info */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="approverName">Your Name *</Label>
                      <Input
                        id="approverName"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approverDesignation">Designation</Label>
                      <Input
                        id="approverDesignation"
                        value={approverDesignation}
                        onChange={(e) => setApproverDesignation(e.target.value)}
                        placeholder="Your designation/title"
                      />
                    </div>
                  </div>
                </div>

                {/* Requests List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {pendingRequests.map(request => (
                    <div 
                      key={request.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRequest?.id === request.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{request.request_number}</div>
                        <div className="flex items-center gap-2">
                          {getUrgencyBadge(request.urgency_level)}
                          {getStatusBadge(request.request_status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>👤 {request.requester_name} ({request.request_type})</div>
                        <div>📦 {request.total_items} items</div>
                        <div>📅 Submitted: {formatDateDMY(request.submitted_at)}</div>
                        <div className="text-xs mt-2 line-clamp-2">💬 {request.purpose}</div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); quickApprove(request); }}
                          disabled={!approverName || isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Quick Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No pending requests for approval</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Details & Approval */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Request Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRequest ? (
                  <div className="space-y-4">
                    {/* Request Info */}
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div><strong>Request:</strong> {selectedRequest.request_number}</div>
                      <div><strong>Type:</strong> {selectedRequest.request_type}</div>
                      <div><strong>Requester:</strong> {selectedRequest.requester_name}</div>
                      <div><strong>Department:</strong> {selectedRequest.requester_department || 'Not specified'}</div>
                      <div><strong>Urgency:</strong> {getUrgencyBadge(selectedRequest.urgency_level)}</div>
                      {selectedRequest.is_returnable && (
                        <div><strong>Return Date:</strong> {formatDateDMY(selectedRequest.expected_return_date)}</div>
                      )}
                    </div>

                    <div>
                      <strong>Purpose:</strong>
                      <p className="text-sm text-gray-600 mt-1">{selectedRequest.purpose}</p>
                    </div>

                    {/* Items List - Separated by Type */}
                    <div className="space-y-4">
                      {/* Inventory Items */}
                      {selectedRequest.inventory_items && selectedRequest.inventory_items.length > 0 && (
                        <div>
                          <strong className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Inventory Items ({selectedRequest.inventory_items.length}):
                          </strong>
                          <div className="space-y-2 mt-2 max-h-96 overflow-y-auto">
                            {selectedRequest.inventory_items.map(item => {
                              const decision = getItemDecision(item.id);
                              const isInWing = item.stock_status === 'sufficient';
                              
                              return (
                                <div key={item.id} className="p-4 border rounded bg-blue-50 border-blue-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <div className="font-semibold text-gray-900">{item.nomenclature}</div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        Requested: <span className="font-medium">{item.requested_quantity}</span>
                                      </div>
                                    </div>
                                    <Badge variant="default" className="text-xs">Inventory</Badge>
                                  </div>
                                  
                                  {/* Stock Status */}
                                  <div className="mb-3 p-2 bg-white rounded border">
                                    <div className="text-sm font-medium text-gray-700 mb-2">Wing Stock Status:</div>
                                    {getStockStatusBadge(item.stock_status || 'unknown', item.current_stock, item.requested_quantity)}
                                    {isInWing && (
                                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-medium">
                                        ✓ Item is available in wing inventory - You can approve from wing
                                      </div>
                                    )}
                                    {!isInWing && (
                                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-medium">
                                        ✗ Item NOT available in wing inventory - You must forward to admin
                                      </div>
                                    )}
                                  </div>

                                  {/* Decision Options */}
                                  <div className="space-y-2 mb-3">
                                    <div className="text-sm font-medium text-gray-700">Your Decision:</div>
                                    
                                    {/* Option 1: Approve from Wing */}
                                    <div className={`p-3 border rounded cursor-pointer transition ${
                                      decision?.decision === 'approve_wing' 
                                        ? 'bg-green-100 border-green-500' 
                                        : 'bg-white border-gray-200 hover:border-green-400'
                                    } ${!isInWing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`decision-${item.id}`}
                                          value="approve_wing"
                                          checked={decision?.decision === 'approve_wing'}
                                          onChange={() => setItemDecision(item.id, 'approve_wing', item.requested_quantity)}
                                          disabled={!isInWing}
                                          className="mt-1"
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium text-green-700">✓ Approve from Wing Store</div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            Deduct {item.requested_quantity} units from wing inventory and allocate to requester
                                          </div>
                                        </div>
                                      </label>
                                      {decision?.decision === 'approve_wing' && isInWing && (
                                        <div className="mt-2 ml-6 p-2 bg-green-50 rounded text-xs">
                                          <strong>Qty to allocate:</strong> {decision.approvedQuantity} units
                                        </div>
                                      )}
                                    </div>

                                    {/* Option 2: Forward to Admin */}
                                    <div className={`p-3 border rounded cursor-pointer transition ${
                                      decision?.decision === 'forward_admin' 
                                        ? 'bg-amber-100 border-amber-500' 
                                        : 'bg-white border-gray-200 hover:border-amber-400'
                                    }`}>
                                      <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`decision-${item.id}`}
                                          value="forward_admin"
                                          checked={decision?.decision === 'forward_admin'}
                                          onChange={() => setItemDecision(item.id, 'forward_admin', item.requested_quantity)}
                                          className="mt-1"
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium text-amber-700">⏭ Forward to Admin</div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            Forward {item.requested_quantity} units to admin supervisor for approval from central warehouse
                                          </div>
                                        </div>
                                      </label>
                                      {decision?.decision === 'forward_admin' && (
                                        <div className="mt-2 ml-6 p-2 bg-amber-50 rounded text-xs">
                                          <strong>Qty to forward:</strong> {decision.approvedQuantity} units
                                        </div>
                                      )}
                                    </div>

                                    {/* Option 3: Reject */}
                                    <div className={`p-3 border rounded cursor-pointer transition ${
                                      decision?.decision === 'reject' 
                                        ? 'bg-red-100 border-red-500' 
                                        : 'bg-white border-gray-200 hover:border-red-400'
                                    }`}>
                                      <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`decision-${item.id}`}
                                          value="reject"
                                          checked={decision?.decision === 'reject'}
                                          onChange={() => setItemDecision(item.id, 'reject', 0)}
                                          className="mt-1"
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium text-red-700">✗ Reject Request</div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            Reject this item from the request entirely
                                          </div>
                                        </div>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Selected Decision Indicator */}
                                  {decision?.decision && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                      <strong className="text-blue-900">✓ Decision Set: </strong>
                                      <span className="text-blue-800">
                                        {decision.decision === 'approve_wing' && '✓ Approve from Wing'}
                                        {decision.decision === 'forward_admin' && '⏭ Forward to Admin'}
                                        {decision.decision === 'reject' && '✗ Reject'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Items */}
                      {selectedRequest.custom_items && selectedRequest.custom_items.length > 0 && (
                        <div>
                          <strong className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            Custom Items ({selectedRequest.custom_items.length}):
                          </strong>
                          <div className="space-y-2 mt-2">
                            {selectedRequest.custom_items.map(item => (
                              <div key={item.id} className="p-3 border rounded bg-orange-50 border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">{item.custom_item_name || item.nomenclature}</div>
                                  <Badge variant="secondary" className="text-xs">Custom</Badge>
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  Qty: {item.requested_quantity}
                                </div>
                                
                                <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800">
                                  📋 <strong>Custom Item Policy:</strong> This item will be automatically sent to the tender process for procurement. 
                                  No immediate approval needed - it will be handled through procurement workflow.
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Approval Actions */}
                    <div className="space-y-3 mt-6 pt-6 border-t">
                      {/* Decision Summary */}
                      {selectedRequest.items.length > 0 && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                          <div className="text-sm font-medium text-gray-900 mb-2">Decision Summary:</div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-green-100 p-2 rounded text-center">
                              <div className="font-bold text-green-900">{getDecisionSummary(selectedRequest).approveWing}</div>
                              <div className="text-gray-600">Wing Approve</div>
                            </div>
                            <div className="bg-amber-100 p-2 rounded text-center">
                              <div className="font-bold text-amber-900">{getDecisionSummary(selectedRequest).forwardAdmin}</div>
                              <div className="text-gray-600">Forward Admin</div>
                            </div>
                            <div className="bg-red-100 p-2 rounded text-center">
                              <div className="font-bold text-red-900">{getDecisionSummary(selectedRequest).reject}</div>
                              <div className="text-gray-600">Reject</div>
                            </div>
                            <div className="bg-gray-100 p-2 rounded text-center">
                              <div className="font-bold text-gray-900">{getDecisionSummary(selectedRequest).undecided}</div>
                              <div className="text-gray-600">Undecided</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Validation Alert */}
                      {selectedRequest.items.length > 0 && !hasDecisionForAllItems(selectedRequest) && (
                        <Alert className="border-orange-200 bg-orange-50">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800">
                            ⚠️ You have {getDecisionSummary(selectedRequest).undecided} items without a decision. 
                            Please make a decision for each item before submitting.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Custom Items Warning */}
                      {selectedRequest.has_custom_items && (
                        <Alert className="border-orange-200 bg-orange-50">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800">
                            This request contains {selectedRequest.custom_items?.length} custom item(s). 
                            Upon approval, custom items will be automatically routed to the tender process for procurement.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label htmlFor="comments">Comments (Optional)</Label>
                        <Textarea
                          id="comments"
                          value={approvalComments}
                          onChange={(e) => setApprovalComments(e.target.value)}
                          placeholder="Add general comments about your decisions, stock considerations, etc."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => processApproval('approve')}
                          disabled={isLoading || !approverName || (selectedRequest.items.length > 0 && !hasDecisionForAllItems(selectedRequest))}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isLoading ? <LoadingSpinner /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Submit Decisions
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(null);
                            setItemDecisions(new Map());
                            setApprovalComments('');
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a request to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalManagement;
