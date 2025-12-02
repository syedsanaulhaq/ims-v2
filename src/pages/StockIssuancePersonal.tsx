import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  Search, 
  Send, 
  User, 
  Building2,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { inventoryLocalService } from '@/services/inventoryLocalService';
import erpDatabaseService from '@/services/erpDatabaseService';
import stockIssuanceService from '@/services/stockIssuanceService';
import { approvalForwardingService } from '@/services/approvalForwardingService';
import type { User as UserType } from '@/services/erpDatabaseService';
import { Office as ERPOffice, Wing as ERPWing, DEC as ERPDEC } from '@/types/office';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StockAvailabilityChecker from '@/components/stock/StockAvailabilityChecker';
import { PermissionGate } from '@/components/PermissionGate';

interface InventoryItem {
  id: string;
  intOfficeID: string;
  nomenclature: string;
  current_stock: number;
  minimum_stock_level: number;
  weighted_avg_price: number;
  primary_Location: string;
}

interface IssuanceItem {
  inventory_id: string;
  inventory_intOfficeID: string;
  nomenclature: string;
  requested_quantity: number;
  available_stock: number;
  unit_price: number;
  item_type: 'inventory' | 'custom';
  custom_item_name?: string;
}

const StockIssuancePersonal: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [issuanceItems, setIssuanceItems] = useState<IssuanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Custom items state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);

  // Form fields - PERSONAL REQUEST (Individual only)
  const [requestType] = useState<'Individual' | 'Organizational'>('Individual');
  const [purpose, setPurpose] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [justification, setJustification] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [isReturnable, setIsReturnable] = useState(true);

  // Automatically set from logged-in user session
  const selectedOfficeId = user?.office_id?.toString() || '';
  const selectedWingId = user?.wing_id?.toString() || '';
  const selectedBranchId = user?.branch_id?.toString() || '';
  const selectedUserId = user?.user_id || '';

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      console.log('🔄 Loading stock issuance form data (Personal Request)...');
      
      // Fetch inventory items using the local service
      console.log('📦 Fetching inventory items...');
      const inventory = await inventoryLocalService.getAll();
      console.log('📦 Inventory response:', inventory);

      if (inventory && inventory.length > 0) {
        // Transform data to match the expected structure for StockIssuance
        const transformedItems = inventory
          .filter(item => item.intCurrentStock > 0) // Only items with stock
          .map((item) => ({
            id: `inventory-${item.intOfficeID}-${item.intItemMasterID}`,
            intOfficeID: item.intOfficeID,
            nomenclature: item.item_masters?.nomenclature || 'Unknown Item',
            current_stock: item.intCurrentStock,
            minimum_stock_level: item.intMinimumLevel,
            weighted_avg_price: item.fltUnitPrice,
            primary_Location: item.strStockLocation || 'Main Warehouse'
          }));

        setInventoryItems(transformedItems);
        console.log('✅ Inventory items loaded:', transformedItems.length);
      } else {
        setInventoryItems([]);
        console.log('⚠️ No inventory items found');
      }

      console.log('✅ Personal stock issuance form data loaded successfully');
      console.log('👤 Using session data:', { 
        user: user?.user_name, 
        office: selectedOfficeId, 
        wing: selectedWingId 
      });
    } catch (error: any) {
      console.error('❌ Error loading stock issuance form data:', error);
      setError('Failed to load data: ' + error.message);
    }
  };

  const filteredInventory = inventoryItems.filter(item =>
    item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addIssuanceItem = (item: InventoryItem) => {
    const existing = issuanceItems.find(i => i.inventory_id === item.id);
    if (existing) {
      setError('Item already added to issuance list');
      return;
    }

    const newItem: IssuanceItem = {
      inventory_id: item.id,
      inventory_intOfficeID: item.intOfficeID,
      nomenclature: item.nomenclature,
      requested_quantity: 1,
      available_stock: item.current_stock,
      unit_price: item.weighted_avg_price,
      item_type: 'inventory'
    };

    setIssuanceItems([...issuanceItems, newItem]);
    setError('');
  };

  const addCustomItem = () => {
    if (customItemName.trim() && customItemQuantity > 0) {
      const customId = `custom_${Date.now()}`;
      const newCustomItem: IssuanceItem = {
        inventory_id: customId,
        inventory_intOfficeID: customId,
        nomenclature: customItemName.trim(),
        requested_quantity: customItemQuantity,
        available_stock: 0,
        unit_price: 0,
        item_type: 'custom',
        custom_item_name: customItemName.trim()
      };
      setIssuanceItems([...issuanceItems, newCustomItem]);
      setCustomItemName('');
      setCustomItemQuantity(1);
      setError('');
    } else {
      setError('Please enter a valid custom item name and quantity');
    }
  };

  const updateQuantity = (inventory_id: string, quantity: number) => {
    setIssuanceItems(items =>
      items.map(item => {
        if (item.inventory_id === inventory_id) {
          // For custom items, allow any positive quantity
          if (item.item_type === 'custom') {
            return { ...item, requested_quantity: Math.max(1, quantity) };
          }
          // For inventory items, respect available stock
          return { ...item, requested_quantity: Math.max(0, Math.min(quantity, item.available_stock)) };
        }
        return item;
      })
    );
  };

  const removeIssuanceItem = (inventory_id: string) => {
    setIssuanceItems(items => items.filter(item => item.inventory_id !== inventory_id));
  };

  const validateForm = () => {
    // Only require user selection for Individual requests
    if (requestType === 'Individual' && !selectedUserId) {
      setError('Please select a user for this individual request');
      return false;
    }
    if (!selectedOfficeId || !selectedWingId) {
      setError('Please select at least Office and Wing from the hierarchy');
      return false;
    }
    if (issuanceItems.length === 0) {
      setError('Please add at least one item to the issuance request');
      return false;
    }
    if (!purpose.trim()) {
      setError('Please provide a purpose for this request');
      return false;
    }
    return true;
  };

  const submitIssuanceRequest = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const requestNumber = stockIssuanceService.generateRequestNumber();
      
      // Create issuance request using SQL Server API
      const requestData = {
        request_number: requestNumber,
        request_type: requestType,
        requester_office_id: parseInt(selectedOfficeId),
        requester_wing_id: parseInt(selectedWingId),
        requester_branch_id: selectedBranchId && selectedBranchId !== 'ALL_BRANCHES' ? selectedBranchId : undefined,
        requester_user_id: requestType === 'Individual' ? selectedUserId : undefined,
        purpose,
        urgency_level: urgencyLevel,
        justification: justification || undefined,
        expected_return_date: expectedReturnDate || undefined,
        is_returnable: isReturnable,
        request_status: 'Submitted'
      };

      const requestResult = await stockIssuanceService.submitRequest(requestData);

      // Add issuance items
      const requestItems = issuanceItems.map(item => ({
        item_master_id: item.item_type === 'inventory' ? item.inventory_intOfficeID : undefined,
        nomenclature: item.nomenclature,
        requested_quantity: item.requested_quantity,
        unit_price: 0, // Value field removed from UI
        item_type: item.item_type,
        custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined
      }));

      await stockIssuanceService.submitItems(requestResult.id, requestItems);

      // Submit for approval workflow
      try {
        console.log('🔄 Submitting for approval workflow...');
        
        // Get stock issuance workflow
        const workflows = await approvalForwardingService.getWorkflows();
        const stockWorkflow = workflows.find(w => w.request_type === 'stock_issuance');
        
        if (stockWorkflow) {
          await approvalForwardingService.submitForApproval(
            requestResult.id, 
            'stock_issuance', 
            stockWorkflow.id
          );
          console.log('✅ Successfully submitted for approval');
        } else {
          console.warn('⚠️ No stock issuance workflow found - request submitted without approval process');
        }
      } catch (approvalError: any) {
        console.error('❌ Error submitting for approval:', approvalError);
        // Don't fail the entire submission if approval fails
      }

      const successMessage = `Stock issuance request ${requestNumber} submitted successfully and sent for approval for ${user?.user_name}!`;
      
      setSuccess(successMessage);
      
      // Reset form
      resetForm();

      // Navigate to approval dashboard to see the submitted request
      setTimeout(() => {
        navigate('/dashboard/approval-dashboard');
      }, 3000);

    } catch (error: any) {
      setError('Failed to submit request to SQL Server: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIssuanceItems([]);
    setPurpose('');
    setJustification('');
    setExpectedReturnDate('');
    setUrgencyLevel('Normal');
    setCustomItemName('');
    setCustomItemQuantity(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Stock Issuance</h1>
          <p className="text-gray-600 mt-1">Issue inventory items to employees and departments</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Request Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Stock Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display Logged-in User Information */}
                <div className="space-y-4 border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Request For (Current User)
                  </h3>
                  
                  <div className="space-y-2 bg-white p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="text-gray-900">{user?.user_name || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="text-gray-900">{user?.email || 'Not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Role:</span>
                      <span className="text-gray-900">{user?.role || 'Not available'}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200 mt-2">
                      <p className="text-sm text-green-700">
                        ✅ <strong>Personal Request:</strong> This request is being created for your own use.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose and Urgency */}
                <div>
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Explain why these items are needed"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={urgencyLevel} onValueChange={(value: 'Low' | 'Normal' | 'High' | 'Critical') => setUrgencyLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {requestType === 'Individual' && (
                    <div>
                      <Label htmlFor="returnDate">Expected Return Date</Label>
                      <Input
                        id="returnDate"
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Justification */}
                <div>
                  <Label htmlFor="justification">Additional Justification</Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Any additional context or justification"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Stock Availability & Item Selection */}
          <div className="space-y-6">
            {/* Stock Availability Checker */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Search className="w-5 h-5" />
                  Check Stock Availability
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Search for items and check their real-time availability before adding to your request
                </p>
              </CardHeader>
              <CardContent>
                <StockAvailabilityChecker
                  selectedItems={issuanceItems.map(item => ({
                    item_master_id: item.inventory_id,
                    requested_quantity: item.requested_quantity
                  }))}
                  onItemSelect={(item) => {
                    // Add selected item to issuance list
                    const newItem: IssuanceItem = {
                      inventory_id: item.item_master_id,
                      inventory_intOfficeID: item.item_master_id,
                      nomenclature: item.nomenclature,
                      requested_quantity: 1,
                      available_stock: item.available_quantity,
                      unit_price: item.unit_price || 0,
                      item_type: 'inventory'
                    };
                    
                    // Check if already added
                    const existing = issuanceItems.find(i => i.inventory_id === item.item_master_id);
                    if (!existing) {
                      setIssuanceItems([...issuanceItems, newItem]);
                      setSuccess(`✅ ${item.nomenclature} added to request`);
                      setTimeout(() => setSuccess(''), 3000);
                    } else {
                      setError('Item already added to issuance list');
                      setTimeout(() => setError(''), 3000);
                    }
                  }}
                  onAvailabilityCheck={(result) => {
                    // Show availability feedback
                    if (!result.can_fulfill) {
                      setError(`⚠️ Only ${result.available_quantity} units available for ${result.nomenclature}`);
                      setTimeout(() => setError(''), 5000);
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Items Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Select Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search inventory items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Available Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {filteredInventory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.nomenclature}</div>
                      <div className="text-xs text-gray-500">
                        Location: {item.primary_Location}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addIssuanceItem(item)}
                      disabled={issuanceItems.some(i => i.inventory_id === item.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Custom Items Section */}
              <div className="border-t pt-4 mb-4">
                <h4 className="font-medium mb-3 text-blue-700">Add Custom Items</h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-3">
                    💡 Add items that are not in the inventory system
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label htmlFor="customItemName">Item Name</Label>
                      <Input
                        id="customItemName"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Enter custom item strOfficeName..."
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
                          onChange={(e) => setCustomItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                  <Button
                    onClick={addCustomItem}
                    disabled={!customItemName.trim()}
                    className="mt-3 w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Item
                  </Button>
                </div>
              </div>

              {/* Selected Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Selected Items ({issuanceItems.length})</h4>
                <div className="space-y-3">
                  {issuanceItems.map(item => (
                    <div key={item.inventory_id} className={`flex items-center gap-3 p-3 rounded-lg ${item.item_type === 'custom' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm">{item.nomenclature}</div>
                          <Badge variant={item.item_type === 'custom' ? 'secondary' : 'default'} className="text-xs">
                            {item.item_type === 'custom' ? 'Custom' : 'Inventory'}
                          </Badge>
                        </div>
                        {item.item_type === 'inventory' ? (
                          <div className="text-xs text-gray-600">
                            Available: {item.available_stock}
                          </div>
                        ) : (
                          <div className="text-xs text-green-700">
                            Custom item (not tracked in inventory)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.inventory_id, item.requested_quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.requested_quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.inventory_id, item.requested_quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeIssuanceItem(item.inventory_id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <PermissionGate 
                  permission="stock_request.create_personal"
                  fallback={
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Access Restricted:</strong> You don't have permission to create personal stock requests.
                      </p>
                    </div>
                  }
                >
                  <Button
                    onClick={submitIssuanceRequest}
                    disabled={isLoading || issuanceItems.length === 0}
                    className="w-full"
                  >
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Issuance Request
                      </>
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
          </div>
          {/* End Right Column */}
        </div>
      </div>
    </div>
  );
};

export default StockIssuancePersonal;
