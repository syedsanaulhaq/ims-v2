import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

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
  po_detail?: string;
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

export default function EditPurchaseOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [po, setPO] = useState<PurchaseOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [poDate, setPoDate] = useState<string>('');
  const [poDetail, setPoDetail] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchPODetails(id);
    }
  }, [id]);

  const fetchPODetails = async (poId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${poId}`);
      if (!response.ok) throw new Error('Failed to fetch PO details');
      const data = await response.json();
      setPO(data);
      setPoDate(data.po_date.split('T')[0]); // Extract date only
      setPoDetail(data.po_detail || '');
      setRemarks(data.remarks || '');
    } catch (err) {
      console.error('Error fetching PO:', err);
      setError('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!po) return;

    try {
      setSaving(true);
      
      const updateData = {
        po_date: poDate,
        po_detail: poDetail,
        remarks: remarks,
        status: po.status
      };
      
      console.log('📤 Sending update:', updateData);
      
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${po.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.error || 'Failed to update PO');
      }

      const result = await response.json();
      console.log('✅ Update successful:', result);
      
      alert('✅ Purchase order updated successfully');
      navigate(`/dashboard/po/${po.id}`);
    } catch (err) {
      console.error('Error saving PO:', err);
      alert('❌ Failed to update purchase order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error || 'Purchase order not found'}</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/dashboard/purchase-orders')}
              >
                Back to POs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (po.status !== 'draft') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center text-amber-600">
              <p className="font-semibold mb-2">Cannot Edit</p>
              <p className="text-sm">Only draft purchase orders can be edited.</p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/dashboard/po/${po.id}`)}
              >
                View PO Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/dashboard/po/${po.id}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Edit Purchase Order</h1>
                <p className="text-sm text-slate-600">PO Number: {po.po_number}</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white p-6 rounded-b-lg shadow-lg space-y-6">
          
          {/* PO Information */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Vendor</label>
                  <Input value={po.vendor_name} disabled className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tender</label>
                  <Input value={po.tender_title} disabled className="mt-1 bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">PO Date</label>
                <Input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Supply Order Details</label>
                <p className="text-xs text-slate-500 mb-2">
                  This text will appear in the Supply Order section of the printed PO
                </p>
                <Textarea
                  value={poDetail}
                  onChange={(e) => setPoDetail(e.target.value)}
                  placeholder="Enter supply order details..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional remarks..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Items Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-center py-2 px-3">Quantity</th>
                      <th className="text-right py-2 px-3">Unit Price</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, index) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-3">{item.nomenclature}</td>
                        <td className="text-center py-2 px-3">{item.quantity} {item.unit}</td>
                        <td className="text-right py-2 px-3">Rs.{item.unit_price.toLocaleString()}</td>
                        <td className="text-right py-2 px-3 font-semibold">Rs.{item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="py-2 px-3 text-right">Total Amount:</td>
                      <td className="text-right py-2 px-3">Rs.{po.total_amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
