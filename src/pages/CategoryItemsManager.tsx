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

interface Category {
  id: string;
  category_name: string;
  category_code?: string;
  description?: string;
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  item_code: string;
  category_id: string;
  status?: string;
}

export const CategoryItemsManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItemMaster | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/categories');
      const data = await response.json();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
        await loadItems(data[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (categoryId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/categories/${categoryId}/items`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    await loadItems(category.id);
  };

  const handleAddItem = async () => {
    if (!newItemName || !newItemCode || !selectedCategory) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/item-masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: newItemName,
          item_code: newItemCode,
          category_id: selectedCategory.id,
          description: `Item for ${selectedCategory.category_name}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      await loadItems(selectedCategory.id);
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
          category_id: selectedCategory?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      if (selectedCategory) {
        await loadItems(selectedCategory.id);
      }
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

      if (selectedCategory) {
        await loadItems(selectedCategory.id);
      }
      setShowDeleteConfirmDialog(false);
      setDeleteItem(null);
      alert('✅ Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openEditDialog = (item: ItemMaster) => {
    setEditingItem(item);
    setNewItemName(item.nomenclature);
    setNewItemCode(item.item_code);
    setShowEditItemDialog(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Category Items</h1>
        <p className="text-gray-600">Add, edit, and delete items from categories</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No categories</p>
                  ) : (
                    categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-all text-sm ${
                          selectedCategory?.id === category.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold">{category.category_name}</p>
                        {category.category_code && (
                          <p className="text-xs text-gray-600">{category.category_code}</p>
                        )}
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
                      <CardTitle className="text-lg">{selectedCategory.category_name}</CardTitle>
                      <p className="text-sm text-gray-600">{selectedCategory.category_code}</p>
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
                            Add a new item to {selectedCategory.category_name}
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
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No items in this category</p>
                      <p className="text-sm text-gray-400 mt-2">Click "Add Item" to create one</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map(item => (
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
