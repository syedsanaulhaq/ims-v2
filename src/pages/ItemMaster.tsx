import React, { useState, useEffect } from 'react';

// Interface for item masters from vw_item_masters_with_categories view
interface ItemMaster {
  id: number;
  item_code: string;
  nomenclature: string;
  category_id: number;
  sub_category_id: number;
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

const ItemMasterManagement = () => {
  // Simple state
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Handler functions for actions
  const handleAddNew = () => {
    console.log('🆕 Add new item clicked');
    // TODO: Open add new item modal/form
    alert('Add New Item functionality - Coming Soon!');
  };

  const handleEdit = (item: ItemMaster) => {
    console.log('✏️ Edit item:', item.id, item.nomenclature);
    // TODO: Open edit modal/form with item data
    alert(`Edit item: ${item.nomenclature} (${item.item_code})`);
  };

  const handleDelete = (item: ItemMaster) => {
    console.log('🗑️ Delete item:', item.id, item.nomenclature);
    // TODO: Show confirmation dialog and delete
    const confirmed = window.confirm(`Are you sure you want to delete "${item.nomenclature}" (${item.item_code})?`);
    if (confirmed) {
      alert(`Delete functionality for ${item.nomenclature} - Coming Soon!`);
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
    </div>
  );
};

export default ItemMasterManagement;