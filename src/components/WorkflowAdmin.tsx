import React, { useState, useEffect } from 'react';
import { 
  approvalForwardingService, 
  ApprovalWorkflow, 
  WorkflowApprover 
} from '../services/approvalForwardingService';
import { erpDatabaseService } from '../services/erpDatabaseService';

interface User {
  Id: string;
  FullName: string;
  Role: string;
  intDesignationID?: number;
  intOfficeID?: number;
}

export const WorkflowAdmin: React.FC = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowApprovers, setWorkflowApprovers] = useState<WorkflowApprover[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    workflow_name: '',
    request_type: '',
    description: ''
  });
  const [newApprover, setNewApprover] = useState({
    user_id: '',
    can_approve: true,
    can_forward: true,
    can_finalize: false,
    approver_role: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowApprovers(selectedWorkflow);
    }
  }, [selectedWorkflow]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [workflowsData, usersData] = await Promise.all([
        approvalForwardingService.getWorkflows(),
        erpDatabaseService.getActiveUsers()
      ]);
      
      console.log('🔍 Workflows loaded:', workflowsData);
      console.log('👥 Users loaded:', usersData);
      
      setWorkflows(workflowsData);
      setAvailableUsers(usersData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowApprovers = async (workflowId: string) => {
    try {
      const approvers = await approvalForwardingService.getWorkflowApprovers(workflowId);
      setWorkflowApprovers(approvers);
    } catch (error) {
      console.error('Error loading workflow approvers:', error);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await approvalForwardingService.createWorkflow({
        ...newWorkflow,
        is_active: true
      });
      
      // Refresh workflows
      await loadInitialData();
      
      // Reset form
      setNewWorkflow({
        workflow_name: '',
        request_type: '',
        description: ''
      });
      setShowCreateWorkflow(false);
      
      alert('Workflow created successfully!');
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      alert(`Failed to create workflow: ${error.message}`);
    }
  };

  const handleAddApprover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;
    
    try {
      const selectedUser = availableUsers.find(u => u.Id === newApprover.user_id);
      if (!selectedUser) {
        alert('Please select a valid user');
        return;
      }

      await approvalForwardingService.addWorkflowApprover(selectedWorkflow, {
        ...newApprover,
        user_name: selectedUser.FullName,
        user_designation: selectedUser.intDesignationID?.toString() || '',
        user_role: selectedUser.Role
      });
      
      // Refresh approvers
      await loadWorkflowApprovers(selectedWorkflow);
      
      // Reset form
      setNewApprover({
        user_id: '',
        can_approve: true,
        can_forward: true,
        can_finalize: false,
        approver_role: ''
      });
      setShowAddApprover(false);
      
      alert('Approver added successfully!');
    } catch (error: any) {
      console.error('Error adding approver:', error);
      alert(`Failed to add approver: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading workflow administration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Workflow Administration
        </h1>
        <button
          onClick={() => setShowCreateWorkflow(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New Workflow
        </button>
      </div>

      {/* Create Workflow Modal */}
      {showCreateWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Workflow</h3>
            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={newWorkflow.workflow_name}
                  onChange={(e) => setNewWorkflow({...newWorkflow, workflow_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Type
                </label>
                <select
                  value={newWorkflow.request_type}
                  onChange={(e) => setNewWorkflow({...newWorkflow, request_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select request type...</option>
                  <option value="stock_issuance">Stock Issuance</option>
                  <option value="tender">Tender</option>
                  <option value="procurement">Procurement</option>
                  <option value="asset_disposal">Asset Disposal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Workflow
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateWorkflow(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Workflows */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Approval Workflows ({workflows.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <div 
                key={workflow.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedWorkflow === workflow.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedWorkflow(workflow.id)}
              >
                <div className="font-medium text-gray-900">
                  {workflow.workflow_name}
                </div>
                <div className="text-sm text-gray-600">
                  Type: {workflow.request_type.replace('_', ' ')}
                </div>
                {workflow.description && (
                  <div className="text-sm text-gray-500 mt-1">
                    {workflow.description}
                  </div>
                )}
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                  workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {workflow.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
            
            {workflows.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No workflows configured yet
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Workflow Details */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedWorkflow ? 'Workflow Approvers' : 'Select a Workflow'}
            </h2>
            {selectedWorkflow && (
              <button
                onClick={() => setShowAddApprover(true)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Add Approver
              </button>
            )}
          </div>
          
          {selectedWorkflow ? (
            <div className="divide-y divide-gray-200">
              {workflowApprovers.map((approver) => (
                <div key={approver.id} className="p-4">
                  <div className="font-medium text-gray-900">
                    {approver.user_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {approver.user_designation}
                  </div>
                  <div className="text-sm text-gray-500">
                    Role: {approver.approver_role}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    {approver.can_approve && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Can Approve
                      </span>
                    )}
                    {approver.can_forward && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Can Forward
                      </span>
                    )}
                    {approver.can_finalize && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        Can Finalize
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {workflowApprovers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No approvers configured for this workflow
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Select a workflow to view and manage approvers
            </div>
          )}
        </div>
      </div>

      {/* Add Approver Modal */}
      {showAddApprover && selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Approver</h3>
            <form onSubmit={handleAddApprover} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User ({availableUsers.length} users available)
                </label>
                <select
                  value={newApprover.user_id}
                  onChange={(e) => setNewApprover({...newApprover, user_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.Id} value={user.Id}>
                      {user.FullName} - {user.Role}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Role
                </label>
                <input
                  type="text"
                  value={newApprover.approver_role}
                  onChange={(e) => setNewApprover({...newApprover, approver_role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Department Head, Finance Officer"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApprover.can_approve}
                      onChange={(e) => setNewApprover({...newApprover, can_approve: e.target.checked})}
                      className="mr-2"
                    />
                    Can Approve
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApprover.can_forward}
                      onChange={(e) => setNewApprover({...newApprover, can_forward: e.target.checked})}
                      className="mr-2"
                    />
                    Can Forward
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApprover.can_finalize}
                      onChange={(e) => setNewApprover({...newApprover, can_finalize: e.target.checked})}
                      className="mr-2"
                    />
                    Can Finalize
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Approver
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddApprover(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowAdmin;