import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
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
  Minus,
  Settings,
  Shield
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { invmisApi } from "@/services/invmisApi";

const Dashboard = () => {
  const navigate = useNavigate();

  // State for real SQL Server data
  const [tenders, setTenders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [stockIssuanceRequests, setStockIssuanceRequests] = useState<any[]>([]);
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [offices, setOffices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all real data from SQL Server
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch all data in parallel using new InvMIS API
        const [
          tendersRes,
          deliveriesRes,
          procurementRes,
          inventoryStockRes,
          dashboardSummaryRes,
          officesRes,
          usersRes,
          wingsRes
        ] = await Promise.all([
          invmisApi.tenders.getAwards().catch(() => ({ success: false, awards: [] })),
          invmisApi.deliveries.getAll().catch(() => ({ success: false, deliveries: [] })),
          invmisApi.procurement.getRequests().catch(() => ({ success: false, requests: [] })),
          invmisApi.stock.getCurrent().catch(() => ({ success: false, stock: [] })),
          invmisApi.dashboard.getSummary().catch(() => null),
          invmisApi.offices.getAll().catch(() => ({ success: false, offices: [] })),
          invmisApi.users.getAll().catch(() => ({ success: false, users: [] })),
          invmisApi.wings.getAll().catch(() => ({ success: false, wings: [] }))
        ]);

        console.log('Dashboard data loaded from InvMIS API:', {
          tenders: tendersRes?.awards?.length || 0,
          deliveries: deliveriesRes?.deliveries?.length || 0,
          procurementRequests: procurementRes?.requests?.length || 0,
          inventoryItems: inventoryStockRes?.stock?.length || 0,
          dashboardSummary: dashboardSummaryRes ? 'loaded' : 'failed',
          offices: officesRes?.offices?.length || 0,
          users: usersRes?.users?.length || 0,
          wings: wingsRes?.wings?.length || 0
        });

        // Update state with new API response format
        setTenders(tendersRes?.success ? tendersRes.awards : []);
        setDeliveries(deliveriesRes?.success ? deliveriesRes.deliveries : []);
        setStockIssuanceRequests(procurementRes?.success ? procurementRes.requests : []);
        setInventoryStock(inventoryStockRes?.success ? inventoryStockRes.stock : []);
        setInventoryStats(dashboardSummaryRes || null);
        setOffices(officesRes?.success ? officesRes.offices : []);
        setUsers(usersRes?.success ? usersRes.users : []);
        setWings(wingsRes?.success ? wingsRes.wings : []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Loading state
  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading comprehensive dashboard data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching data from SQL Server...</p>
        </div>
      </div>
    );
  }

  // Calculate comprehensive system statistics
  const systemStats = {
    // Core System Data
    totalOffices: offices.length,
    totalWings: wings.length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.ISACT || u.isActive).length,
    
    // Tender Management
    totalTenders: tenders.length,
    activeTenders: tenders.filter(t => !t.is_finalized && (t.tender_status === 'Published' || t.status === 'Published')).length,
    finalizedTenders: tenders.filter(t => t.is_finalized === true || t.is_finalized === 1).length,
    draftTenders: tenders.filter(t => t.status === 'Draft' || t.tender_status === 'Draft').length,
    closedTenders: tenders.filter(t => t.status === 'Closed' || t.tender_status === 'Closed').length,
    
    // Delivery Management
    totalDeliveries: deliveries.length,
    pendingDeliveries: deliveries.filter(d => !d.is_finalized && (d.delivery_status === 'Pending' || d.status === 'Pending')).length,
    completedDeliveries: deliveries.filter(d => d.is_finalized || d.delivery_status === 'Completed' || d.status === 'Completed').length,
    
    // Stock Issuance
    totalStockRequests: stockIssuanceRequests.length,
    pendingRequests: stockIssuanceRequests.filter(r => 
      r.request_status === 'Submitted' || 
      r.request_status === 'Pending' || 
      r.ApprovalStatus === 'PENDING'
    ).length,
    approvedRequests: stockIssuanceRequests.filter(r => 
      r.request_status === 'Approved' || 
      r.ApprovalStatus === 'APPROVED'
    ).length,
    
    // Inventory Management (using real inventory statistics)
    totalInventoryItems: inventoryStats?.stats?.inventory?.total_items || inventoryStock.length,
    totalInventoryQuantity: inventoryStats?.stats?.inventory?.total_quantity || 0,
    availableQuantity: inventoryStats?.stats?.inventory?.available_quantity || 0,
    reservedQuantity: inventoryStats?.stats?.inventory?.reserved_quantity || 0,
    lowStockItems: inventoryStats?.stats?.inventory?.low_stock_items || inventoryStock.filter(item => item.stock_status === 'Low Stock').length,
    outOfStockItems: inventoryStats?.stats?.inventory?.out_of_stock_items || inventoryStock.filter(item => item.stock_status === 'Out of Stock').length,
    
    // Movement Statistics
    issuesLastMonth: inventoryStats?.stats?.movements?.issues_last_month || 0,
    returnsLastMonth: inventoryStats?.stats?.movements?.returns_last_month || 0,
    totalIssuedLastMonth: inventoryStats?.stats?.movements?.total_issued_last_month || 0,
    totalReturnedLastMonth: inventoryStats?.stats?.movements?.total_returned_last_month || 0,
    
    // Category Statistics
    totalCategories: inventoryStats?.stats?.categories?.total_categories || [...new Set(inventoryStock.map(item => item.category_name).filter(Boolean))].length,
    
    // Calculate total inventory value from real data
    totalStockValue: inventoryStock.reduce((sum, item) => sum + (item.current_quantity * (item.latest_unit_price || 0)), 0)
  };

  // Process data for charts
  const processChartData = () => {
    // Stock Status Distribution - using real inventory data
    const stockStatusData = [
      { 
        name: 'Normal Stock', 
        value: inventoryStock.filter(item => item.stock_status === 'Normal').length,
        color: '#00C49F' 
      },
      { 
        name: 'Low Stock', 
        value: systemStats.lowStockItems,
        color: '#FFBB28' 
      },
      { 
        name: 'Out of Stock', 
        value: systemStats.outOfStockItems,
        color: '#FF8042' 
      },
      { 
        name: 'Overstock', 
        value: inventoryStock.filter(item => item.stock_status === 'Overstock').length,
        color: '#8884D8' 
      }
    ];

    // Inventory Value Distribution by Category
    const categoryValueData = () => {
      const categoryTotals: Record<string, number> = {};
      
      inventoryStock.forEach(item => {
        const category = item.category_name || 'Uncategorized';
        const value = (item.current_quantity || 0) * (item.latest_unit_price || 0);
        categoryTotals[category] = (categoryTotals[category] || 0) + value;
      });

      return Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6 categories
    };

    // Monthly trends from stock issuance requests and deliveries
    const monthlyTrends = () => {
      const currentYear = new Date().getFullYear();
      const monthlyData: Record<string, { requests: number; deliveries: number; tenders: number }> = {};
      
      // Initialize months
      for (let i = 0; i < 12; i++) {
        const month = new Date(currentYear, i, 1).toLocaleDateString('en', { month: 'short' });
        monthlyData[month] = { requests: 0, deliveries: 0, tenders: 0 };
      }

      // Process stock requests
      stockIssuanceRequests.forEach(request => {
        const date = new Date(request.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.toLocaleDateString('en', { month: 'short' });
          if (monthlyData[month]) monthlyData[month].requests += 1;
        }
      });

      // Process deliveries
      deliveries.forEach(delivery => {
        const date = new Date(delivery.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.toLocaleDateString('en', { month: 'short' });
          if (monthlyData[month]) monthlyData[month].deliveries += 1;
        }
      });

      // Process tenders
      tenders.forEach(tender => {
        const date = new Date(tender.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.toLocaleDateString('en', { month: 'short' });
          if (monthlyData[month]) monthlyData[month].tenders += 1;
        }
      });

      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        'Stock Requests': data.requests,
        'Deliveries': data.deliveries,
        'Tenders': data.tenders
      }));
    };

    // System Performance Metrics
    const performanceData = [
      { name: 'Active Tenders', value: systemStats.activeTenders, color: '#8884d8' },
      { name: 'Pending Deliveries', value: systemStats.pendingDeliveries, color: '#82ca9d' },
      { name: 'Pending Requests', value: systemStats.pendingRequests, color: '#ffc658' },
      { name: 'Low Stock Items', value: systemStats.lowStockItems, color: '#ff7300' }
    ];

    return { 
      stockStatusData, 
      categoryValueData: categoryValueData(),
      monthlyTrends: monthlyTrends(),
      performanceData
    };
  };

  const { stockStatusData, categoryValueData, monthlyTrends, performanceData } = processChartData();

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">System Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">
          Comprehensive Inventory Management System Overview
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Inventory Status */}
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500" onClick={() => navigate('/dashboard/inventory-details')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Package className="h-5 w-5" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Items</span>
                <span className="text-2xl font-bold text-blue-600">{systemStats.totalInventoryItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Available</span>
                <span className="text-lg font-semibold text-green-600">
                  {systemStats.availableQuantity?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-600">Low Stock</span>
                <span className="text-lg font-semibold text-orange-600">{systemStats.lowStockItems}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Operations */}
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500" onClick={() => navigate('/dashboard/stock-operations')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <ClipboardList className="h-5 w-5" />
              Stock Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-2xl font-bold text-green-600">{systemStats.totalStockRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-600">Pending</span>
                <span className="text-lg font-semibold text-yellow-600">{systemStats.pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Approved</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.approvedRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tender Management */}
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500" onClick={() => navigate('/tenders')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <FileText className="h-5 w-5" />
              Tender Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tenders</span>
                <span className="text-2xl font-bold text-purple-600">{systemStats.totalTenders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600">Active</span>
                <span className="text-lg font-semibold text-blue-600">{systemStats.activeTenders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Finalized</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.finalizedTenders}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Management */}
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500" onClick={() => navigate('/deliveries')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Truck className="h-5 w-5" />
              Delivery Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Deliveries</span>
                <span className="text-2xl font-bold text-orange-600">{systemStats.totalDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-600">Pending</span>
                <span className="text-lg font-semibold text-yellow-600">{systemStats.pendingDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Completed</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.completedDeliveries}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics & Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Monthly Activity Trends */}
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Monthly Activity Trends
            </CardTitle>
            <CardDescription>System activities over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorTenders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="Stock Requests" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorRequests)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Deliveries" 
                    stroke="#82ca9d" 
                    fillOpacity={1} 
                    fill="url(#colorDeliveries)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Tenders" 
                    stroke="#ffc658" 
                    fillOpacity={1} 
                    fill="url(#colorTenders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Status Distribution */}
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Stock Status Distribution
            </CardTitle>
            <CardDescription>Current inventory status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
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
            </div>
          </CardContent>
        </Card>

        {/* System Performance Metrics */}
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              System Performance
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Value by Category */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Inventory Value by Category
            </CardTitle>
            <CardDescription>Top categories by total inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryValueData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} fontSize={12} />
                  <Tooltip formatter={(value: any) => [`$${value?.toLocaleString()}`, 'Value']} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities Enhanced */}
        <Card className="hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent System Activity
            </CardTitle>
            <CardDescription>Latest updates across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {/* Recent Tenders */}
              {tenders.slice(0, 3).map((tender, index) => (
                <div key={`tender-${index}`} className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{tender.title}</h4>
                    <p className="text-sm text-gray-600">{tender.tender_type} - {tender.status}</p>
                    <p className="text-xs text-gray-500">
                      {tender.created_at ? new Date(tender.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{tender.status}</Badge>
                </div>
              ))}
              
              {/* Recent Deliveries */}
              {deliveries.slice(0, 2).map((delivery, index) => (
                <div key={`delivery-${index}`} className="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-200">
                  <Truck className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">Delivery #{delivery.id}</h4>
                    <p className="text-sm text-gray-600">Status: {delivery.delivery_status || delivery.status}</p>
                    <p className="text-xs text-gray-500">
                      {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{delivery.delivery_status || delivery.status}</Badge>
                </div>
              ))}

              {/* Recent Stock Requests */}
              {stockIssuanceRequests.slice(0, 2).map((request, index) => (
                <div key={`request-${index}`} className="flex items-center gap-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <ClipboardList className="h-8 w-8 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">Stock Request #{request.id}</h4>
                    <p className="text-sm text-gray-600">Status: {request.request_status || request.ApprovalStatus}</p>
                    <p className="text-xs text-gray-500">
                      {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{request.request_status || request.ApprovalStatus}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Enhanced */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-100 border-2 border-dashed border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Settings className="h-5 w-5" />
            Quick System Actions & Navigation
          </CardTitle>
          <CardDescription>Navigate to different system modules and key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-teal-50 hover:border-teal-300 border-2 border-teal-200"
              onClick={() => navigate('/dashboard/initial-setup')}
            >
              <Settings className="h-6 w-6 text-teal-600" />
              <div className="text-center">
                <div className="text-sm font-bold text-teal-600">Initial</div>
                <div className="text-xs text-gray-600">Setup</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/tenders')}
            >
              <FileText className="h-6 w-6 text-blue-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{systemStats.totalTenders}</div>
                <div className="text-xs text-gray-600">Tenders</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/deliveries')}
            >
              <Truck className="h-6 w-6 text-green-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{systemStats.totalDeliveries}</div>
                <div className="text-xs text-gray-600">Deliveries</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/dashboard/inventory-details')}
            >
              <Package className="h-6 w-6 text-purple-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{systemStats.totalInventoryItems}</div>
                <div className="text-xs text-gray-600">Inventory</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-300"
              onClick={() => navigate('/dashboard/stock-operations')}
            >
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{systemStats.lowStockItems}</div>
                <div className="text-xs text-gray-600">Low Stock</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => navigate('/users')}
            >
              <Users className="h-6 w-6 text-indigo-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">{systemStats.activeUsers}</div>
                <div className="text-xs text-gray-600">Active Users</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  ${(systemStats.totalStockValue / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-gray-600">Stock Value</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Recent System Activity
          </CardTitle>
          <CardDescription>Latest updates across all system modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenders.slice(0, 3).map((tender, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-semibold">{tender.title}</h4>
                  <p className="text-sm text-gray-600">{tender.tender_type} - {tender.status}</p>
                </div>
                <Badge variant="outline">{tender.status}</Badge>
              </div>
            ))}
            
            {deliveries.slice(0, 2).map((delivery, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border">
                <Truck className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <h4 className="font-semibold">Delivery #{delivery.id}</h4>
                  <p className="text-sm text-gray-600">Status: {delivery.delivery_status || delivery.status}</p>
                </div>
                <Badge variant="outline">{delivery.delivery_status || delivery.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
