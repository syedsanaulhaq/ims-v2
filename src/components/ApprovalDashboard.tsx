import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  approvalForwardingService, 
  RequestApproval 
} from '../services/approvalForwardingService';
import ApprovalForwarding from './ApprovalForwarding';

export const ApprovalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<RequestApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    finalized_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingData, dashboardData] = await Promise.all([
        approvalForwardingService.getMyPendingApprovals(),
        approvalForwardingService.getApprovalDashboard()
      ]);
      
      setPendingApprovals(pendingData);
      setDashboardStats(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (approvalId: string) => {
    setSelectedApproval(selectedApproval === approvalId ? null : approvalId);
  };

  const handleActionComplete = () => {
    // Refresh the dashboard when an action is completed
    setRefreshTrigger(prev => prev + 1);
    setSelectedApproval(null);
  };

  // Quick action handlers
  const handleConfigureWorkflows = () => {
    navigate('/dashboard/workflow-admin');
  };

  const handleManageApprovers = () => {
    navigate('/dashboard/workflow-admin');
  };

  const handleViewAllRequests = () => {
    // For now, just refresh the current view
    setRefreshTrigger(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'finalized': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeColor = (requestType: string) => {
    switch (requestType) {
      case 'stock_issuance': return 'bg-purple-100 text-purple-800';
      case 'tender': return 'bg-blue-100 text-blue-800';
      case 'procurement': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading approval dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Approval Dashboard
        </h1>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {dashboardStats.pending_count}
          </div>
          <div className="text-sm text-gray-600">Pending Approvals</div>
        </div>
        
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {dashboardStats.approved_count}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {dashboardStats.rejected_count}
          </div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
        
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {dashboardStats.finalized_count}
          </div>
          <div className="text-sm text-gray-600">Finalized</div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            My Pending Approvals ({pendingApprovals.length})
          </h2>
        </div>
        
        {pendingApprovals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending approvals
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-3 rounded-lg"
                  onClick={() => handleApprovalClick(approval.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRequestTypeColor(approval.request_type)}`}>
                        {approval.request_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(approval.current_status)}`}>
                        {approval.current_status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      Request ID: {approval.request_id}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Submitted by: <span className="font-medium">{approval.submitted_by_name}</span>
                      {' • '}
                      {new Date(approval.submitted_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalClick(approval.id);
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {selectedApproval === approval.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
                
                {/* Expanded Approval Details */}
                {selectedApproval === approval.id && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <ApprovalForwarding 
                      approvalId={approval.id}
                      onActionComplete={handleActionComplete}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={handleConfigureWorkflows}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
          >
            <div className="font-medium text-gray-900">Configure Workflows</div>
            <div className="text-sm text-gray-600">Set up approval workflows for different request types</div>
          </button>
          
          <button 
            onClick={handleManageApprovers}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
          >
            <div className="font-medium text-gray-900">Manage Approvers</div>
            <div className="text-sm text-gray-600">Add or remove approvers from workflows</div>
          </button>
          
          <button 
            onClick={handleViewAllRequests}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
          >
            <div className="font-medium text-gray-900">Refresh Dashboard</div>
            <div className="text-sm text-gray-600">Refresh to see latest approval requests</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDashboard;