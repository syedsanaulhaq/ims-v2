import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Package, 
  Truck,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Types
interface TenderItem {
  id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_amount: number;
  specifications: string;
  remarks: string;
}

interface DeliveryItem {
  id: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  serial_numbers: SerialNumber[];
}

interface SerialNumber {
  id: string;
  serial_number: string;
  notes?: string;
}

interface Delivery {
  id: string;
  delivery_number: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes: string;
  delivery_chalan: string;
  items: DeliveryItem[];
  is_finalized: boolean;
}

interface TenderInfo {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
}

const TenderManagementPage: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [tenderInfo, setTenderInfo] = useState<TenderInfo | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  
  // Collapsible states
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});
  
  // New delivery state
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    delivery_number: '',
    delivery_personnel: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_notes: '',
    delivery_chalan: ''
  });

  // Load data
  useEffect(() => {
    if (tenderId) {
      loadTenderData();
    }
  }, [tenderId]);

  const loadTenderData = async () => {
    try {
      setLoading(true);
      
      // Load tender info
      const tenderResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      if (tenderResponse.ok) {
        const tender = await tenderResponse.json();
        setTenderInfo(tender);
        setTenderItems(tender.items || []);
        
        // Initialize editing prices
        const prices: Record<string, number> = {};
        tender.items?.forEach((item: TenderItem) => {
          prices[item.id] = item.actual_unit_price;
        });
        setEditingPrices(prices);
      }

      // Load deliveries
      const deliveryResponse = await fetch(`http://localhost:3001/api/deliveries/by-tender/${tenderId}`);
      if (deliveryResponse.ok) {
        const deliveriesData = await deliveryResponse.json();
        const deliveriesArray = Array.isArray(deliveriesData) ? deliveriesData : [deliveriesData];
        setDeliveries(deliveriesArray);
      } else {
        setDeliveries([]);
      }
      
    } catch (error) {
      console.error('Error loading tender data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/stock-acquisition/update-price/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          actual_unit_price: newPrice, 
          pricing_confirmed: true 
        })
      });

      if (response.ok) {
        setTenderItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, actual_unit_price: newPrice }
            : item
        ));
        alert('Price updated successfully!');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Failed to update price');
    }
  };

  const createNewDelivery = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDelivery,
          tender_id: tenderId,
          delivery_number: parseInt(newDelivery.delivery_number)
        })
      });

      if (response.ok) {
        const result = await response.json();
        await loadTenderData(); // Reload to get the new delivery
        setShowNewDelivery(false);
        setNewDelivery({
          delivery_number: '',
          delivery_personnel: '',
          delivery_date: new Date().toISOString().split('T')[0],
          delivery_notes: '',
          delivery_chalan: ''
        });
        alert('Delivery created successfully!');
      }
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Failed to create delivery');
    }
  };

  const addItemToDelivery = (deliveryId: string, tenderItem: TenderItem) => {
    const quantity = prompt(`How many ${tenderItem.nomenclature} to add to this delivery?`);
    if (!quantity || isNaN(parseInt(quantity))) return;

    // TODO: Implement add item to delivery
    console.log('Adding item to delivery:', { deliveryId, tenderItem, quantity });
  };

  const removeItemFromDelivery = (deliveryId: string, itemId: string) => {
    if (confirm('Remove this item from the delivery?')) {
      // TODO: Implement remove item from delivery
      console.log('Removing item from delivery:', { deliveryId, itemId });
    }
  };

  const addSerialNumber = (deliveryId: string, itemId: string) => {
    const serialNumber = prompt('Enter serial number:');
    if (!serialNumber) return;

    // TODO: Implement add serial number
    console.log('Adding serial number:', { deliveryId, itemId, serialNumber });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading tender information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/dashboard/tenders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tenders
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{tenderInfo?.title}</h1>
          <p className="text-gray-600">{tenderInfo?.reference_number}</p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {tenderInfo?.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Deliveries */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Deliveries ({deliveries.length})
                </CardTitle>
                <Button onClick={() => setShowNewDelivery(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Delivery
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Delivery Form */}
              {showNewDelivery && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Create New Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Delivery Number</Label>
                        <Input
                          value={newDelivery.delivery_number}
                          onChange={(e) => setNewDelivery(prev => ({...prev, delivery_number: e.target.value}))}
                          placeholder="e.g., 1001"
                        />
                      </div>
                      <div>
                        <Label>Personnel</Label>
                        <Input
                          value={newDelivery.delivery_personnel}
                          onChange={(e) => setNewDelivery(prev => ({...prev, delivery_personnel: e.target.value}))}
                          placeholder="Delivery person"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={newDelivery.delivery_date}
                          onChange={(e) => setNewDelivery(prev => ({...prev, delivery_date: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label>Chalan Number</Label>
                        <Input
                          value={newDelivery.delivery_chalan}
                          onChange={(e) => setNewDelivery(prev => ({...prev, delivery_chalan: e.target.value}))}
                          placeholder="Chalan #"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={newDelivery.delivery_notes}
                        onChange={(e) => setNewDelivery(prev => ({...prev, delivery_notes: e.target.value}))}
                        placeholder="Delivery notes..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createNewDelivery} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewDelivery(false)} size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Existing Deliveries */}
              {deliveries.map((delivery) => (
                <Collapsible
                  key={delivery.id}
                  open={openDeliveries[delivery.id]}
                  onOpenChange={(open) => setOpenDeliveries(prev => ({...prev, [delivery.id]: open}))}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {openDeliveries[delivery.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <div>
                              <h3 className="font-medium">Delivery #{delivery.delivery_number}</h3>
                              <p className="text-sm text-gray-600">{delivery.delivery_personnel} - {formatDate(delivery.delivery_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={delivery.is_finalized ? 'default' : 'secondary'}>
                              {delivery.is_finalized ? 'Finalized' : 'Pending'}
                            </Badge>
                            <Badge variant="outline">
                              {delivery.items?.length || 0} items
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Delivery Details */}
                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded">
                          <div>
                            <span className="text-sm text-gray-600">Chalan:</span>
                            <p className="font-medium">{delivery.delivery_chalan}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Notes:</span>
                            <p className="font-medium">{delivery.delivery_notes}</p>
                          </div>
                        </div>

                        {/* Delivery Items */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Items in this delivery</h4>
                            {!delivery.is_finalized && (
                              <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Item
                              </Button>
                            )}
                          </div>
                          
                          {delivery.items && delivery.items.length > 0 ? (
                            <div className="space-y-2">
                              {delivery.items.map((item) => (
                                <div key={item.id} className="border rounded p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium">{item.item_name}</h5>
                                      <p className="text-sm text-gray-600">Quantity: {item.delivery_qty}</p>
                                    </div>
                                    {!delivery.is_finalized && (
                                      <div className="flex gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addSerialNumber(delivery.id, item.id)}
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeItemFromDelivery(delivery.id, item.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Serial Numbers */}
                                  {item.serial_numbers && item.serial_numbers.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-sm font-medium mb-1">Serial Numbers:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {item.serial_numbers.map((serial) => (
                                          <Badge key={serial.id} variant="outline" className="text-xs">
                                            {serial.serial_number}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No items in this delivery</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}

              {deliveries.length === 0 && !showNewDelivery && (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">No deliveries yet</h3>
                  <p className="text-sm">Create your first delivery to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tender Items */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Tender Items ({tenderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenderItems.map((item) => (
                  <div key={item.id} className="border rounded p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.nomenclature}</h3>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.specifications}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* Add to available deliveries */}}
                          title="Add to delivery"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* Remove from tender */}}
                          title="Remove from tender"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-sm text-gray-600">Estimated Price:</span>
                        <p className="font-medium">{formatCurrency(item.estimated_unit_price)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Actual Price:</span>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editingPrices[item.id] || 0}
                            onChange={(e) => setEditingPrices(prev => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateItemPrice(item.id, editingPrices[item.id])}
                            disabled={editingPrices[item.id] === item.actual_unit_price}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TenderManagementPage;