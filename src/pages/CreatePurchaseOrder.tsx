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
  id: number;
  item_master_id: number;
  nomenclature: string;
  quantity: number;
  estimated_unit_price: number;
  vendor_id: number;
  vendor_name: string;
  category_name: string;
  specifications?: string;
}

interface VendorGroup {
  vendor_id: number;
  vendor_name: string;
  items: TenderItem[];
  totalAmount: number;
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorGroups, setVendorGroups] = useState<VendorGroup[]>([]);

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
      fetchTenderItems(parseInt(selectedTenderId));
    }
  }, [selectedTenderId]);

  useEffect(() => {
    groupItemsByVendor();
  }, [selectedItems, tenderItems]);

  const fetchTenders = async () => {
    try {
      const response = await fetch('/api/tenders');
      if (!response.ok) throw new Error('Failed to fetch tenders');
      const data = await response.json();
      setTenders(data.filter((t: Tender) => t.id)); // Filter valid tenders
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError('Failed to load tenders');
    }
  };

  const fetchTenderItems = async (tenderId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tender/${tenderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch tender items');
      const data = await response.json();
      setTenderItems(data);
      setSelectedItems(new Set()); // Reset selection
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load tender items');
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByVendor = () => {
    const groups: { [key: number]: VendorGroup } = {};

    Array.from(selectedItems).forEach(itemId => {
      const item = tenderItems.find(ti => ti.id === itemId);
      if (item) {
        if (!groups[item.vendor_id]) {
          groups[item.vendor_id] = {
            vendor_id: item.vendor_id,
            vendor_name: item.vendor_name,
            items: [],
            totalAmount: 0
          };
        }
        groups[item.vendor_id].items.push(item);
        groups[item.vendor_id].totalAmount += (item.estimated_unit_price || 0) * item.quantity;
      }
    });

    setVendorGroups(Object.values(groups));
  };

  const handleItemToggle = (itemId: number) => {
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
      alert('Please select at least one item');
      return;
    }

    if (!poDate) {
      alert('Please select a PO date');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: parseInt(selectedTenderId),
          selectedItems: Array.from(selectedItems),
          poDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create POs');
      }

      const result = await response.json();
      alert(`✅ ${result.pos.length} PO(s) created successfully!`);
      navigate('/dashboard/purchase-orders');
    } catch (err) {
      console.error('Error creating POs:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to create POs'}`);
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
    return sum + ((item?.estimated_unit_price || 0) * (item?.quantity || 1));
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Purchase Orders</h1>
          <p className="text-slate-600">Select items from a tender to auto-generate POs grouped by vendor</p>
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
                              <p className="font-medium text-slate-900">{item.nomenclature}</p>
                              <Badge variant="secondary">{item.category_name}</Badge>
                            </div>
                            {item.specifications && (
                              <p className="text-xs text-slate-500 mt-1">{item.specifications}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm font-medium text-slate-700">
                                Qty: {item.quantity}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                @ Rs {item.estimated_unit_price}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-blue-600">
                              Rs {(item.estimated_unit_price * item.quantity).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Vendor: {item.vendor_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Step 3: PO Date */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Set PO Date</CardTitle>
                <CardDescription>All generated POs will have this date</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="border-slate-300"
                />
              </CardContent>
            </Card>

            {/* Preview: POs by Vendor */}
            {selectedItems.size > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Preview: {vendorGroups.length} PO(s) will be created
                  </CardTitle>
                  <CardDescription>
                    Items are grouped by vendor for separate purchase orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vendorGroups.map((group, idx) => (
                      <div key={group.vendor_id} className="border border-blue-300 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              Purchase Order #{idx + 1}
                            </h3>
                            <p className="text-sm text-slate-600">Vendor: {group.vendor_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Total Value</p>
                            <p className="text-lg font-bold text-green-600">
                              Rs {group.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {group.items.map((item, itemIdx) => (
                            <div key={item.id} className="flex justify-between text-sm text-slate-700 ml-4">
                              <span>{itemIdx + 1}. {item.nomenclature}</span>
                              <span>Qty: {item.quantity} @ Rs {item.estimated_unit_price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
                {loading ? 'Creating...' : `Create ${vendorGroups.length} PO(s)`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
