import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api-config';
import { useUserStore } from '../stores/userStore';

interface SelectedItem {
  item_master_id: number;
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
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  }, []);

  const fetchItemsLibrary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/items-master`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setItemsLibrary(data.items || []);
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

  const updateItemNotes = (index: number, notes: string) => {
    const updated = [...selectedItems];
    updated[index].notes = notes;
    setSelectedItems(updated);
  };

  const updateItemPrice = (index: number, price: number) => {
    const updated = [...selectedItems];
    updated[index].estimated_unit_price = price;
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError('Please add at least one item to the request');
      return;
    }

    if (!justification.trim()) {
      setError('Please provide a justification for this procurement request');
      return;
    }

    if (!user?.intWingID) {
      setError('Wing information not found. Please contact support.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`${getApiBaseUrl()}/procurement/requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wing_id: user.intWingID,
          wing_name: user.wing_name || 'Unknown Wing',
          items: selectedItems,
          priority,
          justification
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Procurement request ${data.request.request_number} submitted successfully!`);
        setTimeout(() => {
          navigate('/procurement/my-requests');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit procurement request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setError('Failed to submit procurement request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = itemsLibrary.filter(item => 
    item.vItemNomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vItemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vCategoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEstimatedCost = selectedItems.reduce((sum, item) => 
    sum + (item.requested_quantity * (item.estimated_unit_price || 0)), 0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">New Procurement Request</h1>
        <p className="text-gray-600 mt-1">Request stock from Central Admin for your wing inventory</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Request Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wing
              </label>
              <input
                type="text"
                value={user?.wing_name || 'Unknown Wing'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder="Provide a clear justification for this procurement request..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Explain why these items are needed and how they will be used
            </p>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Requested Items ({selectedItems.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowItemPicker(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Items
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No items added yet</p>
              <button
                type="button"
                onClick={() => setShowItemPicker(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Click here to add items
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{item.item_nomenclature}</h3>
                      <p className="text-sm text-gray-500">
                        Code: {item.item_code} | Category: {item.category_name}
                        {item.subcategory_name && ` > ${item.subcategory_name}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.requested_quantity}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <span className="ml-2 text-sm text-gray-600">{item.unit_of_measurement}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Est. Unit Price (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.estimated_unit_price || ''}
                        onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Est. Total
                      </label>
                      <input
                        type="text"
                        value={item.estimated_unit_price ? 
                          `PKR ${(item.requested_quantity * item.estimated_unit_price).toLocaleString()}` : '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Notes
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(index, e.target.value)}
                      placeholder="Any specific requirements or notes for this item..."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}

              {totalEstimatedCost > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">Total Estimated Cost:</span>
                    <span className="text-xl font-bold text-blue-600">
                      PKR {totalEstimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/procurement/my-requests')}
            className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || selectedItems.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      {/* Item Picker Modal */}
      {showItemPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Select Items</h2>
                <button
                  onClick={() => { setShowItemPicker(false); setSearchTerm(''); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-200px)] p-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading items...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.slice(0, 100).map(item => (
                    <div
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="border border-gray-200 rounded p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition"
                    >
                      <h3 className="font-medium text-gray-800">{item.vItemNomenclature}</h3>
                      <p className="text-sm text-gray-600 mt-1">Code: {item.vItemCode}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.vCategoryName}
                        {item.vSubCategoryName && ` > ${item.vSubCategoryName}`}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Unit: {item.vUnitOfMeasure}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewProcurementRequest;
