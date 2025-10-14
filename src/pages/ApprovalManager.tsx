import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';import { useNavigate } from 'react-router-dom';import { useNavigate } from 'react-router-dom';

import { 

  approvalForwardingService, import { useAuth } from '@/contexts/AuthContext';import { useAuth } from '@/contexts/AuthContext';

  RequestApproval 

} from '../services/approvalForwardingService';import { import { 

import { Clock, User, CheckCircle, XCircle, Forward, FileText, BarChart3, TrendingUp } from 'lucide-react';

  approvalForwardingService,   approvalForwardingService, 

const ApprovalManager: React.FC = () => {

  const { user, isAuthenticated } = useAuth();  RequestApproval   RequestApproval 

  const navigate = useNavigate();

  } from '../services/approvalForwardingService';} from '../services/approvalForwardingService';

  const [myPendingApprovals, setMyPendingApprovals] = useState<RequestApproval[]>([]);

  const [loading, setLoading] = useState(true);import { Clock, User, CheckCircle, XCircle, Forward, FileText, BarChart3, TrendingUp } from 'lucide-react';import { ApprovalDashboard } from '../components/ApprovalDashboard';

  const [dashboardStats, setDashboardStats] = useState({

    pending_count: 0,

    approved_count: 0,

    rejected_count: 0,const ApprovalManager: React.FC = () => {const ApprovalManager: React.FC = () => {

    finalized_count: 0

  });  const { user, isAuthenticated } = useAuth();  const { user, isAuthenticated } = useAuth();



  useEffect(() => {  const navigate = useNavigate();  const navigate = useNavigate();

    if (isAuthenticated && user?.Id) {

      loadApprovalData();    const [allApprovals, setAllApprovals] = useState<RequestApproval[]>([]);

    } else {

      navigate('/login');  const [myPendingApprovals, setMyPendingApprovals] = useState<RequestApproval[]>([]);  const [myApprovals, setMyApprovals] = useState<RequestApproval[]>([]);

    }

  }, [user, isAuthenticated, navigate]);  const [submittedRequests, setSubmittedRequests] = useState<RequestApproval[]>([]);  const [submittedApprovals, setSubmittedApprovals] = useState<RequestApproval[]>([]);



  const loadApprovalData = async () => {  const [loading, setLoading] = useState(true);  const [loading, setLoading] = useState(true);

    try {

      setLoading(true);  const [dashboardStats, setDashboardStats] = useState({  const [dashboardStats, setDashboardStats] = useState({

      

      console.log('🔍 Approval Manager: Loading data for user:', user?.FullName, '(', user?.Id, ')');    pending_count: 0,    pending_count: 0,

      

      // Load approval data for the current user    approved_count: 0,    approved_count: 0,

      const [myPendingData, dashboardData] = await Promise.all([

        approvalForwardingService.getMyPendingApprovals(user?.Id),    rejected_count: 0,    rejected_count: 0,

        approvalForwardingService.getApprovalDashboard(user?.Id)

      ]);    finalized_count: 0    finalized_count: 0

      

      setMyPendingApprovals(myPendingData);  });  });

      setDashboardStats(dashboardData);

      

      console.log('📋 My pending approvals:', myPendingData.length);

        useEffect(() => {  useEffect(() => {

    } catch (error) {

      console.error('Error loading approval data:', error);    if (isAuthenticated && user?.Id) {    if (isAuthenticated && user?.Id) {

    } finally {

      setLoading(false);      loadApprovalData();      loadApprovalData();

    }

  };    } else {    } else {



  const getStatusIcon = (status: string) => {      navigate('/login');      navigate('/login');

    switch (status.toLowerCase()) {

      case 'pending':    }    }

        return <Clock className="w-4 h-4 text-yellow-600" />;

      case 'approved':  }, [user, isAuthenticated, navigate]);  }, [user, isAuthenticated, navigate]);

        return <CheckCircle className="w-4 h-4 text-green-600" />;

      case 'rejected':

        return <XCircle className="w-4 h-4 text-red-600" />;

      case 'forwarded':  const loadApprovalData = async () => {  const loadApprovalData = async () => {

        return <Forward className="w-4 h-4 text-blue-600" />;

      default:    try {    try {

        return <FileText className="w-4 h-4 text-gray-600" />;

    }      setLoading(true);      setLoading(true);

  };

            

  const getStatusColor = (status: string) => {

    switch (status.toLowerCase()) {      console.log('🔍 Approval Manager: Loading data for user:', user?.FullName, '(', user?.Id, ')');      // Load all approval data for the current user

      case 'pending':

        return 'bg-yellow-100 text-yellow-800';            const [myPendingData, allApprovalsData, dashboardData] = await Promise.all([

      case 'approved':

        return 'bg-green-100 text-green-800';      // Load approval data for the current user        approvalForwardingService.getMyPendingApprovals(user?.Id),

      case 'rejected':

        return 'bg-red-100 text-red-800';      const [myPendingData, dashboardData] = await Promise.all([        approvalForwardingService.getAllApprovals(), 

      case 'forwarded':

        return 'bg-blue-100 text-blue-800';        approvalForwardingService.getMyPendingApprovals(user?.Id),        approvalForwardingService.getApprovalDashboard()

      default:

        return 'bg-gray-100 text-gray-800';        approvalForwardingService.getApprovalDashboard()      ]);

    }

  };      ]);      



  const formatDate = (dateString: string) => {            // Filter approvals submitted by current user

    const date = new Date(dateString.replace(' ', 'T'));

    return date.toLocaleDateString('en-US', {      setMyPendingApprovals(myPendingData);      const userSubmittedApprovals = allApprovalsData.filter(approval => 

      year: 'numeric',

      month: 'short',      setDashboardStats(dashboardData);        approval.submitted_by === user?.Id

      day: 'numeric',

      hour: '2-digit',            );

      minute: '2-digit',

      hour12: true      console.log('📋 My pending approvals:', myPendingData.length);      

    });

  };            setMyApprovals(myPendingData);



  if (loading) {    } catch (error) {      setAllApprovals(allApprovalsData);

    return (

      <div className="min-h-screen bg-gray-50 flex justify-center items-center">      console.error('Error loading approval data:', error);      setSubmittedApprovals(userSubmittedApprovals);

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>    } finally {      setDashboardStats(dashboardData);

          <p className="text-gray-600">Loading approval data...</p>

        </div>      setLoading(false);      

      </div>

    );    }      console.log('📊 Approval Manager: Loaded data for user:', user?.FullName);

  }

  };      console.log('📋 My pending approvals:', myPendingData.length);

  return (

    <div className="min-h-screen bg-gray-50">      console.log('📤 My submitted requests:', userSubmittedApprovals.length);

      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}  const getStatusIcon = (status: string) => {      

        <div className="mb-8">

          <div className="flex items-center justify-between">    switch (status.toLowerCase()) {    } catch (error) {

            <div>

              <h1 className="text-3xl font-bold text-gray-900">Approval Manager</h1>      case 'pending':      console.error('Error loading approval data:', error);

              <p className="text-gray-600 mt-2">

                Welcome, {user?.FullName} - Manage your approval workflows        return <Clock className="w-4 h-4 text-yellow-600" />;    } finally {

              </p>

            </div>      case 'approved':      setLoading(false);

            <div className="flex items-center space-x-4">

              <button        return <CheckCircle className="w-4 h-4 text-green-600" />;    }

                onClick={loadApprovalData}

                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"      case 'rejected':  };

              >

                Refresh Data        return <XCircle className="w-4 h-4 text-red-600" />;    if (!selectedApproval || !forwardToUserId || !forwardReason) {

              </button>

            </div>      case 'forwarded':      toast.error('Please fill in all required fields');

          </div>

        </div>        return <Forward className="w-4 h-4 text-blue-600" />;      return;



        {/* Statistics Cards */}      default:    }

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          <div className="bg-white rounded-lg shadow-md p-6">        return <FileText className="w-4 h-4 text-gray-600" />;

            <div className="flex items-center">

              <div className="flex-shrink-0">    }    setSubmitting(true);

                <Clock className="w-8 h-8 text-yellow-600" />

              </div>  };    try {

              <div className="ml-4">

                <p className="text-sm font-medium text-gray-500">Pending</p>      const response = await fetch('http://localhost:3001/api/approvals/forward', {

                <p className="text-2xl font-semibold text-yellow-600">{dashboardStats.pending_count}</p>

              </div>  const getStatusColor = (status: string) => {        method: 'POST',

            </div>

          </div>    switch (status.toLowerCase()) {        headers: {



          <div className="bg-white rounded-lg shadow-md p-6">      case 'pending':          'Content-Type': 'application/json',

            <div className="flex items-center">

              <div className="flex-shrink-0">        return 'bg-yellow-100 text-yellow-800';        },

                <CheckCircle className="w-8 h-8 text-green-600" />

              </div>      case 'approved':        credentials: 'include',

              <div className="ml-4">

                <p className="text-sm font-medium text-gray-500">Approved</p>        return 'bg-green-100 text-green-800';        body: JSON.stringify({

                <p className="text-2xl font-semibold text-green-600">{dashboardStats.approved_count}</p>

              </div>      case 'rejected':          issuanceId: selectedApproval.IssuanceId,

            </div>

          </div>        return 'bg-red-100 text-red-800';          forwardedToUserId,



          <div className="bg-white rounded-lg shadow-md p-6">      case 'forwarded':          forwardReason,

            <div className="flex items-center">

              <div className="flex-shrink-0">        return 'bg-blue-100 text-blue-800';          priority,

                <XCircle className="w-8 h-8 text-red-600" />

              </div>      default:          dueDate: dueDate || null,

              <div className="ml-4">

                <p className="text-sm font-medium text-gray-500">Rejected</p>        return 'bg-gray-100 text-gray-800';          currentUserId: user?.Id

                <p className="text-2xl font-semibold text-red-600">{dashboardStats.rejected_count}</p>

              </div>    }        })

            </div>

          </div>  };      });



          <div className="bg-white rounded-lg shadow-md p-6">

            <div className="flex items-center">

              <div className="flex-shrink-0">  const formatDate = (dateString: string) => {      if (response.ok) {

                <BarChart3 className="w-8 h-8 text-blue-600" />

              </div>    const date = new Date(dateString.replace(' ', 'T'));        toast.success('Approval forwarded successfully');

              <div className="ml-4">

                <p className="text-sm font-medium text-gray-500">Finalized</p>    return date.toLocaleDateString('en-US', {        setShowForwardDialog(false);

                <p className="text-2xl font-semibold text-blue-600">{dashboardStats.finalized_count}</p>

              </div>      year: 'numeric',        resetFormStates();

            </div>

          </div>      month: 'short',        fetchPendingApprovals();

        </div>

      day: 'numeric',      } else {

        {/* My Pending Approvals */}

        <div className="bg-white rounded-lg shadow-md mb-8">      hour: '2-digit',        const error = await response.json();

          <div className="px-6 py-4 border-b border-gray-200">

            <div className="flex items-center justify-between">      minute: '2-digit',        toast.error(error.error || 'Failed to forward approval');

              <h2 className="text-xl font-semibold text-gray-900">

                My Pending Approvals ({myPendingApprovals.length})      hour12: true      }

              </h2>

              {myPendingApprovals.length > 0 && (    });    } catch (error) {

                <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">

                  Action Required  };      console.error('Error forwarding approval:', error);

                </span>

              )}      toast.error('Failed to forward approval');

            </div>

          </div>  if (loading) {    } finally {

          

          {myPendingApprovals.length === 0 ? (    return (      setSubmitting(false);

            <div className="text-center py-12">

              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />      <div className="min-h-screen bg-gray-50 flex justify-center items-center">    }

              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>

              <p className="text-gray-500">You don't have any requests waiting for your approval.</p>        <div className="text-center">  };

            </div>

          ) : (          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>

            <div className="divide-y divide-gray-200">

              {myPendingApprovals.map((approval) => (          <p className="text-gray-600">Loading approval data...</p>  const handleApprove = async () => {

                <div key={approval.id} className="p-6 hover:bg-gray-50 transition-colors">

                  <div className="flex items-center justify-between">        </div>    if (!selectedApproval) return;

                    <div className="flex-1">

                      <div className="flex items-center space-x-3 mb-2">      </div>

                        {getStatusIcon(approval.current_status)}

                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(approval.current_status)}`}>    );    setSubmitting(true);

                          {approval.current_status.toUpperCase()}

                        </span>  }    try {

                        <span className="text-sm text-gray-500">

                          {approval.request_type.replace('_', ' ').toUpperCase()}      const response = await fetch('http://localhost:3001/api/approvals/approve', {

                        </span>

                      </div>  return (        method: 'POST',

                      

                      <div className="mb-2">    <div className="min-h-screen bg-gray-50">        headers: {

                        <h3 className="text-lg font-medium text-gray-900">

                          Request ID: {approval.request_id}      <div className="max-w-7xl mx-auto p-6">          'Content-Type': 'application/json',

                        </h3>

                        <p className="text-sm text-gray-600">        {/* Header */}        },

                          Submitted by: <span className="font-medium">{approval.submitted_by_name}</span>

                          {' • '}        <div className="mb-8">        credentials: 'include',

                          {formatDate(approval.submitted_date)}

                        </p>          <div className="flex items-center justify-between">        body: JSON.stringify({

                      </div>

                    </div>            <div>          issuanceId: selectedApproval.IssuanceId,

                    

                    <div className="flex items-center space-x-3">              <h1 className="text-3xl font-bold text-gray-900">Approval Manager</h1>          comments,

                      <button

                        onClick={() => navigate(`/approvals/forward?approvalId=${approval.id}`)}              <p className="text-gray-600 mt-2">          isFinalApproval,

                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"

                      >                Welcome, {user?.FullName} - Manage your approval workflows          currentUserId: user?.Id

                        View Details

                      </button>              </p>        })

                    </div>

                  </div>            </div>      });

                </div>

              ))}            <div className="flex items-center space-x-4">

            </div>

          )}              <button      if (response.ok) {

        </div>

                onClick={loadApprovalData}        toast.success(isFinalApproval ? 'Final approval completed' : 'Approval completed');

        {/* Quick Actions */}

        <div className="bg-white rounded-lg shadow-md">                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"        setShowApproveDialog(false);

          <div className="px-6 py-4 border-b border-gray-200">

            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>              >        resetFormStates();

          </div>

                          Refresh Data        fetchPendingApprovals();

          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">              </button>      } else {

              <div 

                className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"            </div>        const error = await response.json();

                onClick={() => navigate('/approvals')}

              >          </div>        toast.error(error.error || 'Failed to approve');

                <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-4" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">Approval Dashboard</h3>        </div>      }

                <p className="text-gray-500">View comprehensive approval dashboard with all pending items</p>

              </div>    } catch (error) {

              

              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer">        {/* Statistics Cards */}      console.error('Error approving:', error);

                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics</h3>        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">      toast.error('Failed to approve');

                <p className="text-gray-500">View approval trends and performance metrics</p>

              </div>          <div className="bg-white rounded-lg shadow-md p-6">    } finally {

              

              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors cursor-pointer">            <div className="flex items-center">      setSubmitting(false);

                <User className="w-12 h-12 text-purple-600 mx-auto mb-4" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Settings</h3>              <div className="flex-shrink-0">    }

                <p className="text-gray-500">Configure approval workflows and user permissions</p>

              </div>                <Clock className="w-8 h-8 text-yellow-600" />  };

            </div>

          </div>              </div>

        </div>

              <div className="ml-4">  const handleReject = async () => {

        {/* User Info Footer */}

        <div className="mt-8 text-center text-sm text-gray-500">                <p className="text-sm font-medium text-gray-500">Pending</p>    if (!selectedApproval || !comments) {

          <p>

            Logged in as: <span className="font-medium text-gray-700">{user?.FullName}</span>                 <p className="text-2xl font-semibold text-yellow-600">{dashboardStats.pending_count}</p>      toast.error('Please provide rejection reason');

            {user?.Role && <span> • Role: {user.Role}</span>}

          </p>              </div>      return;

        </div>

      </div>            </div>    }

    </div>

  );          </div>

};

    setSubmitting(true);

export default ApprovalManager;
          <div className="bg-white rounded-lg shadow-md p-6">    try {

            <div className="flex items-center">      const response = await fetch('http://localhost:3001/api/approvals/reject', {

              <div className="flex-shrink-0">        method: 'POST',

                <CheckCircle className="w-8 h-8 text-green-600" />        headers: {

              </div>          'Content-Type': 'application/json',

              <div className="ml-4">        },

                <p className="text-sm font-medium text-gray-500">Approved</p>        credentials: 'include',

                <p className="text-2xl font-semibold text-green-600">{dashboardStats.approved_count}</p>        body: JSON.stringify({

              </div>          issuanceId: selectedApproval.IssuanceId,

            </div>          comments,

          </div>          currentUserId: user?.Id

        })

          <div className="bg-white rounded-lg shadow-md p-6">      });

            <div className="flex items-center">

              <div className="flex-shrink-0">      if (response.ok) {

                <XCircle className="w-8 h-8 text-red-600" />        toast.success('Issuance rejected');

              </div>        setShowRejectDialog(false);

              <div className="ml-4">        resetFormStates();

                <p className="text-sm font-medium text-gray-500">Rejected</p>        fetchPendingApprovals();

                <p className="text-2xl font-semibold text-red-600">{dashboardStats.rejected_count}</p>      } else {

              </div>        const error = await response.json();

            </div>        toast.error(error.error || 'Failed to reject');

          </div>      }

    } catch (error) {

          <div className="bg-white rounded-lg shadow-md p-6">      console.error('Error rejecting:', error);

            <div className="flex items-center">      toast.error('Failed to reject');

              <div className="flex-shrink-0">    } finally {

                <BarChart3 className="w-8 h-8 text-blue-600" />      setSubmitting(false);

              </div>    }

              <div className="ml-4">  };

                <p className="text-sm font-medium text-gray-500">Finalized</p>

                <p className="text-2xl font-semibold text-blue-600">{dashboardStats.finalized_count}</p>  const resetFormStates = () => {

              </div>    setForwardToUserId('');

            </div>    setForwardReason('');

          </div>    setPriority('Normal');

        </div>    setDueDate('');

    setComments('');

        {/* My Pending Approvals */}    setIsFinalApproval(false);

        <div className="bg-white rounded-lg shadow-md mb-8">    setSelectedApproval(null);

          <div className="px-6 py-4 border-b border-gray-200">  };

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-semibold text-gray-900">  const getPriorityColor = (priority: string) => {

                My Pending Approvals ({myPendingApprovals.length})    switch (priority) {

              </h2>      case 'Urgent': return 'bg-red-100 text-red-800';

              {myPendingApprovals.length > 0 && (      case 'High': return 'bg-orange-100 text-orange-800';

                <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">      case 'Normal': return 'bg-blue-100 text-blue-800';

                  Action Required      case 'Low': return 'bg-gray-100 text-gray-800';

                </span>      default: return 'bg-gray-100 text-gray-800';

              )}    }

            </div>  };

          </div>

            const getActionIcon = (actionType: string) => {

          {myPendingApprovals.length === 0 ? (    switch (actionType) {

            <div className="text-center py-12">      case 'FORWARDED': return <Forward className="h-4 w-4" />;

              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />;

              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;

              <p className="text-gray-500">You don't have any requests waiting for your approval.</p>      case 'SUBMITTED': return <Clock className="h-4 w-4 text-blue-600" />;

            </div>      default: return <Clock className="h-4 w-4" />;

          ) : (    }

            <div className="divide-y divide-gray-200">  };

              {myPendingApprovals.map((approval) => (

                <div key={approval.id} className="p-6 hover:bg-gray-50 transition-colors">  if (loading) {

                  <div className="flex items-center justify-between">    return (

                    <div className="flex-1">      <div className="flex items-center justify-center p-8">

                      <div className="flex items-center space-x-3 mb-2">        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>

                        {getStatusIcon(approval.current_status)}      </div>

                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(approval.current_status)}`}>    );

                          {approval.current_status.toUpperCase()}  }

                        </span>

                        <span className="text-sm text-gray-500">  return (

                          {approval.request_type.replace('_', ' ').toUpperCase()}    <div className="space-y-6">

                        </span>      <div className="flex items-center justify-between">

                      </div>        <div>

                                <h1 className="text-3xl font-bold">Approval Manager</h1>

                      <div className="mb-2">          <p className="text-gray-600">Manage your pending approvals and forwarding tasks</p>

                        <h3 className="text-lg font-medium text-gray-900">        </div>

                          Request ID: {approval.request_id}        <Badge variant="secondary" className="text-lg px-3 py-1">

                        </h3>          {pendingApprovals.length} Pending

                        <p className="text-sm text-gray-600">        </Badge>

                          Submitted by: <span className="font-medium">{approval.submitted_by_name}</span>      </div>

                          {' • '}

                          {formatDate(approval.submitted_date)}      {pendingApprovals.length === 0 ? (

                        </p>        <Card>

                      </div>          <CardContent className="p-8 text-center">

                    </div>            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />

                                <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>

                    <div className="flex items-center space-x-3">            <p className="text-gray-600">You have no pending approval requests at this time.</p>

                      <button          </CardContent>

                        onClick={() => navigate(`/approvals/forward?approvalId=${approval.id}`)}        </Card>

                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"      ) : (

                      >        <div className="grid gap-6">

                        View Details          {pendingApprovals.map((approval) => (

                      </button>            <Card key={approval.IssuanceId} className="hover:shadow-md transition-shadow">

                    </div>              <CardHeader>

                  </div>                <div className="flex items-center justify-between">

                </div>                  <div>

              ))}                    <CardTitle className="flex items-center gap-2">

            </div>                      <Clock className="h-5 w-5" />

          )}                      {approval.IssuanceNumber}

        </div>                    </CardTitle>

                    <CardDescription>

        {/* Quick Actions */}                      Requested by {approval.RequestedByName} • Level {approval.Level}

        <div className="bg-white rounded-lg shadow-md">                    </CardDescription>

          <div className="px-6 py-4 border-b border-gray-200">                  </div>

            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>                  <div className="flex items-center gap-2">

          </div>                    <Badge className={getPriorityColor(approval.Priority)}>

                                {approval.Priority}

          <div className="p-6">                    </Badge>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">                    {approval.DueDate && (

              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"                      <Badge variant="outline" className="text-orange-600">

                   onClick={() => navigate('/approvals')}>                        <Calendar className="h-3 w-3 mr-1" />

                <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-4" />                        Due {new Date(approval.DueDate).toLocaleDateString()}

                <h3 className="text-lg font-medium text-gray-900 mb-2">Approval Dashboard</h3>                      </Badge>

                <p className="text-gray-500">View comprehensive approval dashboard with all pending items</p>                    )}

              </div>                  </div>

                              </div>

              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer">              </CardHeader>

                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />              <CardContent>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics</h3>                <div className="space-y-4">

                <p className="text-gray-500">View approval trends and performance metrics</p>                  <div>

              </div>                    <Label className="text-sm font-medium">Forwarded From</Label>

                                  <p className="text-sm text-gray-600">{approval.ForwardedFromName}</p>

              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors cursor-pointer">                  </div>

                <User className="w-12 h-12 text-purple-600 mx-auto mb-4" />                  

                <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Settings</h3>                  <div>

                <p className="text-gray-500">Configure approval workflows and user permissions</p>                    <Label className="text-sm font-medium">Forward Reason</Label>

              </div>                    <p className="text-sm text-gray-600">{approval.ForwardReason}</p>

            </div>                  </div>

          </div>

        </div>                  <div className="flex items-center justify-between pt-4 border-t">

                    <div className="text-sm text-gray-500">

        {/* User Info Footer */}                      Forwarded on {new Date(approval.ForwardDate).toLocaleString()}

        <div className="mt-8 text-center text-sm text-gray-500">                    </div>

          <p>                    <div className="flex gap-2">

            Logged in as: <span className="font-medium text-gray-700">{user?.FullName}</span>                       <Button

            {user?.Role && <span> • Role: {user.Role}</span>}                        variant="outline"

          </p>                        size="sm"

        </div>                        onClick={() => handleViewDetails(approval)}

      </div>                      >

    </div>                        View Details

  );                      </Button>

};                      <Button

                        variant="outline"

export default ApprovalManager;                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowForwardDialog(true);
                        }}
                      >
                        <Forward className="h-4 w-4 mr-1" />
                        Forward
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowApproveDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval History Dialog */}
      {selectedApproval && (
        <Dialog open={!!selectedApproval && !showForwardDialog && !showApproveDialog && !showRejectDialog} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Approval Details - {selectedApproval.IssuanceNumber}</DialogTitle>
              <DialogDescription>
                Complete approval history and current status
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Requested By</Label>
                  <p className="text-sm">{selectedApproval.RequestedByName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Level</Label>
                  <p className="text-sm">Level {selectedApproval.Level}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Approval History</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {approvalHistory.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {getActionIcon(action.ActionType)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{action.ActionType}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(action.ActionDate).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          By {action.UserName} • Level {action.Level}
                        </p>
                        {action.Comments && (
                          <p className="text-sm mt-2 p-2 bg-white rounded border">
                            {action.Comments}
                          </p>
                        )}
                        {action.ForwardedToName && (
                          <p className="text-sm text-blue-600 mt-1">
                            → Forwarded to {action.ForwardedToName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Approval</DialogTitle>
            <DialogDescription>
              Forward this approval to another user for action
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="forwardTo">Forward To</Label>
              <Select value={forwardToUserId} onValueChange={setForwardToUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to forward to" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.Id !== user?.Id).map((u) => (
                    <SelectItem key={u.Id} value={u.Id}>
                      {u.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="forwardReason">Reason for Forwarding</Label>
              <Textarea
                id="forwardReason"
                value={forwardReason}
                onChange={(e) => setForwardReason(e.target.value)}
                placeholder="Explain why you're forwarding this approval..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForwardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleForward} disabled={submitting}>
              {submitting ? 'Forwarding...' : 'Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Approve this stock issuance request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments about your approval..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFinalApproval"
                checked={isFinalApproval}
                onChange={(e) => setIsFinalApproval(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isFinalApproval" className="text-sm">
                This is the final approval (complete the process)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Reject this stock issuance request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">
                This action will reject the request and stop the approval process.
              </span>
            </div>

            <div>
              <Label htmlFor="rejectComments">Reason for Rejection *</Label>
              <Textarea
                id="rejectComments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={submitting || !comments}
            >
              {submitting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalManager;
