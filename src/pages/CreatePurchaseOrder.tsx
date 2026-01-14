import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, X } from 'lucide-react';

interface Tender {
  id: number;
  title: string;
  tender_type: string;
  reference_number: string;
}

interface TenderItem {
  id: string;
  item_master_id: string;
  nomenclature?: string;
  quantity: number;
  estimated_unit_price?: number;
  vendor_id?: string;
  category_name?: string;
}

interface ItemPrice {
  itemId: number;
  unitPrice: number;
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenders();
    // Check if tenderId is provided in URL params
    const tenderId = searchParams.get('tenderId');
    if (tenderId) {
      setSelectedTenderId(tenderId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTenderId) {
      fetchTenderItems(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchTenders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tenders');
      if (!response.ok) throw new Error('Failed to fetch tenders');
      const data = await response.json();
      setTenders(data.filter((t: Tender) => t.id)); // Filter valid tenders
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError('Failed to load tenders');
    }
  };

  const fetchTenderItems = async (tenderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tender/${tenderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch tender items');
      const data = await response.json();
      setTenderItems(data);
      setSelectedItems(new Set()); // Reset selection
      
      // Auto-populate vendor ID from first item if all items have same vendor
      if (data.length > 0 && data[0].vendor_id) {
        const allSameVendor = data.every((item: TenderItem) => item.vendor_id === data[0].vendor_id);
        if (allSameVendor) {
          setVendorId(data[0].vendor_id);
        }
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load tender items');
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByVendor = () => {
    // No vendor grouping in simple version - just validate pricing is entered
    const missingPrices = Array.from(selectedItems).filter(itemId => {
      return !itemPrices[itemId] || itemPrices[itemId] <= 0;
    });
    
    if (missingPrices.length > 0) {
      setError(`Please enter valid unit price for ${missingPrices.length} item(s)`);
      return false;
    }
    return true;
  };

  const handleItemToggle = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(tenderItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleCreatePOs = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item');
      return;
    }

    if (!poDate) {
      setError('Please select a PO date');
      return;
    }

    // Validate all selected items have prices
    if (!groupItemsByVendor()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: selectedTenderId,
          selectedItems: Array.from(selectedItems),
          poDate,
          vendorId: parseInt(vendorId),
          itemPrices: itemPrices
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create POs');
      }

      const result = await response.json();
      alert(`✅ PO created successfully!`);
      navigate('/dashboard/purchase-orders');
    } catch (err) {
      console.error('Error creating POs:', err);
      setError(err instanceof Error ? err.message : 'Failed to create POs');
    } finally {
      setLoading(false);
    }
  };

  const getTenderTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'contract':
        return 'bg-purple-100 text-purple-800';
      case 'spot-purchase':
        return 'bg-orange-100 text-orange-800';
      case 'annual-tender':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalSelectedAmount = Array.from(selectedItems).reduce((sum, itemId) => {
    const item = tenderItems.find(ti => ti.id === itemId);
    const price = itemPrices[itemId] || 0;
    return sum + (price * (item?.quantity || 1));
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Purchase Order</h1>
          <p className="text-slate-600">Select items from a tender and enter pricing to create a PO</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Select Tender */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Tender</CardTitle>
            <CardDescription>Choose a tender to create POs from</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Select a tender..." />
              </SelectTrigger>
              <SelectContent>
                {tenders.map((tender) => (
                  <SelectItem key={tender.id} value={tender.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{tender.reference_number}: {tender.title}</span>
                      <Badge className={getTenderTypeColor(tender.tender_type)}>
                        {tender.tender_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTenderId && (
          <>
            {/* Step 2: Select Items */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Select Items</CardTitle>
                <CardDescription>Choose items from this tender ({tenderItems.length} items)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && <p className="text-slate-600">Loading items...</p>}

                {!loading && tenderItems.length === 0 && (
                  <p className="text-slate-600">No items found in this tender</p>
                )}

                {!loading && tenderItems.length > 0 && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedItems.size === tenderItems.length && tenderItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="font-medium text-slate-700">
                          Select All ({selectedItems.size} selected)
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total Selected</p>
                        <p className="text-lg font-bold text-blue-600">
                          Rs {totalSelectedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {tenderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleItemToggle(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-slate-900">{item.nomenclature || 'Item'}</p>
                              {item.category_name && <Badge variant="secondary">{item.category_name}</Badge>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-slate-700 mb-2">
                              Qty: {item.quantity}
                            </div>
                            {selectedItems.has(item.id) && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">Price:</span>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  step="0.01"
                                  value={itemPrices[item.id] || ''}
                                  onChange={(e) => {
                                    setItemPrices({
                                      ...itemPrices,
                                      [item.id]: parseFloat(e.target.value) || 0
                                    });
                                  }}
                                  className="w-24 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Vendor & PO Date */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Set Vendor & PO Date</CardTitle>
                <CardDescription>Select the vendor and set the PO date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendor ID</label>
                  <Input
                    type="number"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="border-slate-300"
                    placeholder="Enter vendor ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">PO Date</label>
                  <Input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedItems.size > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Selected Items:</span>
                      <span className="font-medium">{selectedItems.size} item(s)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Value:</span>
                      <span className="font-bold text-green-600">
                        Rs {totalSelectedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Vendor ID:</span>
                      <span className="font-medium">{vendorId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">PO Date:</span>
                      <span className="font-medium">{poDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/purchase-orders')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePOs}
                disabled={loading || selectedItems.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Creating...' : `Create PO`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
