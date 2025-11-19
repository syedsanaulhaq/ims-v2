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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
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
    draftTenders: data.tenders.filter(t => t.status === 'Draft' || t.tender_status === 'Draft').length,
    closedTenders: data.tenders.filter(t => t.status === 'Closed' || t.tender_status === 'Closed').length,
    
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
    rejectedRequests: data.stockRequests.filter(r => 
      r.request_status === 'Rejected' || 
      r.ApprovalStatus === 'REJECTED'
    ).length,
    
    totalInventoryItems: data.inventoryStats?.stats?.inventory?.total_items || data.inventoryStock.length,
    totalInventoryQuantity: data.inventoryStats?.stats?.inventory?.total_quantity || data.inventoryStock.reduce((sum, item) => sum + (item.current_quantity || 0), 0),
    availableQuantity: data.inventoryStats?.stats?.inventory?.available_quantity || data.inventoryStock.reduce((sum, item) => sum + (item.available_quantity || item.current_quantity || 0), 0),
    
    lowStockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      const reorderLevel = item.reorder_level || item.ReorderLevel || item.minimum_stock_level || 10;
      return quantity > 0 && quantity <= reorderLevel;
    }).length,
    outOfStockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      return quantity === 0;
    }).length,
    normalStockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      const reorderLevel = item.reorder_level || item.ReorderLevel || item.minimum_stock_level || 10;
      const maxLevel = item.maximum_stock_level || 0;
      return quantity > reorderLevel && (maxLevel === 0 || quantity <= maxLevel);
    }).length,
    overstockItems: data.inventoryStock.filter(item => {
      const quantity = item.quantity || item.Quantity || item.current_quantity || 0;
      const maxLevel = item.maximum_stock_level || 0;
      return maxLevel > 0 && quantity > maxLevel;
    }).length,
    
    totalStockValue: data.inventoryStock.reduce((sum, item) => {
      const qty = item.current_quantity || item.quantity || 0;
      const price = item.latest_unit_price || item.unit_price || 0;
      return sum + (qty * price);
    }, 0)
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Stock status chart data
  const stockStatusData = [
    { name: 'Normal Stock', value: stats.normalStockItems, color: '#00C49F' },
    { name: 'Low Stock', value: stats.lowStockItems, color: '#FFBB28' },
    { name: 'Out of Stock', value: stats.outOfStockItems, color: '#FF8042' },
    { name: 'Overstock', value: stats.overstockItems, color: '#8884D8' }
  ].filter(item => item.value > 0);

  // Tender status chart data
  const tenderChartData = [
    { name: 'Active', value: stats.activeTenders, color: COLORS[0] },
    { name: 'Finalized', value: stats.finalizedTenders, color: COLORS[1] },
    { name: 'Draft', value: stats.draftTenders, color: COLORS[2] },
    { name: 'Closed', value: stats.closedTenders, color: COLORS[3] }
  ].filter(item => item.value > 0);

  // Stock requests chart data
  const requestsChartData = [
    { name: 'Pending', value: stats.pendingRequests, color: COLORS[2] },
    { name: 'Approved', value: stats.approvedRequests, color: COLORS[1] },
    { name: 'Rejected', value: stats.rejectedRequests, color: COLORS[3] }
  ].filter(item => item.value > 0);

  // Performance data
  const performanceData = [
    { name: 'Active Tenders', value: stats.activeTenders, color: '#8884d8' },
    { name: 'Pending Deliveries', value: stats.pendingDeliveries, color: '#82ca9d' },
    { name: 'Pending Requests', value: stats.pendingRequests, color: '#ffc658' },
    { name: 'Low Stock Items', value: stats.lowStockItems, color: '#ff7300' }
  ];

  // Inventory value by category
  const categoryValueData = (() => {
    const categoryTotals: Record<string, number> = {};
    
    data.inventoryStock.forEach(item => {
      const category = item.category_name || item.CategoryName || 'Uncategorized';
      const quantity = item.current_quantity || item.quantity || 0;
      const price = item.latest_unit_price || item.unit_price || 0;
      const value = quantity * price;
      categoryTotals[category] = (categoryTotals[category] || 0) + value;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  // Monthly trends (fiscal year: July-June)
  const monthlyTrends = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const fiscalYearStart = currentMonth >= 6 ? currentYear : currentYear - 1;
    
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyData: Record<string, { requests: number; deliveries: number; tenders: number }> = {};
    
    monthNames.forEach(month => {
      monthlyData[month] = { requests: 0, deliveries: 0, tenders: 0 };
    });

    const getFiscalMonth = (date: Date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      
      if (year === fiscalYearStart && month >= 6) {
        return monthNames[month - 6];
      } else if (year === fiscalYearStart + 1 && month < 6) {
        return monthNames[month + 6];
      }
      return null;
    };

    data.stockRequests.forEach(request => {
      if (request.created_at) {
        const fiscalMonth = getFiscalMonth(new Date(request.created_at));
        if (fiscalMonth && monthlyData[fiscalMonth]) {
          monthlyData[fiscalMonth].requests += 1;
        }
      }
    });

    data.deliveries.forEach(delivery => {
      if (delivery.created_at) {
        const fiscalMonth = getFiscalMonth(new Date(delivery.created_at));
        if (fiscalMonth && monthlyData[fiscalMonth]) {
          monthlyData[fiscalMonth].deliveries += 1;
        }
      }
    });

    data.tenders.forEach(tender => {
      if (tender.created_at) {
        const fiscalMonth = getFiscalMonth(new Date(tender.created_at));
        if (fiscalMonth && monthlyData[fiscalMonth]) {
          monthlyData[fiscalMonth].tenders += 1;
        }
      }
    });

    return monthNames.map(month => ({
      month,
      'Stock Requests': monthlyData[month].requests,
      'Deliveries': monthlyData[month].deliveries,
      'Tenders': monthlyData[month].tenders
    }));
  })();

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
        {/* Inventory Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500" onClick={() => navigate('/inventory')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Inventory Overview</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalInventoryItems}</div>
            <p className="text-xs text-gray-600 mt-1">Total Items</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-700">{stats.normalStockItems} Normal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700">{stats.lowStockItems} Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-gray-700">{stats.outOfStockItems} Out</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-700">{stats.overstockItems} Over</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-semibold">
              Total Value: ₹{stats.totalStockValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Operations Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500" onClick={() => navigate('/stock-issuance')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Operations</CardTitle>
            <ClipboardList className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalStockRequests}</div>
            <p className="text-xs text-gray-600 mt-1">Stock Requests</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                <span className="text-gray-700">{stats.pendingRequests} Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-gray-700">{stats.approvedRequests} Approved</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                <span className="text-gray-700">{stats.rejectedRequests} Rejected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenders Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500" onClick={() => navigate('/tenders')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Tenders</CardTitle>
            <FileText className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalTenders}</div>
            <p className="text-xs text-gray-600 mt-1">Total Tenders</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-blue-600" />
                <span className="text-gray-700">{stats.activeTenders} Active</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-gray-700">{stats.finalizedTenders} Finalized</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-gray-600" />
                <span className="text-gray-700">{stats.draftTenders} Draft</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                <span className="text-gray-700">{stats.closedTenders} Closed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500" onClick={() => navigate('/deliveries')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Deliveries</CardTitle>
            <Truck className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalDeliveries}</div>
            <p className="text-xs text-gray-600 mt-1">Total Deliveries</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                <span className="text-gray-700">{stats.pendingDeliveries} Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-gray-700">{stats.completedDeliveries} Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Activity Trends */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Yearly Activity Trends</CardTitle>
          <CardDescription>Fiscal year overview (July - June)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTenders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Stock Requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
              <Area type="monotone" dataKey="Deliveries" stroke="#10b981" fillOpacity={1} fill="url(#colorDeliveries)" />
              <Area type="monotone" dataKey="Tenders" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTenders)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
            <CardDescription>Inventory health overview</CardDescription>
          </CardHeader>
          <CardContent>
            {stockStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No stock data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Value by Category */}
        {categoryValueData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Inventory Value by Category</CardTitle>
              <CardDescription>Top 6 categories by total value</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryValueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#3b82f6">
                    {categoryValueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.tenders.slice(0, 3).map((tender: any) => (
                <div key={tender.tender_id || tender.TenderID} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="font-medium text-sm text-gray-900 line-clamp-1">
                    {tender.tender_name || tender.TenderName || 'Untitled Tender'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={tender.is_finalized ? 'default' : 'secondary'} className="text-xs">
                      {tender.is_finalized ? 'Finalized' : (tender.tender_status || tender.status || 'Draft')}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {tender.created_at ? formatDateDMY(tender.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
              {data.tenders.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">No tenders found</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.deliveries.slice(0, 3).map((delivery: any) => (
                <div key={delivery.delivery_id || delivery.DeliveryID} className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="font-medium text-sm text-gray-900 line-clamp-1">
                    Delivery #{delivery.delivery_id || delivery.DeliveryID}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {delivery.supplier_name || delivery.SupplierName || 'Unknown Supplier'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={delivery.is_finalized ? 'default' : 'secondary'} className="text-xs">
                      {delivery.is_finalized ? 'Completed' : (delivery.delivery_status || delivery.status || 'Pending')}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {delivery.created_at ? formatDateDMY(delivery.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
              {data.deliveries.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">No deliveries found</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Stock Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Stock Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.stockRequests.slice(0, 3).map((request: any) => (
                <div key={request.request_id || request.RequestID} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="font-medium text-sm text-gray-900 line-clamp-1">
                    Request #{request.request_id || request.RequestID}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {request.requesting_office_name || request.OfficeName || 'Unknown Office'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge 
                      variant={
                        request.request_status === 'Approved' || request.ApprovalStatus === 'APPROVED' ? 'default' : 
                        request.request_status === 'Rejected' || request.ApprovalStatus === 'REJECTED' ? 'destructive' : 
                        'secondary'
                      } 
                      className="text-xs"
                    >
                      {request.request_status || request.ApprovalStatus || 'Pending'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {request.created_at ? formatDateDMY(request.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
              {data.stockRequests.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">No requests found</div>
              )}
            </div>
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
