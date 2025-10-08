import React, { useState, useEffect } from 'react';

// Interface for item masters from vw_item_masters_with_categories view
interface ItemMaster {
  id: string; // UUID in database
  item_code: string;
  nomenclature: string;
  category_id: string; // UUID in database
  sub_category_id: string; // UUID in database
  unit: string;
  specifications?: string;
  description?: string;
  status: string;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_level?: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  sub_category_name: string;
}

// Interface for form data
interface ItemFormData {
  item_code: string;
  nomenclature: string;
  category_id: string;
  sub_category_id: string;
  unit: string;
  specifications: string;
  description: string;
  status: string;
  minimum_stock_level: string;
  maximum_stock_level: string;
  reorder_level: string;
}

// Interface for categories
interface Category {
  id: string; // UUID in database
  category_name: string;
  description?: string;
  status?: string;
}

// Interface for sub-categories
interface SubCategory {
  id: string; // UUID in database
  sub_category_name: string;
  category_id: string; // UUID in database
  description?: string;
  status?: string;
}

const ItemMasterManagement = () => {
  // Simple state
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    item_code: '',
    nomenclature: '',
    category_id: '',
    sub_category_id: '',
    unit: '',
    specifications: '',
    description: '',
    status: 'Active',
    minimum_stock_level: '',
    maximum_stock_level: '',
    reorder_level: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);

  // Load categories and subcategories
  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories and subcategories...');
      
      // Load categories
      const categoriesResponse = await fetch('http://localhost:3001/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        console.log('✅ Categories loaded:', categoriesData.length);
      }

      // Load all sub-categories
      const subCategoriesResponse = await fetch('http://localhost:3001/api/sub-categories');
      if (subCategoriesResponse.ok) {
        const subCategoriesData = await subCategoriesResponse.json();
        setSubCategories(subCategoriesData);
        setFilteredSubCategories(subCategoriesData);
        console.log('✅ Sub-categories loaded:', subCategoriesData.length);
      }
    } catch (err) {
      console.error('❌ Load categories error:', err);
      // Fallback to mock data
      const mockCategories = [
        { id: '1', category_name: 'Information Technology' },
        { id: '2', category_name: 'Furniture' },
        { id: '3', category_name: 'Stationery' },
        { id: '4', category_name: 'Office Equipment' },
      ];
      const mockSubCategories = [
        { id: '1', sub_category_name: 'Computers', category_id: '1' },
        { id: '2', sub_category_name: 'Printers', category_id: '1' },
        { id: '3', sub_category_name: 'Office Chairs', category_id: '2' },
        { id: '4', sub_category_name: 'Desks', category_id: '2' },
        { id: '5', sub_category_name: 'Paper Products', category_id: '3' },
        { id: '6', sub_category_name: 'Writing Instruments', category_id: '3' },
      ];
      setCategories(mockCategories);
      setSubCategories(mockSubCategories);
      setFilteredSubCategories(mockSubCategories);
    }
  };

  // Filter sub-categories based on selected category
  const handleCategoryChange = (categoryId: string) => {
    setFormData({...formData, category_id: categoryId, sub_category_id: ''});
    
    if (categoryId) {
      const filtered = subCategories.filter(sub => sub.category_id === categoryId);
      setFilteredSubCategories(filtered);
    } else {
      setFilteredSubCategories([]);
    }
  };

  // Form functions
  const resetForm = () => {
    setFormData({
      item_code: '',
      nomenclature: '',
      category_id: '',
      sub_category_id: '',
      unit: '',
      specifications: '',
      description: '',
      status: 'Active',
      minimum_stock_level: '',
      maximum_stock_level: '',
      reorder_level: ''
    });
    setFilteredSubCategories([]);
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: ItemMaster) => {
    setFormData({
      item_code: item.item_code,
      nomenclature: item.nomenclature,
      category_id: item.category_id,
      sub_category_id: item.sub_category_id,
      unit: item.unit,
      specifications: item.specifications || '',
      description: item.description || '',
      status: item.status,
      minimum_stock_level: item.minimum_stock_level?.toString() || '',
      maximum_stock_level: item.maximum_stock_level?.toString() || '',
      reorder_level: item.reorder_level?.toString() || ''
    });
    
    // Filter sub-categories for the selected category
    const filtered = subCategories.filter(sub => sub.category_id === item.category_id);
    setFilteredSubCategories(filtered);
    
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        item_code: formData.item_code,
        nomenclature: formData.nomenclature,
        category_id: formData.category_id,
        sub_category_id: formData.sub_category_id,
        unit: formData.unit,
        specifications: formData.specifications || null,
        description: formData.description || null,
        status: formData.status,
        minimum_stock_level: formData.minimum_stock_level ? parseInt(formData.minimum_stock_level) : null,
        maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : null,
        reorder_point: formData.reorder_level ? parseInt(formData.reorder_level) : null
      };

      if (editingItem) {
        // Update existing item
        console.log('🔄 Updating item:', payload);
        console.log('📝 Editing item ID:', editingItem.id);
        const response = await fetch(`http://localhost:3001/api/item-masters/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log('✅ Item updated successfully');
          closeModal();
          loadItems();
        } else {
          const errorData = await response.text();
          console.error('❌ Update failed:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorData}`);
        }
      } else {
        // Create new item
        console.log('🆕 Creating new item:', payload);
        const response = await fetch('http://localhost:3001/api/item-masters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log('✅ Item created successfully');
          closeModal();
          loadItems();
        } else {
          const errorData = await response.text();
          console.error('❌ Create failed:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorData}`);
        }
      }
    } catch (err) {
      console.error('❌ Form submit error:', err);
      alert(`Error ${editingItem ? 'updating' : 'creating'} item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Handler functions for actions
  const handleAddNew = () => {
    console.log('🆕 Add new item clicked');
    openAddModal();
  };

  const handleEdit = (item: ItemMaster) => {
    console.log('✏️ Edit item:', item.id, item.nomenclature);
    openEditModal(item);
  };

  const handleDelete = async (item: ItemMaster) => {
    console.log('🗑️ Delete item:', item.id, item.nomenclature);
    const confirmed = window.confirm(`Are you sure you want to delete "${item.nomenclature}" (${item.item_code})?`);
    if (confirmed) {
      try {
        const response = await fetch(`http://localhost:3001/api/item-masters/${item.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          console.log('✅ Item deleted successfully');
          loadItems();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('❌ Delete error:', err);
        alert(`Error deleting item: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Load items
  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('http://localhost:3001/api/item-masters');
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        console.log('✅ Items loaded:', data.length);
      } else {
        setError(`HTTP Error: ${response.status}`);
      }
    } catch (err) {
      setError(`Network Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('❌ Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  // Show loading
  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={loadItems}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main UI
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Item Master Management</h1>
      
      {/* Stats */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {items.filter(item => item.status === 'Active').length}
            </div>
            <div className="text-sm text-gray-600">Active Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {new Set(items.map(item => item.category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {new Set(items.map(item => item.sub_category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Sub-Categories</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Items List</h2>
            <p className="text-sm text-gray-600">Data from vw_item_masters_with_categories view</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Item
          </button>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nomenclature</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sub-Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Specifications</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono font-medium text-blue-600">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {item.nomenclature}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.sub_category_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.unit}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {item.specifications || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'Active'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                          title="Edit Item"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                          title="Delete Item"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit Item Master' : 'Add New Item Master'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Row 1: Item Code and Nomenclature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_code}
                    onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., IT001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomenclature *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomenclature}
                    onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Desktop Computer"
                  />
                </div>
              </div>

              {/* Row 2: Categories and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-Category *
                  </label>
                  <select
                    required
                    value={formData.sub_category_id}
                    onChange={(e) => setFormData({...formData, sub_category_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.category_id}
                  >
                    <option value="">Select Sub-Category</option>
                    {filteredSubCategories.map(subCat => (
                      <option key={subCat.id} value={subCat.id}>
                        {subCat.sub_category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PCS, KG, Liter"
                  />
                </div>
              </div>

              {/* Row 3: Stock Levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimum_stock_level}
                    onChange={(e) => setFormData({...formData, minimum_stock_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximum_stock_level}
                    onChange={(e) => setFormData({...formData, maximum_stock_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Row 4: Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Specifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications
                </label>
                <textarea
                  rows={3}
                  value={formData.specifications}
                  onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item specifications..."
                />
              </div>

              {/* Row 6: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item description..."
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md flex items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingItem ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterManagement;