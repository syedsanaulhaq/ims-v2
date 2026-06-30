import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ClipboardList, Package, CheckCircle, Users, Send } from 'lucide-react';

const BranchDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    itemsInBranch: 0,
    totalMembers: 0,
  });

  const getBranchId = () => Number((user as any)?.branch_id ?? (user as any)?.intBranchID ?? 0) || 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const branchId = getBranchId();
        const branchParam = branchId || 0;
        const memberQuery = user?.is_super_admin ? '' : `?branch_id=${branchId}`;

        const [requestsRes, inventoryRes, membersRes] = await Promise.all([
          fetch('http://localhost:3001/api/branch-inventory/requests', { credentials: 'include' }).then((r) =>
            r.ok ? r.json() : { requests: [] }
          ),
          fetch(`http://localhost:3001/api/branch-inventory/${branchParam}`, { credentials: 'include' }).then((r) =>
            r.ok ? r.json() : { items: [] }
          ),
          fetch(`http://localhost:3001/api/ims/users/aspnet/filtered${memberQuery}`, { credentials: 'include' }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        const requests = Array.isArray(requestsRes?.requests) ? requestsRes.requests : [];
        const pendingRequests = requests.filter((r: any) =>
          ['submitted', 'pending', 'under_review'].includes(String(r.current_status || '').toLowerCase())
        ).length;
        const approvedRequests = requests.filter((r: any) =>
          ['approved', 'completed'].includes(String(r.final_status || '').toLowerCase())
        ).length;

        setStats({
          totalRequests: requests.length,
          pendingRequests,
          approvedRequests,
          itemsInBranch: Array.isArray(inventoryRes?.items) ? inventoryRes.items.length : 0,
          totalMembers: Array.isArray(membersRes) ? membersRes.length : 0,
        });
      } catch (error) {
        console.error('Error loading branch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.user_id) {
      loadData();
    }
  }, [user?.user_id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Branch Dashboard</h1>
            <p className="text-lg text-gray-600 mt-2">Manage branch-level stock operations and inventory</p>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-3">
              Active
            </Badge>
          </div>
          <Button onClick={() => navigate('/dashboard/stock-issuance-branch')} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Send className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500"
            onClick={() => navigate('/dashboard/branch-request-history')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <ClipboardList className="h-5 w-5" />
                Branch Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalRequests}</div>
              <p className="text-xs text-gray-500 mt-2">Pending: {stats.pendingRequests}</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500"
            onClick={() => navigate('/dashboard/branch-inventory')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Package className="h-5 w-5" />
                Items in Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.itemsInBranch}</div>
              <p className="text-xs text-gray-500 mt-2">In branch possession</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500"
            onClick={() => navigate('/dashboard/branch-request-history')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <CheckCircle className="h-5 w-5" />
                Need Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingRequests}</div>
              <p className="text-xs text-gray-500 mt-2">Pending requests to be approved</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500"
            onClick={() => navigate('/dashboard/branch-members')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Users className="h-5 w-5" />
                Branch Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalMembers}</div>
              <p className="text-xs text-gray-500 mt-2">Members in branch</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;
