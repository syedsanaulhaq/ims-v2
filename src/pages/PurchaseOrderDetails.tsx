import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Download, Printer } from 'lucide-react';

interface POItem {
  id: number;
  po_id: number;
  item_master_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  specifications?: string;
  nomenclature: string;
  category_name: string;
  unit: string;
  subcategory_name?: string;
}

interface PurchaseOrderDetails {
  id: number;
  po_number: string;
  tender_id: number;
  vendor_id: number;
  po_date: string;
  total_amount: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  tender_title: string;
  tender_type: string;
  vendor_name: string;
  vendor_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  items: POItem[];
}

export default function PurchaseOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [po, setPO] = useState<PurchaseOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newRemarks, setNewRemarks] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPODetails(id);  // ✅ Pass UUID string directly, don't parse as number
    }
  }, [id]);

  const fetchPODetails = async (poId: string) => {  // ✅ Change type from number to string
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${poId}`);
      if (!response.ok) throw new Error('Failed to fetch PO details');
      const data = await response.json();
      setPO(data);
      setNewStatus(data.status);
      setNewRemarks(data.remarks || '');
    } catch (err) {
      console.error('Error fetching PO:', err);
      setError('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!po) return;

    try {
      setSaving(true);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${po.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          remarks: newRemarks
        })
      });

      if (!response.ok) throw new Error('Failed to update PO');

      setPO(prev => prev ? { ...prev, status: newStatus, remarks: newRemarks } : null);
      setEditing(false);
      alert('✅ Purchase order updated successfully');
    } catch (err) {
      console.error('Error saving PO:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'issued':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600">Loading purchase order details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/purchase-orders?tenderId=${po?.tender_id || ''}`)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to POs
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-600">{error || 'Purchase order not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Screen View - Navigation and Edit Controls */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 print:hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate(`/dashboard/purchase-orders?tenderId=${po.tender_id}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to POs
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/dashboard/contract-tender?type=${po.tender_type}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tender
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print PO
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{po.po_number}</h1>
                  <p className="text-slate-600">Status: <Badge className={getStatusColor(po.status)}>{po.status.toUpperCase()}</Badge></p>
                </div>
                <Badge className={getTenderTypeColor(po.tender_type)}>
                  {po.tender_type}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Status & Remarks Editor */}
          {!editing ? (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Created</p>
                    <p className="font-medium text-slate-900">
                      {new Date(po.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Last Updated</p>
                    <p className="font-medium text-slate-900">
                      {new Date(po.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {po.remarks && (
                  <div>
                    <p className="text-sm text-slate-600">Remarks</p>
                    <p className="font-medium text-slate-900">{po.remarks}</p>
                  </div>
                )}
                {po.status === 'draft' && (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                  >
                    Edit Status & Remarks
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>Edit Status & Remarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
                <Textarea
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="Add any remarks about this PO..."
                  className="mt-1 border-slate-300"
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      {/* Print View - Professional PO Format */}
      <div className="hidden print:block print:p-8 bg-white">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>

        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wide">PURCHASE ORDER</h1>
            <p className="text-sm mt-1">Inventory Management System</p>
          </div>
        </div>

        {/* PO Number and Date */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <p className="text-sm font-semibold">PO Number:</p>
            <p className="text-lg font-bold">{po.po_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Date:</p>
            <p className="text-lg font-bold">{new Date(po.po_date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="mb-6 border border-gray-300 p-4">
          <p className="text-sm font-bold mb-2 uppercase">To:</p>
          <p className="text-base font-bold">{po.vendor_name}</p>
          {po.vendor_code && <p className="text-sm">Vendor Code: {po.vendor_code}</p>}
          {po.contact_person && <p className="text-sm">Contact Person: {po.contact_person}</p>}
          {po.phone && <p className="text-sm">Phone: {po.phone}</p>}
          {po.email && <p className="text-sm">Email: {po.email}</p>}
        </div>

        {/* Reference */}
        <div className="mb-4">
          <p className="text-sm"><strong>Reference:</strong> {po.tender_title}</p>
          <p className="text-sm"><strong>Tender Type:</strong> {po.tender_type.toUpperCase()}</p>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-2 text-center" style={{width: '40px'}}>S.No</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Description of Items</th>
                <th className="border border-gray-400 px-2 py-2 text-center" style={{width: '60px'}}>Unit</th>
                <th className="border border-gray-400 px-2 py-2 text-center" style={{width: '70px'}}>Qty</th>
                <th className="border border-gray-400 px-3 py-2 text-right" style={{width: '100px'}}>Unit Price (Rs)</th>
                <th className="border border-gray-400 px-3 py-2 text-right" style={{width: '120px'}}>Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-400 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-400 px-3 py-2">
                    <div>
                      <p className="font-medium">{item.nomenclature}</p>
                      {item.specifications && (
                        <p className="text-xs text-gray-600 mt-1">{item.specifications}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Category: {item.category_name}</p>
                    </div>
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-center">{item.unit}</td>
                  <td className="border border-gray-400 px-2 py-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{item.unit_price.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">{item.total_price.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td colSpan={5} className="border border-gray-400 px-3 py-3 text-right uppercase">Grand Total:</td>
                <td className="border border-gray-400 px-3 py-3 text-right text-lg">
                  Rs {po.total_amount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mb-6 border border-gray-300 p-3">
          <p className="text-sm"><strong>Amount in Words:</strong></p>
          <p className="text-sm italic">Rupees {convertToWords(po.total_amount)} Only</p>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-8">
          <p className="text-sm font-bold mb-2 uppercase">Terms & Conditions:</p>
          <ol className="text-xs space-y-1 ml-4 list-decimal">
            <li>Delivery should be made within the specified time period.</li>
            <li>Items must conform to the specifications mentioned above.</li>
            <li>Payment will be processed upon successful delivery and inspection.</li>
            <li>All disputes are subject to local jurisdiction.</li>
          </ol>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="border-t border-gray-600 pt-2">
              <p className="text-xs font-semibold">Prepared By</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-600 pt-2">
              <p className="text-xs font-semibold">Checked By</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-600 pt-2">
              <p className="text-xs font-semibold">Approved By</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600 border-t pt-4">
          <p>This is a system generated Purchase Order</p>
          <p>Generated on: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>
    </>
  );
}

// Helper function to convert number to words
function convertToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero';

  const numToWords = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };

  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);

  let words = numToWords(rupees);
  if (paisa > 0) {
    words += ' and ' + numToWords(paisa) + ' Paisa';
  }

  return words;
}
