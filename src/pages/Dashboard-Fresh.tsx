import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';
import { 
  Package, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  ShoppingCart,
  Calendar,
  MapPin,
  Clock,
  Eye,
  Building,
  FileText,
  Truck,
  ClipboardList,
  Database,
  BarChart3,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import LoadingSpinner from "@/components/common/LoadingSpinner";

// Type definitions
interface DashboardData {
  tenders: any[];
  deliveries: any[];
  stockRequests: any[];
  inventoryStock: any[];
  inventoryStats: any | null;
  offices: any[];
  users: any[];
  wings: any[];
}

const DashboardFresh: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [data, setData] = useState<DashboardData>({
    tenders: [],
    deliveries: [],
    stockRequests: [],
    inventoryStock: [],
    inventoryStats: null,
    offices: [],
    users: [],
    wings: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get API base URL dynamically
      const apiBase = getApiBaseUrl();
      console.log('🔄 Fetching dashboard data from:', apiBase);

      // Fetch all endpoints in parallel
      const [
        tendersRes,
        deliveriesRes,
        stockRequestsRes,
        inventoryRes,
        statsRes,
        officesRes,
        usersRes,
        wingsRes
      ] = await Promise.allSettled([
        fetch(`${apiBase}/tenders`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/deliveries`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/stock-issuance/requests`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/inventory-stock`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/inventory/dashboard-stats`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/offices`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/users`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/wings`).then(r => r.ok ? r.json() : [])
      ]);

      // Extract data or use fallbacks
      setData({
        tenders: tendersRes.status === 'fulfilled' ? (Array.isArray(tendersRes.value) ? tendersRes.value : []) : [],
        deliveries: deliveriesRes.status === 'fulfilled' ? (Array.isArray(deliveriesRes.value) ? deliveriesRes.value : []) : [],
        stockRequests: stockRequestsRes.status === 'fulfilled' ? (Array.isArray(stockRequestsRes.value) ? stockRequestsRes.value : (stockRequestsRes.value?.data || [])) : [],
        inventoryStock: inventoryRes.status === 'fulfilled' ? (Array.isArray(inventoryRes.value) ? inventoryRes.value : []) : [],
        inventoryStats: statsRes.status === 'fulfilled' ? (statsRes.value?.success ? statsRes.value : null) : null,
        offices: officesRes.status === 'fulfilled' ? (Array.isArray(officesRes.value) ? officesRes.value : []) : [],
        users: usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : []) : [],
        wings: wingsRes.status === 'fulfilled' ? (Array.isArray(wingsRes.value) ? wingsRes.value : []) : []
      });

      console.log('✅ Dashboard data loaded successfully');

    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching data from server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchDashboardData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    totalOffices: data.offices.length,
    totalWings: data.wings.length,
    totalUsers: data.users.length,
    activeUsers: data.users.filter(u => u.ISACT || u.isActive).length,
    
    totalTenders: data.tenders.length,
    activeTenders: data.tenders.filter(t => !t.is_finalized && (t.tender_status === 'Published' || t.status === 'Published')).length,
    finalizedTenders: data.tenders.filter(t => t.is_finalized === true || t.is_finalized === 1).length,
    
    totalDeliveries: data.deliveries.length,
    pendingDeliveries: data.deliveries.filter(d => !d.is_finalized && (d.delivery_status === 'Pending' || d.status === 'Pending')).length,
    completedDeliveries: data.deliveries.filter(d => d.is_finalized || d.delivery_status === 'Completed' || d.status === 'Completed').length,
    
    totalStockRequests: data.stockRequests.length,
    pendingRequests: data.stockRequests.filter(r => 
      r.request_status === 'Submitted' || 
      r.request_status === 'Pending' || 
      r.ApprovalStatus === 'PENDING'
    ).length,
    approvedRequests: data.stockRequests.filter(r => 
      r.request_status === 'Approved' || 
      r.ApprovalStatus === 'APPROVED'
    ).length,
    
    totalInventoryItems: data.inventoryStock.length,
    lowStockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      const reorderLevel = item.reorder_level || item.ReorderLevel || 10;
      return quantity > 0 && quantity <= reorderLevel;
    }).length,
    outOfStockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      return quantity === 0;
    }).length
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Tender status chart data
  const tenderChartData = [
    { name: 'Active', value: stats.activeTenders, color: COLORS[0] },
    { name: 'Finalized', value: stats.finalizedTenders, color: COLORS[1] },
    { name: 'Draft', value: data.tenders.filter(t => t.status === 'Draft' || t.tender_status === 'Draft').length, color: COLORS[2] }
  ].filter(item => item.value > 0);

  // Stock requests chart data
  const requestsChartData = [
    { name: 'Pending', value: stats.pendingRequests, color: COLORS[2] },
    { name: 'Approved', value: stats.approvedRequests, color: COLORS[1] },
    { name: 'Rejected', value: data.stockRequests.filter(r => r.request_status === 'Rejected' || r.ApprovalStatus === 'REJECTED').length, color: COLORS[3] }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Inventory Management System Overview</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tenders Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/tenders')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tenders</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalTenders}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {stats.activeTenders} Active
              </span>
              <span className="text-gray-500">{stats.finalizedTenders} Finalized</span>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/deliveries')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deliveries</CardTitle>
            <Truck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalDeliveries}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-yellow-600 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {stats.pendingDeliveries} Pending
              </span>
              <span className="text-gray-500">{stats.completedDeliveries} Done</span>
            </div>
          </CardContent>
        </Card>

        {/* Stock Requests Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/stock-issuance')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Stock Requests</CardTitle>
            <ClipboardList className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalStockRequests}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-yellow-600 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {stats.pendingRequests} Pending
              </span>
              <span className="text-gray-500">{stats.approvedRequests} Approved</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/inventory')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inventory</CardTitle>
            <Package className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalInventoryItems}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {stats.lowStockItems} Low
              </span>
              <span className="text-gray-500">{stats.outOfStockItems} Out</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Status Distribution</CardTitle>
            <CardDescription>Overview of tender statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {tenderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={tenderChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tenderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No tender data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Requests Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Request Status</CardTitle>
            <CardDescription>Breakdown of stock issuance requests</CardDescription>
          </CardHeader>
          <CardContent>
            {requestsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={requestsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No stock request data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
          <CardDescription>Organization structure overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalOffices}</div>
              <div className="text-sm text-gray-500">Offices</div>
            </div>
            <div className="text-center">
              <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalWings}</div>
              <div className="text-sm text-gray-500">Wings</div>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Optional, you can uncomment if needed */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.tenders.slice(0, 5).map((tender, idx) => (
              <div key={idx} className="flex items-center gap-4 border-b pb-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">{tender.tender_name || tender.TenderName}</p>
                  <p className="text-sm text-gray-500">
                    {tender.tender_number || tender.TenderNumber}
                  </p>
                </div>
                <Badge variant={tender.is_finalized ? "success" : "warning"}>
                  {tender.is_finalized ? "Finalized" : "Active"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default DashboardFresh;
