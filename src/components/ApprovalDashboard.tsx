import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  approvalForwardingService, 
  RequestApproval 
} from '../services/approvalForwardingService';
import ApprovalForwarding from './ApprovalForwarding';
import PerItemApprovalPanel from './PerItemApprovalPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CheckCircle, Clock, RefreshCw, Settings, Users } from "lucide-react";

const ApprovalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<RequestApproval[]>([]);
  const [returnedApprovals, setReturnedApprovals] = useState<RequestApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    forwarded_count: 0,
    returned_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'forwarded' | 'returned'>('pending');

  useEffect(() => {
    console.log('🔍 ApprovalDashboard: Current user from auth context:', user);
    loadDashboardData();
  }, [refreshTrigger, user, activeFilter]); // Reload when filter changes

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Pass the current user's ID to get their approvals
      // Prefer `user.user_id` (normalized session shape) but fall back to legacy `Id`
      const userId = (user as any)?.user_id || (user as any)?.Id;
      console.log('🔍 Loading dashboard for user:', user?.FullName, '(', userId, ') with filter:', activeFilter);

      const [approvalsData, dashboardData] = await Promise.all([
        approvalForwardingService.getMyApprovalsByStatus(userId, activeFilter),
        approvalForwardingService.getApprovalDashboard(userId)
      ]);

      console.log('📋 Approvals loaded:', approvalsData.length, 'for status:', activeFilter);
      setPendingApprovals(approvalsData);

      // Set returned approvals from dashboard data
      setReturnedApprovals((dashboardData as any).my_returned || []);

      // Map the API response to match our state structure
      setDashboardStats({
        pending_count: dashboardData.pending_count || 0,
        approved_count: dashboardData.approved_count || 0,
        rejected_count: dashboardData.rejected_count || 0,
        forwarded_count: (dashboardData as any).forwarded_count || (dashboardData as any).finalized_count || 0,
        returned_count: (dashboardData as any).returned_count || 0
      });
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your approval dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">My Approvals</h1>
        <p className="text-lg text-gray-600 mt-2">
          Manage requests awaiting your approval
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {dashboardStats.pending_count} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'pending' 
              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 shadow-lg' 
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-700 font-semibold">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{dashboardStats.pending_count}</div>
              <p className="text-xs text-gray-600 mt-2">Awaiting your action</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'approved' 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 shadow-lg' 
              : 'bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 font-semibold">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboardStats.approved_count}</div>
              <p className="text-xs text-gray-600 mt-2">Requests approved</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'rejected' 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 shadow-lg' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-l-red-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 font-semibold">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{dashboardStats.rejected_count}</div>
              <p className="text-xs text-gray-600 mt-2">Requests rejected</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('forwarded')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'forwarded' 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 shadow-lg' 
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 font-semibold">Forwarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboardStats.forwarded_count}</div>
              <p className="text-xs text-gray-600 mt-2">Forwarded to others</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setActiveFilter('returned')}
          className={`transition-all duration-300 rounded-lg border-l-4 ${
            activeFilter === 'returned' 
              ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 shadow-lg' 
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-orange-500 hover:shadow-xl'
          }`}
        >
          <Card className="h-full bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 font-semibold">Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{dashboardStats.returned_count}</div>
              <p className="text-xs text-gray-600 mt-2">Returned to requester</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Requests List */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests
              <Badge className="ml-2 bg-gray-100 text-gray-800">{pendingApprovals.length}</Badge>
            </CardTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No {activeFilter} requests</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Request ID: {approval.request_id}
                          </h3>
                          <Badge className="text-xs">
                            {approval.request_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              approval.current_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              approval.current_status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                              approval.current_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {approval.current_status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Submitted by: <span className="font-medium text-gray-900">{approval.submitted_by_name}</span></div>
                          <div>
                            Submitted: {(() => {
                              const date = new Date(approval.submitted_date);
                              return date.toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              });
                            })()}
                          </div>
                          {approval.current_approver_name && (
                            <div>Current Approver: <span className="font-medium text-gray-900">{approval.current_approver_name}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalClick(approval.id)}
                        >
                          {selectedApproval === approval.id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedApproval === approval.id && (
                      <div className="mt-4 bg-gray-50 border-t border-gray-200 p-4 rounded-lg">
                        <PerItemApprovalPanel
                          approvalId={approval.id}
                          requestType={approval.request_type}
                          onActionComplete={handleActionComplete}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Returned Requests Table */}
      {returnedApprovals.length > 0 && (
        <Card className="border border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-700">
                Returned Requests
                <Badge className="ml-2 bg-orange-100 text-orange-800">{returnedApprovals.length}</Badge>
              </CardTitle>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {returnedApprovals.map((approval) => (
                <div key={approval.id} className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50">
                  <div 
                    className="p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handleApprovalClick(approval.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            Returned
                          </Badge>
                          <span className="font-medium text-gray-900">
                            {approval.request_number || approval.id}
                          </span>
                          <span className="text-sm text-gray-600">
                            {approval.request_type?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Submitted by: <span className="font-medium">{approval.submitted_by_name || approval.requester_name}</span>
                          {approval.submitted_date && (
                            <span className="ml-4">
                              on {new Date(approval.submitted_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          Awaiting Resubmission
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedApproval === approval.id && (
                    <div className="bg-orange-50 border-t border-orange-200 p-4 overflow-x-auto">
                      <PerItemApprovalPanel
                        approvalId={approval.id}
                        onActionComplete={handleActionComplete}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={handleConfigureWorkflows}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                <div className="font-semibold text-gray-900">Configure Workflows</div>
              </div>
              <div className="text-sm text-gray-600">Set up approval workflows for different request types</div>
            </button>
            
            <button 
              onClick={handleManageApprovers}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-green-600 group-hover:text-green-700" />
                <div className="font-semibold text-gray-900">Manage Approvers</div>
              </div>
              <div className="text-sm text-gray-600">Add or remove approvers from workflows</div>
            </button>
            
            <button 
              onClick={handleViewAllRequests}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className="h-5 w-5 text-purple-600 group-hover:text-purple-700" />
                <div className="font-semibold text-gray-900">Refresh Dashboard</div>
              </div>
              <div className="text-sm text-gray-600">Refresh to see latest approval requests</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalDashboard;