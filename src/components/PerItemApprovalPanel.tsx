import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Package } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import approvalService from '@/services/approvalService';

interface PerItemApprovalPanelProps {
  approvalId: string;
  onActionComplete?: () => void;
}

interface ItemDecision {
  itemId: string;
  decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | null;
  approvedQuantity: number;
  reason?: string;
}

interface RequestItem {
  id: string;
  item_id?: string;
  nomenclature?: string;
  item_name?: string;
  custom_item_name?: string;
  requested_quantity?: number;
  quantity?: number;
  stock_status?: string;
  current_stock?: number;
  wing_stock_available?: number;
}

interface ApprovalRequest {
  id: string;
  request_id?: string;
  request_number: string;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  purpose?: string;
  urgency_level?: string;
  items?: RequestItem[];
  approval_items?: RequestItem[];
  request_items?: RequestItem[];
  inventory_items?: RequestItem[];
  custom_items?: RequestItem[];
}

export const PerItemApprovalPanel: React.FC<PerItemApprovalPanelProps> = ({
  approvalId,
  onActionComplete
}) => {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('Wing Supervisor');
  const [approvalComments, setApprovalComments] = useState('');
  const [itemDecisions, setItemDecisions] = useState<Map<string, ItemDecision>>(new Map());

  useEffect(() => {
    loadApprovalRequest();
  }, [approvalId]);

  const loadApprovalRequest = async () => {
    try {
      setLoading(true);
      // Fetch the approval request details
      const response = await fetch(`http://localhost:3001/api/approvals/${approvalId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load approval');
      const responseData = await response.json();
      
      // Extract data from wrapper if present
      let data = responseData.data || responseData;
      
      console.log('🔍 API Response from /api/approvals/{id}:', JSON.stringify(data, null, 2));
      console.log('🔍 Response keys:', Object.keys(data));
      console.log('🔍 data.items type:', typeof data.items, 'Array?:', Array.isArray(data.items));
      
      // Ensure items array exists - try multiple possible field names
      if (!data.items) {
        if (data.approval_items) {
          console.log('ℹ️ Using data.approval_items');
          data.items = data.approval_items;
        } else if (data.request_items) {
          console.log('ℹ️ Using data.request_items');
          data.items = data.request_items;
        } else if (data.item_list) {
          console.log('ℹ️ Using data.item_list');
          data.items = data.item_list;
        } else {
          console.log('ℹ️ No items field found, initializing empty array');
          data.items = [];
        }
      }
      
      // If still no items but we have item_ids, we need to fetch them separately
      if (!data.items || (Array.isArray(data.items) && data.items.length === 0) || !Array.isArray(data.items)) {
        console.warn('⚠️ No items found in response or not an array, fetching from approval items endpoint');
        try {
          const itemsResponse = await fetch(`http://localhost:3001/api/approval-items/${approvalId}`, {
            credentials: 'include'
          });
          if (itemsResponse.ok) {
            const itemsDataWrapper = await itemsResponse.json();
            const itemsData = itemsDataWrapper.data || itemsDataWrapper;
            
            console.log('✅ Fetched from /api/approval-items:', JSON.stringify(itemsData, null, 2));
            console.log('✅ itemsData type:', typeof itemsData, 'Array?:', Array.isArray(itemsData));
            console.log('✅ itemsData keys:', Object.keys(itemsData));
            
            // Handle if response is an array or object with items property
            if (Array.isArray(itemsData)) {
              console.log('✅ Using itemsData as array directly');
              data.items = itemsData;
            } else if (itemsData?.items && Array.isArray(itemsData.items)) {
              console.log('✅ Using itemsData.items');
              data.items = itemsData.items;
            } else if (itemsData?.approval_items && Array.isArray(itemsData.approval_items)) {
              console.log('✅ Using itemsData.approval_items');
              data.items = itemsData.approval_items;
            } else if (itemsData?.request_items && Array.isArray(itemsData.request_items)) {
              console.log('✅ Using itemsData.request_items');
              data.items = itemsData.request_items;
            } else if (itemsData?.data && Array.isArray(itemsData.data)) {
              console.log('✅ Using itemsData.data');
              data.items = itemsData.data;
            } else {
              console.warn('⚠️ Could not find array in itemsData, setting empty:', itemsData);
              data.items = [];
            }
          }
        } catch (err) {
          console.error('Failed to fetch approval items:', err);
          data.items = [];
        }
      }
      
      // Ensure items is always an array
      if (!Array.isArray(data.items)) {
        console.warn('⚠️ After all processing, items is still not an array:', typeof data.items, data.items);
        data.items = [];
      }
      
      console.log('✅ FINAL: Loaded approval request with items:', data.items?.length || 0, 'items:', data.items);
      setRequest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load approval request');
      console.error('Error loading approval:', err);
    } finally {
      setLoading(false);
    }
  };

  const setItemDecision = (
    itemId: string,
    decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject',
    approvedQty: number
  ) => {
    const newDecisions = new Map(itemDecisions);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason: ''
    });
    setItemDecisions(newDecisions);
  };

  const getItemName = (item: RequestItem) => {
    return item.nomenclature || item.item_name || item.custom_item_name || 'Unknown Item';
  };

  const getItemQuantity = (item: RequestItem) => {
    return item.requested_quantity || item.quantity || 0;
  };

  const getItemId = (item: RequestItem) => {
    return item.id || item.item_id || '';
  };

  const hasDecisionForAllItems = (): boolean => {
    if (!request || !request.items || !Array.isArray(request.items) || request.items.length === 0) return false;
    return request.items.every(item => getItemDecision(getItemId(item))?.decision !== null);
  };

  const getDecisionSummary = () => {
    if (!request || !request.items) return { approveWing: 0, forwardAdmin: 0, forwardSupervisor: 0, reject: 0, undecided: 0 };
    const decisions = request.items.map(item => getItemDecision(getItemId(item)));
    return {
      approveWing: decisions.filter(d => d?.decision === 'approve_wing').length,
      forwardAdmin: decisions.filter(d => d?.decision === 'forward_admin').length,
      forwardSupervisor: decisions.filter(d => d?.decision === 'forward_supervisor').length,
      reject: decisions.filter(d => d?.decision === 'reject').length,
      undecided: decisions.filter(d => !d || !d.decision).length
    };
  };

  const submitDecisions = async () => {
    if (!request || !approverName) {
      setError('Please enter your name before submitting');
      return;
    }

    if (!hasDecisionForAllItems()) {
      setError('Please make a decision for each item before submitting');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const items = request.items || [];
      const itemAllocations = items.map(item => {
        const itemId = getItemId(item);
        const decision = getItemDecision(itemId);
        let decisionType: 'APPROVE_FROM_STOCK' | 'APPROVE_FOR_PROCUREMENT' | 'FORWARD_TO_SUPERVISOR' | 'REJECT' = 'REJECT';
        let allocatedQty = 0;

        if (decision?.decision === 'approve_wing') {
          decisionType = 'APPROVE_FROM_STOCK';
          allocatedQty = decision.approvedQuantity || getItemQuantity(item);
        } else if (decision?.decision === 'forward_admin') {
          decisionType = 'APPROVE_FOR_PROCUREMENT';
          allocatedQty = decision.approvedQuantity || getItemQuantity(item);
        } else if (decision?.decision === 'forward_supervisor') {
          decisionType = 'FORWARD_TO_SUPERVISOR';
          allocatedQty = decision.approvedQuantity || getItemQuantity(item);
        } else {
          decisionType = 'REJECT';
          allocatedQty = 0;
        }

        return {
          requested_item_id: itemId,
          allocated_quantity: allocatedQty,
          decision_type: decisionType,
          rejection_reason: decision?.decision === 'reject' ? (decision.reason || 'Request rejected by supervisor') : undefined,
          forwarding_reason: (decision?.decision === 'forward_admin' || decision?.decision === 'forward_supervisor')
            ? (decision.reason || 'Forwarded for further approval')
            : undefined
        };
      });

      const response = await fetch(`http://localhost:3001/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approver_name: approverName,
          approver_designation: approverDesignation,
          approval_comments: approvalComments,
          item_allocations: itemAllocations
        })
      });

      if (!response.ok) throw new Error('Failed to submit approval');
      
      setSuccess('Per-item approval decisions submitted successfully!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading approval details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">Failed to load approval request</AlertDescription>
      </Alert>
    );
  }

  const summary = getDecisionSummary();
  
  const getItemDecision = (itemId: string): ItemDecision | undefined => {
    return itemDecisions.get(itemId);
  };
  
  const isInWing = (item: RequestItem) => item.stock_status === 'sufficient';

  return (
    <div className="space-y-6">
      {/* Approval Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-600 font-medium">Request Number</div>
              <div className="font-semibold">{request.request_number}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Requester</div>
              <div className="font-semibold">{request.requester_name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Department</div>
              <div className="font-semibold">{request.requester_department || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Urgency</div>
              <Badge className="text-xs" variant="outline">{request.urgency_level}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-medium mb-1">Purpose</div>
            <p className="text-sm text-gray-700">{request.purpose}</p>
          </div>
        </CardContent>
      </Card>

      {/* Approver Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="approverName" className="text-xs">Your Name *</Label>
              <Input
                id="approverName"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Enter your name"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="approverDesignation" className="text-xs">Designation</Label>
              <Input
                id="approverDesignation"
                value={approverDesignation}
                onChange={(e) => setApproverDesignation(e.target.value)}
                placeholder="Your designation"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items with Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Items for Decision ({request?.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {request?.items && request.items.length > 0 ? (
              request.items.map(item => {
                const itemId = getItemId(item);
                const decision = getItemDecision(itemId);
                const inWing = isInWing(item);

                return (
                  <div key={itemId} className="p-4 border rounded-lg bg-gray-50">
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900">{getItemName(item)}</h4>
                    <p className="text-sm text-gray-600">Requested: {getItemQuantity(item)} units</p>
                    {inWing && (
                      <Badge className="mt-2 bg-green-100 text-green-800">✓ Available in Wing</Badge>
                    )}
                    {!inWing && (
                      <Badge className="mt-2 bg-red-100 text-red-800">✗ Not in Wing</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Option 1 */}
                    <label className={`p-3 border rounded cursor-pointer transition ${
                      decision?.decision === 'approve_wing'
                        ? 'bg-green-100 border-green-500'
                        : 'bg-white border-gray-200 hover:border-green-400'
                    } ${!inWing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'approve_wing'}
                          onChange={() => setItemDecision(itemId, 'approve_wing', getItemQuantity(item))}
                          disabled={!inWing}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-green-700">✓ Approve & Provide from Wing</div>
                          <div className="text-xs text-gray-600">Deduct from wing and allocate immediately</div>
                        </div>
                      </div>
                    </label>

                    {/* Option 2 */}
                    <label className={`p-3 border rounded cursor-pointer transition ${
                      decision?.decision === 'forward_admin'
                        ? 'bg-amber-100 border-amber-500'
                        : 'bg-white border-gray-200 hover:border-amber-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'forward_admin'}
                          onChange={() => setItemDecision(itemId, 'forward_admin', getItemQuantity(item))}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-amber-700">⏭ Forward to Admin</div>
                          <div className="text-xs text-gray-600">Send to admin warehouse for approval</div>
                        </div>
                      </div>
                    </label>

                    {/* Option 3 */}
                    <label className={`p-3 border rounded cursor-pointer transition ${
                      decision?.decision === 'forward_supervisor'
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'forward_supervisor'}
                          onChange={() => setItemDecision(itemId, 'forward_supervisor', getItemQuantity(item))}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-blue-700">↗ Forward to Supervisor</div>
                          <div className="text-xs text-gray-600">Send to supervisor level for approval</div>
                        </div>
                      </div>
                    </label>

                    {/* Option 4 */}
                    <label className={`p-3 border rounded cursor-pointer transition ${
                      decision?.decision === 'reject'
                        ? 'bg-red-100 border-red-500'
                        : 'bg-white border-gray-200 hover:border-red-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'reject'}
                          onChange={() => setItemDecision(itemId, 'reject', 0)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-red-700">✗ Reject</div>
                          <div className="text-xs text-gray-600">Don't allocate this item</div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {decision?.decision && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <strong>Decision: </strong>
                      {decision.decision === 'approve_wing' && '✓ Approve from Wing'}
                      {decision.decision === 'forward_admin' && '⏭ Forward to Admin'}
                      {decision.decision === 'forward_supervisor' && '↗ Forward to Supervisor'}
                      {decision.decision === 'reject' && '✗ Reject'}
                    </div>
                  )}
                </div>
              );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No items in this request</p>
              </div>
            )}
          </div>

          {/* Decision Summary */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <div className="text-sm font-medium text-gray-900 mb-2">Decision Summary:</div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="bg-green-100 p-2 rounded text-center">
                <div className="font-bold text-green-900">{summary.approveWing}</div>
                <div className="text-gray-600 text-xs">Wing</div>
              </div>
              <div className="bg-amber-100 p-2 rounded text-center">
                <div className="font-bold text-amber-900">{summary.forwardAdmin}</div>
                <div className="text-gray-600 text-xs">Admin</div>
              </div>
              <div className="bg-blue-100 p-2 rounded text-center">
                <div className="font-bold text-blue-900">{summary.forwardSupervisor}</div>
                <div className="text-gray-600 text-xs">Supv</div>
              </div>
              <div className="bg-red-100 p-2 rounded text-center">
                <div className="font-bold text-red-900">{summary.reject}</div>
                <div className="text-gray-600 text-xs">Reject</div>
              </div>
              <div className="bg-gray-100 p-2 rounded text-center">
                <div className="font-bold text-gray-900">{summary.undecided}</div>
                <div className="text-gray-600 text-xs">Decide</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            placeholder="Add any comments about your decisions..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex gap-2">
        <Button
          onClick={submitDecisions}
          disabled={submitting || !approverName || !hasDecisionForAllItems()}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {submitting ? <LoadingSpinner /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Submit All Decisions
        </Button>
      </div>
    </div>
  );
};

export default PerItemApprovalPanel;
