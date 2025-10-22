import React, { useState } from 'react';
import { useVendors } from '../hooks/useVendors';
import VendorForm from '../components/vendors/VendorForm';
import { Vendor } from '../types/vendor';

const VendorsPage: React.FC = () => {
  const { vendors, loading, error, deleteVendor, refetch } = useVendors();
  // Sort vendors by created_at (latest first)
  const sortedVendors = [...vendors].sort((a, b) => {
    // Fallback to id if created_at is missing
    const aDate = a.created_at ? new Date(a.created_at) : new Date(0);
    const bDate = b.created_at ? new Date(b.created_at) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  const handleAdd = () => {
    setEditVendor(null);
    setShowForm(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditVendor(vendor);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this vendor?')) {
      await deleteVendor(id);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditVendor(null);
    refetch();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Vendors</h1>
      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAdd}>Add Vendor</button>
      {showForm && (
        <VendorForm
          onSubmit={async () => { handleFormSuccess(); }}
          onCancel={() => setShowForm(false)}
          initialData={editVendor || undefined}
        />
      )}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <table className="w-full border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Code</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Contact</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedVendors.map(v => (
            <tr key={v.id} className="border-b">
              <td className="p-2 border">{v.vendor_code}</td>
              <td className="p-2 border">{v.vendor_name}</td>
              <td className="p-2 border">{v.contact_person}</td>
              <td className="p-2 border">{v.email}</td>
              <td className="p-2 border">{v.status}</td>
              <td className="p-2 border">
                <button className="mr-2 text-blue-600" onClick={() => handleEdit(v)}>Edit</button>
                {/* <button className="text-red-600" onClick={() => handleDelete(v.id)}>Delete</button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VendorsPage;
