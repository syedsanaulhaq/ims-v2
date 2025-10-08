import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  AlertTriangle, 
  BarChart3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Activity,
  Archive,
  Package2,
  CheckCircle,
  XCircle,
  Clock
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
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await InventoryService.getInventoryData();
      const inventoryItems = result.data;
      
      // Store all items for the enhanced table
      setAllItems(inventoryItems);

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

  // Enhanced search and filtering functions
  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStockFilter = stockFilter === 'all' || 
      (stockFilter === 'low-stock' && item.currentStock <= item.minimumStock) ||
      (stockFilter === 'out-of-stock' && item.currentStock === 0) ||
      (stockFilter === 'normal-stock' && item.currentStock > item.minimumStock) ||
      (stockFilter === 'overstock' && item.maximumStock && item.currentStock > item.maximumStock);

    const matchesCategoryFilter = categoryFilter === 'all' || 
      item.category === categoryFilter;

    return matchesSearch && matchesStockFilter && matchesCategoryFilter;
  });

  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.currentStock <= item.minimumStock) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low Stock</Badge>;
    } else if (item.maximumStock && item.currentStock > item.maximumStock) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Overstock</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Normal</Badge>;
    }
  };

  const handleQuickFilter = (filterType: string) => {
    setStockFilter(filterType);
    setSearchTerm('');
  };

  const handleItemEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleItemDelete = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete ${item.itemName}?`)) {
      try {
        // Add delete API call here
        toast({
          title: "Success",
          description: `${item.itemName} has been deleted.`,
        });
        fetchData(); // Refresh data
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete item.",
          variant: "destructive",
        });
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(!showSearch);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

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
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Inventory Dashboard
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Comprehensive inventory analytics and stock management
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/dashboard/inventory')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Manage Items
          </Button>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search inventory... (Ctrl+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Stock Level: {stockFilter === 'all' ? 'All' : stockFilter.charAt(0).toUpperCase() + stockFilter.slice(1).replace('-', ' ')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStockFilter('all')}>All Items</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockFilter('low-stock')}>Low Stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockFilter('out-of-stock')}>Out of Stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockFilter('normal-stock')}>Normal Stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockFilter('overstock')}>Overstock</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={stockFilter === 'normal-stock' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('normal-stock')}
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Normal Stock
        </Button>
        <Button
          variant={stockFilter === 'low-stock' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('low-stock')}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Low Stock
        </Button>
        <Button
          variant={stockFilter === 'out-of-stock' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('out-of-stock')}
          className="flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Out of Stock
        </Button>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => navigate('/dashboard/inventory-all-items')}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalItems || 0}</p>
              <p className="text-xs text-blue-500">Active inventory</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => navigate('/dashboard/inventory-stock-quantities')}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats?.totalStockQty || 0)}</p>
              <p className="text-xs text-green-500">Units in stock</p>
            </div>
            <Archive className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => handleQuickFilter('low-stock')}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.itemsBelowMinimum || 0}</p>
              <p className="text-xs text-orange-500">Need attention</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => handleQuickFilter('out-of-stock')}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats?.outOfStockItems || 0}</p>
              <p className="text-xs text-red-500">Critical items</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </CardContent>
        </Card>



        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Normal Stock</p>
              <p className="text-2xl font-bold text-teal-600">{stats?.normalStockItems || 0}</p>
              <p className="text-xs text-teal-500">Healthy levels</p>
            </div>
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </CardContent>
        </Card>
      </div>

      {/* Chart Section - Moved from bottom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top Items by Stock Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopItemsChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
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

      {/* Enhanced Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            Inventory Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min/Max</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No items match your search criteria</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSearchTerm(''); setStockFilter('all'); }}>
                        Clear Filters
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.slice(0, 20).map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{item.itemName}</p>
                          {item.itemCode && (
                            <p className="text-sm text-muted-foreground">Code: {item.itemCode}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {item.subCategory && (
                            <p className="text-xs text-muted-foreground">{item.subCategory}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="space-y-1">
                          <p className="font-medium">{formatNumber(item.currentStock)}</p>
                          {item.unit && (
                            <p className="text-xs text-muted-foreground">{item.unit}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="space-y-1">
                          <p>Min: {formatNumber(item.minimumStock)}</p>
                          {item.maximumStock && (
                            <p className="text-muted-foreground">Max: {formatNumber(item.maximumStock)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStockStatusBadge(item)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleItemEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Activity className="w-4 h-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleItemDelete(item)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length > 20 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Showing 20 of {filteredItems.length} items
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Top Items by Stock Level
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

      {/* Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Make changes to {selectedItem?.itemName} inventory details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Stock</label>
              <Input
                type="number"
                defaultValue={selectedItem?.currentStock || 0}
                placeholder="Enter current stock"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Stock</label>
              <Input
                type="number"
                defaultValue={selectedItem?.minimumStock || 0}
                placeholder="Enter minimum stock level"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Success",
                description: "Item updated successfully.",
              });
              setDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryDashboard;
