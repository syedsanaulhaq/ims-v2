import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  Lock,
  Loader2,
  X,
  Save
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Role {
  role_id: string;
  role_name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  created_at: string;
  user_count?: number;
  permission_count?: number;
}

interface Permission {
  permission_id: string;
  permission_key: string;
  module_name: string;
  action_name: string;
  description?: string;
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ displayName: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch roles and permissions on mount
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/ims/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/permissions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setFormData({ displayName: '', description: '' });
    setSelectedPermissions([]);
    setShowModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ displayName: role.display_name, description: role.description || '' });
    // Fetch the role details to load current permissions
    fetchRolePermissions(role.role_id);
    setShowModal(true);
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/roles/${roleId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const permKeys = (data.permissions || []).map((p: Permission) => p.permission_key);
        setSelectedPermissions(permKeys);
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      setSelectedPermissions([]);
    }
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionKey)
        ? prev.filter(k => k !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSaveRole = async () => {
    if (!formData.displayName.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      if (editingRole) {
        // Update existing role permissions
        const response = await fetch(`${API_BASE_URL}/api/ims/roles/${editingRole.role_id}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permission_keys: selectedPermissions })
        });

        if (!response.ok) throw new Error('Failed to update role');
        alert('Role updated successfully!');
      } else {
        // Create new role
        // This would require a new endpoint - for now just update permissions
        alert('Create role feature requires backend endpoint');
      }

      setShowModal(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Error saving role');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ displayName: '', description: '' });
    setSelectedPermissions([]);
  };

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) {
      acc[perm.module_name] = [];
    }
    acc[perm.module_name].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-10 h-10 text-blue-600" />
              Role Management
            </h1>
            <p className="text-gray-600 mt-2">Manage system roles and their permissions</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Role
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Roles Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredRoles.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role, idx) => (
                    <tr key={role.role_id} className={idx !== filteredRoles.length - 1 ? 'border-b border-gray-200' : ''}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{role.display_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{role.role_name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{role.description || '-'}</td>
                      <td className="px-6 py-4">
                        {role.is_system_role ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            <Lock className="w-3 h-3" />
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No roles found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingRole ? `Edit: ${editingRole.display_name}` : 'Create New Role'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Role Info */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., Wing Manager"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this role for?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Permissions</h3>

                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">{module}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {perms.map((perm) => (
                        <label
                          key={perm.permission_id}
                          className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.permission_key)}
                            onChange={() => handleTogglePermission(perm.permission_key)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{perm.action_name}</p>
                            {perm.description && (
                              <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
