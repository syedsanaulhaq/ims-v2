import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, FileText, Upload, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiBaseUrl } from '@/services/invmisApi';


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
  OfficeID?: number;
}

interface DEC {
  intAutoID: number;
  strDECName: string;
  strDECCode?: string;
  intWingID?: number;
}

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  city?: string;
  status?: string;
}

const EditTender: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Get tender type from URL or default to contract
  const getTenderType = () => {
    // For edit mode, we'll determine type from loaded data
    return 'contract'; // Default until data loads
  };

  const tenderType = getTenderType();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [decs, setDecs] = useState<DEC[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Tender form data
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
    dec_ids: [] as string[],
    // Additional fields
    publication_daily: '',
    procurement_method: '',
    procedure_adopted: ''
  });

  // File uploads state (currently disabled for edit)
  const [fileUploads, setFileUploads] = useState({
    contract_file: null as File | null,
    loi_file: null as File | null,
    noting_file: null as File | null,
    po_file: null as File | null,
    rfp_file: null as File | null
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

  // Load tender data for editing
  useEffect(() => {
    if (id) {
      loadTenderData(id);
    }
  }, [id]);

  const loadTenderData = async (tenderId: string) => {
    try {
      setLoadingData(true);
      
      // Fetch tender details with items
      const tenderResponse = await fetch(`${apiBase}/tenders/${tenderId}`);
      if (tenderResponse.ok) {
        const tender = await tenderResponse.json();
        
        setTenderData({
          reference_number: tender.reference_number || '',
          title: tender.title || '',
          description: tender.description || '',
          estimated_value: tender.estimated_value?.toString() || '',
          publish_date: tender.publish_date ? tender.publish_date.split('T')[0] : '',
          submission_deadline: tender.submission_deadline ? tender.submission_deadline.split('T')[0] : '',
          opening_date: tender.opening_date ? tender.opening_date.split('T')[0] : '',
          tender_type: tender.tender_type || 'contract',
          status: tender.status || 'draft',
          vendor_id: tender.vendor_id || '',
          office_ids: tender.office_ids ? tender.office_ids.split(',') : [],
          wing_ids: tender.wing_ids ? tender.wing_ids.split(',') : [],
          dec_ids: tender.dec_ids ? tender.dec_ids.split(',') : [],
          publication_daily: tender.publication_daily || '',
          procurement_method: tender.procurement_method || '',
          procedure_adopted: tender.procedure_adopted || ''
        });

        // Set tender items from the tender response
        if (tender.items && Array.isArray(tender.items)) {
          setTenderItems(tender.items);
        }
      }

    } catch (err) {
      console.error('Error loading tender data:', err);
      setError('Failed to load tender data');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch initial data (item masters, offices, and vendors)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Item Masters
        const itemMastersResponse = await fetch(`${apiBase}/item-masters`);
        if (itemMastersResponse.ok) {
          const itemMastersData = await itemMastersResponse.json();
          setItemMasters(Array.isArray(itemMastersData) ? itemMastersData : itemMastersData.data || []);
        }

        // Fetch Offices
        const officesResponse = await fetch(`${apiBase}/offices`);
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          setOffices(Array.isArray(officesData) ? officesData : officesData.data || []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch(`${apiBase}/vendors`);
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json();
          setVendors(vendorsData.vendors || []);
        }

      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load form data');
      }
    };

    fetchInitialData();
  }, []);

  // Fetch wings when offices are selected
  useEffect(() => {
    const fetchWings = async () => {
      if (tenderData.office_ids.length > 0) {
        try {
          const allWings: Wing[] = [];
          for (const officeId of tenderData.office_ids) {
            const response = await fetch(`${apiBase}/offices/${officeId}/wings`);
            if (response.ok) {
              const wingsData = await response.json();
              allWings.push(...(Array.isArray(wingsData) ? wingsData : wingsData.data || []));
            }
          }
          setWings(allWings);
        } catch (err) {
          console.error('Error fetching wings:', err);
        }
      } else {
        setWings([]);
        setTenderData(prev => ({ ...prev, wing_ids: [], dec_ids: [] }));
      }
    };

    fetchWings();
  }, [tenderData.office_ids]);

  // Fetch DECs when wings are selected
  useEffect(() => {
    const fetchDECs = async () => {
      if (tenderData.wing_ids.length > 0) {
        try {
          const allDECs: DEC[] = [];
          for (const wingId of tenderData.wing_ids) {
            const response = await fetch(`${apiBase}/wings/${wingId}/decs`);
            if (response.ok) {
              const decsData = await response.json();
              allDECs.push(...(Array.isArray(decsData) ? decsData : decsData.data || []));
            }
          }
          setDecs(allDECs);
        } catch (err) {
          console.error('Error fetching DECs:', err);
        }
      } else {
        setDecs([]);
        setTenderData(prev => ({ ...prev, dec_ids: [] }));
      }
    };

    fetchDECs();
  }, [tenderData.wing_ids]);

  // Calculate total tender value
  const totalTenderValue = tenderItems.reduce((sum, item) => {
    return sum + (item.total_amount || 0);
  }, 0);

  // Add item to tender
  const addItem = () => {
    if (!newItem.item_master_id || !newItem.nomenclature || newItem.quantity <= 0) {
      alert('Please fill in all required item fields');
      return;
    }

    const itemWithTotal = {
      ...newItem,
      id: Date.now().toString(),
      total_amount: (newItem.estimated_unit_price || 0) * newItem.quantity
    };

    setTenderItems([...tenderItems, itemWithTotal]);
    setNewItem({
      item_master_id: '',
      nomenclature: '',
      quantity: 1,
      estimated_unit_price: 0,
      specifications: '',
      remarks: ''
    });
  };

  // Remove item from tender
  const removeItem = (index: number) => {
    setTenderItems(tenderItems.filter((_, i) => i !== index));
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

  // Update total when price or quantity changes
  useEffect(() => {
    const total = (newItem.estimated_unit_price || 0) * newItem.quantity;
    setNewItem(prev => ({ ...prev, total_amount: total }));
  }, [newItem.estimated_unit_price, newItem.quantity]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenderData.title) {
      alert('Please enter a tender title');
      return;
    }

    if (!tenderData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare tender data for JSON submission (only include valid database fields)
      const tenderFormData = {
        reference_number: tenderData.reference_number,
        title: tenderData.title,
        description: tenderData.description,
        estimated_value: totalTenderValue || (tenderData.estimated_value ? parseFloat(tenderData.estimated_value) : null),
        publish_date: tenderData.publish_date || null,
        submission_deadline: tenderData.submission_deadline || null,
        opening_date: tenderData.opening_date || null,
        procurement_method: tenderData.procurement_method || null,
        publication_daily: tenderData.publication_daily || null,
        vendor_id: tenderData.vendor_id || null,
        office_ids: tenderData.office_ids.length > 0 ? tenderData.office_ids.join(',') : null,
        wing_ids: tenderData.wing_ids.length > 0 ? tenderData.wing_ids.join(',') : null,
        dec_ids: tenderData.dec_ids.length > 0 ? tenderData.dec_ids.join(',') : null,
        items: tenderItems.map(item => ({
          id: item.id,
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          total_amount: item.total_amount || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || ''
        }))
      };

      console.log('🔍 Submitting tender data:', JSON.stringify(tenderFormData, null, 2));

      const response = await fetch(`${apiBase}/tenders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenderFormData),
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Success response:', result);

      alert(`${tenderData.tender_type === 'spot-purchase' ? 'Spot purchase' : 'Contract tender'} updated successfully!`);
      navigate(tenderData.tender_type === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender');
    } catch (err) {
      console.error('Error updating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tender');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tender data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate(
              tenderData.tender_type === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender'
            )}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchases' : 'Contract Tenders'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenderData.tender_type === 'spot-purchase' ? 'Edit Spot Purchase' : 'Edit Contract'}
            </h1>
            <p className="text-muted-foreground">
              {tenderData.tender_type === 'spot-purchase' 
                ? 'Update spot purchase details for quick procurement'
                : 'Update contract tender details and modify items for procurement'
              }
            </p>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Rest of the form - same structure as CreateTender */}
        {/* Card 1: Tender Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tender Type
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <SelectItem value="contract">Contract Tender</SelectItem>
                  <SelectItem value="spot-purchase">Spot Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Continue with same structure as CreateTender... */}
        
        {/* Card 2: Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Reference Number</label>
                <Input
                  value={tenderData.reference_number}
                  onChange={(e) => setTenderData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Enter reference number"
                />
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
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={tenderData.title}
                onChange={(e) => setTenderData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter spot purchase title' : 'Enter tender title'}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={tenderData.description}
                onChange={(e) => setTenderData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter spot purchase description' : 'Enter tender description'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Publish Date</label>
                <Input
                  type="date"
                  value={tenderData.publish_date}
                  onChange={(e) => setTenderData(prev => ({ ...prev, publish_date: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Submission Deadline</label>
                <Input
                  type="date"
                  value={tenderData.submission_deadline}
                  onChange={(e) => setTenderData(prev => ({ ...prev, submission_deadline: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Opening Date</label>
                <Input
                  type="date"
                  value={tenderData.opening_date}
                  onChange={(e) => setTenderData(prev => ({ ...prev, opening_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Vendor *</label>
              <Select 
                value={tenderData.vendor_id} 
                onValueChange={(value) => setTenderData(prev => ({ ...prev, vendor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_code} - {vendor.vendor_name} {vendor.contact_person && `(${vendor.contact_person})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Location Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Location Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Offices *</label>
              <MultiSelect
                options={offices.map(office => ({
                  label: `${office.strOfficeName} (${office.OfficeCode || 'No Code'})`,
                  value: office.intOfficeID.toString()
                }))}
                onValueChange={(values) => setTenderData(prev => ({ ...prev, office_ids: values }))}
                defaultValue={tenderData.office_ids}
                placeholder="Select offices"
                variant="inverted"
                animation={2}
                maxCount={3}
              />
            </div>

            {wings.length > 0 && (
              <div>
                <label className="text-sm font-medium">Wings *</label>
                <MultiSelect
                  options={wings.map(wing => ({
                    label: `${wing.Name} ${wing.ShortName ? `(${wing.ShortName})` : ''}`,
                    value: wing.Id.toString()
                  }))}
                  onValueChange={(values) => setTenderData(prev => ({ ...prev, wing_ids: values }))}
                  defaultValue={tenderData.wing_ids}
                  placeholder="Select wings"
                  variant="inverted"
                  animation={2}
                  maxCount={3}
                />
              </div>
            )}

            {decs.length > 0 && (
              <div>
                <label className="text-sm font-medium">DECs</label>
                <MultiSelect
                  options={decs.map(dec => ({
                    label: `${dec.strDECName} ${dec.strDECCode ? `(${dec.strDECCode})` : ''}`,
                    value: dec.intAutoID.toString()
                  }))}
                  onValueChange={(values) => setTenderData(prev => ({ ...prev, dec_ids: values }))}
                  defaultValue={tenderData.dec_ids}
                  placeholder="Select DECs"
                  variant="inverted"
                  animation={2}
                  maxCount={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Publication Daily</label>
              <Input
                value={tenderData.publication_daily}
                onChange={(e) => setTenderData(prev => ({ ...prev, publication_daily: e.target.value }))}
                placeholder="Enter publication daily"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Procurement Method</label>
              <Input
                value={tenderData.procurement_method}
                onChange={(e) => setTenderData(prev => ({ ...prev, procurement_method: e.target.value }))}
                placeholder="Enter procurement method"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Procedure Adopted</label>
              <Input
                value={tenderData.procedure_adopted}
                onChange={(e) => setTenderData(prev => ({ ...prev, procedure_adopted: e.target.value }))}
                placeholder="Enter procedure adopted"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Estimated Value</label>
              <Input
                type="number"
                value={tenderData.estimated_value}
                onChange={(e) => setTenderData(prev => ({ ...prev, estimated_value: e.target.value }))}
                placeholder="Enter estimated value"
              />
              {totalTenderValue > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Calculated total from items: {formatCurrency(totalTenderValue)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Document Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Document Uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Document Updates Not Available</p>
              <p className="text-sm text-gray-600 mb-4">
                File uploads are currently not supported in edit mode. You can update all other tender information and items.
              </p>
              <div className="text-xs text-gray-500">
                To update documents, please create a new tender or contact administrator.
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only tender information and items can be updated in edit mode.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Document file updates will be available in a future version.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Tender Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tender Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Item Form */}
            <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Add New Item</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Item Master</label>
                  <Select 
                    value={newItem.item_master_id} 
                    onValueChange={handleItemMasterSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemMasters.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nomenclature}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Unit Price (PKR)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.estimated_unit_price || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, estimated_unit_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="Enter unit price"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Total Amount</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {formatCurrency(newItem.total_amount || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Specifications</label>
                  <Input
                    value={newItem.specifications || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Enter specifications"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Remarks</label>
                  <Input
                    value={newItem.remarks || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter remarks"
                  />
                </div>
              </div>

              <Button type="button" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item to Tender
              </Button>
            </div>

            {/* Items Table */}
            {tenderItems.length > 0 && (
              <div className="border rounded-lg">
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
                            <div className="font-medium">{item.nomenclature}</div>
                            <div className="text-sm text-muted-foreground">ID: {item.item_master_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.estimated_unit_price || 0)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total_amount || 0)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm">{item.specifications || 'N/A'}</div>
                            {item.remarks && (
                              <div className="text-xs text-muted-foreground mt-1">{item.remarks}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="border-t bg-gray-50 p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Total Items: {tenderItems.length}
                    </div>
                    <div className="text-lg font-semibold">
                      Total Value: {formatCurrency(totalTenderValue)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ready to update tender with {tenderItems.length} items
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>Total Items: {tenderItems.length}</p>
                <p>Total Value: {formatCurrency(totalTenderValue)}</p>
              </div>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(
                    tenderData.tender_type === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender'
                  )}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !tenderData.title}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Updating...' : `Update ${tenderData.tender_type === 'spot-purchase' ? 'Spot Purchase' : 'Contract'}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EditTender;