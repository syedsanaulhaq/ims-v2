import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/services/invmisApi';
import {
  Package, 
  ArrowLeft, 
  Search,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface StockQuantity {
  id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  unit: string;
  current_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  minimum_stock_level: number;
  reorder_point: number;
  maximum_stock_level: number;
  stock_status: string;
  last_updated: string;
}

const StockQuantitiesPage: React.FC = () => {
  const [quantities, setQuantities] = useState<StockQuantity[]>([]);
  const [filteredQuantities, setFilteredQuantities] = useState<StockQuantity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadQuantities();
  }, []);

  useEffect(() => {
    filterQuantities();
  }, [quantities, searchTerm, selectedStatus]);

  const loadQuantities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/inventory/current-inventory-stock`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stock quantities: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map the response and calculate stock status
      const mappedData = data.map((item: any) => {
        const current = item.current_quantity || 0;
        const min = item.minimum_stock_level || 0;
        const max = item.maximum_stock_level || 0;
        
        let stock_status = 'Normal';
        if (current === 0) stock_status = 'Out of Stock';
        else if (current < min) stock_status = 'Low Stock';
        else if (max > 0 && current > max) stock_status = 'Overstocked';
        
        return {
          id: item.item_master_id,
          item_code: item.item_code,
          item_name: item.nomenclature,
          category_name: item.category_name,
          unit: item.unit || 'N/A',
          current_quantity: current,
          available_quantity: item.available_quantity || 0,
          reserved_quantity: item.reserved_quantity || 0,
          minimum_stock_level: min,
          reorder_point: item.reorder_point || 0,
          maximum_stock_level: max,
          stock_status: stock_status,
          last_updated: item.last_updated
        };
      });
      
      setQuantities(mappedData);
    } catch (error) {
      console.error('Error loading stock quantities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock quantities');
    } finally {
      setLoading(false);
    }
  };

  const filterQuantities = () => {
    let filtered = quantities;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_code.toLowerCase().includes(search) ||
        item.item_name.toLowerCase().includes(search) ||
        item.category_name.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.stock_status === selectedStatus);
    }

    setFilteredQuantities(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Out of Stock': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'Low Stock': { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      'Overstock': { color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
      'In Stock': { color: 'bg-green-100 text-green-800', icon: Package }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['In Stock'];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getQuantityColor = (current: number, reorder: number): string => {
    if (current === 0) return 'text-red-600 font-bold';
    if (current <= reorder) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  // Calculate summary statistics
  const stats = {
    total: filteredQuantities.length,
    outOfStock: filteredQuantities.filter(q => q.stock_status === 'Out of Stock').length,
    lowStock: filteredQuantities.filter(q => q.stock_status === 'Low Stock').length,
    overstock: filteredQuantities.filter(q => q.stock_status === 'Overstock').length,
    inStock: filteredQuantities.filter(q => q.stock_status === 'In Stock').length
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Overstock', label: 'Overstock' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Loading stock quantities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Error Loading Stock Quantities</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={loadQuantities}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/inventory-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Stock Quantities
            </h1>
            <p className="text-gray-600">Current stock levels and inventory status</p>
          </div>
        </div>
        <Button onClick={loadQuantities} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Overstock</p>
              <p className="text-2xl font-bold text-purple-600">{stats.overstock}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by item code, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Quantities Table */}
      {filteredQuantities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock quantities found</p>
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search criteria</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock Quantities</span>
              <Badge variant="outline">{filteredQuantities.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuantities.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          <div className="text-sm text-gray-500">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{item.category_name || 'N/A'}</td>
                      <td className={`px-4 py-4 text-right text-base ${getQuantityColor(item.current_quantity, item.reorder_point)}`}>
                        {formatNumber(item.current_quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-green-600">
                        {formatNumber(item.available_quantity)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-orange-600">
                        {formatNumber(item.reserved_quantity)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600">
                        {formatNumber(item.minimum_stock_level)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600">
                        {formatNumber(item.reorder_point)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(item.stock_status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(item.last_updated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockQuantitiesPage;
