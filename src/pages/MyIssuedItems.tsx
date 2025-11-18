import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Calendar, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Search,
  Download
} from 'lucide-react';
import { formatDateDMY } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiBaseUrl } from '@/services/invmisApi';

interface IssuedItem {
  ledger_id: string;
  request_number: string;
  nomenclature: string;
  category_name: string;
  issued_quantity: number;
  unit_price: number;
  total_value: number;
  issued_at: string;
  issued_by_name: string;
  purpose: string;
  request_type: string;
  is_returnable: boolean;
  expected_return_date: string | null;
  actual_return_date: string | null;
  return_status: string;
  current_return_status: string;
  status: string;
  issuance_notes: string;
}

interface Summary {
  total_items: number;
  total_value: number;
  returnable_items: number;
  not_returned: number;
  overdue: number;
}

export default function MyIssuedItems() {
  const apiBase = getApiBaseUrl();

  const [items, setItems] = useState<IssuedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<IssuedItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // TODO: Get from auth context
  const currentUserId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';

  useEffect(() => {
    fetchMyIssuedItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus]);

  const fetchMyIssuedItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/issued-items/user/${currentUserId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch issued items');
      }

      const data = await response.json();
      setItems(data.items || []);
      setSummary(data.summary);
      
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error fetching issued items:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter(item => item.current_return_status === 'Overdue');
      } else if (filterStatus === 'returnable') {
        filtered = filtered.filter(item => item.is_returnable && item.return_status === 'Not Returned');
      } else {
        filtered = filtered.filter(item => item.status === filterStatus);
      }
    }

    setFilteredItems(filtered);
  };

  const getStatusBadge = (item: IssuedItem) => {
    if (item.current_return_status === 'Overdue') {
      return <Badge className="bg-red-500">Overdue</Badge>;
    }
    if (item.status === 'Returned') {
      return <Badge className="bg-green-500">Returned</Badge>;
    }
    if (item.status === 'Issued') {
      return <Badge className="bg-blue-500">In Use</Badge>;
    }
    if (item.status === 'Damaged') {
      return <Badge className="bg-orange-500">Damaged</Badge>;
    }
    if (item.status === 'Lost') {
      return <Badge className="bg-gray-500">Lost</Badge>;
    }
    return <Badge>{item.status}</Badge>;
  };

  const getReturnStatusIcon = (status: string) => {
    switch (status) {
      case 'Returned':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Not Returned':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Issued Items</h1>
          <p className="text-gray-600 mt-1">Track items you've received from inventory</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50" variant="destructive">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{summary.total_items}</div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ₨ {summary.total_value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Value</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{summary.returnable_items}</div>
                  <div className="text-sm text-gray-600">Returnable</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <div className="text-2xl font-bold">{summary.not_returned}</div>
                  <div className="text-sm text-gray-600">Not Returned</div>
                </div>
              </CardContent>
            </Card>

            <Card className={summary.overdue > 0 ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${summary.overdue > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                  <div className={`text-2xl font-bold ${summary.overdue > 0 ? 'text-red-600' : ''}`}>
                    {summary.overdue}
                  </div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'Issued' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('Issued')}
                  size="sm"
                >
                  In Use
                </Button>
                <Button
                  variant={filterStatus === 'returnable' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('returnable')}
                  size="sm"
                >
                  Returnable
                </Button>
                <Button
                  variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('overdue')}
                  size="sm"
                  className={filterStatus === 'overdue' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  Overdue
                </Button>
                <Button
                  variant={filterStatus === 'Returned' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('Returned')}
                  size="sm"
                >
                  Returned
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Items ({filteredItems.length})</span>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request#</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item) => (
                      <tr key={item.ledger_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-sm">{item.nomenclature}</div>
                            <div className="text-xs text-gray-500">{item.category_name}</div>
                            <div className="text-xs text-gray-400 mt-1">{item.purpose}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs">{item.request_number}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold">{item.issued_quantity}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold">₨ {item.total_value.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDateDMY(item.issued_at)}
                          </div>
                          {item.issued_by_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              By: {item.issued_by_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(item)}
                        </td>
                        <td className="px-4 py-4">
                          {item.is_returnable ? (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {getReturnStatusIcon(item.current_return_status)}
                                <span className="text-sm">{item.current_return_status}</span>
                              </div>
                              {item.expected_return_date && (
                                <div className="text-xs text-gray-500">
                                  Expected: {formatDateDMY(item.expected_return_date)}
                                </div>
                              )}
                              {item.actual_return_date && (
                                <div className="text-xs text-green-600">
                                  Returned: {formatDateDMY(item.actual_return_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not Returnable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
