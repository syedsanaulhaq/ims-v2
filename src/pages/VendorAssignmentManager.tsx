import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface ItemWithCategory {
  id: string;
  nomenclature: string;
  item_code: string;
  category_name: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

export const VendorAssignmentManager: React.FC = () => {
  // Main states
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  
  // Categories - extracted from items view
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Items from view
  const [allItems, setAllItems] = useState<ItemWithCategory[]>([]);
  const [categoryItems, setCategoryItems] = useState<ItemWithCategory[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemWithCategory[]>([]);
  
  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);

  // Dialog and loading states
  const [showAssignVendorsDialog, setShowAssignVendorsDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data from view-backed endpoints
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadTenders(),
          loadVendors(),
          loadItems()
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load tenders from database
  const loadTenders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
      if (data.length > 0) {
        setSelectedTender(data[0]);
      }
    } catch (error) {
      console.error('Error loading tenders:', error);
    }
  };

  // Load vendors from database
  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      const data = await response.json();
      const vendorsArray = Array.isArray(data) ? data : (data.data || data.vendors || []);
      setVendors(vendorsArray);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  // Load items from vw_item_masters_with_categories view via API
  const loadItems = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-masters');
      const data = await response.json();
      const itemsArray = Array.isArray(data) ? data : (data.data || data.items || []);
      
      // Store all items
      setAllItems(itemsArray);
      
      // Extract unique categories from items
      const uniqueCategories = Array.from(
        new Set(itemsArray.map((item: ItemWithCategory) => item.category_name))
      ).filter((name): name is string => Boolean(name)).sort();
      
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  // Filter items when category is selected
  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    const filtered = allItems.filter(item => item.category_name === categoryName);
    setCategoryItems(filtered);
    setSelectedItems([]);  // Reset item selection when category changes
  };

  // Assign selected vendors to selected items
  const handleAssignVendors = async () => {
    if (!selectedTender || !selectedCategory || selectedItems.length === 0 || selectedVendors.length === 0) {
      alert('Please complete all steps: Tender → Category → Items → Vendors');
      return;
    }

    try {
      const itemIds = selectedItems.map(item => item.id);
      const vendorIds = selectedVendors.map(vendor => vendor.id);

      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignments: [
              {
                vendorIds: vendorIds,
                itemIds: itemIds
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign vendors');
      }

      alert('✅ Vendors assigned successfully!');
      setShowAssignVendorsDialog(false);
      setSelectedItems([]);
      setSelectedVendors([]);
    } catch (error) {
      console.error('Error assigning vendors:', error);
      alert('Failed to assign vendors');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Assignment</h1>
        <p className="text-gray-600">Assign vendors to items in categories for annual tenders</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Select Tender */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1: Select Annual Tender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {tenders.map(tender => (
                  <Button
                    key={tender.id}
                    variant={selectedTender?.id === tender.id ? 'default' : 'outline'}
                    onClick={() => setSelectedTender(tender)}
                  >
                    {tender.title}
                    <Badge variant="secondary" className="ml-2">{tender.tender_number}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedTender && (
            <>
              {/* Step 2: Select Category from vw_item_masters_with_categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 2: Select Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <p className="text-gray-500">No categories found. Please create items first.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map(categoryName => (
                        <button
                          key={categoryName}
                          onClick={() => handleSelectCategory(categoryName)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedCategory === categoryName
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold">{categoryName}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedCategory && (
                <>
                  {/* Step 3: Select Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Step 3: Select Items from {selectedCategory}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categoryItems.length === 0 ? (
                          <p className="text-center py-8 text-gray-500">No items in this category</p>
                        ) : (
                          categoryItems.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedItems.some(i => i.id === item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                                  }
                                }}
                              />
                              <div>
                                <p className="font-medium">{item.nomenclature}</p>
                                <p className="text-xs text-gray-600">Code: {item.item_code}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      {selectedItems.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-700">
                            ✓ {selectedItems.length} item(s) selected
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedItems.length > 0 && (
                    <>
                      {/* Step 4: Assign Vendors */}
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Step 4: Assign Vendors</CardTitle>
                            <Dialog open={showAssignVendorsDialog} onOpenChange={setShowAssignVendorsDialog}>
                              <DialogTrigger asChild>
                                <Button className="gap-2">
                                  <Plus className="w-4 h-4" />
                                  Assign Vendors
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Select Vendors</DialogTitle>
                                  <DialogDescription>
                                    Select vendors to provide these items
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-3">
                                  {/* Selected Items Summary */}
                                  <div className="p-3 bg-blue-50 rounded">
                                    <p className="text-sm font-semibold mb-2">Items to Assign:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedItems.map(item => (
                                        <Badge key={item.id} variant="secondary">
                                          {item.nomenclature}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Vendor Selection */}
                                  <div>
                                    <p className="text-sm font-semibold mb-2">Select Vendors:</p>
                                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
                                      {vendors.map(vendor => (
                                        <label key={vendor.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={selectedVendors.some(v => v.id === vendor.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedVendors([...selectedVendors, vendor]);
                                              } else {
                                                setSelectedVendors(selectedVendors.filter(v => v.id !== vendor.id));
                                              }
                                            }}
                                          />
                                          <div>
                                            <p className="font-medium text-sm">{vendor.vendor_name}</p>
                                            <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {selectedVendors.length > 0 && (
                                    <div className="p-3 bg-green-50 rounded">
                                      <p className="text-sm font-medium text-green-700">
                                        ✓ {selectedVendors.length} vendor(s) selected
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowAssignVendorsDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleAssignVendors}
                                    disabled={selectedVendors.length === 0}
                                    className="gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    Confirm Assignment
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Click "Assign Vendors" to select vendors that can provide the {selectedItems.length} selected item(s)
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorAssignmentManager;
