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
      fetchPODetails(parseInt(id));
    }
  }, [id]);

  const fetchPODetails = async (poId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-orders/${poId}`);
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
      const response = await fetch(`/api/purchase-orders/${po.id}`, {
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
          <Button variant="ghost" onClick={() => navigate('/dashboard/purchase-orders')} className="mb-4">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start print:hidden">
          <Button variant="ghost" onClick={() => navigate('/dashboard/purchase-orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to POs
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* PO Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{po.po_number}</h1>
                <p className="text-slate-600 mt-1">
                  PO Date: {new Date(po.po_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(po.status)} className="text-lg px-4 py-2">
                  {po.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tender & Vendor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tender Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Title</p>
                <p className="font-semibold text-slate-900">{po.tender_title}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Type</p>
                <Badge className={getTenderTypeColor(po.tender_type)}>
                  {po.tender_type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-600">Tender ID</p>
                <p className="font-mono text-slate-900">{po.tender_id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Vendor Name</p>
                <p className="font-semibold text-slate-900">{po.vendor_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Vendor Code</p>
                <p className="font-mono text-slate-900">{po.vendor_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Vendor ID</p>
                <p className="font-mono text-slate-900">{po.vendor_id}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items ({po.items.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Item</th>
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 font-semibold">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {po.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{item.nomenclature}</p>
                          {item.specifications && (
                            <p className="text-xs text-slate-500 mt-1">{item.specifications}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{item.category_name}</td>
                      <td className="py-3 px-4 text-right font-medium">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right font-medium">Rs {item.unit_price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        Rs {item.total_price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right font-bold">
                      TOTAL PO VALUE:
                    </td>
                    <td className="py-3 px-4 text-right text-xl font-bold text-green-600">
                      Rs {po.total_amount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Status & Remarks */}
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
                  className="print:hidden"
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
  );
}
