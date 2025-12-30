import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Package } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import approvalService from '@/services/approvalService';

// Get API URL from environment or default to localhost
const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PerItemApprovalPanelProps {
  approvalId: string;
  onActionComplete?: () => void;
  activeFilter?: 'pending' | 'approved' | 'rejected' | 'returned' | 'forwarded';
}

interface ItemDecision {
  itemId: string;
  decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return' | null;
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
  issued_quantity?: number;
  item_code?: string;
  item_description?: string;
  unit?: string;
  approved_quantity?: number;
  request_purpose?: string;
  expected_return_date?: string;
  is_returnable?: boolean;
  item_status?: string;
  item_master_id?: string | null;
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
  submitted_by_name?: string;
  request_type?: string;
  current_status?: string;
  workflow_id?: string;
  current_approver_id?: string;
  submitted_by?: string;
  submitted_date?: string;
  finalized_by?: string | null;
  finalized_date?: string | null;
  rejected_by?: string | null;
  rejected_date?: string | null;
  rejection_reason?: string | null;
  created_date?: string;
  updated_date?: string;
  current_approver_name?: string;
  workflow_name?: string;
}

export const PerItemApprovalPanel: React.FC<PerItemApprovalPanelProps> = ({
  approvalId,
  onActionComplete,
  activeFilter = 'pending'
}) => {
  // Debug: Confirm latest code is running
  console.log('🚀 PerItemApprovalPanel: Latest code loaded - Return button should be visible!');
  console.log('📋 Approval ID:', approvalId);
  console.log('📊 Active Filter:', activeFilter);
  console.log('✅ Component should render 5-button grid: ✓Approve, ⏭Forward, ↗Forward, ✗Reject, ↩Return');

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
  const [requestStatus, setRequestStatus] = useState<'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return' | null>(null);
  
  // Stock check state
  const [selectedItemForStock, setSelectedItemForStock] = useState<any>(null);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);
  const [stockAvailable, setStockAvailable] = useState<number>(0);
  const [wingConfirmItem, setWingConfirmItem] = useState<any>(null);
  const [wingConfirmLoading, setWingConfirmLoading] = useState(false);
  const [wingStockAvailable, setWingStockAvailable] = useState<number>(0);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'sent' | 'error' | null>(null);

  // Helper function to check if request has any returned items
  const hasReturnedItems = () => {
    if (!request?.items) return false;
    return request.items.some((item: any) => 
      item.decision_type === 'RETURN' ||
      (item.decision_type === 'REJECT' && item.rejection_reason?.toLowerCase().includes('returned to requester'))
    );
  };

  // Helper function to check if controls should be disabled
  const shouldDisableControls = () => {
    // Disable controls if user clicked on a non-pending filter (viewing past decisions)
    return activeFilter !== 'pending' || hasReturnedItems();
  };

  useEffect(() => {
    loadApprovalRequest();
  }, [approvalId]);

  const loadApprovalRequest = async () => {
    try {
      setLoading(true);
      // Fetch the approval request details
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/approvals/${approvalId}`, {
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
          const apiUrl = getApiUrl();
          const itemsResponse = await fetch(`${apiUrl}/api/approval-items/${approvalId}`, {
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
      
      // Initialize item decisions from database values for highlighting
      if (data.items && Array.isArray(data.items)) {
        const initialDecisions = new Map<string, ItemDecision>();
        data.items.forEach((item: any) => {
          if (item.decision_type) {
            let decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return' | null = null;
            let approvedQty = 0;
            
            switch (item.decision_type) {
              case 'APPROVE_FROM_STOCK':
                decision = 'approve_wing';
                approvedQty = item.allocated_quantity || item.requested_quantity || 0;
                break;
              case 'FORWARD_TO_ADMIN':
                decision = 'forward_admin';
                break;
              case 'FORWARD_TO_SUPERVISOR':
                decision = 'forward_supervisor';
                break;
                case 'REJECT':
                  if (item.rejection_reason?.toLowerCase().includes('returned to requester')) {
                    decision = 'return';
                  } else {
                    decision = 'reject';
                  }
                  break;
                case 'RETURN':
                  // New explicit return decision type (DB + backend will use this)
                  decision = 'return';
                  break;
            }
            
            if (decision) {
              initialDecisions.set(item.id, {
                itemId: item.id,
                decision,
                approvedQuantity: approvedQty,
                reason: item.rejection_reason || item.forwarding_reason || ''
              });
            }
          }
        });
        setItemDecisions(initialDecisions);
        console.log('✅ Initialized item decisions from database:', Array.from(initialDecisions.entries()));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load approval request');
      console.error('Error loading approval:', err);
    } finally {
      setLoading(false);
    }
  };

  const setItemDecision = (
    itemId: string,
    decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return',
    approvedQty: number
  ) => {
    const newDecisions = new Map(itemDecisions);
    const existingDecision = newDecisions.get(itemId);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason: existingDecision?.reason || ''
    });
    setItemDecisions(newDecisions);
  };

  const handleRequestStatusChange = (status: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return' | null) => {
    setRequestStatus(status);
    
    const newDecisions = new Map<string, ItemDecision>();
    
    if (request?.items && Array.isArray(request.items)) {
      if (status === 'reject') {
        // Reject all items
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'reject',
            approvedQuantity: 0,
            reason: 'Request rejected at request level'
          });
        });
      } else if (status === 'approve_wing') {
        // Approve all items
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'approve_wing',
            approvedQuantity: getItemQuantity(item),
            reason: 'Request approved at request level'
          });
        });
      } else if (status === 'forward_admin') {
        // Forward all items to admin
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'forward_admin',
            approvedQuantity: 0,
            reason: 'Request forwarded to admin at request level'
          });
        });
      } else if (status === 'forward_supervisor') {
        // Forward all items to supervisor
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'forward_supervisor',
            approvedQuantity: 0,
            reason: 'Request forwarded to supervisor at request level'
          });
        });
      } else if (status === 'return') {
        // Return all items to requester
        request.items.forEach((item: any) => {
          const itemId = getItemId(item);
          newDecisions.set(itemId, {
            itemId,
            decision: 'return',
            approvedQuantity: 0,
            reason: 'Request returned to requester at request level'
          });
        });
      }
      
      if (newDecisions.size > 0) {
        setItemDecisions(newDecisions);
      }
    }
  };

  const handleItemDecisionChange = (itemId: string, decision: 'approve_wing' | 'forward_admin' | 'forward_supervisor' | 'reject' | 'return', approvedQty: number) => {
    setItemDecision(itemId, decision, approvedQty);
    
    // Update request status based on item decisions
    // If any item is returned, set request to return
    // If all items are rejected, set request to reject
    const newDecisions = new Map(itemDecisions);
    newDecisions.set(itemId, {
      itemId,
      decision,
      approvedQuantity: approvedQty,
      reason: newDecisions.get(itemId)?.reason || ''
    });
    
    const allItemsRejected = Array.from(newDecisions.values()).every(d => d.decision === 'reject');
    const anyItemApproved = Array.from(newDecisions.values()).some(d => d.decision === 'approve_wing');
    const anyItemReturned = Array.from(newDecisions.values()).some(d => d.decision === 'return');
    
    // Auto-update request status based on item decisions
    if (anyItemReturned) {
      // If ANY item is returned → set request status to return
      setRequestStatus('return');
    } else if (allItemsRejected && newDecisions.size > 0) {
      setRequestStatus('reject');
    } else if (anyItemApproved && newDecisions.size > 0) {
      // If any item is approved, suggest approve status
      if (!requestStatus) {
        setRequestStatus('approve_wing');
      }
    }
  };

  const getItemName = (item: RequestItem) => {
    return item.nomenclature || item.item_name || item.custom_item_name || 'Unknown Item';
  };

  const getItemQuantity = (item: RequestItem) => {
    return item.requested_quantity || item.quantity || 0;
  };

  const getItemId = (item: RequestItem) => {
    const id = item.id || item.item_id || '';
    console.log('🔍 getItemId for', item.nomenclature, ':', id);
    return id;
  };

  const getItemDecision = (itemId: string): ItemDecision | undefined => {
    return itemDecisions.get(itemId);
  };

  // Helper function to filter items by current approval status
  const getFilteredItems = () => {
    if (!request?.items || !Array.isArray(request.items)) return [];
    
    // Filter based on which card the user clicked (activeFilter)
    // not based on the approval's overall status
    
    // If user clicked pending, show items with PENDING decision type
    if (activeFilter === 'pending') {
      return request.items.filter((item: any) => 
        !item.decision_type || item.decision_type === '' || item.decision_type === 'PENDING'
      );
    }
    
    // If user clicked approved, show only approved items
    if (activeFilter === 'approved') {
      return request.items.filter((item: any) => 
        item.decision_type === 'APPROVE_FROM_STOCK' || 
        item.decision_type === 'APPROVE_FOR_PROCUREMENT'
      );
    }
    
    // If user clicked rejected, show only rejected items
    if (activeFilter === 'rejected') {
      return request.items.filter((item: any) => 
        item.decision_type === 'REJECT' && 
        !item.rejection_reason?.toLowerCase().includes('returned to requester')
      );
    }
    
    // If user clicked returned, show only returned items
    if (activeFilter === 'returned') {
      return request.items.filter((item: any) => 
        item.decision_type === 'RETURN' || 
        (item.decision_type === 'REJECT' && 
         item.rejection_reason?.toLowerCase().includes('returned to requester'))
      );
    }
    
    // If user clicked forwarded, show only forwarded items
    if (activeFilter === 'forwarded') {
      return request.items.filter((item: any) => 
        item.decision_type === 'FORWARD_TO_SUPERVISOR' || 
        item.decision_type === 'FORWARD_TO_ADMIN'
      );
    }
    
    // Default: show all items
    return request.items;
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
    if (!request) {
      setError('Approval request not loaded');
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
      let decisionType: 'APPROVE_FROM_STOCK' | 'APPROVE_FOR_PROCUREMENT' | 'FORWARD_TO_SUPERVISOR' | 'REJECT' | 'RETURN' = 'REJECT';
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
        } else if (decision?.decision === 'return') {
          decisionType = 'RETURN'; // Use explicit RETURN decision type
          allocatedQty = 0;
        } else {
          decisionType = 'REJECT';
          allocatedQty = 0;
        }

        return {
          requested_item_id: itemId,
          allocated_quantity: allocatedQty,
          decision_type: decisionType,
          rejection_reason: decision?.decision === 'reject' 
            ? (decision.reason || 'Request rejected by supervisor') 
            : decision?.decision === 'return'
            ? (decision.reason || 'Request returned to requester for editing')
            : undefined,
          forwarding_reason: (decision?.decision === 'forward_admin' || decision?.decision === 'forward_supervisor')
            ? (decision.reason || 'Forwarded for further approval')
            : undefined
        };
      });

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approver_name: approverName || 'System',
          approver_designation: approverDesignation || 'Wing Supervisor',
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

  const checkStockAvailability = async (item: any) => {
    setSelectedItemForStock(item);
    setStockCheckLoading(true);
    try {
      // Fetch actual stock from inventory
      const itemMasterId = item.item_master_id || item.id;
      const response = await fetch(`http://localhost:3001/api/inventory/stock/${itemMasterId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const available = data.available_quantity || data.quantity || 0;
        setStockAvailable(available);
        console.log('✓ Stock available:', available);
      } else {
        setStockAvailable(0);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
      setStockAvailable(0);
    } finally {
      setStockCheckLoading(false);
    }
  };

  const confirmWingStock = async (item: any) => {
    setWingConfirmItem(item);
    setWingConfirmLoading(true);
    setConfirmationStatus('pending');
    setError('');
    
    try {
      // Send stock confirmation request to wing stock supervisor
      // Use item_id, item_master_id, or id whichever is available
      const itemId = item.item_id || item.item_master_id || item.id;
      const apiUrl = getApiUrl();
      const endpoint = `${apiUrl}/api/approvals/${approvalId}/request-wing-stock-confirmation`;
      
      console.log('🔄 Sending wing stock confirmation request to:', endpoint);
      console.log('📦 Item ID sources - item_id:', item.item_id, 'item_master_id:', item.item_master_id, 'id:', item.id, 'FINAL:', itemId);
      console.log('Request payload:', {
        item_id: itemId,
        item_name: getItemName(item),
        requested_quantity: getItemQuantity(item),
        approval_id: approvalId,
        request_type: 'wing_stock_confirmation'
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          item_id: itemId,
          item_name: getItemName(item),
          requested_quantity: getItemQuantity(item),
          approval_id: approvalId,
          request_type: 'wing_stock_confirmation'
        })
      });
      
      console.log('📥 Response received - Status:', response.status, response.statusText);
      
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('❌ Failed to parse JSON response:', parseErr);
        const text = await response.text();
        console.log('Response text:', text);
        setError('Server returned invalid response: ' + text.substring(0, 100));
        setConfirmationStatus('error');
        setWingConfirmLoading(false);
        return;
      }
      
      console.log('📋 Response data:', data);
      console.log('Response status OK?', response.ok);
      console.log('Data success?', data?.success);

      // Consider it successful if response.ok OR data.success OR status 200
      if (response.status === 200 || response.ok || data?.success) {
        console.log('✓ Wing stock confirmation request sent successfully:', data);
        setConfirmationStatus('sent');
        setSuccess('✓ Confirmation request sent to Wing Stock Supervisor');
      } else {
        const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        setError(errorMsg);
        setConfirmationStatus('error');
        console.error('❌ Request failed:', { status: response.status, statusOk: response.ok, data });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Error sending wing stock confirmation request:', err);
      setError('Error: ' + errorMsg);
      setConfirmationStatus('error');
    } finally {
      setWingConfirmLoading(false);
    }
  };

  const handleConfirmWing = () => {
    // This will be called by the wing stock supervisor from their dashboard
    setConfirmationStatus('confirmed');
    console.log('✓ Wing stock confirmed for item:', getItemId(wingConfirmItem));
  };

  const handleRejectWing = () => {
    setConfirmationStatus('rejected');
    console.log('✗ Wing stock rejected for item:', getItemId(wingConfirmItem));
  };

  if (!request) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">Failed to load approval request</AlertDescription>
      </Alert>
    );
  }

  const summary = getDecisionSummary();
  
  const isInWing = (item: RequestItem) => {
    // Check various indicators that item is available in wing
    // For now, assume items in the approval request are available unless explicitly marked otherwise
    return !item.issued_quantity || item.issued_quantity === 0;
  };

  return (
    <div className="space-y-6">
      {/* Approval Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasReturnedItems() && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                This request contains items that have been returned to the requester for revision. 
                All approval controls are disabled until the returned items are resubmitted.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-600 font-medium">Request Number</div>
              <div className="font-semibold">{request?.request_number || request?.id || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Requester</div>
              <div className="font-semibold">{request?.submitted_by_name || request?.requester_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Request Type</div>
              <div className="font-semibold">{request?.request_type || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Status</div>
              <Badge className="text-xs" variant="outline">{request?.current_status || 'N/A'}</Badge>
            </div>
          </div>

          {/* Request-Level Status Selection */}
          {!shouldDisableControls() && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-semibold mb-2 block">Request Decision</Label>
              <Select 
                value={requestStatus || ''} 
                onValueChange={(value) => handleRequestStatusChange(value as any)}
              >
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Select request decision..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_wing">
                    <span className="flex items-center gap-2">
                      ✓ Approve from Wing
                    </span>
                  </SelectItem>
                  <SelectItem value="forward_admin">
                    <span className="flex items-center gap-2">
                      ⏭ Forward to Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="forward_supervisor">
                    <span className="flex items-center gap-2">
                      ↗ Forward to Supervisor
                    </span>
                  </SelectItem>
                  <SelectItem value="return">
                    <span className="flex items-center gap-2">
                      ↩ Return All
                    </span>
                  </SelectItem>
                  <SelectItem value="reject">
                    <span className="flex items-center gap-2">
                      ✗ Reject All
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {requestStatus && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={`${
                    requestStatus === 'approve_wing' ? 'bg-green-100 text-green-800' :
                    requestStatus === 'forward_admin' ? 'bg-amber-100 text-amber-800' :
                    requestStatus === 'forward_supervisor' ? 'bg-blue-100 text-blue-800' :
                    requestStatus === 'return' ? 'bg-orange-100 text-orange-800' :
                    requestStatus === 'reject' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {requestStatus === 'approve_wing' ? '✓ Approve' :
                     requestStatus === 'forward_admin' ? '⏭ Forward to Admin' :
                     requestStatus === 'forward_supervisor' ? '↗ Forward to Supervisor' :
                     requestStatus === 'return' ? '↩ Return' :
                     requestStatus === 'reject' ? '✗ Reject' : 'Selected'}
                  </Badge>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-2">
                💡 Selecting any request-level action marks all items with that decision. You can also make individual item decisions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items with Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            {request?.current_status === 'pending' ? 'Items for Decision' : `Items (${request?.current_status?.toUpperCase()})`}
            ({getFilteredItems().length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {getFilteredItems().length > 0 ? (
              getFilteredItems().map((item: any) => {
                const itemId = getItemId(item);
                const decision = getItemDecision(itemId);

                const isReturnedItem = item.decision_type === 'RETURN' || (
                  item.decision_type === 'REJECT' && 
                  item.rejection_reason?.toLowerCase().includes('returned to requester')
                );

                return (
                  <div key={itemId} className={`p-4 border rounded-lg ${
                    isReturnedItem 
                      ? 'bg-orange-50 border-orange-300 shadow-sm' 
                      : 'bg-gray-50'
                  }`}>
                    {isReturnedItem && (
                      <div className="mb-2">
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                          ↩ Returned to Requester
                        </Badge>
                      </div>
                    )}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{getItemName(item)}</h4>
                      {decision?.decision && (
                        <Badge variant="outline" className={`text-xs ${
                          decision.decision === 'approve_wing' ? 'bg-green-100 text-green-800 border-green-300' :
                          decision.decision === 'forward_admin' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          decision.decision === 'forward_supervisor' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          decision.decision === 'reject' ? 'bg-red-100 text-red-800 border-red-300' :
                          decision.decision === 'return' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {decision.decision === 'approve_wing' ? '✓ Approved' :
                           decision.decision === 'forward_admin' ? '⏭ Forwarded to Admin' :
                           decision.decision === 'forward_supervisor' ? '⏭ Forwarded to Supervisor' :
                           decision.decision === 'reject' ? '✗ Rejected' :
                           decision.decision === 'return' ? '↩ Returned' :
                           'Unknown'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Requested: {getItemQuantity(item)} units</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => checkStockAvailability(item)}
                      >
                        🔍 Check Stock Availability
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => confirmWingStock(item)}
                      >
                        ✓ Confirm from Wing Stock
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 min-w-fit border border-gray-200 p-2 rounded">
                    {/* Grid should have 5 columns - Return button is the 5th */}
                    {/* Option 1 - Approve */}
                    {request?.current_status === 'pending' ? (
                      <label className={`p-2 border rounded transition flex flex-col items-center text-center ${
                        decision?.decision === 'approve_wing'
                          ? 'bg-green-100 border-green-500'
                          : 'bg-white border-gray-200 hover:border-green-400'
                      } ${shouldDisableControls() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'approve_wing'}
                          onChange={() => handleItemDecisionChange(itemId, 'approve_wing', getItemQuantity(item))}
                          disabled={shouldDisableControls()}
                          className="mb-2"
                        />
                        <div className="text-sm font-medium text-green-700">✓ Approve</div>
                        <div className="text-xs text-gray-600 mt-1">From Wing</div>
                      </label>
                    ) : (
                      <div className={`p-2 border rounded flex flex-col items-center text-center ${
                        decision?.decision === 'approve_wing'
                          ? 'bg-green-100 border-green-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="text-sm font-medium text-green-700">✓ Approve</div>
                        <div className="text-xs text-gray-600 mt-1">From Wing</div>
                      </div>
                    )}

                    {/* Option 2 - Forward to Admin */}
                    {request?.current_status === 'pending' ? (
                      <label className={`p-2 border rounded transition flex flex-col items-center text-center ${
                        decision?.decision === 'forward_admin'
                          ? 'bg-amber-100 border-amber-500'
                          : 'bg-white border-gray-200 hover:border-amber-400'
                      } ${shouldDisableControls() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'forward_admin'}
                          onChange={() => handleItemDecisionChange(itemId, 'forward_admin', getItemQuantity(item))}
                          disabled={shouldDisableControls()}
                          className="mb-2"
                        />
                        <div className="text-sm font-medium text-amber-700">⏭ Forward</div>
                        <div className="text-xs text-gray-600 mt-1">To Admin</div>
                      </label>
                    ) : (
                      <div className={`p-2 border rounded flex flex-col items-center text-center ${
                        decision?.decision === 'forward_admin'
                          ? 'bg-amber-100 border-amber-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="text-sm font-medium text-amber-700">⏭ Forward</div>
                        <div className="text-xs text-gray-600 mt-1">To Admin</div>
                      </div>
                    )}

                    {/* Option 3 - Forward to Supervisor */}
                    {request?.current_status === 'pending' ? (
                      <label className={`p-2 border rounded transition flex flex-col items-center text-center ${
                        decision?.decision === 'forward_supervisor'
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-blue-400'
                      } ${shouldDisableControls() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'forward_supervisor'}
                          onChange={() => handleItemDecisionChange(itemId, 'forward_supervisor', getItemQuantity(item))}
                          disabled={shouldDisableControls()}
                          className="mb-2"
                        />
                        <div className="text-sm font-medium text-blue-700">↗ Forward</div>
                        <div className="text-xs text-gray-600 mt-1">To Supervisor</div>
                      </label>
                    ) : (
                      <div className={`p-2 border rounded flex flex-col items-center text-center ${
                        decision?.decision === 'forward_supervisor'
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="text-sm font-medium text-blue-700">↗ Forward</div>
                        <div className="text-xs text-gray-600 mt-1">To Supervisor</div>
                      </div>
                    )}

                    {/* Option 4 - Reject */}
                    {request?.current_status === 'pending' ? (
                      <label className={`p-2 border rounded transition flex flex-col items-center text-center ${
                        decision?.decision === 'reject'
                          ? 'bg-red-100 border-red-500'
                          : 'bg-white border-gray-200 hover:border-red-400'
                      } ${shouldDisableControls() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'reject'}
                          onChange={() => handleItemDecisionChange(itemId, 'reject', 0)}
                          disabled={shouldDisableControls()}
                          className="mb-2"
                        />
                        <div className="text-sm font-medium text-red-700">✗ Reject</div>
                        <div className="text-xs text-gray-600 mt-1">Don't Allocate</div>
                      </label>
                    ) : (
                      <div className={`p-2 border rounded flex flex-col items-center text-center ${
                        decision?.decision === 'reject'
                          ? 'bg-red-100 border-red-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="text-sm font-medium text-red-700">✗ Reject</div>
                        <div className="text-xs text-gray-600 mt-1">Don't Allocate</div>
                      </div>
                    )}

                    {/* Option 5 - Return */}
                    {request?.current_status === 'pending' ? (
                      <label className={`p-2 border rounded transition flex flex-col items-center text-center ${
                        decision?.decision === 'return'
                          ? 'bg-orange-100 border-orange-500'
                          : 'bg-white border-gray-200 hover:border-orange-400'
                      } ${shouldDisableControls() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`decision-${itemId}`}
                          checked={decision?.decision === 'return'}
                          onChange={() => handleItemDecisionChange(itemId, 'return', 0)}
                          disabled={shouldDisableControls()}
                          className="mb-2"
                        />
                        <div className="text-sm font-medium text-orange-700">↩ Return</div>
                        <div className="text-xs text-gray-600 mt-1 leading-tight">To Requester</div>
                      </label>
                    ) : (
                      <div className={`p-2 border rounded flex flex-col items-center text-center ${
                        decision?.decision === 'return'
                          ? 'bg-orange-100 border-orange-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="text-sm font-medium text-orange-700">↩ Return</div>
                        <div className="text-xs text-gray-600 mt-1 leading-tight">To Requester</div>
                      </div>
                    )}
                  </div>

                  {/* Item-specific Description Box */}
                  <div className="mt-3">
                    <Label htmlFor={`item-description-${itemId}`} className="text-sm font-medium text-gray-700 mb-1 block">
                      Comments for this item (Optional)
                    </Label>
                    <Textarea
                      id={`item-description-${itemId}`}
                      placeholder="Add comments or reasons for this item's decision..."
                      value={decision?.reason || ''}
                      onChange={(e) => {
                        const newDecisions = new Map(itemDecisions);
                        const currentDecision = newDecisions.get(itemId) || {
                          itemId,
                          decision: null,
                          approvedQuantity: 0,
                          reason: ''
                        };
                        newDecisions.set(itemId, {
                          ...currentDecision,
                          reason: e.target.value
                        });
                        setItemDecisions(newDecisions);
                      }}
                      disabled={shouldDisableControls()}
                      className="min-h-16 resize-none text-sm"
                      rows={2}
                    />
                  </div>
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

        </CardContent>
      </Card>

      {/* Stock Details Modal */}
      <Dialog open={!!selectedItemForStock} onOpenChange={(open) => !open && setSelectedItemForStock(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stock Availability Details</DialogTitle>
          </DialogHeader>
          
          {selectedItemForStock && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Name</div>
                  <div className="font-semibold">{getItemName(selectedItemForStock)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Code</div>
                  <div className="font-semibold">{selectedItemForStock.item_code || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Requested Qty</div>
                  <div className="font-semibold">{getItemQuantity(selectedItemForStock)} {selectedItemForStock.unit || 'units'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Stock Available</div>
                  {stockCheckLoading ? (
                    <div className="text-xs"><LoadingSpinner size="sm" className="inline" /> Loading...</div>
                  ) : (
                    <div className={`font-bold ${stockAvailable >= getItemQuantity(selectedItemForStock) ? 'text-green-600' : 'text-red-600'}`}>
                      {stockAvailable} {selectedItemForStock.unit || 'units'}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Approved Qty</div>
                  <div className="font-semibold">{selectedItemForStock.approved_quantity || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Issued Qty</div>
                  <div className="font-semibold">{selectedItemForStock.issued_quantity || '0'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Status</div>
                  <div className="font-semibold">{selectedItemForStock.item_status || 'pending'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Returnable</div>
                  <div className="font-semibold">{selectedItemForStock.is_returnable ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 font-medium mb-1">Description</div>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedItemForStock.item_description || 'No description'}</p>
              </div>

              {/* Stock Status Badge */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                {stockAvailable >= getItemQuantity(selectedItemForStock) ? (
                  <div className="text-sm text-green-700">
                    <strong>✓ Stock Available</strong> - {stockAvailable} units in stock (Requested: {getItemQuantity(selectedItemForStock)})
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    <strong>✗ Insufficient Stock</strong> - Only {stockAvailable} units in stock (Requested: {getItemQuantity(selectedItemForStock)})
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => setSelectedItemForStock(null)} 
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wing Stock Confirmation Modal */}
      <Dialog open={!!wingConfirmItem} onOpenChange={(open) => !open && setWingConfirmItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Wing Stock Availability</DialogTitle>
          </DialogHeader>
          
          {wingConfirmItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Name</div>
                  <div className="font-semibold">{getItemName(wingConfirmItem)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Item Code</div>
                  <div className="font-semibold">{wingConfirmItem.item_code || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Requested Qty</div>
                  <div className="font-semibold">{getItemQuantity(wingConfirmItem)} {wingConfirmItem.unit || 'units'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium mb-1">Wing Stock Available</div>
                  {wingConfirmLoading ? (
                    <div className="text-xs"><LoadingSpinner size="sm" className="inline" /> Loading...</div>
                  ) : (
                    <div className={`font-bold ${wingStockAvailable >= getItemQuantity(wingConfirmItem) ? 'text-green-600' : 'text-red-600'}`}>
                      {wingStockAvailable} {wingConfirmItem.unit || 'units'}
                    </div>
                  )}
                </div>
              </div>

              {/* Wing Stock Status */}
              <div className="mt-4 p-3 rounded-lg border-2">
                {confirmationStatus === 'pending' && (
                  <div className="bg-yellow-50 border-yellow-200">
                    <div className="text-sm text-yellow-700">
                      <strong>⏳ Request Pending</strong> - Waiting to send confirmation request to Wing Stock Supervisor
                    </div>
                  </div>
                )}
                {confirmationStatus === 'sent' && (
                  <div className="bg-blue-50 border-blue-200 text-sm text-blue-700">
                    <strong>✓ Request Sent</strong> - Confirmation request has been sent to Wing Stock Supervisor. They will verify and respond.
                  </div>
                )}
                {confirmationStatus === 'confirmed' && (
                  <div className="bg-green-50 border-green-200 text-sm text-green-700">
                    <strong>✓ Confirmed</strong> - Wing stock availability has been confirmed by supervisor
                  </div>
                )}
                {confirmationStatus === 'rejected' && (
                  <div className="bg-red-50 border-red-200 text-sm text-red-700">
                    <strong>✗ Rejected</strong> - Wing stock availability could not be confirmed
                  </div>
                )}
                {confirmationStatus === 'error' && (
                  <div className="bg-red-50 border-red-200 text-sm text-red-700">
                    <strong>⚠ Error</strong> - Failed to send confirmation request
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p><strong>Process:</strong> When you request confirmation, the Wing Stock Supervisor will receive a request to verify the stock availability for this item.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {confirmationStatus === 'pending' && (
              <Button 
                onClick={() => confirmWingStock(wingConfirmItem)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={wingConfirmLoading}
              >
                {wingConfirmLoading ? 'Sending...' : '📤 Send Request to Supervisor'}
              </Button>
            )}
            {confirmationStatus === 'sent' && (
              <Button 
                onClick={() => setWingConfirmItem(null)} 
                className="flex-1"
              >
                Close & Wait for Response
              </Button>
            )}
            {(confirmationStatus === 'confirmed' || confirmationStatus === 'rejected' || confirmationStatus === 'error') && (
              <Button 
                onClick={() => setWingConfirmItem(null)} 
                className="flex-1"
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          disabled={submitting || !hasDecisionForAllItems() || shouldDisableControls()}
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
