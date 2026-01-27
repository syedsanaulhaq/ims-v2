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
  tender_reference_number?: string;
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
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 print:bg-white">
        {/* Navigation and Action Buttons - Hidden on Print */}
        <div className="no-print bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
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
            <div className="flex gap-2 items-center">
              <Badge className={getStatusColor(po.status)}>{po.status.toUpperCase()}</Badge>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print PO
              </Button>
              {po.status === 'draft' && !editing && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Status
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Panel - Hidden on Print */}
        {editing && (
          <div className="no-print bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="max-w-5xl mx-auto">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle>Edit Status & Remarks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Add any remarks..."
                        className="mt-1 border-slate-300"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveChanges} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Professional PO Format - Visible on Both Screen and Print */}
        <div className="px-6 py-8 print:p-8">
          <div className="max-w-5xl mx-auto bg-white shadow-lg print:shadow-none p-12 print:p-0">
            
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm">
                  <p>{po.tender_reference_number ? `No.${po.tender_reference_number}` : `No. ${po.po_number}`}</p>
                </div>
                <div className="text-sm font-bold uppercase">
                  <p className="underline">MOST IMMEDIATE</p>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase">ELECTION COMMISSION OF PAKISTAN</h1>
              </div>

              <div className="flex justify-end mb-6">
                <div className="text-sm text-right">
                  <p>Secretariat,</p>
                  <p>Constitution Avenue, G-5/2,</p>
                  <p>Islamabad, the {new Date(po.po_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (match) => {
                    const num = parseInt(match);
                    const suffix = num === 1 || num === 21 || num === 31 ? 'st' : 
                                 num === 2 || num === 22 ? 'nd' : 
                                 num === 3 || num === 23 ? 'rd' : 'th';
                    return num + suffix;
                  })}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm">To,</p>
              </div>

              <div className="mb-6 ml-12 text-sm">
                <p>M/s {po.vendor_name},</p>
                {po.contact_person && <p>{po.contact_person},</p>}
                {po.phone && <p>Tel: {po.phone},</p>}
                {po.email && <p>{po.email},</p>}
                <p className="underline font-semibold">Islamabad.</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold uppercase underline">SUPPLY ORDER</h2>
            </div>

            {/* Body Text */}
            <div className="mb-6 text-sm leading-relaxed" style={{ textAlign: 'justify' }}>
              <p className="indent-12">
                It is submitted that the following items may kindly be provided to this Commission 
                Secretariat at the earliest to meet the official requirements as per annual tender rates 
                {po.tender_type === 'annual-tender' ? ' 2025-26' : ''}. Furthermore, the supplier may be requested to furnish the 
                corresponding bill/invoice to this office after delivery of the items, so that necessary 
                arrangements for payment can be made in accordance with the prescribed financial rules 
                and procedures.
              </p>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr className="border border-black">
                    <th className="border border-black px-2 py-2 text-center font-bold" style={{width: '50px'}}>Sl.<br/>No.</th>
                    <th className="border border-black px-3 py-2 text-center font-bold">Item</th>
                    <th className="border border-black px-2 py-2 text-center font-bold" style={{width: '80px'}}>Quantity</th>
                    <th className="border border-black px-3 py-2 text-center font-bold" style={{width: '90px'}}>Tender<br/>Rate</th>
                    <th className="border border-black px-3 py-2 text-center font-bold" style={{width: '110px'}}>Cost</th>
                    <th className="border border-black px-3 py-2 text-center font-bold" style={{width: '100px'}}>Tender<br/>Serial #</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, index) => (
                    <tr key={item.id} className="border border-black">
                      <td className="border border-black px-2 py-2 text-center">{index + 1}.</td>
                      <td className="border border-black px-3 py-2">
                        {item.nomenclature}
                        {item.specifications && (
                          <span className="text-xs block text-gray-600 mt-1">({item.specifications})</span>
                        )}
                      </td>
                      <td className="border border-black px-2 py-2 text-center">{item.quantity} {item.unit}.</td>
                      <td className="border border-black px-3 py-2 text-center">Rs.{item.unit_price.toFixed(2).replace(/\.00$/, '')}/-</td>
                      <td className="border border-black px-3 py-2 text-center">Rs.{item.total_price.toLocaleString('en-PK')}/-</td>
                      <td className="border border-black px-3 py-2 text-center text-xs">
                        {po.tender_type === 'annual-tender' ? 'Sl. in Group-II' : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals Section */}
                  <tr className="border border-black">
                    <td colSpan={4} className="border border-black px-3 py-2 text-right font-bold">Total:</td>
                    <td className="border border-black px-3 py-2 text-center font-bold">
                      Rs.{po.total_amount.toLocaleString('en-PK')}/-
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                  <tr className="border border-black">
                    <td colSpan={4} className="border border-black px-3 py-2 text-right font-bold">GST:</td>
                    <td className="border border-black px-3 py-2 text-center font-bold">
                      Rs.{Math.round(po.total_amount * 0.18).toLocaleString('en-PK')}/-
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                  <tr className="border border-black">
                    <td colSpan={4} className="border border-black px-3 py-2 text-right font-bold">Sub Total:</td>
                    <td className="border border-black px-3 py-2 text-center font-bold">
                      Rs.{Math.round(po.total_amount * 1.18).toLocaleString('en-PK')}/-
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks if any */}
            {po.remarks && (
              <div className="mb-6 text-sm">
                <p><strong>Note:</strong> {po.remarks}</p>
              </div>
            )}

            {/* Signature Section */}
            <div className="mt-16 flex justify-end">
              <div className="text-sm text-center">
                <p className="font-bold">(M. Adnan Iqbal)</p>
                <p>Assistant Director (Admn)</p>
                <p>Tele: 9206967</p>
              </div>
            </div>

            {/* System Footer - Only on Screen */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 no-print">
              <p>System Generated Document | Created: {new Date(po.created_at).toLocaleString('en-GB')} | Updated: {new Date(po.updated_at).toLocaleString('en-GB')}</p>
            </div>

          </div>
        </div>
      </div>
    </>
  );

}
