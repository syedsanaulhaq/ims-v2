import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Building, 
  Package, 
  Calendar,
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import { createNameResolver } from '@/utils/nameResolver';
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
  vendor_name?: string;
  category_name?: string;
  category_description?: string;
}

interface TenderData {
  id: string;
  title: string;
  description?: string;
  reference_number?: string;
  tender_number?: string;
  tender_type: string;
  tender_status?: string;
  procurement_method?: string;
  procedure?: string;
  published_date?: string;
  estimated_value: number;
  submission_date?: string;
  opening_date?: string;
  submission_deadline?: string;
  publication_daily?: string;
  vendor_name?: string;
  vendor_code?: string;
  office_ids?: string;
  wing_ids?: string;
  dec_ids?: string;
  office_names?: string;
  wing_names?: string;
  dec_names?: string;
  created_at: string;
  updated_at?: string;
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
  items: TenderItem[];
}

const TenderReportEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenderData, setTenderData] = useState<TenderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidders, setBidders] = useState<any[]>([]);
  const { offices, wings, decs, isLoading: hierarchyLoading } = useOfficeHierarchy();
  const [vendors, setVendors] = useState<any[]>([]);

  // Fetch tender data and vendors
  useEffect(() => {
    if (id) {
      loadTenderData(id);
      fetchVendors();
    }
  }, [id]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const getVendorName = (vendorId: string): string => {
    const vendor = vendors.find(v => 
      v.id?.toLowerCase() === vendorId?.toLowerCase() ||
      v.vendor_id?.toLowerCase() === vendorId?.toLowerCase()
    );
    return vendor?.vendor_name || vendorId;
  };

  const loadTenderData = async (tenderId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch tender details
      const tenderResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      if (!tenderResponse.ok) {
        throw new Error('Failed to fetch tender data');
      }
      const tender = await tenderResponse.json();
      setTenderData(tender);

      // Fetch bidders/vendors for annual tenders
      if (tender.tender_type === 'annual-tender') {
        try {
          const biddersResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`);
          if (biddersResponse.ok) {
            const biddersData = await biddersResponse.json();
            setBidders(biddersData || []);
          }
        } catch (err) {
          console.error('Error fetching bidders:', err);
        }
      }
    } catch (err) {
      console.error('Error loading tender data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tender data');
    } finally {
      setIsLoading(false);
    }
  };

  // Name resolution using office hierarchy
  const getResolvedNames = (data: TenderData) => {
    const nameResolver = createNameResolver(offices, wings, decs);
    
    const parseIds = (idsString: string) => {
      if (!idsString) return [];
      return idsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    };

    const resolveOfficeNames = () => {
      if (data.office_ids) {
        const ids = parseIds(data.office_ids);
        if (ids.length > 0) {
          return nameResolver.resolveOfficeNames(ids).join(', ');
        }
      }
      return data.office_names || 'N/A';
    };

    const resolveWingNames = () => {
      if (data.wing_ids) {
        const ids = parseIds(data.wing_ids);
        if (ids.length > 0) {
          return nameResolver.resolveWingNames(ids).join(', ');
        }
      }
      return data.wing_names || 'N/A';
    };

    const resolveDecNames = () => {
      if (data.dec_ids) {
        const ids = parseIds(data.dec_ids);
        if (ids.length > 0) {
          return nameResolver.resolveDecNames(ids).join(', ');
        }
      }
      return data.dec_names || 'N/A';
    };

    return {
      officeNames: resolveOfficeNames(),
      wingNames: resolveWingNames(),
      decNames: resolveDecNames()
    };
  };

  // Formatting functions
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  // Calculations
  const calculateActualTotal = () => {
    if (!tenderData || !tenderData.items) return 0;
    if (tenderData.tender_type === 'annual-tender') {
      return 0; // Annual tenders don't show total value
    }
    return tenderData.items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  };

  const estimatedValue = tenderData?.estimated_value || 0;
  const actualValue = calculateActualTotal();
  const variance = actualValue - estimatedValue;
  const variancePercentage = estimatedValue > 0 ? (variance / estimatedValue) * 100 : 0;

  // PDF Generation
  const generatePDF = () => {
    if (!tenderData) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(tenderData.title || 'Tender Report', 148.5, 20, { align: 'center' });

    // Reference Number
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${tenderData.reference_number || tenderData.tender_number || 'N/A'}`, 148.5, 28, { align: 'center' });

    let yPos = 40;

    // Tender Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Information', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const tenderInfo = [
      ['Type:', tenderData.tender_type || 'N/A', 'Method:', tenderData.procurement_method || 'N/A'],
      ['Status:', tenderData.tender_status || 'N/A', 'Estimated Value:', formatCurrency(estimatedValue)],
      ['Submission:', formatDate(tenderData.submission_date), 'Opening:', formatDate(tenderData.opening_date)]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: tenderInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 80 },
        2: { fontStyle: 'bold', cellWidth: 40 },
        3: { cellWidth: 80 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Financial Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, yPos);
    yPos += 8;

    const financialData = [
      ['Estimated Value', formatCurrency(estimatedValue)],
      ['Actual Value', formatCurrency(actualValue)],
      ['Variance', formatCurrency(variance) + ` (${variancePercentage.toFixed(2)}%)`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Items Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Items', 14, yPos);
    yPos += 8;

    const itemsData = tenderData.items.map(item => [
      item.nomenclature || item.item_name || 'N/A',
      item.quantity.toString(),
      formatCurrency(item.estimated_unit_price),
      formatCurrency(calculateItemTotal(item))
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Item Name', 'Quantity', 'Unit Price', 'Total Amount']],
      body: itemsData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 9 },
      foot: [[
        'Total',
        tenderData.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
        '',
        formatCurrency(actualValue)
      ]],
      footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
    });

    // Save PDF
    doc.save(`Tender_Report_${tenderData.reference_number || tenderData.id}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tender report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenderData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600 mb-4">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Error Loading Tender</h3>
            </div>
            <p className="text-red-700 mb-4">{error || 'Tender not found'}</p>
            <Button onClick={() => navigate('/dashboard/contract-tender')} variant="outline">
              Back to Tenders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedNames = getResolvedNames(tenderData);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-4 print:max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          onClick={() => navigate('/dashboard/contract-tender')}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tenders</span>
        </Button>
        
        <div className="flex space-x-2">
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={generatePDF} variant="default" className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center border-b-2 border-green-600 pb-4 print:border-b print:border-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {tenderData.title || 'Tender Report'}
        </h1>
        <p className="text-gray-600 text-lg">
          Reference: {tenderData.reference_number || tenderData.tender_number || 'N/A'}
        </p>
        {tenderData.is_finalized && (
          <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Finalized
          </Badge>
        )}
      </div>

      {/* Basic Information */}
      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <FileText className="h-5 w-5" />
            <span>Tender Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tender Type</label>
              <p className="text-gray-900 font-medium">{tenderData.tender_type || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Reference Number</label>
              <p className="text-gray-900 font-medium">{tenderData.reference_number || 'N/A'}</p>
            </div>
            {tenderData.tender_number && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tender Number</label>
                <p className="text-gray-900 font-medium">{tenderData.tender_number}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <Badge className={
                tenderData.tender_status === 'Active' ? 'bg-green-100 text-green-800' :
                tenderData.tender_status === 'Closed' ? 'bg-red-100 text-red-800' :
                tenderData.tender_status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {tenderData.tender_status || 'Unknown'}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Value</label>
              <p className="text-gray-900 font-semibold text-green-600">{formatCurrency(estimatedValue)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Item Count</label>
              <p className="text-gray-900 font-semibold">{tenderData.items?.length || 0} items</p>
            </div>
          </div>

          {tenderData.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{tenderData.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Calendar className="h-5 w-5" />
            <span>Important Dates</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenderData.published_date && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Publish Date</label>
                <p className="text-gray-900">{formatDate(tenderData.published_date)}</p>
              </div>
            )}
            {tenderData.submission_date && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Submission Date</label>
                <p className="text-gray-900">{formatDate(tenderData.submission_date)}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Submission Deadline</label>
              <p className="text-gray-900 font-semibold text-red-600">{formatDate(tenderData.submission_deadline)}</p>
            </div>
            {tenderData.opening_date && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Opening Date</label>
                <p className="text-gray-900">{formatDate(tenderData.opening_date)}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-gray-900">{formatDateTime(tenderData.created_at)}</p>
            </div>
            {tenderData.updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(tenderData.updated_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Procurement Details */}
      <Card className="border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardTitle className="flex items-center space-x-2 text-orange-800">
            <Building className="h-5 w-5" />
            <span>Procurement Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenderData.procedure && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Procedure Adopted</label>
                <p className="text-gray-900">{tenderData.procedure}</p>
              </div>
            )}
            {tenderData.procurement_method && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Procurement Method</label>
                <p className="text-gray-900">{tenderData.procurement_method}</p>
              </div>
            )}
            {tenderData.publication_daily && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Publication Daily</label>
                <p className="text-gray-900">{tenderData.publication_daily}</p>
              </div>
            )}
            {tenderData.vendor_name && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                <p className="text-gray-900">{tenderData.vendor_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary - Only for non-annual tenders */}
      {tenderData.tender_type !== 'annual-tender' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100 pb-3">
              <CardTitle className="flex items-center justify-between text-blue-800 text-base">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Estimated Value
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(estimatedValue)}</p>
              <p className="text-sm text-gray-600 mt-1">Budgeted Amount</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="bg-gradient-to-br from-green-50 to-green-100 pb-3">
              <CardTitle className="flex items-center justify-between text-green-800 text-base">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Actual Value
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-900">{formatCurrency(actualValue)}</p>
              <p className="text-sm text-gray-600 mt-1">Total Item Cost</p>
            </CardContent>
          </Card>

          <Card className={variance >= 0 ? 'border-red-200' : 'border-green-200'}>
            <CardHeader className={`bg-gradient-to-br pb-3 ${
              variance >= 0 ? 'from-red-50 to-red-100' : 'from-green-50 to-green-100'
            }`}>
              <CardTitle className={`flex items-center justify-between text-base ${
                variance >= 0 ? 'text-red-800' : 'text-green-800'
              }`}>
                <span className="flex items-center gap-2">
                  {variance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  Variance
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${variance >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                {formatCurrency(Math.abs(variance))}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {variancePercentage.toFixed(2)}% {variance >= 0 ? 'Over' : 'Under'} Budget
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organizational Information */}
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardTitle className="flex items-center space-x-2 text-purple-800">
            <Building className="h-5 w-5" />
            <span>Organizational Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Offices</label>
              <p className="text-gray-900 bg-blue-50 p-3 rounded-md">{resolvedNames.officeNames}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Wings</label>
              <p className="text-gray-900 bg-green-50 p-3 rounded-md">{resolvedNames.wingNames}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Departments</label>
              <p className="text-gray-900 bg-purple-50 p-3 rounded-md">{resolvedNames.decNames}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tender Items */}
      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 print:bg-gray-100">
          <CardTitle className="flex items-center space-x-2 text-green-800 print:text-gray-900">
            <Package className="h-5 w-5" />
            <span>
              {tenderData.tender_type === 'annual-tender' 
                ? 'Annual Tender Items' 
                : tenderData.tender_type === 'spot-purchase'
                ? 'Spot Purchase Items'
                : 'Tender Items'
              } ({tenderData.items?.length || 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border print:text-sm">
              <thead className="bg-green-100 print:bg-gray-200">
                <tr>
                  {tenderData.tender_type === 'annual-tender' ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Name of the Article</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Specifications</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Remarks</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Total Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Specifications</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider print:text-gray-900 print:px-2 print:py-2">Remarks</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(tenderData.tender_type === 'annual-tender' 
                  ? [...tenderData.items].sort((a, b) => {
                      const categoryA = a.category_description && a.category_name 
                        ? `${a.category_description} - ${a.category_name}`
                        : a.category_name || '';
                      const categoryB = b.category_description && b.category_name 
                        ? `${b.category_description} - ${b.category_name}`
                        : b.category_name || '';
                      return categoryA.localeCompare(categoryB);
                    })
                  : tenderData.items
                ).map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-green-50 print:hover:bg-white">
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 print:px-2 print:py-1">{index + 1}</td>
                    {tenderData.tender_type === 'annual-tender' ? (
                      <>
                        <td className="px-4 py-3 text-sm print:px-2 print:py-1">
                          <p className="font-medium">
                            {item.category_description && item.category_name 
                              ? `${item.category_description} - ${item.category_name}`
                              : item.category_name || 'N/A'
                            }
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold print:px-2 print:py-1">{item.nomenclature}</td>
                        <td className="px-4 py-3 text-sm print:px-2 print:py-1">
                          {item.vendor_ids || item.vendor_id || item.vendor_name ? (
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                if (item.vendor_name) {
                                  return (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded print:bg-white print:border print:border-gray-300">
                                      {item.vendor_name}
                                    </span>
                                  );
                                }
                                const vendorIds = item.vendor_ids 
                                  ? (Array.isArray(item.vendor_ids) 
                                      ? item.vendor_ids 
                                      : String(item.vendor_ids).split(',').map(id => id.trim()).filter(id => id))
                                  : (item.vendor_id ? [item.vendor_id] : []);
                                
                                return vendorIds.length > 0 ? (
                                  vendorIds.map(vendorId => (
                                    <span key={vendorId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded print:bg-white print:border print:border-gray-300">
                                      {getVendorName(vendorId)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded print:bg-white print:border print:border-gray-300">No vendor</span>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded print:bg-white print:border print:border-gray-300">No vendor</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 print:px-2 print:py-1">
                          {formatCurrency(item.estimated_unit_price || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs print:px-2 print:py-1">
                          {item.specifications || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs print:px-2 print:py-1">
                          {item.remarks || '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-semibold print:px-2 print:py-1">{item.nomenclature}</td>
                        <td className="px-4 py-3 text-sm text-center print:px-2 print:py-1">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 print:px-2 print:py-1">
                          {formatCurrency(item.estimated_unit_price || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 print:px-2 print:py-1">
                          {formatCurrency(item.total_amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs print:px-2 print:py-1">
                          {item.specifications || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs print:px-2 print:py-1">
                          {item.remarks || '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Items Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 print:bg-gray-100 print:border-gray-300">
            <div className={`grid gap-6 ${tenderData.tender_type === 'annual-tender' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-4'} print:gap-4`}>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Items</p>
                <p className="text-3xl font-bold text-blue-600 print:text-2xl">{tenderData.items.length}</p>
              </div>
              {tenderData.tender_type !== 'annual-tender' && (
                <>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Quantity</p>
                    <p className="text-3xl font-bold text-green-600 print:text-2xl">
                      {tenderData.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Average Unit Price</p>
                    <p className="text-3xl font-bold text-purple-600 print:text-2xl">
                      {formatCurrency(
                        tenderData.items.length > 0
                          ? tenderData.items.reduce((sum, item) => sum + (item.estimated_unit_price || 0), 0) / tenderData.items.length
                          : 0
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-orange-600 print:text-2xl">
                      {formatCurrency(tenderData.items.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                    </p>
                  </div>
                </>
              )}
              {tenderData.tender_type === 'annual-tender' && bidders.length > 0 && (
                <>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Vendors</p>
                    <p className="text-3xl font-bold text-purple-600 print:text-2xl">{bidders.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Successful Bidders</p>
                    <p className="text-3xl font-bold text-green-600 print:text-2xl">
                      {bidders.filter(b => b.is_successful).length}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participating Bidders */}
      {tenderData.tender_type === 'annual-tender' && bidders.length > 0 && (
        <TenderVendorManagement
          tenderId={id}
          vendors={bidders}
          readOnly={true}
        />
      )}

      {/* System Information */}
      <Card className="border-gray-200 print:hidden">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created At</label>
              <p className="text-gray-700">{formatDateTime(tenderData.created_at)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Updated At</label>
              <p className="text-gray-700">{formatDateTime(tenderData.updated_at)}</p>
            </div>
            {tenderData.is_finalized && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Finalized At</label>
                  <p className="text-gray-700">{formatDateTime(tenderData.finalized_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Finalized By</label>
                  <p className="text-gray-700">{tenderData.finalized_by || 'N/A'}</p>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tender ID</label>
              <p className="text-gray-700 font-mono text-xs">{tenderData.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenderReportEnhanced;
