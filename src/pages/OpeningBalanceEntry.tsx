import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getApiBaseUrl } from '@/services/invmisApi';

interface OpeningBalanceItem {
  item_master_id: string;
  nomenclature: string;
  category_name?: string;
  quantity_received: number;
  quantity_already_issued: number;
  quantity_available: number;
  unit_cost: number;
}

interface Tender {
  id: string;
  tender_number: string;
  tender_title: string;
  tender_date?: string;
}

export default function OpeningBalanceEntry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Tender selection mode
  const [tenderMode, setTenderMode] = useState<'existing' | 'manual'>('existing');
  const [selectedTenderId, setSelectedTenderId] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    tender_id: null as string | null,
    tender_reference: '',
    tender_title: '',
    source_type: 'TENDER' as 'TENDER' | 'PURCHASE' | 'DONATION' | 'OTHER',
    acquisition_date: '2020-01-01', // Default to 2020
    remarks: '',
  });

  // Dropdown data
  const [itemMasters, setItemMasters] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  
  // Items to add
  const [items, setItems] = useState<OpeningBalanceItem[]>([]);
  const [newItem, setNewItem] = useState({
    item_master_id: '',
    quantity_received: 0,
    quantity_already_issued: 0,
    unit_cost: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch item masters
      const itemsResponse = await fetch(`${getApiBaseUrl()}/item-masters`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        const itemsList = itemsData.items || [];
        setItemMasters(itemsList);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(itemsList
          .filter((item: any) => item.category_name)
          .map((item: any) => item.category_name)
        )].sort() as string[];
        setCategories(uniqueCategories);
      }

      // Fetch existing tenders from BOTH regular tenders and annual tenders
      // ONLY FINALIZED/COMPLETED tenders
      const allTenders: Tender[] = [];
      
      // Fetch regular/contract tenders
      try {
        const tendersResponse = await fetch(`${getApiBaseUrl()}/tenders`);
        if (tendersResponse.ok) {
          const tendersData = await tendersResponse.json();
          console.log('📥 Raw contract tenders data:', tendersData);
          
          const regularTenders = (Array.isArray(tendersData) ? tendersData : [])
            .filter((t: any) => {
              const isFinalized = t.is_finalized === true || t.is_finalized === 1;
              console.log(`Tender ${t.reference_number}: is_finalized=${t.is_finalized}, status=${t.status}`);
              return isFinalized;
            })
            .map((t: any) => ({
              id: t.id,
              tender_number: t.reference_number || 'N/A',
              tender_title: `[Contract] ${t.title || 'Untitled'}`,
              tender_date: t.publish_date || t.created_at,
            }));
          allTenders.push(...regularTenders);
          console.log('✅ Loaded finalized contract tenders:', regularTenders.length);
        } else {
          console.warn('⚠️ Contract tenders API failed:', tendersResponse.status);
        }
      } catch (err) {
        console.error('❌ Failed to fetch contract tenders:', err);
      }

      // Fetch annual tenders
      try {
        const annualTendersResponse = await fetch(`${getApiBaseUrl()}/annual-tenders`);
        if (annualTendersResponse.ok) {
          const annualTendersData = await annualTendersResponse.json();
          console.log('📥 Raw annual tenders data:', annualTendersData);
          
          const annualTenders = (Array.isArray(annualTendersData) ? annualTendersData : [])
            .filter((t: any) => {
              const isActive = t.status === 'active' || t.status === 'completed' || t.status === 'finalized';
              console.log(`Annual Tender ${t.tender_number}: status=${t.status}`);
              return isActive;
            })
            .map((t: any) => ({
              id: t.id,
              tender_number: t.tender_number || 'N/A',
              tender_title: `[Annual] ${t.title || 'Untitled'}`,
              tender_date: t.start_date || t.created_at,
            }));
          allTenders.push(...annualTenders);
          console.log('✅ Loaded active annual tenders:', annualTenders.length);
        } else {
          console.warn('⚠️ Annual tenders API failed:', annualTendersResponse.status);
        }
      } catch (err) {
        console.error('❌ Failed to fetch annual tenders:', err);
      }

      // Sort by date (most recent first)
      allTenders.sort((a, b) => {
        const dateA = new Date(a.tender_date || 0).getTime();
        const dateB = new Date(b.tender_date || 0).getTime();
        return dateB - dateA;
      });

      setTenders(allTenders);
      console.log('✅ Total finalized tenders loaded:', allTenders.length);
      
      if (allTenders.length === 0) {
        console.warn('⚠️ No finalized tenders found. Use "Manual Reference Entry" instead.');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load form data');
    }
  };

  const handleTenderSelection = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    const selectedTender = tenders.find(t => t.id === tenderId);
    if (selectedTender) {
      setFormData(prev => ({
        ...prev,
        tender_id: tenderId,
        tender_reference: selectedTender.tender_number,
        tender_title: selectedTender.tender_title,
      }));
    }
  };

  const handleTenderModeChange = (mode: 'existing' | 'manual') => {
    setTenderMode(mode);
    if (mode === 'manual') {
      // Clear tender selection
      setSelectedTenderId('');
      setFormData(prev => ({
        ...prev,
        tender_id: null,
        tender_reference: '',
        tender_title: '',
      }));
    }
  };

  const handleAddItem = () => {
    if (!newItem.item_master_id || newItem.quantity_received <= 0) {
      alert('Please select an item and enter valid quantities');
      return;
    }

    const selectedItem = itemMasters.find(im => im.id === newItem.item_master_id);
    if (!selectedItem) return;

    const quantity_available = newItem.quantity_received - newItem.quantity_already_issued;
    
    if (quantity_available < 0) {
      alert('Quantity already issued cannot exceed quantity received!');
      return;
    }

    const openingBalanceItem: OpeningBalanceItem = {
      item_master_id: newItem.item_master_id,
      nomenclature: selectedItem.nomenclature,
      category_name: selectedItem.category_name,
      quantity_received: newItem.quantity_received,
      quantity_already_issued: newItem.quantity_already_issued,
      quantity_available: quantity_available,
      unit_cost: newItem.unit_cost,
    };

    setItems([...items, openingBalanceItem]);
    setNewItem({ 
      item_master_id: '', 
      quantity_received: 0, 
      quantity_already_issued: 0, 
      unit_cost: 0 
    });
    setSelectedCategory('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (tenderMode === 'existing' && !formData.tender_id) {
      setError('Please select an existing tender');
      return;
    }
    if (tenderMode === 'manual' && !formData.tender_reference.trim()) {
      setError('Please enter tender/purchase reference');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        items: items,
      };

      const response = await fetch(`${getApiBaseUrl()}/stock-acquisitions/opening-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create opening balance entries');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/stock-acquisitions');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating opening balance:', err);
      setError(err.message || 'Failed to create opening balance entries');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory
    ? itemMasters.filter(item => item.category_name === selectedCategory)
    : itemMasters;

  const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
  const totalIssued = items.reduce((sum, item) => sum + item.quantity_already_issued, 0);
  const totalAvailable = items.reduce((sum, item) => sum + item.quantity_available, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity_received * item.unit_cost), 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/stock-acquisitions')} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Opening Balance Entry</h1>
          <p className="text-sm text-gray-600 mt-1">Record existing stock from past tenders/purchases (2020 onwards)</p>
        </div>
      </div>

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Opening balance entries created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Details */}
        <Card>
          <CardHeader>
            <CardTitle>Source Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tender Selection Mode */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <Label className="text-base font-semibold mb-3 block">Tender Source</Label>
              <RadioGroup value={tenderMode} onValueChange={(v: any) => handleTenderModeChange(v)} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="cursor-pointer font-normal">Select Existing Tender</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="cursor-pointer font-normal">Enter Manual Reference</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Existing Tender Selection */}
            {tenderMode === 'existing' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label>Select Existing Tender *</Label>
                <Select value={selectedTenderId} onValueChange={handleTenderSelection}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="Choose a tender..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenders.length === 0 ? (
                      <SelectItem value="none" disabled>No finalized tenders found</SelectItem>
                    ) : (
                      tenders.map((tender) => (
                        <SelectItem key={tender.id} value={tender.id}>
                          {tender.tender_number} - {tender.tender_title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {tenders.length === 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                    <div className="font-semibold mb-1">💡 No finalized tenders available</div>
                    <div>Switch to <strong>"Enter Manual Reference"</strong> above to enter historical tender references.</div>
                  </div>
                )}
                {selectedTenderId && (
                  <div className="mt-3 text-sm text-blue-700">
                    <div><strong>Reference:</strong> {formData.tender_reference}</div>
                    <div><strong>Title:</strong> {formData.tender_title}</div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry */}
            {tenderMode === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                {/* Tender Reference */}
                <div>
                  <Label>Tender/Purchase Reference *</Label>
                  <Input
                    value={formData.tender_reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, tender_reference: e.target.value }))}
                    placeholder="e.g., TENDER-2023-001, PO-2022-045"
                    required
                    className="bg-white"
                  />
                </div>

                {/* Tender Title */}
                <div>
                  <Label>Title/Description</Label>
                  <Input
                    value={formData.tender_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, tender_title: e.target.value }))}
                    placeholder="e.g., Laptops and Office Equipment 2023"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Type */}
              <div>
                <Label>Source Type *</Label>
                <Select
                  value={formData.source_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, source_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TENDER">Tender/Contract</SelectItem>
                    <SelectItem value="PURCHASE">Direct Purchase</SelectItem>
                    <SelectItem value="DONATION">Donation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Acquisition Date */}
              <div>
                <Label>Original Purchase Date *</Label>
                <Input
                  type="date"
                  value={formData.acquisition_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, acquisition_date: e.target.value }))}
                  min="2020-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Additional notes about this stock..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Items & Quantities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item Form */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setNewItem(prev => ({ ...prev, item_master_id: '' }));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Item *</Label>
                <Select
                  value={newItem.item_master_id}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, item_master_id: value }))}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={selectedCategory ? "Select..." : "Category first"} />
                 </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nomenclature}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Qty Received *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity_received || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity_received: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="Total"
                />
              </div>

              <div>
                <Label className="text-xs">Qty Issued</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.quantity_already_issued || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity_already_issued: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="Already"
                />
              </div>

              <div>
                <Label className="text-xs">Unit Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unit_cost || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="h-9 w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.nomenclature}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category_name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_received}</TableCell>
                        <TableCell className="text-right">{item.quantity_already_issued}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">{item.quantity_available}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unit_cost > 0 ? item.unit_cost.toLocaleString('en-PK', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.quantity_received * item.unit_cost).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={2}>TOTALS</TableCell>
                      <TableCell className="text-right">{totalReceived}</TableCell>
                      <TableCell className="text-right">{totalIssued}</TableCell>
                      <TableCell className="text-right text-green-600">{totalAvailable}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {totalValue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Total Items</div>
                      <div className="text-2xl font-bold">{items.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Total Received</div>
                      <div className="text-2xl font-bold">{totalReceived}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Available Now</div>
                      <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Total Value</div>
                      <div className="text-2xl font-bold">
                        {totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No items added yet. Use the form above to add items.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Ready to create opening balance for {items.length} item(s)
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ This will add {totalAvailable} units to available stock
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/stock-acquisitions')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || items.length === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Opening Balance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
