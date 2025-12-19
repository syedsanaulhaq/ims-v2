// Approval Forwarding Service
// Handles the complete approval workflow system

import { sessionService } from './sessionService';

const API_BASE_URL = 'http://localhost:3001/api';

export interface ApprovalWorkflow {
  id: string;
  workflow_name: string;
  request_type: string;
  office_id?: string;
  description?: string;
  is_active: boolean;
}

export interface WorkflowApprover {
  id: string;
  workflow_id: string;
  user_id: string;
  user_name: string;
  user_designation: string;
  user_role: string;
  can_approve: boolean;
  can_forward: boolean;
  can_finalize: boolean;
  approver_role: string;
}

export interface AddWorkflowApproverPayload {
  user_id: string;
  can_approve: boolean;
  can_forward: boolean;
  can_finalize: boolean;
  approver_role: string;
}

export interface RequestApproval {
  id: string;
  request_id: string;
  request_type: string;
  workflow_id: string;
  current_status: 'pending' | 'approved' | 'rejected' | 'finalized';
  current_approver_id: string;
  current_approver_name?: string;
  submitted_by: string;
  submitted_by_name?: string;
  submitted_date: string;
  finalized_by?: string;
  finalized_date?: string;
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
}

export interface ApprovalAction {
  action_type: 'forwarded' | 'approved' | 'rejected' | 'finalized';
  forwarded_to?: string;
  forwarding_type?: 'approval' | 'action';
  comments?: string;
  internal_notes?: string;
}

export interface ApprovalHistory {
  id: string;
  step_number: number;
  action_type: string;
  action_date: string;
  action_by_name: string;
  action_by_designation: string;
  forwarded_from_name?: string;
  forwarded_to_name?: string;
  comments?: string;
  is_current_step: boolean;
}

class ApprovalForwardingService {
  
  // ======================
  // WORKFLOW MANAGEMENT (Admin functions)
  // ======================
  
  async getWorkflows(): Promise<ApprovalWorkflow[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/approval-workflows`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch workflows');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  }
  
  async createWorkflow(workflow: Omit<ApprovalWorkflow, 'id'>): Promise<ApprovalWorkflow> {
    try {
      const response = await fetch(`${API_BASE_URL}/approval-workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create workflow');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }
  
  async getWorkflowApprovers(workflowId: string): Promise<WorkflowApprover[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/approval-workflows/${workflowId}/approvers`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch workflow approvers');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching workflow approvers:', error);
      throw error;
    }
  }
  
  async addWorkflowApprover(workflowId: string, approver: AddWorkflowApproverPayload): Promise<WorkflowApprover> {
    try {
      const response = await fetch(`${API_BASE_URL}/approval-workflows/${workflowId}/approvers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approver),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add workflow approver');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error adding workflow approver:', error);
      throw error;
    }
  }

  async deleteWorkflowApprover(workflowId: string, approverId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/approval-workflows/${workflowId}/approvers/${approverId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete workflow approver');
      }
    } catch (error) {
      console.error('Error deleting workflow approver:', error);
      throw error;
    }
  }
  
  // ======================
  // REQUEST APPROVAL OPERATIONS
  // ======================
  
  async submitForApproval(requestId: string, requestType: string, workflowId: string): Promise<RequestApproval> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          request_type: requestType,
          workflow_id: workflowId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit for approval');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error submitting for approval:', error);
      throw error;
    }
  }
  
  async getMyPendingApprovals(userId?: string): Promise<RequestApproval[]> {
    try {
      // Use provided userId first, then session user, then let backend handle
      let url = `${API_BASE_URL}/approvals/my-pending`;
      
      if (userId) {
        url += `?userId=${encodeURIComponent(userId)}`;
        console.log('📋 Using provided user ID for pending approvals:', userId);
      } else {
        // Get current user from session as fallback
        const currentUser = sessionService.getCurrentUser();
        if (currentUser?.user_id) {
          url += `?userId=${encodeURIComponent(currentUser.user_id)}`;
          console.log('📋 Using session user ID for pending approvals:', currentUser.user_id);
        } else {
          console.warn('⚠️ No user ID provided, using backend auto-detection');
        }
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch pending approvals');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  async getMyApprovalsByStatus(userId?: string, status?: string): Promise<RequestApproval[]> {
    try {
      // Use provided userId first, then session user, then let backend handle
      let url = `${API_BASE_URL}/approvals/my-approvals`;
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
        console.log('📋 Using provided user ID for approvals:', userId);
      } else {
        // Get current user from session as fallback
        const currentUser = sessionService.getCurrentUser();
        if (currentUser?.user_id) {
          params.append('userId', currentUser.user_id);
          console.log('📋 Using session user ID for approvals:', currentUser.user_id);
        } else {
          console.warn('⚠️ No user ID provided, using backend auto-detection');
        }
      }
      
      if (status) {
        params.append('status', status);
        console.log('🔍 Filtering by status:', status);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch approvals');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching approvals by status:', error);
      throw error;
    }
  }

  async getWingApprovalsByStatus(wingId: number, status?: string): Promise<RequestApproval[]> {
    try {
      const params = new URLSearchParams();
      params.append('wingId', wingId.toString());

      if (status) {
        params.append('status', status);
        console.log('🔍 Filtering wing approvals by status:', status);
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/approvals/wing-approvals${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch wing approvals');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching wing approvals by status:', error);
      throw error;
    }
  }

  async getApprovalDetails(approvalId: string): Promise<RequestApproval> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch approval details');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching approval details:', error);
      throw error;
    }
  }
  
  async getApprovalHistory(approvalId: string): Promise<ApprovalHistory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/history`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch approval history');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching approval history:', error);
      throw error;
    }
  }
  
  async getAvailableForwarders(approvalId: string): Promise<WorkflowApprover[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/available-forwarders`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch available forwarders');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching available forwarders:', error);
      throw error;
    }
  }
  
  // ======================
  // APPROVAL ACTIONS
  // ======================
  
  async forwardRequest(approvalId: string, action: ApprovalAction): Promise<RequestApproval> {
    try {
      // Get userId from session
      const currentUser = sessionService.getCurrentUser();
      const userId = currentUser?.user_id;
      
      console.log('🔄 Frontend: Forwarding request using original endpoint with userId:', userId);
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forwarded_to: action.forwarded_to,
          comments: action.comments,
          forwarding_type: action.forwarding_type,
          userId: userId
        }),
      });
      
      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Endpoint not found - server returned HTML instead of JSON');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to forward request');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error forwarding request:', error);
      throw error;
    }
  }
  
  async approveRequest(approvalId: string, action: ApprovalAction): Promise<RequestApproval> {
    try {
      console.log('✅ Frontend: Approving request using original endpoint');
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: action.comments
        }),
      });
      
      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Endpoint not found - server returned HTML instead of JSON');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve request');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  }
  
  async rejectRequest(approvalId: string, action: ApprovalAction): Promise<RequestApproval> {
    try {
      console.log('❌ Frontend: Rejecting request using simple endpoint');
      const response = await fetch(`${API_BASE_URL}/approvals/simple-reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId,
          comments: action.comments
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject request');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  }
  
  async finalizeRequest(approvalId: string, action: ApprovalAction): Promise<RequestApproval> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to finalize request');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error finalizing request:', error);
      throw error;
    }
  }
  
  // ======================
  // DASHBOARD & REPORTING
  // ======================
  
  async getApprovalDashboard(userId?: string): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    finalized_count: number;
    my_pending: RequestApproval[];
    recent_actions: ApprovalHistory[];
  }> {
    try {
      const url = userId 
        ? `${API_BASE_URL}/approvals/dashboard?userId=${encodeURIComponent(userId)}`
        : `${API_BASE_URL}/approvals/dashboard`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch approval dashboard');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching approval dashboard:', error);
      throw error;
    }
  }

  async getWingApprovalDashboard(wingId: number): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    forwarded_count: number;
    my_pending: RequestApproval[];
    recent_actions: ApprovalHistory[];
  }> {
    try {
      const url = `${API_BASE_URL}/approvals/wing-dashboard?wingId=${encodeURIComponent(wingId.toString())}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch wing approval dashboard');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching wing approval dashboard:', error);
      throw error;
    }
  }

  async getRequestStatus(requestId: string, requestType: string): Promise<RequestApproval | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/status?request_id=${requestId}&request_type=${requestType}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No approval process started
        }
        throw new Error(data.message || 'Failed to fetch request status');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching request status:', error);
      throw error;
    }
  }
}

export const approvalForwardingService = new ApprovalForwardingService();