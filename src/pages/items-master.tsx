import React, { useState, useEffect } from 'react';
import { formatDateDMY } from '@/utils/dateUtils';

interface ItemMaster {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: string | null;
  sub_category_id: string | null;
  unit_of_measure: string;
  specifications: string;
  category_name?: string;
  sub_category_name?: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  category_name: string;
}

interface SubCategory {
  id: string;
  sub_category_name: string;
  category_id: string;
}

interface ItemFormData {
  item_code: string;
  item_name: string;
  category_id: string;
  sub_category_id: string;
  unit_of_measure: string;
  specifications: string;
}

type ViewMode = 'list' | 'add' | 'edit';

const UNITS_LIST = [
  'Piece', 'Kg', 'Gram', 'Liter', 'Meter', 'Centimeter', 'Box', 'Pack', 'Set', 'Dozen', 'Pair',
  'Gallon', 'Inch', 'Foot', 'Yard', 'Square Meter', 'Cubic Meter', 'Ton', 'Pound'
];

const ItemsMaster: React.FC = () => {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    item_code: '',
    item_name: '',
    category_id: '',
    sub_category_id: '',
    unit_of_measure: '',
    specifications: ''
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSubCategories();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/item-masters');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched items:', data);
      setItems(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(`Failed to fetch items: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Fetched categories:', data);
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(`Failed to fetch categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sub-categories');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Fetched sub-categories:', data);
      setSubCategories(data);
    } catch (err) {
      console.error('Error fetching sub-categories:', err);
      setError(`Failed to fetch sub-categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getFilteredSubCategories = () => {
    if (!formData.category_id || formData.category_id === '') {
      return [];
    }
    return subCategories.filter(sub => sub.category_id === formData.category_id);
  };

  const checkDuplicateCode = (code: string): boolean => {
    return items.some(item => 
      item.item_code.toLowerCase() === code.toLowerCase() && 
      (!editingItem || item.item_id !== editingItem.item_id)
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'category_id') {
      setFormData(prev => ({
        ...prev,
        category_id: value,
        sub_category_id: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setViewMode('add');
    setFormData({
      item_code: '',
      item_name: '',
      category_id: '',
      sub_category_id: '',
      unit_of_measure: '',
      specifications: ''
    });
  };

  const handleEdit = (item: ItemMaster) => {
    setEditingItem(item);
    setViewMode('edit');
    setFormData({
      item_code: item.item_code || '',
      item_name: item.item_name || '',
      category_id: item.category_id || '',
      sub_category_id: item.sub_category_id || '',
      unit_of_measure: item.unit_of_measure || '',
      specifications: item.specifications || ''
    });
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingItem(null);
    setFormData({
      item_code: '',
      item_name: '',
      category_id: '',
      sub_category_id: '',
      unit_of_measure: '',
      specifications: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    if (viewMode === 'add' && checkDuplicateCode(formData.item_code)) {
      setError('Item code already exists. Please use a different code.');
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        item_code: formData.item_code,
        item_name: formData.item_name,
        category_id: formData.category_id,
        sub_category_id: formData.sub_category_id,
        unit_of_measure: formData.unit_of_measure,
        specifications: formData.specifications
      };

      console.log('Submitting payload:', payload);

      const url = viewMode === 'add' 
        ? 'http://localhost:3001/api/item-masters'
        : `http://localhost:3001/api/item-masters/${editingItem?.item_id}`;

      const method = viewMode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        
        if (response.status === 409) {
          setError('Item code already exists. Please use a different code.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}. ${errorText}`);
        }
        return;
      }

      await fetchItems();
      handleCancel();
      setError(null);
    } catch (err) {
      console.error('Error saving item:', err);
      setError(`Failed to save item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (item: ItemMaster) => {
    if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/item-masters/${item.item_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchItems();
      setError(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Loading items...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchItems}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Items Master</h1>
        <p className="text-gray-600 mt-1">Manage your inventory items</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Items List ({items.length} items)
              </h2>
              <button 
                onClick={handleAddNew}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add New Item
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sub Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.item_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.sub_category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                          >
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
      ) : (
        /* FORM VIEW (ADD/EDIT) */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewMode === 'add' ? 'Add New Item' : `Edit Item: ${editingItem?.item_name}`}
              </h2>
              <button 
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Back to List
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Code */}
              <div>
                <label htmlFor="item_code" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Code *
                </label>
                <input
                  type="text"
                  id="item_code"
                  name="item_code"
                  value={formData.item_code || ''}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    viewMode === 'add' && formData.item_code && checkDuplicateCode(formData.item_code)
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter item code"
                />
                {viewMode === 'add' && formData.item_code && checkDuplicateCode(formData.item_code) && (
                  <p className="mt-1 text-sm text-red-600">
                    ⚠️ Item code already exists. Please use a different code.
                  </p>
                )}
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="item_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  id="item_name"
                  name="item_name"
                  value={formData.item_name || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item name"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Category */}
              <div>
                <label htmlFor="sub_category_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category *
                </label>
                <select
                  id="sub_category_id"
                  name="sub_category_id"
                  value={formData.sub_category_id || ''}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.category_id || formData.category_id === ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.category_id || formData.category_id === '' ? 'Select category first' : 'Select a sub category'}
                  </option>
                  {getFilteredSubCategories().map((subCat) => (
                    <option key={subCat.id} value={subCat.id}>
                      {subCat.sub_category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  id="unit_of_measure"
                  name="unit_of_measure"
                  value={formData.unit_of_measure || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a unit</option>
                  {UNITS_LIST.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specifications */}
              <div className="md:col-span-2">
                <label htmlFor="specifications" className="block text-sm font-medium text-gray-700 mb-2">
                  Specifications
                </label>
                <textarea
                  id="specifications"
                  name="specifications"
                  value={formData.specifications || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter technical specifications (optional)"
                />
              </div>
            </div>

            {/* Form Buttons */}
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? 'Saving...' : (viewMode === 'add' ? 'Add Item' : 'Update Item')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ItemsMaster;