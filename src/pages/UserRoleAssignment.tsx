import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Shield,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2
} from 'lucide-react';
import { useIsSuperAdmin } from '../hooks/usePermission';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  cnic: string;
  office_id: number;
  wing_id: number;
  office_name: string;
  wing_name: string;
  is_super_admin: boolean;
  roles: UserRole[];
}

interface UserRole {
  user_role_id: string;
  role_name: string;
  display_name: string;
  scope_type: string;
  scope_wing_id: number | null;
  scope_wing_name: string | null;
  assigned_at: string;
  assigned_by_name: string;
}

interface Role {
  role_id: string;
  role_name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
}

interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  WingCode?: string;
}

const UserRoleAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useIsSuperAdmin();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [filterRole, setFilterRole] = useState('');
  // Applied filters (used for actual API calls)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedWing, setAppliedWing] = useState('');
  const [appliedRole, setAppliedRole] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    role_id: '',
    scope_type: 'Global',
    scope_wing_id: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Define fetch functions first with useCallback
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (appliedSearch) params.append('search', appliedSearch);
      if (appliedWing) params.append('wing_id', appliedWing);
      if (appliedRole) params.append('role_name', appliedRole);

      const response = await fetch(`${API_BASE_URL}/api/ims/users?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedWing, appliedRole]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/roles`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  const fetchWings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/wings`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWings(data);
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
    }
  }, []);

  // Handle manual search/filter submission
  const handleSearch = () => {
    setAppliedSearch(searchTerm);
    setAppliedWing(filterWing);
    setAppliedRole(filterRole);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterWing('');
    setFilterRole('');
    setAppliedSearch('');
    setAppliedWing('');
    setAppliedRole('');
  };

  // Redirect if not Super Admin
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  // Fetch initial data only once after auth is confirmed
  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchRoles();
      fetchWings();
    }
  }, [authLoading, isSuperAdmin, fetchRoles, fetchWings]);

  // Fetch users when applied filters change
  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchUsers();
    }
  }, [appliedSearch, appliedWing, appliedRole, authLoading, isSuperAdmin, fetchUsers]);

  const handleAssignRole = async () => {
    if (!selectedUser || !assignForm.role_id) return;

    try {
      const payload = {
        role_id: assignForm.role_id,
        scope_type: assignForm.scope_type,
        scope_wing_id: assignForm.scope_wing_id || null
      };

      const response = await fetch(`${API_BASE_URL}/api/ims/users/${selectedUser.user_id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Role assigned successfully!' });
        setShowAssignModal(false);
        setAssignForm({ role_id: '', scope_type: 'Global', scope_wing_id: '' });
        fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to assign role' });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setMessage({ type: 'error', text: 'Error assigning role' });
    }
  };

  const handleRevokeRole = async (userId: string, userRoleId: string) => {
    if (!confirm('Are you sure you want to revoke this role?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ims/users/${userId}/roles/${userRoleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Role revoked successfully!' });
        fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to revoke role' });
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      setMessage({ type: 'error', text: 'Error revoking role' });
    }
  };

  const filteredUsers = users;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Role Assignment</h1>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, email, or CNIC..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Wing</label>
            <select
              value={filterWing}
              onChange={(e) => setFilterWing(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option key="all-wings" value="">All Wings</option>
              {wings.map((wing) => (
                <option key={wing.Id} value={String(wing.Id)}>
                  {wing.Name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option key="all-roles" value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Clear Filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Office/Wing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {user.full_name}
                        {user.is_super_admin && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">{user.cnic}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">{user.office_name || 'N/A'}</div>
                      <div className="text-gray-500">{user.wing_name || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <div
                            key={role.user_role_id}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            <span>{role.display_name}</span>
                            <span className="text-blue-500">({role.scope_type})</span>
                            <button
                              onClick={() => handleRevokeRole(user.user_id, role.user_role_id)}
                              className="ml-1 text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No roles assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAssignModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Assign Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Assign Role</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignForm({ role_id: '', scope_type: 'Global', scope_wing_id: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Assigning role to:</p>
              <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Role *
                </label>
                <select
                  value={assignForm.role_id}
                  onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option key="choose-role" value="">Choose a role...</option>
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.display_name} {role.is_system_role && '(System Role)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scope Type *
                </label>
                <select
                  value={assignForm.scope_type}
                  onChange={(e) => setAssignForm({ ...assignForm, scope_type: e.target.value, scope_wing_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option key="scope-global" value="Global">Global (All)</option>
                  <option key="scope-wing" value="Wing">Wing Specific</option>
                  <option key="scope-office" value="Office">Office Specific</option>
                  <option key="scope-branch" value="Branch">Branch Specific</option>
                </select>
              </div>

              {/* Wing Selection (conditional) */}
              {assignForm.scope_type === 'Wing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Wing *
                  </label>
                  <select
                    value={assignForm.scope_wing_id}
                    onChange={(e) => setAssignForm({ ...assignForm, scope_wing_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option key="choose-wing" value="">Choose a wing...</option>
                    {wings.map((wing) => (
                      <option key={wing.Id} value={String(wing.Id)}>
                        {wing.Name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignForm({ role_id: '', scope_type: 'Global', scope_wing_id: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                disabled={!assignForm.role_id || (assignForm.scope_type === 'Wing' && !assignForm.scope_wing_id)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleAssignment;
