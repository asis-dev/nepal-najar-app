'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, Shield, X,
  Mail, Phone, MapPin, Clock, Trash2, ShieldCheck, ShieldOff, Loader2,
} from 'lucide-react';

// --- Types ---
interface UserProfile {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: 'citizen' | 'admin';
  province: string | null;
  district: string | null;
  created_at: string;
}

// --- API helpers ---
async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/users');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch users');
  }
  return res.json();
}

async function inviteUser(payload: { email: string; display_name: string }) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to invite user');
  }
  return res.json();
}

async function updateUserRole(id: string, role: 'citizen' | 'admin') {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to update role');
  }
  return res.json();
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to delete user');
  }
  return res.json();
}

// --- Page ---
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'citizen'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'citizen' | 'admin' }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDelete(null);
    },
  });

  // Filter
  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName = u.display_name?.toLowerCase().includes(q);
      const matchesEmail = u.email?.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            Manage platform users and roles
            {!isLoading && <span className="ml-2 text-xs text-gray-400">({users.length} total)</span>}
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowInviteModal(true)}
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="bg-transparent outline-none text-sm flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'citizen')}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="citizen">Citizen</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {(error as Error).message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading users...</span>
        </div>
      )}

      {/* Users Table */}
      {!isLoading && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Email / Phone</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Province</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Joined</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {search || roleFilter !== 'all'
                        ? 'No users match your filters'
                        : 'No users yet'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-700">
                              {(user.display_name || '?')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {user.display_name || '(no name)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="space-y-0.5">
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {user.role === 'admin' ? (
                          <span className="badge-blue flex items-center gap-1 w-fit">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="badge-green w-fit">Citizen</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {user.province ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>
                              {user.province}
                              {user.district ? `, ${user.district}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {/* Toggle role */}
                          {user.role === 'citizen' ? (
                            <button
                              className="text-xs font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1 disabled:opacity-50"
                              title="Promote to admin"
                              disabled={roleMutation.isPending}
                              onClick={() => roleMutation.mutate({ id: user.id, role: 'admin' })}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Promote
                            </button>
                          ) : (
                            <button
                              className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1 disabled:opacity-50"
                              title="Demote to citizen"
                              disabled={roleMutation.isPending}
                              onClick={() => roleMutation.mutate({ id: user.id, role: 'citizen' })}
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              Demote
                            </button>
                          )}

                          {/* Delete */}
                          {confirmDelete === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                disabled={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(user.id)}
                              >
                                {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                className="text-xs text-gray-400 hover:text-gray-600"
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1"
                              title="Delete user"
                              onClick={() => setConfirmDelete(user.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite User</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteName('');
                  inviteMutation.reset();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Create a new user account. They will receive a confirmation email.
            </p>

            {inviteMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {(inviteMutation.error as Error).message}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Full name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={!inviteEmail || inviteMutation.isPending}
                onClick={() =>
                  inviteMutation.mutate({
                    email: inviteEmail,
                    display_name: inviteName,
                  })
                }
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create User
                  </>
                )}
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteName('');
                  inviteMutation.reset();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
