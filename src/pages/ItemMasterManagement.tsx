import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/services/invmisApi';

// Exact API data structure
interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: string;
  sub_category_id: string;
  specifications: string;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
  category_name: string;
  sub_category_name: string;
}

const ItemMasterManagement = () => {
  const apiBase = getApiBaseUrl();

  // Simple state
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load items
  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${apiBase}/item-masters`);
      
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
              {items.filter(item => item.is_active).length}
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
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Items List</h2>
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
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sub-Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Specifications</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono font-medium text-blue-600">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.sub_category_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {item.specifications || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
        <strong>Debug:</strong> 
        <div>API: http://localhost:3001/api/item-masters</div>
        <div>Items loaded: {items.length}</div>
        <div>Last update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default ItemMasterManagement;