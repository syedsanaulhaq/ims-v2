import React, { useState, useEffect } from 'react';
import { 
  approvalForwardingService, 
  RequestApproval, 
  ApprovalHistory, 
  WorkflowApprover,
  ApprovalAction 
} from '../services/approvalForwardingService';

interface ApprovalForwardingProps {
  approvalId: string;
  onActionComplete?: () => void;
}

export const ApprovalForwarding: React.FC<ApprovalForwardingProps> = ({ 
  approvalId, 
  onActionComplete 
}) => {
  const [approval, setApproval] = useState<RequestApproval | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [availableForwarders, setAvailableForwarders] = useState<WorkflowApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form state
  const [selectedForwarder, setSelectedForwarder] = useState('');
  const [comments, setComments] = useState('');
  const [showActionPanel, setShowActionPanel] = useState(false);

  useEffect(() => {
    loadApprovalData();
  }, [approvalId]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      const [approvalData, historyData, forwardersData] = await Promise.all([
        approvalForwardingService.getApprovalDetails(approvalId),
        approvalForwardingService.getApprovalHistory(approvalId),
        approvalForwardingService.getAvailableForwarders(approvalId)
      ]);
      
      setApproval(approvalData);
      setHistory(historyData);
      setAvailableForwarders(forwardersData);
    } catch (error) {
      console.error('Error loading approval data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: 'forwarded' | 'approved' | 'rejected' | 'finalized') => {
    if (!approval) return;
    
    try {
      setActionLoading(true);
      
      const action: ApprovalAction = {
        action_type: actionType,
        comments: comments || undefined,
        forwarded_to: actionType === 'forwarded' ? selectedForwarder : undefined
      };

      let result: RequestApproval;
      
      switch (actionType) {
        case 'forwarded':
          if (!selectedForwarder) {
            alert('Please select a person to forward to');
            return;
          }
          result = await approvalForwardingService.forwardRequest(approvalId, action);
          break;
        case 'approved':
          result = await approvalForwardingService.approveRequest(approvalId, action);
          break;
        case 'rejected':
          if (!comments?.trim()) {
            alert('Please provide a reason for rejection');
            return;
          }
          result = await approvalForwardingService.rejectRequest(approvalId, action);
          break;
        case 'finalized':
          result = await approvalForwardingService.finalizeRequest(approvalId, action);
          break;
        default:
          throw new Error('Invalid action type');
      }

      // Refresh data
      await loadApprovalData();
      
      // Reset form
      setComments('');
      setSelectedForwarder('');
      setShowActionPanel(false);
      
      // Notify parent
      if (onActionComplete) {
        onActionComplete();
      }
      
      alert(`Request ${actionType} successfully!`);
      
    } catch (error: any) {
      console.error(`Error ${actionType} request:`, error);
      alert(`Failed to ${actionType} request: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading approval details...</div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="text-red-600 p-4">
        Failed to load approval details
      </div>
    );
  }

  const canTakeAction = approval.current_status === 'pending';
  const currentUserCanFinalize = availableForwarders.some(f => f.can_finalize);

  return (
    <div className="space-y-6">
      {/* Approval Status Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Approval Status
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            approval.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            approval.current_status === 'approved' ? 'bg-green-100 text-green-800' :
            approval.current_status === 'rejected' ? 'bg-red-100 text-red-800' :
            approval.current_status === 'finalized' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {approval.current_status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Request Type:</span>
            <div className="text-gray-900">{approval.request_type}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Request ID:</span>
            <div className="text-gray-900 font-mono">{approval.request_id}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted By:</span>
            <div className="text-gray-900">{approval.submitted_by_name}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted Date:</span>
            <div className="text-gray-900">
              {new Date(approval.submitted_date).toLocaleString()}
            </div>
          </div>
          {approval.current_status === 'pending' && (
            <>
              <div>
                <span className="font-medium text-gray-700">Current Approver:</span>
                <div className="text-gray-900">{approval.current_approver_name}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Panel */}
      {canTakeAction && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">
              Take Action
            </h4>
            <button
              onClick={() => setShowActionPanel(!showActionPanel)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={actionLoading}
            >
              {showActionPanel ? 'Hide Actions' : 'Show Actions'}
            </button>
          </div>

          {showActionPanel && (
            <div className="space-y-4">
              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments / Notes
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add your comments here..."
                />
              </div>

              {/* Forward To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forward To (Optional)
                </label>
                <select
                  value={selectedForwarder}
                  onChange={(e) => setSelectedForwarder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a person to forward to...</option>
                  {availableForwarders.map((forwarder) => (
                    <option key={forwarder.user_id} value={forwarder.user_id}>
                      {forwarder.user_name} - {forwarder.user_designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                {/* Forward Button */}
                <button
                  onClick={() => handleAction('forwarded')}
                  disabled={actionLoading || !selectedForwarder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Forward'}
                </button>

                {/* Approve Button */}
                <button
                  onClick={() => handleAction('approved')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Approve'}
                </button>

                {/* Reject Button */}
                <button
                  onClick={() => handleAction('rejected')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Reject'}
                </button>

                {/* Finalize Button - Only for authorized users */}
                {currentUserCanFinalize && (
                  <button
                    onClick={() => handleAction('finalized')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Processing...' : 'Finalize'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Approval History
        </h4>
        
        {history.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No approval history yet
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => (
              <div 
                key={item.id} 
                className={`flex items-start space-x-4 p-4 rounded-lg ${
                  item.is_current_step ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    item.action_type === 'submitted' ? 'bg-gray-500 text-white' :
                    item.action_type === 'forwarded' ? 'bg-blue-500 text-white' :
                    item.action_type === 'approved' ? 'bg-green-500 text-white' :
                    item.action_type === 'rejected' ? 'bg-red-500 text-white' :
                    item.action_type === 'finalized' ? 'bg-purple-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {item.step_number}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {item.action_by_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.action_by_designation}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.action_type === 'submitted' ? 'bg-gray-100 text-gray-800' :
                      item.action_type === 'forwarded' ? 'bg-blue-100 text-blue-800' :
                      item.action_type === 'approved' ? 'bg-green-100 text-green-800' :
                      item.action_type === 'rejected' ? 'bg-red-100 text-red-800' :
                      item.action_type === 'finalized' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.action_type.toUpperCase()}
                    </span>
                  </div>
                  
                  {item.forwarded_to_name && (
                    <div className="text-sm text-gray-600 mt-1">
                      Forwarded to: <span className="font-medium">{item.forwarded_to_name}</span>
                    </div>
                  )}
                  
                  {item.comments && (
                    <div className="text-sm text-gray-700 mt-2 bg-white p-3 rounded border">
                      {item.comments}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(item.action_date).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalForwarding;