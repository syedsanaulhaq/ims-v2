import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';
import { useSession } from '../contexts/SessionContext';
import erpDatabaseService from '@/services/erpDatabaseService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, Minus } from 'lucide-react';

interface SelectedItem {
  item_master_id: number | string;
  item_nomenclature: string;
  item_code: string;
  category_name: string;
  subcategory_name: string;
  requested_quantity: number;
  unit_of_measurement: string;
  estimated_unit_price?: number;
  notes?: string;
}

interface ItemMaster {
  id: number;
  vItemNomenclature: string;
  vItemCode: string;
  vCategoryName: string;
  vSubCategoryName: string;
  vUnitOfMeasure: string;
}

const NewProcurementRequest: React.FC = () => {
    // Custom item state
    const [customItemName, setCustomItemName] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState(1);
    const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  // Debug: log user object
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Session user:', user);
  }, [user]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wings, setWings] = useState<any[]>([]);
  const [wingName, setWingName] = useState('');
  const [wingsError, setWingsError] = useState('');

  // Form fields
  const [priority, setPriority] = useState('normal');
  const [justification, setJustification] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Item selection
  const [itemsLibrary, setItemsLibrary] = useState<ItemMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);


  useEffect(() => {
    fetchItemsLibrary();
    fetchWingsAndSetWingName();
  }, []);

  const fetchWingsAndSetWingName = async () => {
    try {
      const wingsData = await erpDatabaseService.getActiveWings();
      setWings(wingsData);
      // Debug: log wings data
      // eslint-disable-next-line no-console
      console.log('Wings data:', wingsData);
      // Try multiple possible user wing fields
      const wingId = user?.intWingID || user?.wing_id || user?.WingID;
      if (wingId) {
        const foundWing = wingsData.find((w: any) => w.Id === wingId || w.id === wingId);
        setWingName(foundWing ? foundWing.Name || foundWing.name : 'Unknown Wing');
      } else {
        setWingName('Unknown Wing');
        setWingsError('No wing ID found in user session.');
      }
    } catch (err) {
      setWingName('Unknown Wing');
      setWingsError('Failed to load wings.');
    }
  };
  const [itemsError, setItemsError] = useState('');

  const fetchItemsLibrary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/items-master`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend fields to frontend ItemMaster structure
        const mappedItems = (data.items || []).map((item: any) => ({
          id: item.id,
          vItemNomenclature: item.nomenclature,
          vItemCode: item.item_code,
          vCategoryName: '', // Fill if available from backend
          vSubCategoryName: '', // Fill if available from backend
          vUnitOfMeasure: item.unit
        }));
        // eslint-disable-next-line no-console
        console.log('Items library:', mappedItems);
        setItemsLibrary(mappedItems);
        if (!mappedItems || mappedItems.length === 0) {
          setItemsError('No items found in the items library.');
        }
      } else {
        setItemsError('Failed to fetch items library.');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load items library');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item: ItemMaster) => {
    const existingItem = selectedItems.find(si => si.item_master_id === item.id);
    
    if (existingItem) {
      setError(`${item.vItemNomenclature} is already added to the request`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newItem: SelectedItem = {
      item_master_id: item.id,
      item_nomenclature: item.vItemNomenclature,
      item_code: item.vItemCode,
      category_name: item.vCategoryName,
      subcategory_name: item.vSubCategoryName,
      requested_quantity: 1,
      unit_of_measurement: item.vUnitOfMeasure,
      notes: ''
    };

    setSelectedItems([...selectedItems, newItem]);
    setShowItemPicker(false);
    setSearchTerm('');
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };


  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...selectedItems];
    updated[index].requested_quantity = quantity;
    setSelectedItems(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">New Procurement Request</h1>
          <p className="text-gray-600 mt-1">Request procurement of items for your wing/department</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Request Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Procurement Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Wing</Label>
                  <div className="font-medium text-blue-800">{wingName}</div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Justification</Label>
                  <Textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    placeholder="Describe the need for this procurement..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Right Column: Items Library and Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Items Library
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                {loading ? (
                  <div>Loading items...</div>
                ) : itemsError ? (
                  <div className="text-red-600">{itemsError}</div>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto">
                      {itemsLibrary.filter(item =>
                        item.vItemNomenclature.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map(item => (
                        <div key={item.id} className="flex items-center justify-between border-b py-2">
                          <div>
                            <span className="font-medium">{item.vItemNomenclature}</span>
                            <span className="ml-2 text-xs text-gray-500">({item.vUnitOfMeasure})</span>
                          </div>
                          <Button size="sm" onClick={() => addItem(item)}>
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                    {/* Add custom item if no match and searchTerm is not empty */}
                    {searchTerm && itemsLibrary.filter(item =>
                      item.vItemNomenclature.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && !showCustomItemForm && (
                      <div className="p-4 text-center">
                        <Button
                          onClick={() => {
                            setShowCustomItemForm(true);
                            setCustomItemName(searchTerm);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add "{searchTerm}" as Custom Item
                        </Button>
                      </div>
                    )}
                    {/* Custom Item Form */}
                    {showCustomItemForm && (
                      <div className="border-t pt-4 mb-4">
                        <h4 className="font-medium mb-3 text-blue-700">Add Custom Item</h4>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 mb-3">
                            💡 Configure your custom item details
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <Label htmlFor="customItemName">Item Name</Label>
                              <Input
                                id="customItemName"
                                value={customItemName}
                                onChange={e => setCustomItemName(e.target.value)}
                                placeholder="Enter custom item name..."
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="customItemQuantity">Quantity</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCustomItemQuantity(Math.max(1, customItemQuantity - 1))}
                                  type="button"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  id="customItemQuantity"
                                  type="number"
                                  value={customItemQuantity}
                                  onChange={e => setCustomItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 text-center"
                                  min="1"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCustomItemQuantity(customItemQuantity + 1)}
                                  type="button"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={() => {
                                // Add custom item to selectedItems
                                const customItem: SelectedItem = {
                                  item_master_id: `custom_${Date.now()}`,
                                  item_nomenclature: customItemName,
                                  item_code: '',
                                  category_name: '',
                                  subcategory_name: '',
                                  requested_quantity: customItemQuantity,
                                  unit_of_measurement: '',
                                  notes: '',
                                };
                                setSelectedItems([...selectedItems, customItem]);
                                setShowCustomItemForm(false);
                                setCustomItemName('');
                                setCustomItemQuantity(1);
                              }}
                              disabled={!customItemName.trim()}
                              className="flex-1"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Custom Item
                            </Button>
                            <Button
                              onClick={() => {
                                setShowCustomItemForm(false);
                                setCustomItemName('');
                                setCustomItemQuantity(1);
                              }}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Selected Items ({selectedItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedItems.length === 0 ? (
                  <div className="text-gray-500">No items selected.</div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div
                      key={item.item_master_id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${item.item_master_id.toString().startsWith('custom_') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.item_nomenclature}</div>
                        <div className="text-xs text-gray-600">Unit: {item.unit_of_measurement || 'Custom'}</div>
                        {item.item_master_id.toString().startsWith('custom_') && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(idx, Math.max(1, item.requested_quantity - 1))}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.requested_quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(idx, item.requested_quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Button disabled={selectedItems.length === 0 || submitting} className="w-full">
              Submit Procurement Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewProcurementRequest;
