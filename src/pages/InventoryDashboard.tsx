import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  AlertTriangle, 
  BarChart3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { InventoryService, type InventoryItem, type InventoryStats } from '@/services/inventoryServiceSqlServer';

interface ExtendedInventoryStats extends InventoryStats {
  totalStockQty: number;
  itemsBelowMinimum: number;
  itemsNeedingReorder: number;
}

const InventoryDashboard: React.FC = () => {
  const [stats, setStats] = useState<ExtendedInventoryStats | null>(null);
  const [topItems, setTopItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [reorderItems, setReorderItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await InventoryService.getInventoryData();
      const inventoryItems = result.data;

      const extendedStats: ExtendedInventoryStats = {
        ...result.stats,
        totalStockQty: inventoryItems.reduce((sum, item) => sum + item.currentStock, 0),
        itemsBelowMinimum: inventoryItems.filter(item => {
          const currentStock = item.currentStock;
          const minLevel = item.minimumStock;
          const reorderLevel = item.reorderLevel || 0;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel) ||
            (minLevel > 0 && currentStock < (minLevel * 1.2))
          );
        }).length,
        itemsNeedingReorder: inventoryItems.filter(item => {
          const currentStock = item.currentStock;
          const reorderLevel = item.reorderLevel || 0;
          const minLevel = item.minimumStock;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel)
          );
        }).length
      };
      setStats(extendedStats);

      const topItemsData = inventoryItems
        .sort((a, b) => b.currentStock - a.currentStock)
        .slice(0, 10);
      setTopItems(topItemsData);

      const lowStockData = inventoryItems
        .filter(item => {
          const currentStock = item.currentStock;
          const minLevel = item.minimumStock;
          const reorderLevel = item.reorderLevel || 0;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel) ||
            (minLevel > 0 && currentStock < (minLevel * 1.2))
          );
        })
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 15);
      setLowStockItems(lowStockData);

      const reorderData = inventoryItems
        .filter(item => {
          const currentStock = item.currentStock;
          const reorderLevel = item.reorderLevel || 0;
          const minLevel = item.minimumStock;
          
          return (
            currentStock <= 0 ||
            (reorderLevel > 0 && currentStock <= reorderLevel) ||
            (minLevel > 0 && currentStock <= minLevel)
          );
        })
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 12);
      setReorderItems(reorderData);

    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      
      setStats({
        totalItems: 0,
        totalStockValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        normalStockItems: 0,
        overstockItems: 0,
        totalStockQty: 0,
        itemsBelowMinimum: 0,
        itemsNeedingReorder: 0
      });
      setTopItems([]);
      setLowStockItems([]);
      setReorderItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-8 h-8 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600 mb-4">No inventory data available</p>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTopItemsChartData = () => {
    return topItems.slice(0, 10).map(item => ({
      name: item.itemName.length > 15 ? item.itemName.substring(0, 15) + '...' : item.itemName,
      stock: item.currentStock
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-1">Visual inventory analytics and insights</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Items Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/dashboard/inventory-all-items')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Total Items
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalItems)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.normalStockItems} normal stock items
            </p>
          </CardContent>
        </Card>

        {/* Total Qty Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/dashboard/inventory-stock-quantities')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Total Qty
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalStockQty)}</div>
            <p className="text-xs text-muted-foreground">
              Units in inventory
            </p>
          </CardContent>
        </Card>

        {/* Alerts Card - Clickable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/dashboard/inventory-alerts')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Alerts
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.itemsNeedingReorder}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="stock-levels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock-levels" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Stock Levels Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTopItemsChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} units`, 'Stock']}
                    />
                    <Legend />
                    <Bar dataKey="stock" fill="#10B981" name="Stock" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Low Stock Alerts ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {lowStockItems.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">{item.itemName}</div>
                        <div className="text-xs text-gray-600">
                          Current: {item.currentStock} | Min: {item.minimumStock}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No low stock alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Reorder Required ({reorderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {reorderItems.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">{item.itemName}</div>
                        <div className="text-xs text-gray-600">
                          Stock: {item.currentStock} | Reorder at: {item.reorderLevel || 'N/A'}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        Urgent
                      </Badge>
                    </div>
                  ))}
                  {reorderItems.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No urgent reorders</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryDashboard;
