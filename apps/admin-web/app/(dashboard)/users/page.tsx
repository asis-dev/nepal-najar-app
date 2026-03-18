'use client';

import { useState } from 'react';
import {
  Users, Search, Plus, Shield, X, ChevronRight,
  Mail, Phone, Building2, Clock, CheckCircle, XCircle
} from 'lucide-react';

// --- Mock data ---
interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  govt_unit: string;
  status: 'active' | 'inactive' | 'suspended';
  verified: boolean;
  created_at: string;
  last_login: string;
  activity: { action: string; date: string }[];
  role_history: { role: string; assigned_at: string; assigned_by: string }[];
}

const mockUsers: UserRecord[] = [
  {
    id: '1', name: 'Ram Shrestha', email: 'ram.shrestha@gov.np', phone: '+977-9841234567',
    roles: ['District Engineer', 'Project Manager'], govt_unit: 'District Engineering Office, Kathmandu',
    status: 'active', verified: true, created_at: '2025-06-15', last_login: '2026-03-16',
    activity: [
      { action: 'Uploaded evidence for Kathmandu Expressway', date: '2026-03-14' },
      { action: 'Updated milestone progress', date: '2026-03-12' },
      { action: 'Submitted verification response', date: '2026-03-10' },
    ],
    role_history: [
      { role: 'Project Manager', assigned_at: '2026-01-15', assigned_by: 'Admin User' },
      { role: 'District Engineer', assigned_at: '2025-06-15', assigned_by: 'System' },
    ],
  },
  {
    id: '2', name: 'Sita Gurung', email: 'sita.gurung@mof.gov.np', phone: '+977-9852345678',
    roles: ['Budget Officer'], govt_unit: 'Budget Division, MoF',
    status: 'active', verified: true, created_at: '2025-08-22', last_login: '2026-03-15',
    activity: [
      { action: 'Released NPR 120M for Rural Electrification', date: '2026-03-13' },
      { action: 'Updated FY 2082/83 allocations', date: '2026-03-08' },
    ],
    role_history: [
      { role: 'Budget Officer', assigned_at: '2025-08-22', assigned_by: 'Admin User' },
    ],
  },
  {
    id: '3', name: 'Deepak Rai', email: 'deepak.rai@mopit.gov.np', phone: '+977-9863456789',
    roles: ['Field Inspector'], govt_unit: 'Ministry of Physical Infrastructure',
    status: 'active', verified: true, created_at: '2025-09-10', last_login: '2026-03-14',
    activity: [
      { action: 'Submitted inspection report for Koshi Bridge', date: '2026-03-10' },
    ],
    role_history: [
      { role: 'Field Inspector', assigned_at: '2025-09-10', assigned_by: 'Admin User' },
    ],
  },
  {
    id: '4', name: 'Hari Thapa', email: 'hari.thapa@energy.gov.np', phone: '+977-9874567890',
    roles: ['Project Manager'], govt_unit: 'Renewable Energy Authority',
    status: 'active', verified: false, created_at: '2026-01-05', last_login: '2026-03-12',
    activity: [],
    role_history: [
      { role: 'Project Manager', assigned_at: '2026-01-05', assigned_by: 'System' },
    ],
  },
  {
    id: '5', name: 'Anita Maharjan', email: 'anita.m@mopit.gov.np', phone: '+977-9885678901',
    roles: ['Legal Advisor'], govt_unit: 'Ministry of Physical Infrastructure',
    status: 'inactive', verified: true, created_at: '2025-07-20', last_login: '2026-02-01',
    activity: [],
    role_history: [
      { role: 'Legal Advisor', assigned_at: '2025-07-20', assigned_by: 'Admin User' },
    ],
  },
  {
    id: '6', name: 'Binod KC', email: 'binod.kc@pmu.gov.np', phone: '+977-9896789012',
    roles: ['Project Manager', 'District Engineer'], govt_unit: 'Project Management Unit',
    status: 'active', verified: true, created_at: '2025-05-01', last_login: '2026-03-16',
    activity: [
      { action: 'Completed milestone for School Reconstruction', date: '2026-03-11' },
      { action: 'Uploaded completion certificate', date: '2026-03-11' },
    ],
    role_history: [
      { role: 'District Engineer', assigned_at: '2025-11-01', assigned_by: 'Admin User' },
      { role: 'Project Manager', assigned_at: '2025-05-01', assigned_by: 'System' },
    ],
  },
  {
    id: '7', name: 'Sarita Lama', email: 'sarita.lama@env.gov.np', phone: '+977-9807890123',
    roles: ['Environmental Officer'], govt_unit: 'Environmental Division',
    status: 'suspended', verified: true, created_at: '2025-10-15', last_login: '2026-01-20',
    activity: [],
    role_history: [
      { role: 'Environmental Officer', assigned_at: '2025-10-15', assigned_by: 'Admin User' },
    ],
  },
];

const allRoles = ['Super Admin', 'Project Manager', 'District Engineer', 'Budget Officer', 'Field Inspector', 'Legal Advisor', 'Environmental Officer', 'Data Entry'];

const statusBadge: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  suspended: 'badge-red',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserRecord | null>(null);

  const filtered = mockUsers.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage platform users, roles, and permissions</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
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
        <select className="input w-auto text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 font-medium text-gray-500">Phone</th>
                <th className="px-6 py-3 font-medium text-gray-500">Roles</th>
                <th className="px-6 py-3 font-medium text-gray-500">Govt Unit</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Verified</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <button
                      className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      onClick={() => setSelectedUser(user)}
                    >
                      {user.name}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{user.email}</td>
                  <td className="px-6 py-3 text-gray-600">{user.phone}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className="badge-blue text-[10px]">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate">{user.govt_unit}</td>
                  <td className="px-6 py-3">
                    <span className={statusBadge[user.status]}>{user.status}</span>
                  </td>
                  <td className="px-6 py-3">
                    {user.verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      className="text-sm text-primary-600 hover:underline font-medium"
                      onClick={() => { setRoleTarget(user); setShowRoleModal(true); }}
                    >
                      Assign Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-700">
                    {selectedUser.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                  <span className={statusBadge[selectedUser.status]}>{selectedUser.status}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{selectedUser.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span>{selectedUser.govt_unit}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last login: {selectedUser.last_login}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUser.roles.map((r) => (
                    <span key={r} className="badge-blue">{r}</span>
                  ))}
                </div>
              </div>

              {/* Role History */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Role History</p>
                <div className="space-y-2">
                  {selectedUser.role_history.map((rh, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{rh.role}</span>
                        <p className="text-xs text-gray-500">by {rh.assigned_by}</p>
                      </div>
                      <span className="text-xs text-gray-400">{rh.assigned_at}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</p>
                {selectedUser.activity.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.activity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-700">{a.action}</p>
                          <p className="text-xs text-gray-400">{a.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assign Role</h3>
              <button onClick={() => { setShowRoleModal(false); setRoleTarget(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Assign a role to <span className="font-medium text-gray-900">{roleTarget.name}</span>
            </p>

            <div className="space-y-2 mb-6">
              {allRoles.map((role) => {
                const hasRole = roleTarget.roles.includes(role);
                return (
                  <label
                    key={role}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      hasRole ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input type="checkbox" defaultChecked={hasRole} className="w-4 h-4 accent-primary-600" />
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{role}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-primary flex-1">Save Roles</button>
              <button className="btn-secondary flex-1" onClick={() => { setShowRoleModal(false); setRoleTarget(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
