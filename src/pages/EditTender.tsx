import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
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
  vendor_id?: string;
  vendor_ids?: string[];
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

const EditTender: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
    tender_type: 'contract',
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
    remarks: '',
    vendor_ids: []
  });

  // Load tender data on mount
  useEffect(() => {
    const loadTenderData = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        const response = await fetch(`http://localhost:3001/api/tenders/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load tender');
        }

        const tender = await response.json();
        console.log('📋 Loaded tender:', tender);

        setTenderData({
          reference_number: tender.reference_number || '',
          title: tender.title || '',
          description: tender.description || '',
          estimated_value: tender.estimated_value?.toString() || '',
          publish_date: tender.publish_date || '',
          submission_deadline: tender.submission_deadline || '',
          opening_date: tender.opening_date || '',
          tender_type: tender.tender_type || 'contract',
          status: tender.status || 'draft',
          vendor_id: tender.vendor_id || '',
          office_ids: tender.office_ids ? tender.office_ids.split(',').filter(id => id) : [],
          wing_ids: tender.wing_ids ? tender.wing_ids.split(',').filter(id => id) : [],
          dec_ids: tender.dec_ids ? tender.dec_ids.split(',').filter(id => id) : [],
          publication_dailies: tender.publication_dailies || '',
          procurement_methods: tender.procurement_methods || '',
          procedure_adopted: tender.procedure_adopted || ''
        });

        // Load tender items
        if (tender.items && Array.isArray(tender.items)) {
          // Convert vendor_ids from string to array if needed for annual tenders
          const processedItems = tender.items.map(item => {
            if (tender.tender_type === 'annual-tender' && item.vendor_ids && typeof item.vendor_ids === 'string') {
              // Convert comma-separated string to array
              return {
                ...item,
                vendor_ids: item.vendor_ids.split(',').map(id => id.trim()).filter(id => id)
              };
            }
            return item;
          });
          setTenderItems(processedItems);
        }
      } catch (err) {
        console.error('Error loading tender:', err);
        setError('Failed to load tender data');
      } finally {
        setLoadingData(false);
      }
    };

    loadTenderData();
  }, [id]);

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
          setOffices(Array.isArray(officesData) ? officesData : []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch('http://localhost:3001/api/vendors');
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json();
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
        return;
      }

      try {
        const allWings: Wing[] = [];
        
        for (const officeId of tenderData.office_ids) {
          const response = await fetch(`http://localhost:3001/api/offices/${officeId}/wings`);
          if (response.ok) {
            const wingsData = await response.json();
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
            dec_ids: []
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

    if (tenderData.tender_type === 'annual-tender') {
      if (!Array.isArray(newItem.vendor_ids) || newItem.vendor_ids.length === 0) {
        alert('Please select at least one vendor for this item');
        return;
      }
    } else {
      if (!tenderData.vendor_id) {
        alert('Please add vendors in the "Participating Bidders" section and mark one as selected');
        return;
      }
    }

    const item: TenderItem = {
      ...newItem,
      id: `temp-${Date.now()}`
    };

    setTenderItems(prev => [...prev, item]);
    setNewItem({
      item_master_id: '',
      nomenclature: '',
      quantity: 1,
      estimated_unit_price: 0,
      specifications: '',
      remarks: '',
      vendor_ids: []
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  // Spot Purchase Amount Validation
  const getSpotPurchaseValidation = () => {
    if (tenderData.tender_type !== 'spot-purchase') return { isValid: true, message: '' };
    
    const procurementMethod = tenderData.procurement_methods;
    
    if (procurementMethod === 'single_quotation') {
      if (totalTenderValue > 100000) {
        return {
          isValid: false,
          message: `Single Quotation maximum limit is PKR 100,000. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
    } else if (procurementMethod === 'multiple_quotation') {
      if (totalTenderValue <= 100000) {
        return {
          isValid: false,
          message: `Multiple Quotation minimum limit is PKR 100,001. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
      if (totalTenderValue > 500000) {
        return {
          isValid: false,
          message: `Multiple Quotation maximum limit is PKR 500,000. Please register a tender instead. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
    }
    
    if (totalTenderValue > 500000) {
      return {
        isValid: false,
        message: `Spot Purchase maximum limit is PKR 500,000. You must register a tender for amounts exceeding this limit. Current total: ${formatCurrency(totalTenderValue)}`
      };
    }
    
    return { isValid: true, message: '' };
  };

  const spotPurchaseValidation = getSpotPurchaseValidation();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenderData.title.trim()) {
      alert('Please enter a tender title');
      return;
    }

    if ((tenderData.tender_type === 'contract' || tenderData.tender_type === 'spot-purchase') && !tenderData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    if (tenderData.tender_type === 'spot-purchase' && !spotPurchaseValidation.isValid) {
      alert(spotPurchaseValidation.message);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
          ...(item.id && !item.id.startsWith('temp-') ? { id: item.id } : {}),
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          total_amount: item.total_amount || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || '',
          ...(tenderData.tender_type === 'annual-tender' 
            ? { vendor_ids: item.vendor_ids || [] }
            : { vendor_id: item.vendor_id || null }
          )
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Success response:', result);

      alert(`${tenderData.tender_type === 'spot-purchase' ? 'Spot purchase' : tenderData.tender_type === 'annual-tender' ? 'Annual tender' : 'Contract tender'} updated successfully!`);
      
      let redirectPath = '/dashboard/contract-tender';
      if (tenderData.tender_type === 'spot-purchase') {
        redirectPath = '/dashboard/spot-purchases';
      } else if (tenderData.tender_type === 'annual-tender') {
        redirectPath = '/dashboard/contract-tender?type=annual-tender';
      }
      navigate(redirectPath);
    } catch (err) {
      console.error('Error updating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tender');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(
            tenderData.tender_type === 'spot-purchase' ? '/dashboard/spot-purchases' : '/dashboard/contract-tender'
          )}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchases' : 'Contract Tenders'}
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
                Type
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
                      <SelectItem value="annual-tender">Annual Tender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {tenderData.tender_type !== 'spot-purchase' && (
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Tender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchase Information' : 'Tender Information'}
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
                  placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter spot purchase title' : 'Enter tender title'}
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
                  placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter spot purchase description' : 'Enter tender description'}
                />
              </div>

              {tenderData.tender_type !== 'spot-purchase' && (
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
              )}
            </CardContent>
          </Card>

          {/* Location Selection - Only for Contract Tenders */}
          {tenderData.tender_type !== 'spot-purchase' && (
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
          )}

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
                  <label className="text-sm font-medium">Estimated Value *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tenderData.estimated_value}
                    onChange={(e) => setTenderData(prev => ({
                      ...prev,
                      estimated_value: e.target.value
                    }))}
                    placeholder="Enter estimated value"
                  />
                </div>

                {tenderData.tender_type !== 'spot-purchase' && (
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
                )}
                
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
                      {tenderData.tender_type === 'spot-purchase' ? (
                        <>
                          <SelectItem value="single_quotation">Single Quotation</SelectItem>
                          <SelectItem value="multiple_quotation">Multiple Quotation</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="open_bidding">Open Bidding</SelectItem>
                          <SelectItem value="limited_bidding">Limited Bidding</SelectItem>
                          <SelectItem value="direct_contracting">Direct Contracting</SelectItem>
                          <SelectItem value="framework_agreement">Framework Agreement</SelectItem>
                          <SelectItem value="request_for_quotation">Request for Quotation</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {tenderData.tender_type !== 'spot-purchase' && (
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Participating Bidders Section */}
          <TenderVendorManagement
            tenderId={id}
            vendors={vendors}
            tenderItems={tenderItems}
            onVendorsChange={(updatedVendors) => {
              console.log('Vendors updated:', updatedVendors);
              setBidders(updatedVendors);
            }}
            onSuccessfulVendorChange={(vendorId) => {
              console.log('Selected successful vendor:', vendorId);
              setTenderData(prev => ({
                ...prev,
                vendor_id: vendorId || ''
              }));
            }}
            maxVendors={tenderData.tender_type === 'spot-purchase' && tenderData.procurement_methods === 'single_quotation' ? 1 : tenderData.tender_type === 'spot-purchase' && tenderData.procurement_methods === 'multiple_quotation' ? 3 : undefined}
            minVendors={tenderData.tender_type === 'spot-purchase' && tenderData.procurement_methods === 'multiple_quotation' ? 3 : undefined}
            procurementMethod={tenderData.tender_type === 'spot-purchase' ? tenderData.procurement_methods : undefined}
          />

          {/* Tender Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchase Items' : 'Tender Items'} ({tenderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Item Form */}
              <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-4">Add New Item</h3>
                
                {/* Category and Item Select - First Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                  {/* Category Select */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Category *</label>
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
                      <SelectTrigger className="h-9">
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
                    <label className="text-xs font-medium mb-1 block">Item Master *</label>
                    <Select 
                      value={newItem.item_master_id} 
                      onValueChange={handleItemMasterSelect}
                      disabled={!selectedCategory}
                    >
                      <SelectTrigger className="h-9">
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
                </div>

                {/* Second Row - Vendor/Quantity and Price */}
                {tenderData.tender_type === 'annual-tender' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                    {/* Vendor Multi-Select for Annual Tender - Show only participating bidders */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">Vendors * (Multi-select)</label>
                      <div className="border rounded-lg bg-white p-2 space-y-1 max-h-48 overflow-y-auto">
                        {bidders.length > 0 ? (
                          bidders.map(vendor => {
                            const vendorIds = Array.isArray(newItem.vendor_ids) ? newItem.vendor_ids : [];
                            const isSelected = vendorIds.includes(vendor.vendor_id);
                            return (
                              <label key={vendor.vendor_id} className="flex items-center gap-2 p-1 text-xs hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewItem(prev => {
                                        const updated = {
                                          ...prev,
                                          vendor_ids: [...(Array.isArray(prev.vendor_ids) ? prev.vendor_ids : []), vendor.vendor_id]
                                        };
                                        return updated;
                                      });
                                    } else {
                                      setNewItem(prev => {
                                        const updated = {
                                          ...prev,
                                          vendor_ids: (Array.isArray(prev.vendor_ids) ? prev.vendor_ids : []).filter(id => id !== vendor.vendor_id)
                                        };
                                        return updated;
                                      });
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span>{vendor.vendor_name}</span>
                              </label>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-500 p-2">Add vendors in the 'Participating Bidders' section first</p>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {Array.isArray(newItem.vendor_ids) && newItem.vendor_ids.length > 0
                          ? `✅ ${newItem.vendor_ids.length} vendor(s) selected`
                          : '⚠️ Select at least 1 vendor'}
                      </div>
                    </div>

                    {/* Unit Price for Annual Tender */}
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
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                    {/* Quantity for Normal Tender */}
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

                    {/* Unit Price for Normal Tender */}
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

                    {/* Total for Normal Tender */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">Total</label>
                      <Input
                        className="h-9 bg-gray-100"
                        value={formatCurrency(newItem.total_amount || 0)}
                        disabled
                      />
                    </div>
                  </div>
                )}

                {/* Text areas for longer content in one row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                {/* Add Button at the bottom */}
                <Button type="button" onClick={handleAddItem} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Items Table */}
              {tenderItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {tenderData.tender_type === 'spot-purchase' ? 'Spot Purchase Items List' : tenderData.tender_type === 'annual-tender' ? 'Annual Tender Items List' : 'Tender Items List'}
                  </h3>
                  <div className="overflow-x-auto">
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
                                <p className="font-medium">{item.nomenclature}</p>
                                <p className="text-xs text-gray-500">ID: {item.item_master_id}</p>
                              </div>
                            </TableCell>
                            {tenderData.tender_type === 'annual-tender' ? (
                              <>
                                <TableCell>
                                  {item.vendor_ids ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(() => {
                                        // Handle both string and array formats
                                        const vendorIds = Array.isArray(item.vendor_ids) 
                                          ? item.vendor_ids 
                                          : String(item.vendor_ids).split(',').map(id => id.trim()).filter(id => id);
                                        
                                        return vendorIds.length > 0 ? (
                                          vendorIds.map(vendorId => {
                                            const vendor = vendors.find(v => v.id === vendorId);
                                            return (
                                              <span key={vendorId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {vendor?.vendor_name || vendorId}
                                              </span>
                                            );
                                          })
                                        ) : (
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendors</span>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendors</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(item.estimated_unit_price || 0)}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.estimated_unit_price || 0)}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(item.total_amount || 0)}
                                </TableCell>
                              </>
                            )}
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
                    {tenderData.tender_type === 'annual-tender' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-lg font-bold">{tenderItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Value</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(totalTenderValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Price</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(
                              tenderItems.length > 0 
                                ? totalTenderValue / tenderItems.length
                                : 0
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
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
                          <p className={`text-lg font-bold ${!spotPurchaseValidation.isValid ? 'text-red-600' : ''}`}>
                            {formatCurrency(totalTenderValue)}
                          </p>
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
                    )}

                    {tenderData.tender_type === 'spot-purchase' && !spotPurchaseValidation.isValid && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription className="font-medium">
                          {spotPurchaseValidation.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {tenderData.tender_type === 'spot-purchase' && tenderData.procurement_methods && spotPurchaseValidation.isValid && (
                      <Alert className="mt-4 bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {tenderData.procurement_methods === 'single_quotation' 
                            ? `✓ Single Quotation: Amount within limit (Max: PKR 100,000)`
                            : `✓ Multiple Quotation: Amount within limit (Min: PKR 100,001, Max: PKR 500,000)`
                          }
                        </AlertDescription>
                      </Alert>
                    )}
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
                    Ready to update tender with {tenderItems.length} items
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
    </div>
  );
};

export default EditTender;
