'use client';

import { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Filter, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend
} from 'recharts';

// --- Mock data ---
const summary = {
  totalAllocated: 245_800_000_000,
  totalReleased: 187_300_000_000,
  totalSpent: 142_600_000_000,
  utilizationRate: 76.1,
};

const ministryBudgets = [
  { name: 'Physical Infra', allocated: 82, released: 65, spent: 48 },
  { name: 'Energy', allocated: 45, released: 38, spent: 29 },
  { name: 'Education', allocated: 32, released: 28, spent: 25 },
  { name: 'Health', allocated: 28, released: 22, spent: 18 },
  { name: 'Water Supply', allocated: 24, released: 15, spent: 10 },
  { name: 'Agriculture', allocated: 18, released: 12, spent: 8 },
  { name: 'Urban Dev', allocated: 12, released: 5, spent: 3 },
  { name: 'ICT', allocated: 5, released: 3, spent: 2 },
];

interface BudgetRow {
  id: string;
  project: string;
  ministry: string;
  allocated: number;
  released: number;
  spent: number;
  utilization: number;
  status: 'healthy' | 'under_utilized' | 'over_budget' | 'at_risk';
}

const budgetRows: BudgetRow[] = [
  { id: '1', project: 'Kathmandu Expressway Phase 2', ministry: 'Physical Infrastructure', allocated: 4200, released: 3100, spent: 3500, utilization: 113, status: 'over_budget' },
  { id: '2', project: 'Melamchi Water Supply', ministry: 'Water Supply', allocated: 2800, released: 1200, spent: 980, utilization: 82, status: 'healthy' },
  { id: '3', project: 'Rural Electrification Karnali', ministry: 'Energy', allocated: 1500, released: 1100, spent: 420, utilization: 38, status: 'under_utilized' },
  { id: '4', project: 'School Reconstruction Batch 12', ministry: 'Education', allocated: 890, released: 850, spent: 780, utilization: 92, status: 'healthy' },
  { id: '5', project: 'Digital Health Records', ministry: 'Health', allocated: 320, released: 200, spent: 185, utilization: 93, status: 'healthy' },
  { id: '6', project: 'Pokhara Airport Extension', ministry: 'Physical Infrastructure', allocated: 3100, released: 800, spent: 750, utilization: 94, status: 'at_risk' },
  { id: '7', project: 'Solar Farm Bardiya', ministry: 'Energy', allocated: 680, released: 680, spent: 590, utilization: 87, status: 'healthy' },
  { id: '8', project: 'Hydropower Tamakoshi', ministry: 'Energy', allocated: 5200, released: 3800, spent: 3200, utilization: 84, status: 'healthy' },
];

const anomalies = [
  { id: '1', project: 'Kathmandu Expressway Phase 2', type: 'over_budget', message: 'Spending exceeds released funds by NPR 400M', severity: 'critical' as const },
  { id: '2', project: 'Rural Electrification Karnali', type: 'under_utilized', message: 'Only 38% utilization despite 73% fund release', severity: 'warning' as const },
  { id: '3', project: 'Pokhara Airport Extension', type: 'release_delay', message: 'Only 26% of budget released, 8 months into project', severity: 'warning' as const },
  { id: '4', project: 'Urban Dev Smart City Pilot', type: 'spending_spike', message: 'NPR 120M spent in last 2 weeks (4x normal rate)', severity: 'critical' as const },
];

function formatNPR(value: number): string {
  if (value >= 1000) return `NPR ${(value / 1000).toFixed(1)}B`;
  return `NPR ${value}M`;
}

function formatLargeNPR(value: number): string {
  if (value >= 1_000_000_000) return `NPR ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `NPR ${(value / 1_000_000).toFixed(0)}M`;
  return `NPR ${value.toLocaleString()}`;
}

const statusBadge: Record<string, string> = {
  healthy: 'badge-green',
  under_utilized: 'badge-yellow',
  over_budget: 'badge-red',
  at_risk: 'badge-yellow',
};

const statusLabel: Record<string, string> = {
  healthy: 'Healthy',
  under_utilized: 'Under-utilized',
  over_budget: 'Over Budget',
  at_risk: 'At Risk',
};

export default function BudgetPage() {
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRows = budgetRows.filter((r) => {
    if (ministryFilter !== 'all' && r.ministry !== ministryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Overview</h1>
          <p className="text-gray-500 mt-1">National budget allocation and expenditure tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto text-sm">
            <option>FY 2082/83</option>
            <option>FY 2081/82</option>
            <option>FY 2080/81</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Allocated"
          value={formatLargeNPR(summary.totalAllocated)}
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          label="Total Released"
          value={formatLargeNPR(summary.totalReleased)}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="green"
          subtitle={`${((summary.totalReleased / summary.totalAllocated) * 100).toFixed(0)}% of allocated`}
        />
        <SummaryCard
          label="Total Spent"
          value={formatLargeNPR(summary.totalSpent)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="purple"
          subtitle={`${((summary.totalSpent / summary.totalReleased) * 100).toFixed(0)}% of released`}
        />
        <SummaryCard
          label="Utilization Rate"
          value={`${summary.utilizationRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color={summary.utilizationRate >= 70 ? 'green' : 'yellow'}
        />
      </div>

      {/* Ministry Budget Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Budget by Ministry (NPR Billions)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ministryBudgets}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}B`} />
              <Tooltip
                formatter={(value: number, name: string) => [`NPR ${value}B`, name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="allocated" name="Allocated" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="released" name="Released" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters + Budget Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="text-lg font-semibold flex-1">Budget Health</h2>
          <select className="input w-auto text-sm" value={ministryFilter} onChange={(e) => setMinistryFilter(e.target.value)}>
            <option value="all">All Ministries</option>
            {[...new Set(budgetRows.map((r) => r.ministry))].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="under_utilized">Under-utilized</option>
            <option value="over_budget">Over Budget</option>
            <option value="at_risk">At Risk</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                <th className="px-6 py-3 font-medium text-gray-500">Ministry</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Allocated</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Released</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Spent</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilization</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.project}</td>
                  <td className="px-6 py-3 text-gray-600">{row.ministry}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{formatNPR(row.allocated)}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{formatNPR(row.released)}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{formatNPR(row.spent)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={row.utilization > 100 ? 'text-red-600 font-semibold' : row.utilization < 50 ? 'text-yellow-600 font-semibold' : 'text-gray-700'}>
                      {row.utilization}%
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={statusBadge[row.status]}>{statusLabel[row.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomaly Alerts */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Anomaly Alerts
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {anomalies.map((a) => (
            <div key={a.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{a.project}</p>
                <p className="text-sm text-gray-500 mt-0.5">{a.message}</p>
              </div>
              <span className={a.severity === 'critical' ? 'badge-red' : 'badge-yellow'}>
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
