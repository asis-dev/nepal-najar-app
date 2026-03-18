'use client';

import { useState } from 'react';
import {
  ScrollText, Filter, Download, Clock,
  User, Edit3, Plus, Trash2, Eye, Shield,
  ChevronDown
} from 'lucide-react';

// Mock audit entries until backend endpoint is connected
const mockAuditEntries = [
  { id: '1', action: 'project.updated', actor: 'Admin User', target: 'Melamchi Water Supply Phase 2', details: 'Updated progress from 38% to 42%', timestamp: '2026-03-17T10:30:00Z', type: 'update' },
  { id: '2', action: 'blocker.created', actor: 'Admin User', target: 'East-West Highway Bridge Repairs', details: 'Created new blocker: Land acquisition dispute', timestamp: '2026-03-17T09:15:00Z', type: 'create' },
  { id: '3', action: 'milestone.completed', actor: 'System', target: 'Bir Hospital Modernization', details: 'Milestone "Phase 1 Equipment Procurement" marked complete', timestamp: '2026-03-16T16:45:00Z', type: 'update' },
  { id: '4', action: 'project.created', actor: 'Admin User', target: 'Solar Mini-Grid Karnali Province', details: 'New project created in Karnali Province', timestamp: '2026-03-16T14:20:00Z', type: 'create' },
  { id: '5', action: 'user.login', actor: 'Admin User', target: 'System', details: 'Successful login from 192.168.1.x', timestamp: '2026-03-16T08:00:00Z', type: 'auth' },
  { id: '6', action: 'evidence.uploaded', actor: 'Admin User', target: 'Smart Classroom Initiative Bagmati', details: 'Uploaded 3 site inspection photos', timestamp: '2026-03-15T15:30:00Z', type: 'create' },
  { id: '7', action: 'blocker.resolved', actor: 'Admin User', target: 'Provincial Water Supply Karnali', details: 'Resolved blocker: Contractor payment delay', timestamp: '2026-03-15T11:00:00Z', type: 'update' },
  { id: '8', action: 'project.status_changed', actor: 'Admin User', target: 'Digital Nepal Framework Phase 1', details: 'Status changed from active to cancelled', timestamp: '2026-03-14T09:45:00Z', type: 'update' },
];

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
  update: <Edit3 className="w-3.5 h-3.5 text-primary-400" />,
  delete: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
  auth: <Shield className="w-3.5 h-3.5 text-amber-400" />,
  view: <Eye className="w-3.5 h-3.5 text-gray-400" />,
};

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/10 border-emerald-500/20',
  update: 'bg-primary-500/10 border-primary-500/20',
  delete: 'bg-red-500/10 border-red-500/20',
  auth: 'bg-amber-500/10 border-amber-500/20',
  view: 'bg-gray-500/10 border-gray-500/20',
};

export default function AuditPage() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? mockAuditEntries
    : mockAuditEntries.filter(e => e.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-primary-400" />
            Audit Log
          </h1>
          <p className="section-subtitle">System activity and change history</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {['all', 'create', 'update', 'auth'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-np-border'
            }`}
          >
            {f === 'all' ? 'All Events' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-np-border/50">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${actionColors[entry.type] ?? actionColors.view}`}>
                {actionIcons[entry.type] ?? actionIcons.view}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">
                    {entry.action.replace('.', ' › ').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {entry.action}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{entry.details}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.actor}
                  </span>
                  <span>{entry.target}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.timestamp).toLocaleDateString()}
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
