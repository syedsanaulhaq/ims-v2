import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  Package, 
  Building2,
  User,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Edit,
  File,
  Printer,
  FileDown
} from 'lucide-react';
import { format } from 'date-fns';
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
  id: string;
  tender_id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  quantity_received?: number;
  estimated_unit_price?: number;
  actual_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  remarks?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  vendor_ids?: string | string[];
  vendor_id?: string;
}

interface Tender {
  id: string;
  title: string;
  description?: string;
  reference_number: string;
  tender_number?: string;
  tender_type: string;
  tender_spot_type?: string;
  submission_deadline: string;
  estimated_value: number;
  status: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  publish_date?: string;
  publication_date?: string;
  submission_date?: string;
  opening_date?: string;
  advertisement_date?: string;
  procedure_adopted?: string;
  procurement_method?: string;
  publication_daily?: string;
  contract_file_path?: string;
  loi_file_path?: string;
  noting_file_path?: string;
  po_file_path?: string;
  rfp_file_path?: string;
  document_path?: string;
  office_ids?: string;
  wing_ids?: string;
  dec_ids?: string;
  vendor_id?: string;
  vendor_name?: string;
  individual_total?: number;
  actual_price_total?: number;
  items?: TenderItem[];
}

const TenderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [officeNames, setOfficeNames] = useState<string[]>([]);
  const [wingNames, setWingNames] = useState<string[]>([]);
  const [decNames, setDecNames] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchTenderDetails();
    }
  }, [id]);

  useEffect(() => {
    if (tender) {
      fetchOrganizationalNames();
    }
  }, [tender]);

  const fetchOrganizationalNames = async () => {
    try {
      // Fetch all offices, wings, and decs
      const [officesRes, wingsRes, decsRes] = await Promise.all([
        fetch('http://localhost:3001/api/offices'),
        fetch('http://localhost:3001/api/wings'),
        fetch('http://localhost:3001/api/decs')
      ]);

      const offices = await officesRes.json();
      const wings = await wingsRes.json();
      const decs = await decsRes.json();

      console.log('📊 Fetched data:', { offices, wings, decs });

      // Parse the IDs from the tender
      if (tender?.office_ids) {
        const officeIds = tender.office_ids.split(',').map(id => id.trim());
        const names = officeIds
          .map(id => {
            const office = offices.find((o: any) => 
              o.intOfficeID?.toString() === id || 
              o.id?.toString() === id ||
              o.Id?.toString() === id
            );
            return office?.strOfficeName || office?.name || office?.Name || `Office ID: ${id}`;
          })
          .filter(Boolean);
        setOfficeNames(names);
      }

      if (tender?.wing_ids) {
        const wingIds = tender.wing_ids.split(',').map(id => id.trim());
        console.log('🔍 Looking for wing IDs:', wingIds);
        const names = wingIds
          .map(id => {
            const wing = wings.find((w: any) => 
              w.Id?.toString() === id || 
              w.id?.toString() === id ||
              w.intWingID?.toString() === id
            );
            console.log(`Wing ID ${id} matched:`, wing);
            return wing?.Name || wing?.name || wing?.strWingName || `Wing ID: ${id}`;
          })
          .filter(Boolean);
        setWingNames(names);
      }

      if (tender?.dec_ids) {
        const decIds = tender.dec_ids.split(',').map(id => id.trim());
        console.log('🔍 Looking for DEC IDs:', decIds);
        const names = decIds
          .map(id => {
            const dec = decs.find((d: any) => 
              d.intAutoID?.toString() === id || 
              d.id?.toString() === id ||
              d.Id?.toString() === id ||
              d.intDecID?.toString() === id
            );
            console.log(`DEC ID ${id} matched:`, dec);
            return dec?.DECName || dec?.name || dec?.Name || dec?.strDecName || `DEC ID: ${id}`;
          })
          .filter(Boolean);
        setDecNames(names);
      }
    } catch (error) {
      console.error('Error fetching organizational names:', error);
    }
  };

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tenders/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tender details');
      }
      
      const data = await response.json();
      console.log('✅ Fetched tender details:', data);
      setTender(data);
    } catch (error) {
      console.error('❌ Error fetching tender details:', error);
      alert('Failed to load tender details');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <Badge className="bg-green-600">✓ Finalized</Badge>;
    }
    
    switch (status?.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'published':
        return <Badge className="bg-blue-600">Published</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600">Closed</Badge>;
      case 'awarded':
        return <Badge className="bg-purple-600">Awarded</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const url = `http://localhost:3001/uploads/tender-files/${filePath}`;
    window.open(url, '_blank');
  };

  const handleEdit = () => {
    if (tender?.is_finalized) {
      alert('Finalized tenders cannot be edited');
      return;
    }
    navigate(`/dashboard/edit-tender/${tender?.id}`);
  };

  const handleBack = () => {
    const tenderType = tender?.tender_type === 'spot-purchase' ? 'spot-purchases' : 'contract-tender';
    navigate(`/dashboard/${tenderType}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!tender) return;

    // Prepare data for export
    const csvContent = [
      ['Tender Details Report'],
      [],
      ['Title', tender.title],
      ['Reference Number', tender.reference_number],
      ['Tender Type', tender.tender_type],
      ['Status', tender.status],
      ['Estimated Value', formatCurrency(tender.estimated_value)],
      ['Publish Date', formatDate(tender.publish_date)],
      ['Submission Deadline', formatDate(tender.submission_deadline)],
      ['Opening Date', formatDate(tender.opening_date)],
      ['Description', tender.description || ''],
      ['Created By', tender.created_by || ''],
      ['Created Date', formatDateTime(tender.created_at)],
      [],
      ['Tender Items'],
      ['Item', 'Quantity', 'Unit Price', 'Total Amount', 'Specifications', 'Remarks'],
      ...(tender.items?.map((item) => [
        item.nomenclature,
        item.quantity,
        item.estimated_unit_price || 0,
        item.total_amount || 0,
        item.specifications || '',
        item.remarks || ''
      ]) || [])
    ];

    const csvString = csvContent.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tender.reference_number || 'tender'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading tender details...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tender not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8" />
              {tender.title}
            </h1>
            <p className="text-gray-600 mt-1">Reference: {tender.reference_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(tender.status, tender.is_finalized)}
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
          {!tender.is_finalized && (
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Finalized Alert */}
      {tender.is_finalized && (
        <Alert className="bg-green-50 border-green-200">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            This tender has been finalized on {formatDateTime(tender.finalized_at)} 
            by {tender.finalized_by || 'Unknown'} and has been added to the stock acquisition system.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="text-lg font-semibold mt-1">{tender.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Reference Number</label>
              <p className="text-lg font-semibold mt-1">{tender.reference_number}</p>
            </div>
            {tender.tender_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tender Number</label>
                <p className="text-lg font-semibold mt-1">{tender.tender_number}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Tender Type</label>
              <p className="text-lg mt-1">
                {tender.tender_type === 'spot-purchase' ? 'Spot Purchase' : tender.tender_type === 'annual-tender' ? 'Annual Tender' : 'Contract/Tender'}
              </p>
            </div>
            {tender.tender_spot_type && (
              <div>
                <label className="text-sm font-medium text-gray-500">Spot Type</label>
                <p className="text-lg mt-1">{tender.tender_spot_type}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {getStatusBadge(tender.status, tender.is_finalized)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Estimated Value</label>
              <p className="text-lg font-semibold text-green-600 mt-1">
                {formatCurrency(tender.estimated_value)}
              </p>
            </div>
            {tender.publication_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Publication Date</label>
                <p className="text-lg mt-1">{formatDate(tender.publication_date)}</p>
              </div>
            )}
            {tender.procurement_method && (
              <div>
                <label className="text-sm font-medium text-gray-500">Procurement Method</label>
                <p className="text-lg mt-1">{tender.procurement_method}</p>
              </div>
            )}
            {tender.individual_total !== null && tender.individual_total !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-500">Individual Total</label>
                <p className="text-lg font-semibold text-blue-600 mt-1">
                  {formatCurrency(tender.individual_total)}
                </p>
              </div>
            )}
            {tender.actual_price_total !== null && tender.actual_price_total !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-500">Actual Price Total</label>
                <p className="text-lg font-semibold text-purple-600 mt-1">
                  {formatCurrency(tender.actual_price_total)}
                </p>
              </div>
            )}
          </div>

          {tender.description && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {tender.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tender.publish_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Publish Date</label>
                <p className="text-lg mt-1">{formatDate(tender.publish_date)}</p>
              </div>
            )}
            {tender.publication_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Publication Date</label>
                <p className="text-lg mt-1">{formatDate(tender.publication_date)}</p>
              </div>
            )}
            {tender.advertisement_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Advertisement Date</label>
                <p className="text-lg mt-1">{formatDate(tender.advertisement_date)}</p>
              </div>
            )}
            {tender.submission_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Submission Date</label>
                <p className="text-lg mt-1">{formatDate(tender.submission_date)}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Submission Deadline</label>
              <p className="text-lg font-semibold text-red-600 mt-1">
                {formatDate(tender.submission_deadline)}
              </p>
            </div>
            {tender.opening_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Opening Date</label>
                <p className="text-lg mt-1">{formatDate(tender.opening_date)}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="text-lg mt-1">{formatDateTime(tender.created_at)}</p>
            </div>
            {tender.updated_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-lg mt-1">{formatDateTime(tender.updated_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Procurement Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Procurement Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tender.procedure_adopted && (
              <div>
                <label className="text-sm font-medium text-gray-500">Procedure Adopted</label>
                <p className="text-lg mt-1">{tender.procedure_adopted}</p>
              </div>
            )}
            {tender.procurement_method && (
              <div>
                <label className="text-sm font-medium text-gray-500">Procurement Method</label>
                <p className="text-lg mt-1">{tender.procurement_method}</p>
              </div>
            )}
            {tender.publication_daily && (
              <div>
                <label className="text-sm font-medium text-gray-500">Publication Daily</label>
                <p className="text-lg mt-1">{tender.publication_daily}</p>
              </div>
            )}
            {tender.vendor_name && (
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor</label>
                <p className="text-lg mt-1">{tender.vendor_name}</p>
              </div>
            )}
            {tender.created_by && (
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <p className="text-lg mt-1">{tender.created_by}</p>
              </div>
            )}
          </div>

          {/* Organizational Names */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {officeNames.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Offices</label>
                <ul className="space-y-1">
                  {officeNames.map((name, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-sm">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {wingNames.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Wings</label>
                <ul className="space-y-1">
                  {wingNames.map((name, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-sm">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {decNames.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">DECs</label>
                <ul className="space-y-1">
                  {decNames.map((name, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span className="text-sm">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Attachments */}
      {(tender.contract_file_path || tender.loi_file_path || tender.noting_file_path || 
        tender.po_file_path || tender.rfp_file_path || tender.document_path) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Document Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tender.contract_file_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Contract File</p>
                      <p className="text-sm text-gray-500">{tender.contract_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.contract_file_path!, 'Contract')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.loi_file_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">LOI File</p>
                      <p className="text-sm text-gray-500">{tender.loi_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.loi_file_path!, 'LOI')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.noting_file_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Noting File</p>
                      <p className="text-sm text-gray-500">{tender.noting_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.noting_file_path!, 'Noting')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.po_file_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">PO File</p>
                      <p className="text-sm text-gray-500">{tender.po_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.po_file_path!, 'PO')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.rfp_file_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">RFP File</p>
                      <p className="text-sm text-gray-500">{tender.rfp_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.rfp_file_path!, 'RFP')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.document_path && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Document</p>
                      <p className="text-sm text-gray-500">{tender.document_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownload(tender.document_path!, 'Document')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participating Bidders Section */}
      <TenderVendorManagement
        tenderId={tender.id}
        readOnly={true}
        vendors={[]}
      />

      {/* Tender Items */}
      {tender.items && tender.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Tender Items ({tender.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Specifications</TableHead>
                    <TableHead>Remarks</TableHead>
                    {tender.tender_type === 'annual-tender' && <TableHead>Vendor</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tender.items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{item.nomenclature}</TableCell>
                      <TableCell>
                        {item.estimated_unit_price ? formatCurrency(item.estimated_unit_price) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={item.specifications || ''}>
                          {item.specifications || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={item.remarks || ''}>
                          {item.remarks || '-'}
                        </div>
                      </TableCell>
                      {tender.tender_type === 'annual-tender' && (
                        <TableCell>
                          {item.vendor_ids ? (
                            Array.isArray(item.vendor_ids) ? (
                              <div className="flex flex-wrap gap-1">
                                {item.vendor_ids.map((vendorId: any, idx: number) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {vendorId}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {item.vendor_ids.split(',').map((vendorId: string, idx: number) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {vendorId.trim()}
                                  </span>
                                ))}
                              </div>
                            )
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Items Summary */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-blue-600">{tender.items.length}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tender.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(tender.items.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenderDetails;
