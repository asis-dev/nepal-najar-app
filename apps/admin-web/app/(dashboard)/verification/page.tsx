'use client';

import { useState } from 'react';
import {
  Shield, Clock, CheckCircle, MessageSquare, AlertTriangle,
  ChevronRight, User, Calendar, Link2, Send, Upload
} from 'lucide-react';

// --- Mock data ---
type VerificationStatus = 'pending' | 'responded' | 'resolved';
type Urgency = 'low' | 'medium' | 'high' | 'critical';

interface VerificationRequest {
  id: string;
  question: string;
  target_user: string;
  target_unit: string;
  project_id: string;
  project_name: string;
  due_date: string;
  urgency: Urgency;
  status: VerificationStatus;
  created_at: string;
  response?: string;
  official_data?: string;
  observational_data?: string;
  has_contradiction: boolean;
}

const mockRequests: VerificationRequest[] = [
  {
    id: '1', question: 'The geo-tagged photos show no foundation work at KM 42, but the milestone report claims 85% completion. Please verify actual progress.',
    target_user: 'Ram Shrestha', target_unit: 'District Engineering Office, Kathmandu',
    project_id: 'p1', project_name: 'Kathmandu Expressway Phase 2',
    due_date: '2026-03-18', urgency: 'critical', status: 'pending', created_at: '2026-03-14',
    has_contradiction: true,
    official_data: 'Foundation work: 85% complete',
    observational_data: 'Geo-tagged photos show bare land, no construction activity visible'
  },
  {
    id: '2', question: 'Budget release record shows NPR 120M disbursed last week, but project team reports no funds received. Please confirm transfer status.',
    target_user: 'Sita Gurung', target_unit: 'Budget Division, MoF',
    project_id: 'p3', project_name: 'Rural Electrification Karnali',
    due_date: '2026-03-20', urgency: 'high', status: 'pending', created_at: '2026-03-13',
    has_contradiction: true,
    official_data: 'NPR 120M released on March 6',
    observational_data: 'Project team has not received any funds as of March 13'
  },
  {
    id: '3', question: 'The uploaded completion certificate for Block C appears to have inconsistent dates. The certificate date is before construction start date.',
    target_user: 'Binod KC', target_unit: 'Project Management Unit',
    project_id: 'p4', project_name: 'School Reconstruction Batch 12',
    due_date: '2026-03-22', urgency: 'medium', status: 'responded', created_at: '2026-03-10',
    response: 'The certificate was re-issued after corrections. The original date was a typo that has been corrected in the re-uploaded document.',
    has_contradiction: false,
  },
  {
    id: '4', question: 'Field inspector notes indicate environmental clearance is still pending, but the project dashboard shows it as resolved. Please clarify.',
    target_user: 'Deepak Rai', target_unit: 'Environmental Division',
    project_id: 'p7', project_name: 'Hydropower Tamakoshi',
    due_date: '2026-03-25', urgency: 'low', status: 'responded', created_at: '2026-03-08',
    response: 'Conditional clearance was granted on March 5. Full clearance is expected by March 30 pending water flow assessment.',
    has_contradiction: false,
  },
  {
    id: '5', question: 'Satellite imagery from last week shows no activity at the solar panel installation site, contradicting reported 60% physical progress.',
    target_user: 'Bikash Poudel', target_unit: 'Renewable Energy Authority',
    project_id: 'p8', project_name: 'Solar Farm Bardiya',
    due_date: '2026-03-19', urgency: 'high', status: 'pending', created_at: '2026-03-12',
    has_contradiction: true,
    official_data: 'Physical progress: 60% complete',
    observational_data: 'Satellite imagery shows minimal ground activity'
  },
];

const urgencyConfig: Record<Urgency, { color: string; label: string }> = {
  low: { color: 'badge-gray', label: 'Low' },
  medium: { color: 'badge-blue', label: 'Medium' },
  high: { color: 'badge-yellow', label: 'High' },
  critical: { color: 'badge-red', label: 'Critical' },
};

const statusConfig: Record<VerificationStatus, { color: string; label: string }> = {
  pending: { color: 'badge-yellow', label: 'Pending' },
  responded: { color: 'badge-blue', label: 'Responded' },
  resolved: { color: 'badge-green', label: 'Resolved' },
};

export default function VerificationPage() {
  const [tab, setTab] = useState<'pending' | 'responded' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = mockRequests.filter((r) => {
    if (tab === 'all') return true;
    return r.status === tab;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Inbox</h1>
          <p className="text-gray-500 mt-1">Manage verification requests and data contradictions</p>
        </div>
        <button className="btn-primary">+ New Request</button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['pending', 'responded', 'all'] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
            <span className="ml-1.5 text-xs text-gray-400">
              ({mockRequests.filter((r) => t === 'all' || r.status === t).length})
            </span>
          </button>
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-4">
        {filtered.map((req) => (
          <div key={req.id} className="card overflow-hidden">
            {/* Card header */}
            <div
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  req.has_contradiction ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {req.has_contradiction ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{req.question}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {req.target_user} — {req.target_unit}
                    </span>
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {req.project_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due: {req.due_date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={urgencyConfig[req.urgency].color}>{urgencyConfig[req.urgency].label}</span>
                  <span className={statusConfig[req.status].color}>{statusConfig[req.status].label}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === req.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === req.id && (
              <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                {/* Contradiction comparison */}
                {req.has_contradiction && req.official_data && req.observational_data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Official Report</p>
                      <p className="text-sm text-blue-900">{req.official_data}</p>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Observational Data</p>
                      <p className="text-sm text-orange-900">{req.observational_data}</p>
                    </div>
                  </div>
                )}

                {/* Response */}
                {req.response && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Response</p>
                    <p className="text-sm text-green-900">{req.response}</p>
                  </div>
                )}

                {/* Response Form (for pending) */}
                {req.status === 'pending' && (
                  <div className="space-y-3">
                    <textarea
                      className="input min-h-[100px]"
                      placeholder="Type your response..."
                    />
                    <div className="flex items-center gap-3">
                      <button className="btn-primary flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Submit Response
                      </button>
                      <button className="btn-secondary flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Attach Evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
