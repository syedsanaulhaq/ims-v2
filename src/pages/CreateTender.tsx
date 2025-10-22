import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, FileText, Upload } from 'lucide-react';
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
  const location = useLocation();
  
  // Determine tender type from referrer or URL params
  const getTenderType = () => {
    const searchParams = new URLSearchParams(location.search);
    const typeParam = searchParams.get('type');
    if (typeParam) return typeParam;
    
    // Check referrer URL
    const referrer = document.referrer;
    if (referrer.includes('spot-purchases')) return 'spot-purchase';
    if (referrer.includes('contract-tender')) return 'contract';
    
    return 'contract'; // default
  };
  
  const tenderType = getTenderType();
  
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
    tender_type: tenderType,
    status: 'draft',
    vendor_id: '',
    office_ids: [] as string[],
    wing_ids: [] as string[],
    dec_ids: [] as string[],
    // Additional fields
    publication_dailies: '',
    procurement_methods: '',
    procedure_adopted: ''
  });

  // File uploads state
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

    if (!tenderData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add tender data
      const tenderFormData = {
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

      // Add tender data as JSON string
      formData.append('tenderData', JSON.stringify(tenderFormData));

      // Add file uploads
      if (fileUploads.contract_file) {
        formData.append('contract_file', fileUploads.contract_file);
      }
      if (fileUploads.loi_file) {
        formData.append('loi_file', fileUploads.loi_file);
      }
      if (fileUploads.noting_file) {
        formData.append('noting_file', fileUploads.noting_file);
      }
      if (fileUploads.po_file) {
        formData.append('po_file', fileUploads.po_file);
      }
      if (fileUploads.rfp_file) {
        formData.append('rfp_file', fileUploads.rfp_file);
      }

      const response = await fetch('http://localhost:3001/api/tenders', {
        method: 'POST',
        body: formData, // Remove Content-Type header to let browser set it for FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(`${tenderType === 'spot-purchase' ? 'Spot purchase' : 'Contract tender'} created successfully!`);
      navigate(tenderType === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender');
    } catch (err) {
      console.error('Error creating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(
            tenderType === 'spot_purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender'
          )}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenderType === 'spot_purchase' ? 'Spot Purchases' : 'Contract Tenders'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenderType === 'spot-purchase' ? 'Create New Spot Purchase' : 'Create New Contract'}
            </h1>
            <p className="text-muted-foreground">
              {tenderType === 'spot-purchase' 
                ? 'Enter spot purchase details for quick procurement'
                : 'Enter contract tender details and add items for procurement'
              }
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tender Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Tender Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tender Type *</label>
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
            </CardContent>
          </Card>

          {/* Main Tender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Tender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Vendor Selection */}
              <div>
                <label className="text-sm font-medium">Vendor *</label>
                <Select 
                  value={tenderData.vendor_id} 
                  onValueChange={(value) => setTenderData(prev => ({
                    ...prev,
                    vendor_id: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <span className="font-medium">
                          {vendor.vendor_code && `${vendor.vendor_code} - `}
                          {vendor.vendor_name}
                          {vendor.contact_person && ` (${vendor.contact_person})`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {vendors.length} vendors available
                </p>
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

          {/* Location Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Tender Request Form
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Additional Tender Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Publication Dailies</label>
                  <Input
                    value={tenderData.publication_dailies}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      publication_dailies: e.target.value
                    }))}
                    placeholder="Enter publication dailies"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Procurement Methods</label>
                  <Select 
                    value={tenderData.procurement_methods} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      procurement_methods: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select procurement method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_bidding">Open Bidding</SelectItem>
                      <SelectItem value="limited_bidding">Limited Bidding</SelectItem>
                      <SelectItem value="direct_contracting">Direct Contracting</SelectItem>
                      <SelectItem value="framework_agreement">Framework Agreement</SelectItem>
                      <SelectItem value="request_for_quotation">Request for Quotation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Procedure Adopted</label>
                  <Select 
                    value={tenderData.procedure_adopted} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      procedure_adopted: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select procedure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_stage">Single Stage</SelectItem>
                      <SelectItem value="two_stage">Two Stage</SelectItem>
                      <SelectItem value="pre_qualification">Pre-qualification</SelectItem>
                      <SelectItem value="expression_of_interest">Expression of Interest</SelectItem>
                      <SelectItem value="request_for_proposal">Request for Proposal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Noting File</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, noting_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.noting_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.noting_file.name}
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

              {/* Default message when no tender type selected */}
              {!tenderData.tender_type && (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Please select a tender type to see available document upload options</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Accepted formats:</strong> PDF, DOC, DOCX, XLS, XLSX
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Maximum file size: 10MB per file
                </p>
                {tenderData.tender_type === 'contract' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Contract Tender:</strong> Contract, LOI, PO, RFP documents
                  </p>
                )}
                {tenderData.tender_type === 'spot-purchase' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Spot Purchase:</strong> Noting file and PO documents
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vendor Management Section */}
          <TenderVendorManagement
            tenderId={location.state?.tenderId}
            vendors={vendors}
            onVendorsChange={(updatedVendors) => {
              console.log('Vendors updated:', updatedVendors);
            }}
          />

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
                
                {/* All fields in one row */}
                <div className="grid grid-cols-1 lg:grid-cols-8 gap-3 mb-4">
                  <div className="lg:col-span-2">
                    <label className="text-xs font-medium mb-1 block">Item Master *</label>
                    <Select 
                      value={newItem.item_master_id} 
                      onValueChange={handleItemMasterSelect}
                    >
                      <SelectTrigger className="h-9">
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

                  <div className="lg:col-span-2">
                    <label className="text-xs font-medium mb-1 block">Nomenclature *</label>
                    <Input
                      className="h-9"
                      value={newItem.nomenclature}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev,
                        nomenclature: e.target.value
                      }))}
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Quantity *</label>
                    <Input
                      className="h-9"
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
                    <label className="text-xs font-medium mb-1 block">Unit Price</label>
                    <Input
                      className="h-9"
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
                    <label className="text-xs font-medium mb-1 block">Total</label>
                    <Input
                      className="h-9 bg-gray-100"
                      value={formatCurrency(newItem.total_amount || 0)}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Action</label>
                    <Button type="button" onClick={handleAddItem} className="h-9 w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Text areas for longer content in one row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Specifications (Optional)</label>
                    <textarea
                      className="w-full p-2 border border-input rounded-md resize-none text-sm"
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
                    <label className="text-xs font-medium mb-1 block">Remarks (Optional)</label>
                    <textarea
                      className="w-full p-2 border border-input rounded-md resize-none text-sm"
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
                    onClick={() => navigate(
                      tenderType === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender'
                    )}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !tenderData.title}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : `Create ${tenderType === 'spot-purchase' ? 'Spot Purchase' : 'Contract'}`}
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