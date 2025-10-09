import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Edit, 
  Truck,
  DollarSign,
  Plus,
  Save,
  X,
  MapPin,
  User,
  CalendarDays,
  Receipt,
  Settings
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StockTransactionItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  item_name?: string;
  nomenclature?: string;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  type: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryItem {
  id: string;
  delivery_id: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  created_at: string;
  serial_numbers?: DeliveryItemSerialNumber[];
}

interface DeliveryItemSerialNumber {
  id: string;
  delivery_id: string;
  delivery_item_id: string;
  item_master_id: string;
  serial_number: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TenderItemSelection {
  selected: boolean;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
}

interface DeliveryInfo {
  id: string;
  delivery_number: string;
  tender_id: string;
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  items: DeliveryItem[];
}

const StockAcquisitionFullPage: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tender and items state
  const [tenderInfo, setTenderInfo] = useState<any>(null);
  const [stockTransactionItems, setStockTransactionItems] = useState<StockTransactionItem[]>([]);
  const [editedItems, setEditedItems] = useState<{ [key: string]: { actual_unit_price: number; remarks?: string } }>({});
  
  // Delivery management state
  const [deliveries, setDeliveries] = useState<DeliveryInfo[]>([]);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [newDeliveryItem, setNewDeliveryItem] = useState<Record<string, TenderItemSelection>>({});
  const [showAddDeliveryItem, setShowAddDeliveryItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newSerialNotes, setNewSerialNotes] = useState('');
  const [activeTab, setActiveTab] = useState('delivery');
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());

  // Helper functions for serial number management
  const addSerialNumber = (deliveryId: string, itemId: string) => {
    if (!newSerialNumber.trim()) return;

    const newSerial: DeliveryItemSerialNumber = {
      id: Date.now().toString(),
      delivery_id: deliveryId,
      delivery_item_id: itemId,
      item_master_id: '',
      serial_number: newSerialNumber.trim(),
      notes: newSerialNotes.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDeliveries(prev => prev.map(delivery => ({
      ...delivery,
      items: delivery.items?.map(item => 
        item.id === itemId
          ? { ...item, serial_numbers: [...(item.serial_numbers || []), newSerial] }
          : item
      ) || []
    })));

    setNewSerialNumber('');
    setNewSerialNotes('');
    
    // Mark delivery as having unsaved changes
    setUnsavedChanges(prev => new Set(prev).add(deliveryId));
  };

  const removeSerialNumber = (itemId: string, serialId: string) => {
    // Find the delivery that contains this item
    const deliveryId = deliveries.find(delivery => 
      delivery.items?.some(item => item.id === itemId)
    )?.id;
    
    setDeliveries(prev => prev.map(delivery => ({
      ...delivery,
      items: delivery.items?.map(item => 
        item.id === itemId
          ? { ...item, serial_numbers: item.serial_numbers?.filter(s => s.id !== serialId) || [] }
          : item
      ) || []
    })));
    
    // Mark delivery as having unsaved changes
    if (deliveryId) {
      setUnsavedChanges(prev => new Set(prev).add(deliveryId));
    }
  };

  // Helper function to create initial delivery info
  const createInitialDeliveryInfo = useCallback((): DeliveryInfo => ({
    id: '',
    tender_id: tenderId || '',
    delivery_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_personnel: '',
    delivery_notes: '',
    delivery_chalan: '',
    chalan_file_path: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_finalized: false,
    items: []
  }), [tenderId]);

  // Memoized change handlers to prevent unnecessary re-renders
  const handleDeliveryChange = useCallback((deliveryId: string, field: keyof DeliveryInfo, value: any) => {
    setDeliveries(prev => prev.map(delivery => 
      delivery.id === deliveryId || (deliveryId === 'new' && !delivery.id)
        ? { ...delivery, [field]: value }
        : delivery
    ));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingDeliveryId(null);
    // Remove any unsaved new deliveries
    setDeliveries(prev => prev.filter(delivery => delivery.id));
  }, []);

  useEffect(() => {
    if (tenderId) {
      loadTenderDetails();
    }
  }, [tenderId]);

  const loadTenderDetails = async () => {
    if (!tenderId) return;
    
    try {
      setLoading(true);
      
      // Load stock transaction items
      const itemsResponse = await fetch(`http://localhost:3001/api/stock-acquisition/items/${tenderId}`);
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        console.log('📦 Stock transaction items loaded:', items);
        setStockTransactionItems(items);
        
        // Initialize edited items state
        const initialEdits: { [key: string]: { actual_unit_price: number; remarks?: string } } = {};
        items.forEach((item: StockTransactionItem) => {
          initialEdits[item.id] = {
            actual_unit_price: item.actual_unit_price,
            remarks: item.remarks || ''
          };
        });
        setEditedItems(initialEdits);
      }

      // Load tender info
      const tenderResponse = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      if (tenderResponse.ok) {
        const tender = await tenderResponse.json();
        setTenderInfo(tender);
      }

      // Load delivery info if exists
      console.log('🔄 Loading deliveries for tender:', tenderId);
      const deliveryResponse = await fetch(`http://localhost:3001/api/deliveries/by-tender/${tenderId}`);
      console.log('📥 Delivery response:', {
        status: deliveryResponse.status,
        ok: deliveryResponse.ok,
        url: `http://localhost:3001/api/deliveries/by-tender/${tenderId}`
      });
      
      if (deliveryResponse.ok) {
        const deliveriesData = await deliveryResponse.json();
        console.log('📦 Raw delivery data:', deliveriesData);
        
        // Ensure we always have an array
        const deliveriesArray = Array.isArray(deliveriesData) ? deliveriesData : [deliveriesData];
        console.log('✅ Processed deliveries array:', deliveriesArray);
        
        // Debug delivery finalization status
        deliveriesArray.forEach((delivery, index) => {
          console.log(`🔒 Delivery ${index + 1} finalization status:`, {
            id: delivery.id,
            delivery_number: delivery.delivery_number,
            is_finalized: delivery.is_finalized,
            finalized_at: delivery.finalized_at,
            finalized_by: delivery.finalized_by
          });
        });
        
        setDeliveries(deliveriesArray);
      } else {
        const errorText = await deliveryResponse.text();
        console.log('❌ Failed to load deliveries:', errorText);
        setDeliveries([]);
      }
      
    } catch (err) {
      console.error('❌ Error loading tender details:', err);
      setError('Failed to load tender details');
    } finally {
      setLoading(false);
    }
  };

  const saveAllItemPrices = async () => {
    try {
      const updates = Object.entries(editedItems).map(([itemId, data]) => ({
        id: itemId,
        actual_unit_price: data.actual_unit_price,
        remarks: data.remarks,
        pricing_confirmed: true
      }));

      const response = await fetch('http://localhost:3001/api/stock-acquisition/update-multiple-prices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        await loadTenderDetails();
        alert('All item prices updated successfully!');
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (err) {
      console.error('❌ Error updating prices:', err);
      alert('Failed to update prices');
    }
  };

  const updateItemPrice = (itemId: string, field: 'actual_unit_price' | 'remarks', value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'actual_unit_price' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const saveDeliveryInfo = async (specificDeliveryId?: string) => {
    // If a specific delivery ID is provided, use that; otherwise use the editing one
    const targetDeliveryId = specificDeliveryId || editingDeliveryId;
    const currentDelivery = deliveries.find(d => d.id === targetDeliveryId || (!d.id && targetDeliveryId === 'new'));
    
    console.log('🔄 Starting save delivery info...', {
      currentDelivery,
      editingDeliveryId,
      specificDeliveryId,
      targetDeliveryId,
      tenderId,
      hasCurrentDelivery: !!currentDelivery,
      hasTenderId: !!tenderId
    });

    if (!currentDelivery || !tenderId) {
      console.error('❌ Missing required data:', { currentDelivery: !!currentDelivery, tenderId: !!tenderId });
      alert('Missing delivery information or tender ID');
      return;
    }

    try {
      const url = currentDelivery.id 
        ? `http://localhost:3001/api/deliveries/${currentDelivery.id}`
        : 'http://localhost:3001/api/deliveries';
      
      const method = currentDelivery.id ? 'PUT' : 'POST';
      
      console.log('📡 Making request:', { url, method, currentDelivery });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentDelivery,
          delivery_number: parseInt(currentDelivery.delivery_number) || 0,
          tender_id: tenderId
        }),
      });

      console.log('📥 Response received:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText 
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Save successful:', result);
        
        // Save delivery items if there are any
        if (currentDelivery.items && currentDelivery.items.length > 0) {
          console.log('💾 Saving delivery items...', currentDelivery.items);
          
          const deliveryId = currentDelivery.id || result.id;
          const itemsResponse = await fetch('http://localhost:3001/api/delivery-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              delivery_id: deliveryId,
              items: currentDelivery.items.map(item => ({
                item_master_id: item.item_master_id,
                item_name: item.item_name,
                delivery_qty: item.delivery_qty
              }))
            }),
          });

          if (itemsResponse.ok) {
            const itemsResult = await itemsResponse.json();
            console.log('✅ Delivery items saved:', itemsResult);
          } else {
            const itemsError = await itemsResponse.text();
            console.error('❌ Failed to save delivery items:', itemsError);
            alert(`Delivery saved but failed to save items: ${itemsError}`);
          }
        }
        
        setEditingDeliveryId(null);
        
        // Clear unsaved changes for this delivery
        if (currentDelivery.id) {
          setUnsavedChanges(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentDelivery.id!);
            return newSet;
          });
        }
        
        alert('Delivery information saved successfully!');
        
        // Force reload to get updated data
        console.log('🔄 Reloading tender details after save...');
        await loadTenderDetails();
        console.log('✅ Reload complete, current deliveries count:', deliveries.length);
      } else {
        const errorText = await response.text();
        console.error('❌ Save failed:', { status: response.status, error: errorText });
        
        // Parse error response to provide better user feedback
        let errorMessage = 'Failed to save delivery information';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.reason === 'delivery_finalized') {
            errorMessage = '❌ Cannot save changes: This delivery has been finalized and cannot be modified.';
          } else if (errorData.error) {
            errorMessage = `❌ ${errorData.error}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, use the raw error text
          errorMessage = `❌ ${errorText}`;
        }
        
        alert(errorMessage);
        return; // Don't throw error, just return to prevent further processing
      }
    } catch (err) {
      console.error('❌ Error saving delivery info:', err);
      
      // Provide user-friendly error message
      let userMessage = 'Failed to save delivery information. Please try again.';
      if (err.message.includes('delivery_finalized')) {
        userMessage = '❌ Cannot save changes: This delivery has been finalized and cannot be modified.';
      } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        userMessage = '❌ Network error: Please check your connection and try again.';
      }
      
      alert(userMessage);
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

  const getPricingStatusBadge = (confirmed: boolean) => {
    if (confirmed) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmed
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading stock acquisition details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tenderId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tender ID provided</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/stock-acquisition-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Stock Acquisition & Delivery Management
            </h1>
            {tenderInfo && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span><strong>Tender:</strong> {tenderInfo.title}</span>
                <span><strong>Number:</strong> {tenderInfo.tender_number || tenderInfo.reference_number}</span>
                <span><strong>Type:</strong> {tenderInfo.tender_spot_type || 'Contract/Tender'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="delivery">Delivery Management</TabsTrigger>
          <TabsTrigger value="pricing">Item Pricing</TabsTrigger>
        </TabsList>
        
        {/* Delivery Management Tab */}
        <TabsContent value="delivery" className="space-y-6">
          {/* Deliveries List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Deliveries
                  <Badge variant="outline">{deliveries.length} deliveries</Badge>
                  {/* Debug info */}
                  <Badge variant="secondary" className="text-xs">
                    Tender: {tenderId?.slice(-8)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      loadTenderDetails();
                    }}
                  >
                    Refresh
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('➕ Creating new delivery...');
                      const newDelivery = createInitialDeliveryInfo();
                      console.log('📝 New delivery object:', newDelivery);
                      setDeliveries(prev => {
                        const updated = [...prev, newDelivery];
                        console.log('📦 Updated deliveries array:', updated);
                        return updated;
                      });
                      setEditingDeliveryId('new');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Delivery
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Debug info */}
              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>Debug Info:</strong> 
                Deliveries in state: {deliveries.length} | 
                Editing ID: {editingDeliveryId || 'none'} | 
                Tender ID: {tenderId}
                {deliveries.length > 0 && (
                  <div className="mt-1">
                    Delivery IDs: {deliveries.map(d => d.id || 'new').join(', ')}
                  </div>
                )}
              </div>
              
              {deliveries.length > 0 ? (
                <div className="space-y-4">
                  {deliveries.map((delivery, index) => {
                    const isEditing = editingDeliveryId === delivery.id || (editingDeliveryId === 'new' && !delivery.id);
                    
                    return (
                      <div key={delivery.id || `new-${index}`} className="border rounded-lg p-4">
                        {isEditing ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <h4 className="font-medium text-lg">
                              {delivery.id ? 'Edit Delivery' : 'New Delivery'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="delivery_number">Delivery Number</Label>
                                <Input
                                  type="number"
                                  value={delivery.delivery_number || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'delivery_number', e.target.value)}
                                  placeholder="123"
                                />
                              </div>
                              <div>
                                <Label htmlFor="delivery_date">Delivery Date</Label>
                                <Input
                                  type="date"
                                  value={delivery.delivery_date?.split('T')[0] || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'delivery_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="delivery_personnel">Personnel</Label>
                                <Input
                                  value={delivery.delivery_personnel || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'delivery_personnel', e.target.value)}
                                  placeholder="Delivery Person/Company"
                                />
                              </div>
                              <div>
                                <Label htmlFor="delivery_chalan">Chalan Number</Label>
                                <Input
                                  value={delivery.delivery_chalan || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'delivery_chalan', e.target.value)}
                                  placeholder="Chalan Number"
                                />
                              </div>
                              <div>
                                <Label htmlFor="chalan_file_path">Chalan File</Label>
                                <Input
                                  value={delivery.chalan_file_path || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'chalan_file_path', e.target.value)}
                                  placeholder="File path or URL"
                                />
                              </div>
                              <div>
                                <Label htmlFor="is_finalized">Status</Label>
                                <Select
                                  value={delivery.is_finalized ? 'true' : 'false'}
                                  onValueChange={(value) => handleDeliveryChange(delivery.id || 'new', 'is_finalized', value === 'true')}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="false">Pending</SelectItem>
                                    <SelectItem value="true">Finalized</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3">
                                <Label htmlFor="delivery_notes">Notes</Label>
                                <Textarea
                                  value={delivery.delivery_notes || ''}
                                  onChange={(e) => handleDeliveryChange(delivery.id || 'new', 'delivery_notes', e.target.value)}
                                  placeholder="Delivery notes..."
                                  rows={2}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => saveDeliveryInfo()} 
                                size="sm"
                                disabled={delivery.is_finalized}
                                title={delivery.is_finalized ? "Cannot save: Delivery is finalized" : "Save delivery information"}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button variant="outline" onClick={handleCancelEdit} size="sm">
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-lg">Delivery #{delivery.delivery_number}</h4>
                                  {unsavedChanges.has(delivery.id) && (
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Unsaved changes"></div>
                                  )}
                                </div>
                                <Badge variant={delivery.is_finalized ? 'default' : 'secondary'}>
                                  {delivery.is_finalized ? 'Finalized' : 'Pending'}
                                </Badge>
                                {unsavedChanges.has(delivery.id) && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    Unsaved Changes
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {/* Show save button if there are unsaved changes */}
                                {unsavedChanges.has(delivery.id) && (
                                  <Button 
                                    size="sm"
                                    onClick={() => saveDeliveryInfo(delivery.id)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    disabled={delivery.is_finalized}
                                    title={delivery.is_finalized ? "Cannot save: Delivery is finalized" : "Save unsaved changes"}
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    Save Changes
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingDeliveryId(delivery.id)}
                                  disabled={delivery.is_finalized}
                                  title={delivery.is_finalized ? "Cannot edit: Delivery is finalized" : "Edit delivery information"}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-gray-500">Date</div>
                                <div className="font-medium">{formatDate(delivery.delivery_date)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Personnel</div>
                                <div className="font-medium">{delivery.delivery_personnel || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Chalan</div>
                                <div className="font-medium">{delivery.delivery_chalan || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Items</div>
                                <div className="font-medium">{delivery.items?.length || 0} items</div>
                              </div>
                            </div>

                            {delivery.delivery_notes && (
                              <div className="text-sm text-gray-600 italic">
                                "{delivery.delivery_notes}"
                              </div>
                            )}
                            
                            {/* Delivery Items for this delivery */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium">Delivery Items</h5>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setCurrentDeliveryId(delivery.id);
                                    setShowAddDeliveryItem(true);
                                  }}
                                  disabled={delivery.is_finalized}
                                  title={delivery.is_finalized ? "Cannot add items: Delivery is finalized" : "Add items to this delivery"}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Item
                                </Button>
                              </div>
                              
                              {delivery.items && delivery.items.length > 0 ? (
                                <div className="space-y-3">
                                  {delivery.items.map((item) => (
                                    <div key={item.id} className="border rounded-lg">
                                      <div className="flex items-center justify-between p-3 bg-gray-50">
                                        <div className="flex-1">
                                          <div className="font-medium">{item.item_name}</div>
                                          <div className="text-sm text-gray-600">
                                            Qty: {item.delivery_qty} | Serials: {item.serial_numbers?.length || 0}
                                          </div>
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                                        >
                                          <Settings className="w-4 h-4 mr-1" />
                                          {editingItemId === item.id ? 'Close' : 'Manage'}
                                        </Button>
                                      </div>
                                      
                                      {/* Serial Numbers Management */}
                                      {editingItemId === item.id && (
                                        <div className="p-4 border-t bg-white">
                                          <h6 className="font-medium mb-3">Serial Numbers ({item.serial_numbers?.length || 0})</h6>
                                          <div className="space-y-2 mb-4">
                                            {item.serial_numbers?.map((serial) => (
                                              <div key={serial.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                <span className="text-sm font-mono flex-1">{serial.serial_number}</span>
                                                {serial.notes && (
                                                  <span className="text-xs text-gray-500">- {serial.notes}</span>
                                                )}
                                                <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  className="h-6 px-2"
                                                  onClick={() => removeSerialNumber(item.id, serial.id)}
                                                >
                                                  <X className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex gap-2">
                                            <Input 
                                              placeholder="Serial number" 
                                              className="flex-1" 
                                              value={newSerialNumber}
                                              onChange={(e) => setNewSerialNumber(e.target.value)}
                                            />
                                            <Input 
                                              placeholder="Notes (optional)" 
                                              className="flex-1" 
                                              value={newSerialNotes}
                                              onChange={(e) => setNewSerialNotes(e.target.value)}
                                            />
                                            <Button 
                                              size="sm"
                                              onClick={() => addSerialNumber(delivery.id, item.id)}
                                              disabled={!newSerialNumber.trim() || delivery.is_finalized}
                                              title={delivery.is_finalized ? "Cannot add serial: Delivery is finalized" : "Add serial number"}
                                            >
                                              <Plus className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                  <p className="text-sm">No items in this delivery</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No deliveries created yet</h3>
                  <p>Create delivery records to track item deliveries for this tender</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          {stockTransactionItems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Item Pricing & Cost Management
                    <Badge variant="outline">{stockTransactionItems.length} items</Badge>
                  </div>
                  <Button onClick={saveAllItemPrices} size="lg">
                    <Save className="w-4 h-4 mr-2" />
                    Save All Prices
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Estimated Price</TableHead>
                        <TableHead>Actual Price</TableHead>
                        <TableHead>Qty Received</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockTransactionItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.item_name || item.nomenclature}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(item.estimated_unit_price)}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editedItems[item.id]?.actual_unit_price || 0}
                              onChange={(e) => updateItemPrice(item.id, 'actual_unit_price', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-center font-medium">{item.total_quantity_received}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency((editedItems[item.id]?.actual_unit_price || 0) * item.total_quantity_received)}
                            </div>
                          </TableCell>
                          <TableCell>{getPricingStatusBadge(item.pricing_confirmed)}</TableCell>
                          <TableCell>
                            <Input
                              value={editedItems[item.id]?.remarks || ''}
                              onChange={(e) => updateItemPrice(item.id, 'remarks', e.target.value)}
                              placeholder="Add remarks..."
                              className="w-48"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Pricing Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Total Estimated Value</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          stockTransactionItems.reduce((sum, item) => 
                            sum + (item.estimated_unit_price * item.total_quantity_received), 0
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Total Actual Value</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          stockTransactionItems.reduce((sum, item) => 
                            sum + ((editedItems[item.id]?.actual_unit_price || 0) * item.total_quantity_received), 0
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Price Variance</div>
                      <div className="text-xl font-bold">
                        {(() => {
                          const estimated = stockTransactionItems.reduce((sum, item) => 
                            sum + (item.estimated_unit_price * item.total_quantity_received), 0
                          );
                          const actual = stockTransactionItems.reduce((sum, item) => 
                            sum + ((editedItems[item.id]?.actual_unit_price || 0) * item.total_quantity_received), 0
                          );
                          const variance = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;
                          return (
                            <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No pricing items found</h3>
              <p>Stock transaction items will appear here once the tender is finalized</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Delivery Item Modal */}
      <Dialog open={showAddDeliveryItem} onOpenChange={setShowAddDeliveryItem}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items to Delivery</DialogTitle>
            <DialogDescription>
              Select items from this tender to add to the delivery with quantities
            </DialogDescription>
          </DialogHeader>
          
          {stockTransactionItems.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Select items from the tender to include in this delivery. You can specify how many of each item are being delivered.
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-center">Total Delivered</TableHead>
                      <TableHead className="text-center">This Delivery</TableHead>
                      <TableHead className="text-center">Tender Remaining</TableHead>
                      <TableHead className="text-center">Delivery Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockTransactionItems.map((tenderItem) => {
                      // Calculate delivered quantities across all deliveries
                      const deliveredQty = deliveries.reduce((total, delivery) => {
                        const deliveryItemQty = delivery.items?.find(
                          item => item.item_master_id === tenderItem.item_master_id
                        )?.delivery_qty || 0;
                        return total + deliveryItemQty;
                      }, 0);
                      
                      // Get current delivery quantity for this specific delivery being edited
                      const currentDelivery = deliveries.find(d => d.id === currentDeliveryId) || 
                                             deliveries.find(d => !d.id && editingDeliveryId === 'new') || 
                                             deliveries[0];
                      const currentDeliveryQty = currentDelivery?.items?.find(
                        item => item.item_master_id === tenderItem.item_master_id
                      )?.delivery_qty || 0;
                      
                      // Total received quantity is the sum of all delivery quantities for this item
                      const totalReceivedQty = deliveredQty;
                      const remainingQty = tenderItem.total_quantity_received - deliveredQty;
                      const isFullyDelivered = remainingQty <= 0;
                      
                      return (
                        <TableRow key={tenderItem.id} className={isFullyDelivered ? 'bg-gray-50 opacity-60' : ''}>
                          <TableCell>
                            <input
                              type="checkbox"
                              disabled={isFullyDelivered}
                              checked={newDeliveryItem[tenderItem.id]?.selected || false}
                              onChange={(e) => {
                                setNewDeliveryItem(prev => ({
                                  ...prev,
                                  [tenderItem.id]: {
                                    ...prev[tenderItem.id],
                                    selected: e.target.checked,
                                    item_master_id: tenderItem.item_master_id,
                                    item_name: tenderItem.item_name || tenderItem.nomenclature || 'Unknown Item',
                                    delivery_qty: e.target.checked ? Math.min(1, remainingQty) : 0
                                  }
                                }));
                              }}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{tenderItem.item_name || tenderItem.nomenclature}</div>
                            <div className="text-sm text-gray-500">ID: {tenderItem.item_master_id}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {totalReceivedQty}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={currentDeliveryQty > 0 ? 'default' : 'secondary'}>
                              {currentDeliveryQty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={isFullyDelivered ? 'destructive' : remainingQty < tenderItem.total_quantity_received ? 'secondary' : 'default'}>
                              {remainingQty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {newDeliveryItem[tenderItem.id]?.selected && (
                              <Input
                                type="number"
                                min="1"
                                max={remainingQty}
                                value={newDeliveryItem[tenderItem.id]?.delivery_qty || 1}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0;
                                  setNewDeliveryItem(prev => ({
                                    ...prev,
                                    [tenderItem.id]: {
                                      ...prev[tenderItem.id],
                                      delivery_qty: Math.min(qty, remainingQty)
                                    }
                                  }));
                                }}
                                className="w-20 text-center"
                                placeholder="Qty"
                              />
                            )}
                            {isFullyDelivered && (
                              <span className="text-sm text-gray-500">Fully delivered</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No tender items found</h3>
              <p>This tender doesn't have any items to deliver</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={async () => {
                // Add selected items to the delivery
                const selectedItems = Object.values(newDeliveryItem).filter(item => item.selected);
                
                if (selectedItems.length === 0) {
                  alert('Please select at least one item to add to the delivery');
                  return;
                }
                
                const currentDelivery = deliveries.find(d => d.id === currentDeliveryId) || 
                                       deliveries.find(d => !d.id && editingDeliveryId === 'new') || 
                                       deliveries[0];
                
                if (currentDelivery) {
                  const newItems = selectedItems.map(item => ({
                    id: Date.now().toString() + Math.random(),
                    delivery_id: currentDelivery.id || '',
                    item_master_id: item.item_master_id || '',
                    item_name: item.item_name || '',
                    delivery_qty: item.delivery_qty || 0,
                    created_at: new Date().toISOString(),
                    serial_numbers: []
                  }));

                  // Update local state
                  const updatedDelivery = { ...currentDelivery, items: [...(currentDelivery.items || []), ...newItems] };
                  
                  setDeliveries(prev => prev.map(delivery => 
                    delivery === currentDelivery ? updatedDelivery : delivery
                  ));

                  // Auto-save if this is an existing delivery (has ID)
                  if (currentDelivery.id) {
                    try {
                      console.log('💾 Auto-saving delivery items...', updatedDelivery.items);
                      
                      const itemsResponse = await fetch('http://localhost:3001/api/delivery-items', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          delivery_id: currentDelivery.id,
                          items: updatedDelivery.items.map(item => ({
                            item_master_id: item.item_master_id,
                            item_name: item.item_name,
                            delivery_qty: item.delivery_qty
                          }))
                        }),
                      });

                      if (itemsResponse.ok) {
                        const itemsResult = await itemsResponse.json();
                        console.log('✅ Delivery items auto-saved:', itemsResult);
                        alert('Items added and saved successfully!');
                        
                        // Clear unsaved changes since auto-save succeeded
                        setUnsavedChanges(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(currentDelivery.id);
                          return newSet;
                        });
                      } else {
                        const itemsError = await itemsResponse.text();
                        console.error('❌ Failed to auto-save delivery items:', itemsError);
                        alert('Items added to delivery but failed to save. Please click Save to try again.');
                        
                        // Mark as having unsaved changes since auto-save failed
                        setUnsavedChanges(prev => new Set(prev).add(currentDelivery.id));
                      }
                    } catch (error) {
                      console.error('❌ Error auto-saving delivery items:', error);
                      alert('Items added to delivery but failed to save. Please click Save to try again.');
                      
                      // Mark as having unsaved changes since auto-save failed
                      setUnsavedChanges(prev => new Set(prev).add(currentDelivery.id));
                    }
                  } else {
                    alert('Items added to delivery! Click Save to persist changes.');
                    
                    // Mark as having unsaved changes for new deliveries
                    if (currentDelivery.id) {
                      setUnsavedChanges(prev => new Set(prev).add(currentDelivery.id));
                    }
                  }
                }

                setNewDeliveryItem({});
                setShowAddDeliveryItem(false);
                setCurrentDeliveryId(null);
              }}
              className="flex-1"
              disabled={!Object.values(newDeliveryItem).some(item => item.selected)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Selected Items ({Object.values(newDeliveryItem).filter(item => item.selected).length})
            </Button>
            <Button variant="outline" onClick={() => {
              setNewDeliveryItem({});
              setShowAddDeliveryItem(false);
              setCurrentDeliveryId(null);
            }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default StockAcquisitionFullPage;