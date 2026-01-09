import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Check, X } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface Category {
  id: string;
  category_name: string;
  category_code?: string;
  description?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  item_code: string;
}

export const VendorAssignmentManager: React.FC = () => {
  // Main states
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryItems, setCategoryItems] = useState<ItemMaster[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemMaster[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);

  // Dialog states
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showAssignVendorsDialog, setShowAssignVendorsDialog] = useState(false);
  
  // Create category form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryItems, setNewCategoryItems] = useState<{ nomenclature: string; item_code: string }[]>([
    { nomenclature: '', item_code: '' }
  ]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadTenders();
    loadVendors();
    loadCategories();
  }, []);

  const loadTenders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
      if (data.length > 0) {
        setSelectedTender(data[0]);
      }
    } catch (error) {
      console.error('Error loading tenders:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCategoryItems = async (categoryId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/categories/${categoryId}/items`);
      if (response.ok) {
        const data = await response.json();
        setCategoryItems(data);
        setSelectedItems([]);
      }
    } catch (error) {
      console.error('Error loading category items:', error);
    }
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    loadCategoryItems(category.id);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName || newCategoryItems.some(item => !item.nomenclature || !item.item_code)) {
      alert('Please fill in all category and item fields');
      return;
    }

    try {
      // Create category
      const categoryResponse = await fetch('http://localhost:3001/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: newCategoryName,
          category_code: newCategoryCode || newCategoryName,
          description: `Auto-created category for tender procurement`
        })
      });

      if (!categoryResponse.ok) {
        throw new Error('Failed to create category');
      }

      const newCategory = await categoryResponse.json();

      // Create items for this category
      for (const item of newCategoryItems) {
        await fetch('http://localhost:3001/api/item-masters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomenclature: item.nomenclature,
            item_code: item.item_code,
            category_id: newCategory.id,
            description: `Item for ${newCategoryName}`
          })
        });
      }

      // Refresh categories and select the new one
      await loadCategories();
      setSelectedCategory(newCategory);
      await loadCategoryItems(newCategory.id);

      // Reset form
      setNewCategoryName('');
      setNewCategoryCode('');
      setNewCategoryItems([{ nomenclature: '', item_code: '' }]);
      setShowCreateCategoryDialog(false);
      alert('✅ Category and items created successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

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
                categoryId: selectedCategory.id,
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
              {/* Step 2: Select or Create Category */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Step 2: Select or Create Category</CardTitle>
                    <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Plus className="w-4 h-4" />
                          Create New Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create New Category with Items</DialogTitle>
                          <DialogDescription>
                            Define category details and add items to it
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Category Details */}
                          <div className="space-y-3 p-4 bg-blue-50 rounded">
                            <h3 className="font-semibold text-sm">Category Information</h3>
                            <div className="space-y-2">
                              <div>
                                <label className="text-sm font-medium">Category Name *</label>
                                <Input
                                  placeholder="e.g., Furniture"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Category Code (Optional)</label>
                                <Input
                                  placeholder="e.g., FURN"
                                  value={newCategoryCode}
                                  onChange={(e) => setNewCategoryCode(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Items Section */}
                          <div className="space-y-3 p-4 bg-yellow-50 rounded">
                            <div className="flex justify-between items-center">
                              <h3 className="font-semibold text-sm">Items in Category</h3>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNewCategoryItems([...newCategoryItems, { nomenclature: '', item_code: '' }])}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Item
                              </Button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {newCategoryItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Input
                                    placeholder="Item name (e.g., Office Chair)"
                                    value={item.nomenclature}
                                    onChange={(e) => {
                                      const updated = [...newCategoryItems];
                                      updated[idx].nomenclature = e.target.value;
                                      setNewCategoryItems(updated);
                                    }}
                                    className="flex-1"
                                  />
                                  <Input
                                    placeholder="Item code (e.g., CHAIR-001)"
                                    value={item.item_code}
                                    onChange={(e) => {
                                      const updated = [...newCategoryItems];
                                      updated[idx].item_code = e.target.value;
                                      setNewCategoryItems(updated);
                                    }}
                                    className="flex-1"
                                  />
                                  {newCategoryItems.length > 1 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setNewCategoryItems(newCategoryItems.filter((_, i) => i !== idx))}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateCategoryDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateCategory} className="gap-2">
                              <Check className="w-4 h-4" />
                              Create Category & Items
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedCategory?.id === category.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold">{category.category_name}</p>
                        {category.category_code && <p className="text-xs text-gray-600">{category.category_code}</p>}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedCategory && (
                <>
                  {/* Step 3: Select Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Step 3: Select Items from {selectedCategory.category_name}</CardTitle>
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
};

export default VendorAssignmentManager;
