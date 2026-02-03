import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';

interface POItem {
  id: string;
  item_id: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  pending_quantity: number;
  unit_price: number;
  delivery_status: string;
}

interface DeliveryItem {
  po_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  quality_status: 'good' | 'damaged' | 'rejected' | 'partial';
  remarks?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  vendor_name: string;
  total_amount: number;
  status: string;
  tender_id: string;
  tender_type: string;
}

const ReceiveDelivery: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState('');
  const [deliveryChalan, setDeliveryChalan] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPODetails();
  }, [poId]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get PO basic info
      const poResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}`);
      if (!poResponse.ok) throw new Error('Failed to fetch PO details');
      const poData = await poResponse.json();
      setPo(poData);

      // Get PO fulfillment details
      const fulfillmentResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}/fulfillment`);
      if (!fulfillmentResponse.ok) throw new Error('Failed to fetch fulfillment data');
      const fulfillmentData = await fulfillmentResponse.json();
      const items = fulfillmentData.items;
      setPoItems(items);

      // Initialize delivery items (only pending items)
      const pendingItems = items
        .filter((item: POItem) => item.pending_quantity > 0)
        .map((item: POItem) => ({
          po_item_id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: 0,
          quality_status: 'good' as const,
          remarks: ''
        }));
      
      setDeliveryItems(pendingItems);
    } catch (err: any) {
      console.error('Error fetching PO details:', err);
      setError(err.response?.data?.error || 'Failed to load purchase/supply order details');
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryItem = (index: number, field: keyof DeliveryItem, value: any) => {
    const updated = [...deliveryItems];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryItems(updated);
  };

  const handleCreateDelivery = async () => {
    try {
      // Validate required fields
      if (!deliveryPersonnel.trim()) {
        setError('Delivery Personnel is required');
        return;
      }
      
      if (!deliveryChalan.trim()) {
        setError('Delivery Challan/Invoice Number is required');
        return;
      }

      // Validate delivery items
      const itemsToDeliver = deliveryItems.filter(item => item.quantity > 0);
      
      if (itemsToDeliver.length === 0) {
        setError('Please enter quantities for at least one item');
        return;
      }

      // Validate quantities don't exceed pending
      for (const deliveryItem of itemsToDeliver) {
        const poItem = poItems.find(pi => pi.id === deliveryItem.po_item_id);
        if (poItem && deliveryItem.quantity > poItem.pending_quantity) {
          setError(`Quantity for ${deliveryItem.item_name} exceeds pending quantity (${poItem.pending_quantity})`);
          return;
        }
      }

      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Create delivery
      const deliveryPayload = {
        delivery_date: deliveryDate,
        delivery_personnel: deliveryPersonnel,
        delivery_chalan: deliveryChalan,
        notes,
        items: itemsToDeliver.map(item => ({
          po_item_id: item.po_item_id,
          item_master_id: item.item_id,
          quantity_delivered: item.quantity,
          quality_status: item.quality_status,
          remarks: item.remarks
        }))
      };

      const createResponse = await fetch(`${getApiBaseUrl()}/deliveries/for-po/${poId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryPayload)
      });
      if (!createResponse.ok) throw new Error('Failed to create delivery');
      const createData = await createResponse.json();

      const deliveryId = createData.id;
      setSuccess(`Delivery created successfully: ${createData.delivery_number}`);

      // Confirm receipt to trigger stock transaction
      const receiveResponse = await fetch(`${getApiBaseUrl()}/deliveries/${deliveryId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_by: user?.user_id,
          receiving_date: new Date().toISOString()
        })
      });
      if (!receiveResponse.ok) throw new Error('Failed to receive delivery');
      const receiveData = await receiveResponse.json();

      setSuccess(
        `✅ Delivery received successfully!\n` +
        `Acquisition Number: ${receiveData.acquisition_number}\n` +
        `${receiveData.total_items} item(s) added to inventory`
      );

      // Navigate back to tender with POs filtered after 2 seconds
      setTimeout(() => {
        navigate(getBackPath());
      }, 2000);

    } catch (err: any) {
      console.error('Error creating delivery:', err);
      setError(err.response?.data?.error || 'Failed to create delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const getQualityBadge = (status: string) => {
    const badges = {
      good: 'bg-green-100 text-green-800',
      damaged: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      partial: 'bg-blue-100 text-blue-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getBackPath = () => {
    if (po?.tender_id) {
      return `/dashboard/purchase-orders?tenderId=${po.tender_id}`;
    }
    return '/dashboard/purchase-orders';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading purchase/supply order...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Purchase/Supply order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receive Delivery</h1>
            <p className="text-gray-600 mt-1">PO: {po.po_number}</p>
          </div>
          <button
            onClick={() => navigate(getBackPath())}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to POs
          </button>
        </div>
      </div>

      {/* PO Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Purchase/Supply Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vendor</p>
            <p className="font-medium">{po.vendor_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">PO Date</p>
            <p className="font-medium">{new Date(po.po_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-medium">Rs. {po.total_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              po.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {po.status}
            </span>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 whitespace-pre-line">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 whitespace-pre-line">{success}</p>
        </div>
      )}

      {/* Delivery Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Date *
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Personnel *
            </label>
            <input
              type="text"
              value={deliveryPersonnel}
              onChange={(e) => setDeliveryPersonnel(e.target.value)}
              placeholder="Name of person delivering goods"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Challan/Invoice Number *
            </label>
            <input
              type="text"
              value={deliveryChalan}
              onChange={(e) => setDeliveryChalan(e.target.value)}
              placeholder="Vendor's challan or invoice number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery notes"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Items to Receive */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Items to Receive</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter quantities for items being delivered. Only items with pending quantities are shown.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receiving Qty *
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Status *
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryItems.map((deliveryItem, index) => {
                const poItem = poItems.find(pi => pi.id === deliveryItem.po_item_id);
                if (!poItem) return null;

                return (
                  <tr key={deliveryItem.po_item_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {deliveryItem.item_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {poItem.ordered_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {poItem.received_quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-medium text-blue-600">
                        {poItem.pending_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={poItem.pending_quantity}
                        value={deliveryItem.quantity}
                        onChange={(e) => updateDeliveryItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={deliveryItem.quality_status}
                        onChange={(e) => updateDeliveryItem(index, 'quality_status', e.target.value)}
                        className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${getQualityBadge(deliveryItem.quality_status)}`}
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="rejected">Rejected</option>
                        <option value="partial">Partial</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={deliveryItem.remarks}
                        onChange={(e) => updateDeliveryItem(index, 'remarks', e.target.value)}
                        placeholder="Optional"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {deliveryItems.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">All items for this purchase/supply order have been fully received.</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate(getBackPath())}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateDelivery}
          disabled={submitting || deliveryItems.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing...' : 'Confirm Receipt & Update Inventory'}
        </button>
      </div>
    </div>
  );
};

export default ReceiveDelivery;
