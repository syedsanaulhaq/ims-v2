import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Lock,
  Loader2
} from 'lucide-react';
import { useIsSuperAdmin } from '../hooks/usePermission';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Role {
  role_id: string;
  role_name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
  user_count: number;
  permission_count: number;
}

interface Permission {
  permission_id: string;
  permission_key: string;
  module_name: string;
  action_name: string;
  description: string;
}

interface RoleUser {
  user_id: string;
  full_name: string;
  email: string;
  cnic: string;
  scope_type: string;
  assigned_at: string;
  assigned_by_name: string;
}

const RoleManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useIsSuperAdmin();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');

  // Redirect if not Super Admin
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  // Fetch roles
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
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch roles:', response.status, errorText);
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
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch permissions:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchRoleDetails = async (roleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/roles/${roleId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRole(data);
        setRolePermissions(data.permissions || []);
        setSelectedPermissions((data.permissions || []).map((p: Permission) => p.permission_key));
        setRoleUsers(data.users || []);
        setShowModal(true);
        setModalMode('view');
      }
    } catch (error) {
      console.error('Error fetching role details:', error);
    }
  };

  const handleViewRole = (role: Role) => {
    fetchRoleDetails(role.role_id);
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setRolePermissions([]);
    setRoleUsers([]);
    setSelectedPermissions([]);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditMode = () => {
    setModalMode('edit');
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionKey)
        ? prev.filter(k => k !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/roles/${selectedRole.role_id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission_keys: selectedPermissions })
      });

      if (response.ok) {
        alert('Permissions updated successfully!');
        fetchRoleDetails(selectedRole.role_id);
        setModalMode('view');
      } else {
        alert('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Error updating permissions');
    }
  };

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) {
      acc[perm.module_name] = [];
    }
    acc[perm.module_name].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Role Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage system roles and permissions
            </p>
          </div>
          <button
            onClick={handleCreateRole}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => r.is_system_role).length}
              </p>
            </div>
            <Lock className="w-8 h-8 text-gray-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Custom Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => !r.is_system_role).length}
              </p>
            </div>
            <Edit className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Permissions</p>
              <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
            </div>
            <Key className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search roles by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <div
              key={role.role_id}
              className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewRole(role)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${role.is_system_role ? 'text-gray-600' : 'text-blue-600'}`} />
                  <h3 className="font-semibold text-gray-900">{role.display_name}</h3>
                </div>
                {role.is_system_role && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    System
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {role.description || 'No description available'}
              </p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{role.user_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Key className="w-4 h-4" />
                    <span>{role.permission_count}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewRole(role);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredRoles.length === 0 && !loading && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No roles found matching your search.</p>
        </div>
      )}

      {/* Role Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedRole ? (
                      <>
                        <Shield className="w-6 h-6 text-blue-600" />
                        {selectedRole.display_name}
                      </>
                    ) : (
                      <>
                        <Plus className="w-6 h-6 text-blue-600" />
                        Create New Role
                      </>
                    )}
                  </h2>
                  {selectedRole && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRole.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedRole && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">{selectedRole.user_count} users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">{rolePermissions.length} permissions</span>
                  </div>
                  {selectedRole.is_system_role && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      System Role (Protected)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
                {modalMode === 'view' && selectedRole && selectedRole.role_name !== 'IMS_SUPER_ADMIN' && (
                  <button
                    onClick={handleEditMode}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Permissions
                  </button>
                )}
              </div>
              
              {Object.entries(permissionsByModule).map(([module, perms]) => {
                const isEditing = modalMode === 'edit' || modalMode === 'create';
                
                return (
                  <div key={module} className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-600" />
                      {module}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      {perms.map((perm) => {
                        const isSelected = selectedPermissions.includes(perm.permission_key);
                        
                        return (
                          <div
                            key={perm.permission_id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              isEditing
                                ? 'cursor-pointer hover:bg-blue-50 ' + (isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200')
                                : isSelected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => isEditing && handleTogglePermission(perm.permission_key)}
                          >
                            {isEditing ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePermission(perm.permission_key)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            ) : isSelected ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                {perm.action_name}
                              </p>
                              {perm.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5 font-mono">{perm.permission_key}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {rolePermissions.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No permissions assigned to this role.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {modalMode === 'edit' ? (
                <>
                  <button
                    onClick={() => {
                      setModalMode('view');
                      setSelectedPermissions(rolePermissions.map(p => p.permission_key));
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
