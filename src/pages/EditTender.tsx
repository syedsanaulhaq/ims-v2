import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
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
import TenderVendorManagement from '@/components/tenders/TenderVendorManagement';

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

  // File uploads state
  const [fileUploads, setFileUploads] = useState({
    contract_file: null as File | null,
    loi_file: null as File | null,
    po_file: null as File | null,
    rfp_file: null as File | null,
    rfq_file: null as File | null,
    quotation_file: null as File | null,
    comparison_file: null as File | null,
    tender_notice_file: null as File | null,
    standing_arrangement_file: null as File | null,
    vendor_list_file: null as File | null,
    schedule_file: null as File | null,
    evaluation_report_file: null as File | null
  });

  // Tender items
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [bidders, setBidders] = useState<any[]>([]);
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
      const tenderResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
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

        // Fetch bidders for this tender
        try {
          const biddersResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`);
          if (biddersResponse.ok) {
            const biddersData = await biddersResponse.json();
            setBidders(Array.isArray(biddersData) ? biddersData : biddersData.vendors || []);
          }
        } catch (bidderErr) {
          console.error('Error loading bidders:', bidderErr);
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
        const itemMastersResponse = await fetch('http://localhost:3001/api/item-masters');
        if (itemMastersResponse.ok) {
          const itemMastersData = await itemMastersResponse.json();
          setItemMasters(Array.isArray(itemMastersData) ? itemMastersData : itemMastersData.data || []);
        }

        // Fetch Offices
        const officesResponse = await fetch('http://localhost:3001/api/offices');
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          setOffices(Array.isArray(officesData) ? officesData : officesData.data || []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch('http://localhost:3001/api/vendors');
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
            const response = await fetch(`http://localhost:3001/api/offices/${officeId}/wings`);
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
            const response = await fetch(`http://localhost:3001/api/wings/${wingId}/decs`);
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
        status: tenderData.status || 'draft',
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

      const response = await fetch(`http://localhost:3001/api/tenders/${id}`, {
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

      alert(`${tenderData.tender_type === 'spot-purchase' ? 'Spot purchase' : tenderData.tender_type === 'annual-tender' ? 'Annual tender' : 'Contract tender'} updated successfully!`);
      if (tenderData.tender_type === 'spot-purchase') {
        navigate('/dashboard/spot-purchases');
      } else if (tenderData.tender_type === 'annual-tender') {
        navigate('/dashboard/contract-tender?type=annual-tender');
      } else {
        navigate('/dashboard/contract-tender');
      }
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
            onClick={() => {
              if (tenderData.tender_type === 'spot-purchase') {
                navigate('/dashboard/spot-purchases');
              } else if (tenderData.tender_type === 'annual-tender') {
                navigate('/dashboard/contract-tender?type=annual-tender');
              } else {
                navigate('/dashboard/contract-tender');
              }
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchases' : tenderData.tender_type === 'annual-tender' ? 'Annual Tenders' : 'Contract Tenders'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenderData.tender_type === 'spot-purchase' ? 'Edit Spot Purchase' : tenderData.tender_type === 'annual-tender' ? 'Edit Annual Tender' : 'Edit Contract'}
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
                  <SelectItem value="annual-tender">Annual Tender</SelectItem>
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
            {/* Contract Tender Documents */}
            {tenderData.tender_type === 'contract' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Contract Document</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, contract_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.contract_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.contract_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">LOI (Letter of Intent)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, loi_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.loi_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.loi_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">PO (Purchase Order)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, po_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.po_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.po_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">RFP (Request for Proposal)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, rfp_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.rfp_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.rfp_file.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Spot Purchase Documents */}
            {tenderData.tender_type === 'spot-purchase' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">RFQ (Request for Quotation)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, rfq_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.rfq_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.rfq_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Quotation Response</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, quotation_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.quotation_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.quotation_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Comparison Sheet</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, comparison_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.comparison_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.comparison_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">PO (Purchase Order)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, po_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.po_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.po_file.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Annual Tender Documents */}
            {tenderData.tender_type === 'annual-tender' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Tender Notice</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, tender_notice_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.tender_notice_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.tender_notice_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Standing Arrangement</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, standing_arrangement_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.standing_arrangement_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.standing_arrangement_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Vendor List</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, vendor_list_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.vendor_list_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.vendor_list_file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Schedule of Requirements</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFileUploads(prev => ({ ...prev, schedule_file: file }));
                    }}
                    className="mt-1"
                  />
                  {fileUploads.schedule_file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {fileUploads.schedule_file.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 5.5: Participating Bidders */}
        <TenderVendorManagement
          tenderId={id}
          vendors={vendors}
          readOnly={false}
        />

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
              
              {/* Category and Item Select - First Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Select */}
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(value) => {
                      setSelectedCategory(value);
                      setNewItem(prev => ({
                        ...prev,
                        item_master_id: ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(itemMasters
                        .filter(item => item.category_name)
                        .map(item => item.category_name)))
                        .sort()
                        .map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Item Master Select - filtered by category */}
                <div>
                  <label className="text-sm font-medium">Item Master</label>
                  <Select 
                    value={newItem.item_master_id} 
                    onValueChange={handleItemMasterSelect}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCategory ? "Select item" : "Select category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {itemMasters
                        .filter(item => item.category_name === selectedCategory)
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nomenclature}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Nomenclature</label>
                  <Input
                    value={newItem.nomenclature}
                    onChange={(e) => setNewItem(prev => ({ ...prev, nomenclature: e.target.value }))}
                    placeholder="Item description"
                  />
                </div>
              </div>

              {/* Second Row - Vendor/Quantity and Price */}
              {tenderData.tender_type === 'annual-tender' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vendor Multi-Select Dropdown for Annual Tender */}
                  <div>
                    <label className="text-sm font-medium">Vendors (Multi-select)</label>
                    <div className="border rounded-lg bg-white overflow-hidden">
                      <details className="w-full cursor-pointer group">
                        <summary className="flex items-center justify-between px-3 py-2 list-none hover:bg-gray-50">
                          <span className="text-sm text-gray-600">
                            {Array.isArray(newItem.vendor_ids) && newItem.vendor_ids.length > 0
                              ? `${newItem.vendor_ids.length} vendor(s) selected`
                              : 'Select vendors'}
                          </span>
                          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </summary>
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                          {bidders.filter(bidder => bidder.is_successful).length > 0 ? (
                            bidders
                              .filter(bidder => bidder.is_successful)
                              .map(bidder => {
                                const vendor = vendors.find(v => v.id === bidder.vendor_id);
                                if (!vendor) return null;
                                
                                const vendorIds = Array.isArray(newItem.vendor_ids) ? newItem.vendor_ids : [];
                                const isSelected = vendorIds.includes(vendor.id);
                                
                                return (
                                  <label key={vendor.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-gray-50 rounded">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewItem(prev => ({
                                            ...prev,
                                            vendor_ids: [...(Array.isArray(prev.vendor_ids) ? prev.vendor_ids : []), vendor.id]
                                          }));
                                        } else {
                                          setNewItem(prev => ({
                                            ...prev,
                                            vendor_ids: (Array.isArray(prev.vendor_ids) ? prev.vendor_ids : []).filter(id => id !== vendor.id)
                                          }));
                                        }
                                      }}
                                      className="w-4 h-4"
                                    />
                                    <span>{vendor.vendor_name}</span>
                                  </label>
                                );
                              })
                          ) : (
                            <p className="text-sm text-gray-500 p-2">No successful bidders available</p>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Unit Price for Annual Tender */}
                  <div>
                    <label className="text-sm font-medium">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.estimated_unit_price || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, estimated_unit_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quantity for Normal Tender */}
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

                  {/* Unit Price for Normal Tender */}
                  <div>
                    <label className="text-sm font-medium">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.estimated_unit_price || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, estimated_unit_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total for Normal Tender */}
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    <Input
                      className="bg-gray-100"
                      value={(newItem.quantity || 1) * (newItem.estimated_unit_price || 0)}
                      disabled
                    />
                  </div>
                </div>
              )}

              {/* Specifications and Remarks */}
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

              {/* Add Button at the bottom */}
              <Button type="button" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Items Table */}
            {tenderItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      {tenderData.tender_type === 'annual-tender' ? (
                        <>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Price</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </>
                      )}
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
                        {tenderData.tender_type === 'annual-tender' ? (
                          <>
                            <TableCell>
                              {Array.isArray(item.vendor_ids) && item.vendor_ids.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.vendor_ids.map(vendorId => (
                                    <span key={vendorId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {vendors.find(v => v.id === vendorId)?.vendor_name || vendorId}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                item.vendor_id ? (
                                  <span>{vendors.find(v => v.id === item.vendor_id)?.vendor_name || item.vendor_id}</span>
                                ) : (
                                  'No vendors'
                                )
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.estimated_unit_price || 0)}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.estimated_unit_price || 0)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.total_amount || 0)}</TableCell>
                          </>
                        )}
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
                  onClick={() => {
                    if (tenderData.tender_type === 'spot-purchase') {
                      navigate('/dashboard/spot-purchases');
                    } else if (tenderData.tender_type === 'annual-tender') {
                      navigate('/dashboard/contract-tender?type=annual-tender');
                    } else {
                      navigate('/dashboard/contract-tender');
                    }
                  }}
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