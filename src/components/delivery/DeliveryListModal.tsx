import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, Calendar, FileText, User } from 'lucide-react';

interface Delivery {
  id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  delivery_date: string;
  delivery_status: string;
  received_by: string;
  receiving_date: string;
  received_by_name?: string;
  notes?: string;
  item_count: number;
  total_quantity: number;
  good_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;
  vendor_name: string;
}

interface DeliveryListModalProps {
  poId: string;
  poNumber: string;
  vendorName: string;
  onClose: () => void;
}

export default function DeliveryListModal({ poId, poNumber, vendorName, onClose }: DeliveryListModalProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [poId]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/deliveries/by-po/${poId}`);
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      const data = await response.json();
      setDeliveries(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'partial': 'bg-blue-100 text-blue-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Loading deliveries...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Deliveries for PO: {poNumber}</h2>
            <p className="text-sm text-gray-600">Vendor: {vendorName}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {deliveries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No deliveries recorded yet for this PO</p>
              <p className="text-sm text-gray-400 mt-2">Deliveries will appear here once items are received</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {delivery.delivery_number}
                            </h3>
                            <Badge className={getStatusBadge(delivery.delivery_status)}>
                              {delivery.delivery_status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Delivery Date:</span>
                          <span className="font-medium">
                            {new Date(delivery.delivery_date).toLocaleDateString()}
                          </span>
                        </div>

                        {delivery.receiving_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Received Date:</span>
                            <span className="font-medium">
                              {new Date(delivery.receiving_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {delivery.received_by_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Received By:</span>
                            <span className="font-medium">{delivery.received_by_name}</span>
                          </div>
                        )}

                        {delivery.notes && (
                          <div className="text-sm">
                            <span className="text-gray-600">Notes:</span>
                            <p className="text-gray-800 mt-1">{delivery.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right Column - Summary */}
                      <div className="space-y-3">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Delivery Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Total Items:</span>
                              <Badge variant="secondary">{delivery.item_count}</Badge>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Total Quantity:</span>
                              <span className="font-semibold">{delivery.total_quantity}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-green-600">Good:</span>
                              <span className="font-semibold text-green-700">{delivery.good_quantity}</span>
                            </div>
                            {delivery.damaged_quantity > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-yellow-600">Damaged:</span>
                                <span className="font-semibold text-yellow-700">{delivery.damaged_quantity}</span>
                              </div>
                            )}
                            {delivery.rejected_quantity > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-red-600">Rejected:</span>
                                <span className="font-semibold text-red-700">{delivery.rejected_quantity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Summary Footer */}
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Total: {deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items Received:</span>
                      <span className="ml-2 font-semibold">
                        {deliveries.reduce((sum, d) => sum + d.total_quantity, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
