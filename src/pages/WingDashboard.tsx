import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  ClipboardList,
  CheckCircle,
  Users,
  TrendingUp,
  Box,
  Building2,
  BarChart3
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LoadingSpinner from "@/components/common/LoadingSpinner";

const WingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Wing data state
  const [wingRequests, setWingRequests] = useState<any[]>([]);
  const [wingInventory, setWingInventory] = useState<any[]>([]);
  const [wingMembers, setWingMembers] = useState<any[]>([]);
  const [wingStats, setWingStats] = useState<any>(null);

  useEffect(() => {
    const fetchWingData = async () => {
      try {
        setDataLoading(true);
        const apiBase = getApiBaseUrl();
        
        // Fetch wing-level data
        const [
          requestsRes,
          inventoryRes,
          membersRes,
          statsRes
        ] = await Promise.all([
          // Wing stock issuance requests
          fetch(`${apiBase}/stock-issuance/wing-requests`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing inventory (items issued to wing members)
          fetch(`${apiBase}/wing-inventory`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing members
          fetch(`${apiBase}/wing-members`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []),
          
          // Wing statistics
          fetch(`${apiBase}/wing-stats`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        ]);

        setWingRequests(Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || []));
        setWingInventory(Array.isArray(inventoryRes) ? inventoryRes : (inventoryRes?.data || []));
        setWingMembers(Array.isArray(membersRes) ? membersRes : (membersRes?.data || []));
        setWingStats(statsRes);

      } catch (error) {
        console.error('Error fetching wing dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchWingData();
  }, []);

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading wing dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalRequests: wingRequests.length,
    pendingRequests: wingRequests.filter(r => 
      r.request_status === 'Submitted' || 
      r.request_status === 'Pending' ||
      r.ApprovalStatus === 'PENDING'
    ).length,
    approvedRequests: wingRequests.filter(r => 
      r.request_status === 'Approved' ||
      r.ApprovalStatus === 'APPROVED'
    ).length,
    totalItems: wingInventory.length,
    totalQuantity: wingInventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
    wingMembers: wingMembers.length,
    activeMembers: wingMembers.filter(m => m.ISACT || m.isActive).length
  };

  // Chart data
  const requestStatusData = [
    { name: 'Pending', value: stats.pendingRequests, color: '#FFA500' },
    { name: 'Approved', value: stats.approvedRequests, color: '#00C49F' },
    { name: 'Rejected', value: wingRequests.filter(r => 
      r.request_status === 'Rejected' || r.ApprovalStatus === 'REJECTED'
    ).length, color: '#FF6B6B' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Wing Dashboard</h1>
        <p className="text-blue-100">Overview of your wing's inventory activities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wing Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingRequests} pending
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wing Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalQuantity} total items
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wing Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wingMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/stock-issuance-wing')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Request</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              Request for Wing
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Status Distribution */}
        {requestStatusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request Status Distribution</CardTitle>
              <CardDescription>Breakdown of wing request statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={requestStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {requestStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Requested Items */}
        <Card>
          <CardHeader>
            <CardTitle>Wing Activity Summary</CardTitle>
            <CardDescription>Recent activity metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Requests This Month</span>
                <Badge variant="secondary">{wingRequests.filter(r => {
                  const requestDate = new Date(r.request_date || r.created_at);
                  const thisMonth = new Date();
                  return requestDate.getMonth() === thisMonth.getMonth() && 
                         requestDate.getFullYear() === thisMonth.getFullYear();
                }).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Approved This Month</span>
                <Badge variant="default">{wingRequests.filter(r => {
                  const requestDate = new Date(r.request_date || r.created_at);
                  const thisMonth = new Date();
                  return (r.request_status === 'Approved' || r.ApprovalStatus === 'APPROVED') &&
                         requestDate.getMonth() === thisMonth.getMonth() && 
                         requestDate.getFullYear() === thisMonth.getFullYear();
                }).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Items in Wing Possession</span>
                <Badge variant="outline">{stats.totalQuantity}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Wing Members</span>
                <Badge variant="outline">{stats.activeMembers}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Wing Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Wing Requests</CardTitle>
              <CardDescription>Latest stock requests for your wing</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/stock-issuance-dashboard')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {wingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No wing requests yet</p>
          ) : (
            <div className="space-y-4">
              {wingRequests.slice(0, 5).map((request) => (
                <div key={request.request_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.item_name || 'Item Request'}</h4>
                    <p className="text-sm text-gray-500">
                      Requested by: {request.requester_name || 'Unknown'} | 
                      Quantity: {request.requested_quantity} | 
                      Date: {formatDateDMY(request.request_date || request.created_at)}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      request.request_status === 'Approved' || request.ApprovalStatus === 'APPROVED' 
                        ? 'default' 
                        : request.request_status === 'Rejected' || request.ApprovalStatus === 'REJECTED'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {request.request_status || request.ApprovalStatus || 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wing Inventory Overview */}
      {wingInventory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wing Inventory</CardTitle>
                <CardDescription>Items currently with wing members</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/wing-inventory')}>
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {wingInventory.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.item_name}</h4>
                    <p className="text-sm text-gray-500">
                      Holder: {item.holder_name || 'Unknown'} | Quantity: {item.quantity}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {item.category_name || 'Uncategorized'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WingDashboard;
