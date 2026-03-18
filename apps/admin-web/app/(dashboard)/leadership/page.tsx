'use client';

import {
  Crown, TrendingUp, AlertTriangle, Shield, BarChart3,
  ArrowUpRight, ArrowDownRight, ChevronRight, Clock,
  Building2, Target, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from 'recharts';

// --- Mock data ---
const kpis = {
  totalProjects: 142,
  onTrack: 43.7,
  delayed: 24.6,
  blocked: 12.7,
  budgetHealth: 76.1,
};

const provinces = [
  { name: 'Koshi', projects: 22, delayed: 4, severity: 'low' },
  { name: 'Madhesh', projects: 18, delayed: 7, severity: 'high' },
  { name: 'Bagmati', projects: 34, delayed: 5, severity: 'medium' },
  { name: 'Gandaki', projects: 16, delayed: 2, severity: 'low' },
  { name: 'Lumbini', projects: 20, delayed: 6, severity: 'medium' },
  { name: 'Karnali', projects: 14, delayed: 8, severity: 'critical' },
  { name: 'Sudurpashchim', projects: 18, delayed: 6, severity: 'high' },
];

const blockerCategories = [
  { name: 'Land Acquisition', count: 14 },
  { name: 'Procurement', count: 11 },
  { name: 'Environmental', count: 8 },
  { name: 'Technical', count: 6 },
  { name: 'Financial', count: 5 },
  { name: 'Political', count: 4 },
  { name: 'Coordination', count: 3 },
];

const escalations = [
  { id: '1', title: 'Land acquisition freeze — Kathmandu Expressway Phase 2', project: 'Kathmandu Expressway Phase 2', urgency: 'critical', days_pending: 45, escalated_to: 'Ministry Secretary' },
  { id: '2', title: 'Procurement irregularity — Pokhara Airport Extension', project: 'Pokhara Airport Extension', urgency: 'critical', days_pending: 32, escalated_to: 'Secretary, MoPIT' },
  { id: '3', title: 'Budget release hold — Rural Electrification Karnali', project: 'Rural Electrification Karnali', urgency: 'high', days_pending: 21, escalated_to: 'Budget Division, MoF' },
  { id: '4', title: 'Environmental clearance — Hydropower Tamakoshi', project: 'Hydropower Tamakoshi', urgency: 'high', days_pending: 18, escalated_to: 'Ministry of Forests' },
  { id: '5', title: 'Inter-ministry coordination — Digital Health', project: 'Digital Health Records', urgency: 'medium', days_pending: 12, escalated_to: 'PMO' },
];

const ministryPerformance = [
  { ministry: 'Education', projects: 21, avgProgress: 82, blockers: 2, confidence: 91 },
  { ministry: 'ICT', projects: 6, avgProgress: 89, blockers: 0, confidence: 95 },
  { ministry: 'Agriculture', projects: 14, avgProgress: 73, blockers: 3, confidence: 78 },
  { ministry: 'Health', projects: 19, avgProgress: 67, blockers: 4, confidence: 72 },
  { ministry: 'Physical Infrastructure', projects: 32, avgProgress: 58, blockers: 12, confidence: 54 },
  { ministry: 'Energy', projects: 24, avgProgress: 55, blockers: 7, confidence: 61 },
  { ministry: 'Water Supply', projects: 16, avgProgress: 45, blockers: 6, confidence: 48 },
  { ministry: 'Urban Development', projects: 10, avgProgress: 42, blockers: 4, confidence: 45 },
];

const interventionProjects = [
  { id: '1', name: 'Kathmandu-Terai Expressway Phase 2', reason: 'Land acquisition blocked for 45+ days, 23% progress', ministry: 'Physical Infrastructure' },
  { id: '2', name: 'Pokhara Airport Runway Extension', reason: 'Procurement irregularity under investigation, 18% progress', ministry: 'Physical Infrastructure' },
  { id: '3', name: 'Rural Electrification Karnali', reason: 'Budget release hold, only 38% utilization', ministry: 'Energy' },
  { id: '4', name: 'Melamchi Water Supply Expansion', reason: 'Multiple technical blockers, 98 days delayed', ministry: 'Water Supply' },
];

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const urgencyBadge: Record<string, string> = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-yellow',
  critical: 'badge-red',
};

export default function LeadershipPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          Leadership Command Dashboard
        </h1>
        <p className="text-gray-500 mt-1">National development intelligence for executive decision-makers</p>
      </div>

      {/* National KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Total Projects" value={kpis.totalProjects.toString()} color="blue" />
        <KPICard label="On Track" value={`${kpis.onTrack}%`} color="green" />
        <KPICard label="Delayed" value={`${kpis.delayed}%`} color="yellow" />
        <KPICard label="Blocked" value={`${kpis.blocked}%`} color="red" />
        <KPICard label="Budget Health" value={`${kpis.budgetHealth}%`} color={kpis.budgetHealth >= 70 ? 'green' : 'yellow'} />
      </div>

      {/* Delay Heatmap + Blocker Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Province Delay Heatmap */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Delay Heatmap by Province</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {provinces.map((prov) => (
              <div
                key={prov.name}
                className={`rounded-xl border p-4 text-center ${severityColors[prov.severity]}`}
              >
                <p className="font-semibold text-sm">{prov.name}</p>
                <p className="text-2xl font-bold mt-1">{prov.delayed}</p>
                <p className="text-xs mt-0.5">of {prov.projects} delayed</p>
                <p className="text-xs font-medium mt-1 capitalize">{prov.severity}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Blocker Categories */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Top Blocker Categories</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockerCategories} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} blockers`, 'Count']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Escalation Queue */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Escalation Queue</h2>
          <span className="badge-red ml-2">{escalations.length} active</span>
        </div>
        <div className="divide-y divide-gray-100">
          {escalations.map((esc) => (
            <div key={esc.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{esc.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Escalated to: {esc.escalated_to}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {esc.days_pending} days pending
                  </span>
                </div>
              </div>
              <span className={urgencyBadge[esc.urgency]}>{esc.urgency}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ministry Performance */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Ministry Performance Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Ministry</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Projects</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Avg Progress</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Blockers</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ministryPerformance.map((m) => (
                <tr key={m.ministry} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{m.ministry}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{m.projects}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${m.avgProgress >= 70 ? 'bg-green-500' : m.avgProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${m.avgProgress}%` }}
                        />
                      </div>
                      <span className="text-gray-600 w-10 text-right">{m.avgProgress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={m.blockers > 5 ? 'text-red-600 font-semibold' : 'text-gray-600'}>{m.blockers}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.confidence >= 80 ? 'bg-green-100 text-green-700' :
                      m.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {m.confidence}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intervention Needed */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold">Intervention Needed</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {interventionProjects.map((p) => (
            <div key={p.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.reason}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.ministry}</p>
              </div>
              <button className="text-xs font-medium text-primary-600 hover:underline">View Details</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-50/50',
    green: 'border-l-green-500 bg-green-50/50',
    yellow: 'border-l-yellow-500 bg-yellow-50/50',
    red: 'border-l-red-500 bg-red-50/50',
  };
  return (
    <div className={`card border-l-4 p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
