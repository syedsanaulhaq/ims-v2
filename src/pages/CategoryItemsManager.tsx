import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface ItemWithCategory {
  id: string;
  nomenclature: string;
  item_code: string;
  category_id: string;
  category_name: string;
  status?: string;
}

export const CategoryItemsManager: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categoryItems, setCategoryItems] = useState<ItemWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItemWithCategory | null>(null);

  useEffect(() => {
    loadAllItems();
  }, []);

  const loadAllItems = async () => {
    try {
      setLoading(true);
      // Load from vw_item_masters_with_categories view
      const response = await fetch('http://localhost:3001/api/item-masters');
      const data = await response.json();
      const itemsArray = Array.isArray(data) ? data : (data.data || data.items || []);
      
      setItems(itemsArray);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(itemsArray.map((item: ItemWithCategory) => item.category_name))
      ).filter((name): name is string => Boolean(name)).sort();
      
      setCategories(uniqueCategories);
      
      if (uniqueCategories.length > 0) {
        setSelectedCategory(uniqueCategories[0]);
        filterItemsByCategory(uniqueCategories[0], itemsArray);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItemsByCategory = (categoryName: string, allItems: ItemWithCategory[]) => {
    const filtered = allItems.filter(item => item.category_name === categoryName);
    setCategoryItems(filtered);
  };

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    filterItemsByCategory(categoryName, items);
  };

  const handleAddItem = async () => {
    if (!newItemName || !newItemCode || !selectedCategory) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Find a category_id for the selected category name
      const categoryItem = items.find(item => item.category_name === selectedCategory);
      if (!categoryItem) {
        alert('Category not found');
        return;
      }

      const response = await fetch('http://localhost:3001/api/item-masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: newItemName,
          item_code: newItemCode,
          category_id: categoryItem.category_id,
          description: `Item for ${selectedCategory}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      await loadAllItems();
      setShowAddItemDialog(false);
      setNewItemName('');
      setNewItemCode('');
      alert('✅ Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !newItemName || !newItemCode) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/item-masters/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: newItemName,
          item_code: newItemCode,
          category_id: editingItem.category_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      await loadAllItems();
      setShowEditItemDialog(false);
      setEditingItem(null);
      setNewItemName('');
      setNewItemCode('');
      alert('✅ Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;

    try {
      const response = await fetch(`http://localhost:3001/api/item-masters/${deleteItem.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      await loadAllItems();
      setShowDeleteConfirmDialog(false);
      setDeleteItem(null);
      alert('✅ Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openEditDialog = (item: ItemWithCategory) => {
    setEditingItem(item);
    setNewItemName(item.nomenclature);
    setNewItemCode(item.item_code);
    setShowEditItemDialog(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: newCategoryName,
          description: `Category for ${newCategoryName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      await loadAllItems();
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      setNewCategoryCode('');
      alert('✅ Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Category Items</h1>
        <p className="text-gray-600">View and manage items from vw_item_masters_with_categories</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="text-lg">Categories</CardTitle>
                  <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 p-2 h-auto">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new category for organizing items
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Category Name *</label>
                          <Input
                            placeholder="e.g., Office Equipment"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Category Code (Optional)</label>
                          <Input
                            placeholder="e.g., OFFICE_EQ (auto-generated if blank)"
                            value={newCategoryCode}
                            onChange={(e) => setNewCategoryCode(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddCategoryDialog(false);
                              setNewCategoryName('');
                              setNewCategoryCode('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddCategory} className="gap-2">
                            <Check className="w-4 h-4" />
                            Create Category
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No categories</p>
                  ) : (
                    categories.map(categoryName => (
                      <button
                        key={categoryName}
                        onClick={() => handleSelectCategory(categoryName)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-all text-sm ${
                          selectedCategory === categoryName
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold">{categoryName}</p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Management */}
          <div className="lg:col-span-3">
            {selectedCategory ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{selectedCategory}</CardTitle>
                      <p className="text-sm text-gray-600">{categoryItems.length} item(s)</p>
                    </div>
                    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Item</DialogTitle>
                          <DialogDescription>
                            Add a new item to {selectedCategory}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Item Name *</label>
                            <Input
                              placeholder="e.g., Office Chair"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Item Code *</label>
                            <Input
                              placeholder="e.g., CHAIR-001"
                              value={newItemCode}
                              onChange={(e) => setNewItemCode(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowAddItemDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddItem} className="gap-2">
                              <Check className="w-4 h-4" />
                              Add Item
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoryItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No items in this category</p>
                      <p className="text-sm text-gray-400 mt-2">Click "Add Item" to create one</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.nomenclature}</p>
                            <p className="text-xs text-gray-600">Code: {item.item_code}</p>
                          </div>
                          <div className="flex gap-2">
                            <Dialog open={showEditItemDialog && editingItem?.id === item.id} onOpenChange={setShowEditItemDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(item)}
                                  className="gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Item</DialogTitle>
                                  <DialogDescription>
                                    Update item details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Item Name *</label>
                                    <Input
                                      placeholder="e.g., Office Chair"
                                      value={newItemName}
                                      onChange={(e) => setNewItemName(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Item Code *</label>
                                    <Input
                                      placeholder="e.g., CHAIR-001"
                                      value={newItemCode}
                                      onChange={(e) => setNewItemCode(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => setShowEditItemDialog(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={handleEditItem} className="gap-2">
                                      <Check className="w-4 h-4" />
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={showDeleteConfirmDialog && deleteItem?.id === item.id} onOpenChange={setShowDeleteConfirmDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteItem(item)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Item?</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete "{item.nomenclature}"? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirmDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeleteItem}
                                    className="gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Item
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">Select a category to manage its items</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryItemsManager;
