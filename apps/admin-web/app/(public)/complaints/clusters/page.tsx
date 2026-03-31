'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  MapPin,
  AlertTriangle,
  Clock,
  FileText,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useClusters, type ClusterFilters } from '@/lib/hooks/use-complaints';

const ISSUE_LABELS: Record<string, { en: string; ne: string }> = {
  roads: { en: 'Roads', ne: 'सडक' },
  water: { en: 'Water', ne: 'पानी' },
  electricity: { en: 'Electricity', ne: 'बिजुली' },
  health: { en: 'Health', ne: 'स्वास्थ्य' },
  education: { en: 'Education', ne: 'शिक्षा' },
  sanitation: { en: 'Sanitation', ne: 'सरसफाइ' },
  internet: { en: 'Internet', ne: 'इन्टरनेट' },
  safety: { en: 'Safety', ne: 'सुरक्षा' },
  employment: { en: 'Employment', ne: 'रोजगार' },
  environment: { en: 'Environment', ne: 'वातावरण' },
  other: { en: 'Other', ne: 'अन्य' },
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  acknowledged: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function ClustersPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const [filters, setFilters] = useState<ClusterFilters>({});
  const { data, isLoading } = useClusters(filters);

  const clusters = data?.clusters || [];

  return (
    <div className="public-page">
      <div className="relative z-10">
        {/* Header */}
        <div className="px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? 'नागरिक समस्या' : 'Civic Issues'}
            </Link>
          </div>
        </div>

        <section className="px-3 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-primary-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {isNe ? 'समस्या क्लस्टरहरू' : 'Issue Clusters'}
              </h1>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {isNe
                ? 'समान समस्याहरू एकसाथ समूहित — एक स्थान, एक SLA, एक सार्वजनिक स्थिति।'
                : 'Similar reports grouped together — one location, one SLA, one public status.'}
            </p>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-4">
              <select
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value || undefined }))
                }
              >
                <option value="">{isNe ? 'सबै स्थिति' : 'All Status'}</option>
                <option value="open">{isNe ? 'खुला' : 'Open'}</option>
                <option value="acknowledged">{isNe ? 'स्वीकृत' : 'Acknowledged'}</option>
                <option value="in_progress">{isNe ? 'प्रगतिमा' : 'In Progress'}</option>
                <option value="resolved">{isNe ? 'समाधान' : 'Resolved'}</option>
              </select>
              <select
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300"
                value={filters.issue_type || ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, issue_type: e.target.value || undefined }))
                }
              >
                <option value="">{isNe ? 'सबै प्रकार' : 'All Types'}</option>
                {Object.entries(ISSUE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {isNe ? label.ne : label.en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Cluster List */}
        <section className="px-3 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto space-y-3">
            {isLoading ? (
              <div className="glass-card p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {isNe ? 'लोड हुँदैछ...' : 'Loading clusters...'}
                </p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Layers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isNe ? 'कुनै क्लस्टर फेला परेन।' : 'No clusters found.'}
                </p>
              </div>
            ) : (
              clusters.map((cluster) => {
                const issueLabel =
                  ISSUE_LABELS[cluster.issue_type]?.[isNe ? 'ne' : 'en'] || cluster.issue_type;
                const statusStyle = STATUS_STYLES[cluster.status] || STATUS_STYLES.open;

                return (
                  <Link
                    key={cluster.id}
                    href={`/complaints/clusters/${cluster.id}`}
                    className="glass-card block p-4 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle}`}
                          >
                            {cluster.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            {issueLabel}
                          </span>
                          {cluster.severity === 'critical' || cluster.severity === 'high' ? (
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                          ) : null}
                        </div>

                        <h3 className="text-sm font-medium text-white truncate">
                          {isNe && cluster.title_ne ? cluster.title_ne : cluster.title}
                        </h3>

                        {cluster.summary && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {cluster.summary}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                          {cluster.municipality && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {cluster.municipality}
                              {cluster.ward_number ? `, Ward ${cluster.ward_number}` : ''}
                            </span>
                          )}
                          {cluster.authority_name && (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span className="text-gray-400">
                                {isNe ? 'AI सुझाव:' : 'AI suggestion:'}
                              </span>{' '}
                              {isNe && cluster.authority_name_ne
                                ? cluster.authority_name_ne
                                : cluster.authority_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Report count badge */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5">
                          <Users className="w-3.5 h-3.5 text-primary-400" />
                          <span className="text-sm font-semibold text-white">
                            {cluster.report_count}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-600 uppercase">
                          {isNe ? 'रिपोर्ट' : 'reports'}
                        </span>
                        {cluster.evidence_count > 0 && (
                          <span className="text-[9px] text-gray-500">
                            {cluster.evidence_count} {isNe ? 'प्रमाण' : 'evidence'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
