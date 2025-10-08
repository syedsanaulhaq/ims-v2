import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenderItem {
  id?: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  remarks?: string;
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  category_name?: string;
  sub_category_name?: string;
}

interface Office {
  intOfficeID: number;
  strOfficeName: string;
  OfficeCode?: number;
  strOfficeDescription?: string;
}

interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  FocalPerson?: string;
  ContactNo?: string;
}

interface Dec {
  intAutoID: number;
  WingID: number;
  DECName: string;
  DECAcronym?: string;
  DECAddress?: string;
  Location?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code?: string;
  contact_person?: string;
}

const CreateTender: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [decs, setDecs] = useState<Dec[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredWings, setFilteredWings] = useState<Wing[]>([]);
  const [filteredDecs, setFilteredDecs] = useState<Dec[]>([]);
  
  // Main tender form data
  const [tenderData, setTenderData] = useState({
    reference_number: '',
    title: '',
    description: '',
    estimated_value: '',
    publish_date: '',
    submission_deadline: '',
    opening_date: '',
    tender_type: '',
    status: 'draft',
    vendor_id: '',
    office_ids: [] as string[],
    wing_ids: [] as string[],
    dec_ids: [] as string[]
  });

  // Tender items
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [newItem, setNewItem] = useState<TenderItem>({
    item_master_id: '',
    nomenclature: '',
    quantity: 1,
    estimated_unit_price: 0,
    specifications: '',
    remarks: ''
  });

  // Fetch initial data (item masters, offices, and vendors)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Item Masters
        const itemMastersResponse = await fetch('http://localhost:3001/api/item-masters');
        if (itemMastersResponse.ok) {
          const itemMastersData = await itemMastersResponse.json();
          setItemMasters(Array.isArray(itemMastersData) ? itemMastersData : itemMastersData.data || []);
        }

        // Fetch Offices
        const officesResponse = await fetch('http://localhost:3001/api/offices');
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          console.log('📍 Offices API response:', officesData);
          setOffices(Array.isArray(officesData) ? officesData : []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch('http://localhost:3001/api/vendors');
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json();
          console.log('🏪 Vendors API response:', vendorsData);
          // Handle the {vendors: [...]} format
          if (vendorsData.vendors && Array.isArray(vendorsData.vendors)) {
            setVendors(vendorsData.vendors);
          } else if (Array.isArray(vendorsData)) {
            setVendors(vendorsData);
          } else {
            setVendors([]);
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch wings when offices are selected
  useEffect(() => {
    const fetchWingsForOffices = async () => {
      if (tenderData.office_ids.length === 0) {
        setFilteredWings([]);
        setFilteredDecs([]);
        setTenderData(prev => ({ ...prev, wing_ids: [], dec_ids: [] }));
        return;
      }

      try {
        const allWings: Wing[] = [];
        
        for (const officeId of tenderData.office_ids) {
          const response = await fetch(`http://localhost:3001/api/offices/${officeId}/wings`);
          if (response.ok) {
            const wingsData = await response.json();
            console.log(`🪶 Wings for office ${officeId}:`, wingsData);
            const wings = Array.isArray(wingsData) ? wingsData : wingsData.data || [];
            allWings.push(...wings);
          }
        }

        setFilteredWings(allWings);
        
        // Clear wing and dec selections that are no longer valid
        const validWingIds = allWings.map(w => w.Id.toString());
        const filteredWingIds = tenderData.wing_ids.filter(id => validWingIds.includes(id));
        
        if (filteredWingIds.length !== tenderData.wing_ids.length) {
          setTenderData(prev => ({ 
            ...prev, 
            wing_ids: filteredWingIds,
            dec_ids: [] // Clear decs when wings change
          }));
        }
      } catch (err) {
        console.error('Error fetching wings:', err);
      }
    };

    fetchWingsForOffices();
  }, [tenderData.office_ids]);

  // Fetch decs when wings are selected
  useEffect(() => {
    const fetchDecsForWings = async () => {
      if (tenderData.wing_ids.length === 0) {
        setFilteredDecs([]);
        setTenderData(prev => ({ ...prev, dec_ids: [] }));
        return;
      }

      try {
        const allDecs: Dec[] = [];
        
        for (const wingId of tenderData.wing_ids) {
          const response = await fetch(`http://localhost:3001/api/wings/${wingId}/decs`);
          if (response.ok) {
            const decsData = await response.json();
            const decs = Array.isArray(decsData) ? decsData : decsData.data || [];
            allDecs.push(...decs);
          }
        }

        setFilteredDecs(allDecs);
        
        // Clear dec selections that are no longer valid
        const validDecIds = allDecs.map(d => d.intAutoID.toString());
        const filteredDecIds = tenderData.dec_ids.filter(id => validDecIds.includes(id));
        
        if (filteredDecIds.length !== tenderData.dec_ids.length) {
          setTenderData(prev => ({ 
            ...prev, 
            dec_ids: filteredDecIds
          }));
        }
      } catch (err) {
        console.error('Error fetching decs:', err);
      }
    };

    fetchDecsForWings();
  }, [tenderData.wing_ids]);

  // Calculate total amount when quantity or price changes
  useEffect(() => {
    const total = (newItem.quantity || 0) * (newItem.estimated_unit_price || 0);
    setNewItem(prev => ({ ...prev, total_amount: total }));
  }, [newItem.quantity, newItem.estimated_unit_price]);

  // Handle adding new item to tender
  const handleAddItem = () => {
    if (!newItem.item_master_id || !newItem.nomenclature || newItem.quantity <= 0) {
      alert('Please fill in all required item fields');
      return;
    }

    const item: TenderItem = {
      ...newItem,
      id: `temp-${Date.now()}` // Temporary ID for frontend
    };

    setTenderItems(prev => [...prev, item]);
    setNewItem({
      item_master_id: '',
      nomenclature: '',
      quantity: 1,
      estimated_unit_price: 0,
      specifications: '',
      remarks: ''
    });
  };

  // Handle removing item from tender
  const handleRemoveItem = (index: number) => {
    setTenderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle item master selection
  const handleItemMasterSelect = (itemMasterId: string) => {
    const selectedItem = itemMasters.find(item => item.id === itemMasterId);
    if (selectedItem) {
      setNewItem(prev => ({
        ...prev,
        item_master_id: itemMasterId,
        nomenclature: selectedItem.nomenclature
      }));
    }
  };

  // Calculate total tender value
  const totalTenderValue = tenderItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenderData.title.trim()) {
      alert('Please enter a tender title');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = {
        ...tenderData,
        estimated_value: totalTenderValue || (tenderData.estimated_value ? parseFloat(tenderData.estimated_value) : null),
        publish_date: tenderData.publish_date || null,
        submission_deadline: tenderData.submission_deadline || null,
        opening_date: tenderData.opening_date || null,
        vendor_id: tenderData.vendor_id || null,
        office_ids: tenderData.office_ids.length > 0 ? tenderData.office_ids.join(',') : null,
        wing_ids: tenderData.wing_ids.length > 0 ? tenderData.wing_ids.join(',') : null,
        dec_ids: tenderData.dec_ids.length > 0 ? tenderData.dec_ids.join(',') : null,
        items: tenderItems.map(item => ({
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          total_amount: item.total_amount || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || ''
        }))
      };

      const response = await fetch('http://localhost:3001/api/tenders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert('Tender created successfully!');
      navigate('/dashboard/contract-tender');
    } catch (err) {
      console.error('Error creating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard/contract-tender')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Tender</h1>
            <p className="text-muted-foreground">
              Enter tender details and add items for procurement
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Tender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Tender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Reference Number</label>
                  <Input
                    value={tenderData.reference_number}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      reference_number: e.target.value
                    }))}
                    placeholder="Enter reference number"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Tender Type</label>
                  <Select 
                    value={tenderData.tender_type} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      tender_type: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tender type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open Tender</SelectItem>
                      <SelectItem value="restricted">Restricted Tender</SelectItem>
                      <SelectItem value="negotiated">Negotiated Tender</SelectItem>
                      <SelectItem value="framework">Framework Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  required
                  value={tenderData.title}
                  onChange={(e) => setTenderData(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  placeholder="Enter tender title"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full p-3 border border-input rounded-md resize-none"
                  rows={4}
                  value={tenderData.description}
                  onChange={(e) => setTenderData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Enter tender description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Manual Estimated Value</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tenderData.estimated_value}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      estimated_value: e.target.value
                    }))}
                    placeholder="Leave empty to use calculated total"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current calculated total: {formatCurrency(totalTenderValue)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={tenderData.status} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      status: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vendor Selection */}
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <Select 
                  value={tenderData.vendor_id} 
                  onValueChange={(value) => setTenderData(prev => ({
                    ...prev,
                    vendor_id: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {vendor.vendor_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {vendor.vendor_code && `Code: ${vendor.vendor_code}`}
                            {vendor.contact_person && ` | Contact: ${vendor.contact_person}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {vendors.length} vendors available
                </p>
              </div>

              {/* Location Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Location Selection (Hierarchical)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Offices *</label>
                    <MultiSelect
                      options={offices.map(office => ({
                        label: `${office.strOfficeName}${office.OfficeCode ? ` (${office.OfficeCode})` : ''}`,
                        value: office.intOfficeID.toString()
                      }))}
                      onValueChange={(values) => setTenderData(prev => ({
                        ...prev,
                        office_ids: values
                      }))}
                      defaultValue={tenderData.office_ids}
                      placeholder="Select offices first"
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Select offices to load their wings
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Wings</label>
                    <MultiSelect
                      options={filteredWings.map(wing => ({
                        label: `${wing.Name}${wing.ShortName ? ` (${wing.ShortName})` : ''}`,
                        value: wing.Id.toString()
                      }))}
                      onValueChange={(values) => setTenderData(prev => ({
                        ...prev,
                        wing_ids: values
                      }))}
                      defaultValue={tenderData.wing_ids}
                      placeholder={tenderData.office_ids.length === 0 ? "Select offices first" : "Select wings"}
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                      disabled={tenderData.office_ids.length === 0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredWings.length} wings available
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">DECs</label>
                    <MultiSelect
                      options={filteredDecs.map(dec => ({
                        label: `${dec.DECName.trim()}${dec.DECAcronym ? ` (${dec.DECAcronym})` : ''}`,
                        value: dec.intAutoID.toString()
                      }))}
                      onValueChange={(values) => setTenderData(prev => ({
                        ...prev,
                        dec_ids: values
                      }))}
                      defaultValue={tenderData.dec_ids}
                      placeholder={tenderData.wing_ids.length === 0 ? "Select wings first" : "Select DECs"}
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                      disabled={tenderData.wing_ids.length === 0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredDecs.length} DECs available
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Publish Date</label>
                  <Input
                    type="date"
                    value={tenderData.publish_date}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      publish_date: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Submission Deadline</label>
                  <Input
                    type="date"
                    value={tenderData.submission_deadline}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      submission_deadline: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Opening Date</label>
                  <Input
                    type="date"
                    value={tenderData.opening_date}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      opening_date: e.target.value
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tender Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Tender Items ({tenderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Item Form */}
              <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-4">Add New Item</h3>
                
                {/* Main fields in one row */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-4">
                  <div className="lg:col-span-2">
                    <label className="text-sm font-medium">Select Item Master *</label>
                    <Select 
                      value={newItem.item_master_id} 
                      onValueChange={handleItemMasterSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemMasters.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nomenclature} {item.category_name && `(${item.category_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quantity *</label>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1
                      }))}
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.estimated_unit_price || ''}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev,
                        estimated_unit_price: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Total Amount</label>
                    <Input
                      value={formatCurrency(newItem.total_amount || 0)}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Actions</label>
                    <Button type="button" onClick={handleAddItem} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Nomenclature field (auto-filled, editable) */}
                <div className="mb-4">
                  <label className="text-sm font-medium">Nomenclature *</label>
                  <Input
                    value={newItem.nomenclature}
                    onChange={(e) => setNewItem(prev => ({
                      ...prev,
                      nomenclature: e.target.value
                    }))}
                    placeholder="Item name/description (auto-filled from selection)"
                    className="mt-1"
                  />
                </div>

                {/* Optional specifications and remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Specifications (Optional)</label>
                    <textarea
                      className="w-full p-3 border border-input rounded-md resize-none mt-1"
                      rows={2}
                      value={newItem.specifications || ''}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev,
                        specifications: e.target.value
                      }))}
                      placeholder="Technical specifications"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Remarks (Optional)</label>
                    <textarea
                      className="w-full p-3 border border-input rounded-md resize-none mt-1"
                      rows={2}
                      value={newItem.remarks || ''}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev,
                        remarks: e.target.value
                      }))}
                      placeholder="Additional remarks"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {tenderItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Tender Items List</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Specifications</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenderItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.nomenclature}</p>
                                <p className="text-xs text-gray-500">ID: {item.item_master_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.estimated_unit_price || 0)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.total_amount || 0)}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {item.specifications && (
                                  <p className="text-xs truncate" title={item.specifications}>
                                    {item.specifications}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Items</p>
                        <p className="text-lg font-bold">{tenderItems.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Quantity</p>
                        <p className="text-lg font-bold">
                          {tenderItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Value</p>
                        <p className="text-lg font-bold">{formatCurrency(totalTenderValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avg Unit Price</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(
                            tenderItems.length > 0 
                              ? totalTenderValue / tenderItems.reduce((sum, item) => sum + item.quantity, 0)
                              : 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
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
                    Ready to create tender with {tenderItems.length} items
                  </p>
                  <p className="text-lg font-semibold">
                    Total Value: {formatCurrency(totalTenderValue)}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/dashboard/contract-tender')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !tenderData.title}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Tender'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreateTender;