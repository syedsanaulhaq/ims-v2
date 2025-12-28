import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approvalForwardingService,
  RequestApproval
} from '../services/approvalForwardingService';
import ApprovalForwarding from './ApprovalForwarding';
import PerItemApprovalPanel from './PerItemApprovalPanel';
import { CheckCircle, Clock, RefreshCw, Settings, Users, Building2 } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export const WingApprovalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [pendingApprovals, setPendingApprovals] = useState<RequestApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    forwarded_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'forwarded'>('pending');
  const [wingName, setWingName] = useState<string>('');

  useEffect(() => {
    console.log('🔍 WingApprovalDashboard: Current user from session context:', user);
    loadDashboardData();
  }, [refreshTrigger, user, activeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get wing information
      if (user?.wing_id) {
        try {
          const wingsRes = await fetch('http://localhost:3001/api/wings', { credentials: 'include' });
          if (wingsRes.ok) {
            const wingsData = await wingsRes.json();
            const wingsList = Array.isArray(wingsData) ? wingsData : (wingsData?.data || []);
            const currentWing = wingsList.find((w: any) => w.Id === user.wing_id || w.id === user.wing_id);
            setWingName(currentWing?.Name || currentWing?.name || 'Your Wing');
          }
        } catch (error) {
          console.error('Error fetching wing information:', error);
        }
      }

      // For wing dashboard, we need to get approvals for all users in the wing
      const wingId = user?.wing_id;
      console.log('🔍 Loading wing dashboard for wing:', wingId, 'with filter:', activeFilter);

      if (!wingId) {
        console.warn('⚠️ No wing ID found for user, cannot load wing approvals');
        setPendingApprovals([]);
        setDashboardStats({
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          forwarded_count: 0
        });
        return;
      }

      // Use the new wing-specific endpoint
      const [approvalsData, dashboardData] = await Promise.all([
        approvalForwardingService.getWingApprovalsByStatus(wingId, activeFilter),
        approvalForwardingService.getWingApprovalDashboard(wingId)
      ]);

      console.log('📋 Wing approvals loaded:', approvalsData.length, 'for status:', activeFilter);
      setPendingApprovals(approvalsData);
      setDashboardStats(dashboardData);

    } catch (error) {
      console.error('❌ Error loading wing approval dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject', comments?: string) => {
    try {
      console.log(`🔄 Processing ${action} for approval:`, approvalId);

      // Use the appropriate service method
      const actionPayload: any = {
        action_type: action,
        comments: comments || ''
      };
      
      const result = (action === 'approve') 
        ? await approvalForwardingService.approveRequest(approvalId, actionPayload)
        : await approvalForwardingService.rejectRequest(approvalId, actionPayload);

      if (result && result.id) {
        console.log(`✅ Approval ${action}d successfully`);
        setRefreshTrigger(prev => prev + 1); // Trigger reload
        setSelectedApproval(null);
      } else {
        console.error(`❌ Failed to ${action} approval`);
        alert(`Failed to ${action} approval`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing approval:`, error);
      alert(`Error ${action}ing approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-300', icon: RefreshCw },
      'forwarded': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Users }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Urgent': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || priorityColors.Medium}>
        {priority}
      </Badge>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Wing Approval Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage approvals for all requests in {wingName}
            </p>
          </div>
          <Button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <Clock className="h-5 w-5" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardStats.pending_count}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardStats.approved_count}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <RefreshCw className="h-5 w-5" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats.rejected_count}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Users className="h-5 w-5" />
                Forwarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardStats.forwarded_count}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'pending', label: 'Pending', count: dashboardStats.pending_count },
            { key: 'approved', label: 'Approved', count: dashboardStats.approved_count },
            { key: 'rejected', label: 'Rejected', count: dashboardStats.rejected_count },
            { key: 'forwarded', label: 'Forwarded', count: dashboardStats.forwarded_count }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeFilter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Approvals List */}
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No {activeFilter} approvals found</p>
                <p className="text-sm">Approvals for your wing will appear here</p>
              </div>
            </Card>
          ) : (
            pendingApprovals.map((approval) => (
              <Card key={approval.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {(approval as any).title || (approval as any).request_title || 'Approval Request'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested by: {(approval as any).requester_name || 'Unknown'} • Wing: {wingName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge((approval as any).status || approval.current_status)}
                      {getPriorityBadge((approval as any).priority || 'Medium')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {approval.request_type}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Submitted:</strong> {new Date(approval.submitted_date).toLocaleDateString()}
                      </p>
                      {(approval as any).description && (
                        <p className="text-sm text-gray-600">
                          <strong>Description:</strong> {(approval as any).description || (approval as any).title}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {activeFilter === 'pending' && (
                        <>
                          <Button
                            onClick={() => setSelectedApproval(approval.id)}
                            variant="outline"
                            size="sm"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => handleApprovalAction(approval.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleApprovalAction(approval.id, 'reject')}
                            variant="destructive"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => navigate(`/dashboard/request-details/${approval.request_id}`)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Approval Forwarding Modal */}
        {selectedApproval && (
          <ApprovalForwarding
            approvalId={selectedApproval}
          />
        )}
      </div>
    </div>
  );
};

export default WingApprovalDashboard;