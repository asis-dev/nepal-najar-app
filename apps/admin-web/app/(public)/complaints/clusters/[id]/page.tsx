'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  MapPin,
  Clock,
  FileText,
  Users,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCluster } from '@/lib/hooks/use-complaints';
import { ShareMenu } from '@/components/public/share-menu';
import { buildComplaintShareData } from '@/lib/complaints/share';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  acknowledged: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function timeAgo(dateStr: string, isNe: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return isNe ? 'भर्खरै' : 'just now';
  if (hours < 24) return isNe ? `${hours} घण्टा अगाडि` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isNe ? `${days} दिन अगाडि` : `${days}d ago`;
}

export default function ClusterDetailPage() {
  const params = useParams();
  const clusterId = params.id as string;
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { data, isLoading } = useCluster(clusterId);

  if (isLoading) {
    return (
      <div className="public-page">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="public-page">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">{isNe ? 'क्लस्टर फेला परेन।' : 'Cluster not found.'}</p>
        </div>
      </div>
    );
  }

  const { cluster, complaints, events, evidence } = data;
  const statusStyle = STATUS_STYLES[cluster.status] || STATUS_STYLES.open;
  const severityStyle = SEVERITY_STYLES[cluster.severity] || SEVERITY_STYLES.medium;

  return (
    <div className="public-page">
      <div className="relative z-10">
        {/* Back */}
        <div className="px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/complaints/clusters"
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? 'क्लस्टरहरू' : 'Clusters'}
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="px-3 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle}`}>
                {cluster.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityStyle}`}>
                {cluster.severity}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
              {isNe && cluster.title_ne ? cluster.title_ne : cluster.title}
            </h1>

            {cluster.summary && (
              <p className="text-sm text-gray-400 mb-3">
                {isNe && cluster.summary_ne ? cluster.summary_ne : cluster.summary}
              </p>
            )}

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center">
                <Users className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-white">{cluster.report_count}</p>
                <p className="text-[10px] text-gray-500 uppercase">
                  {isNe ? 'रिपोर्ट' : 'Reports'}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center">
                <ImageIcon className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-white">{cluster.evidence_count}</p>
                <p className="text-[10px] text-gray-500 uppercase">
                  {isNe ? 'प्रमाण' : 'Evidence'}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center">
                <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-white">
                  {cluster.sla_breached_at ? (isNe ? 'उल्लंघन' : 'Breached') : cluster.sla_due_at ? (isNe ? 'ट्र्याकमा' : 'Tracked') : '—'}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">SLA</p>
              </div>
            </div>
          </div>
        </section>

        {/* Authority Routing Card */}
        {cluster.authority_name && (
          <section className="px-3 sm:px-6 lg:px-8 pb-2">
            <div className="max-w-4xl mx-auto">
              <div className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                      {isNe ? 'AI रुटिङ सुझाव' : 'AI routing suggestion'}
                    </p>
                    <p className="text-sm font-medium text-white">
                      {isNe && cluster.authority_name_ne
                        ? cluster.authority_name_ne
                        : cluster.authority_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cluster.authority_office}
                    </p>
                    {cluster.routing_reason && (
                      <p className="text-[11px] text-gray-500 mt-1.5 italic">
                        {cluster.routing_reason}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-400">
                        {cluster.authority_level === 'federal'
                          ? isNe ? 'संघीय' : 'Federal'
                          : cluster.authority_level === 'provincial'
                            ? isNe ? 'प्रदेश' : 'Provincial'
                            : isNe ? 'स्थानीय' : 'Local'}
                      </span>
                      {cluster.municipality && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {cluster.municipality}
                          {cluster.ward_number ? `, Ward ${cluster.ward_number}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Supporting Reports */}
        <section className="px-3 sm:px-6 lg:px-8 pb-2">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              {isNe
                ? `${complaints.length} सहायक रिपोर्ट`
                : `${complaints.length} Supporting Reports`}
            </h2>
            <div className="space-y-2">
              {complaints.map((complaint) => {
                const shareData = buildComplaintShareData(complaint, isNe ? 'ne' : 'en');
                return (
                  <div key={complaint.id} className="glass-card flex items-start gap-1 p-3 transition-colors hover:bg-white/[0.04]">
                    <Link href={`/complaints/${complaint.id}`} className="block min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">
                            {isNe && complaint.title_ne ? complaint.title_ne : complaint.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                            {complaint.description}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-600">
                            <span>{timeAgo(complaint.created_at, isNe)}</span>
                            {complaint.municipality && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />
                                {complaint.municipality}
                              </span>
                            )}
                            {complaint.evidence_count > 0 && (
                              <span>{complaint.evidence_count} {isNe ? 'प्रमाण' : 'evidence'}</span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex flex-shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                            STATUS_STYLES[complaint.status] || STATUS_STYLES.open
                          }`}
                        >
                          {complaint.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                    <div className="pt-0.5">
                      <ShareMenu
                        shareUrl={shareData.shareUrl}
                        shareText={shareData.shareText}
                        shareTitle={shareData.shareTitle}
                        ogParams={shareData.ogParams}
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Evidence Rollup */}
        {evidence.length > 0 && (
          <section className="px-3 sm:px-6 lg:px-8 pb-2">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                {isNe ? `${evidence.length} प्रमाणहरू` : `${evidence.length} Evidence Items`}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {evidence.slice(0, 9).map((item) => (
                  <div
                    key={item.id}
                    className="glass-card p-2 text-center"
                  >
                    {item.media_urls && item.media_urls.length > 0 ? (
                      <img
                        src={item.media_urls[0]}
                        alt="Evidence"
                        className="w-full h-24 object-cover rounded-lg mb-1"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-white/[0.04] flex items-center justify-center mb-1">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    {item.note && (
                      <p className="text-[10px] text-gray-500 truncate">{item.note}</p>
                    )}
                  </div>
                ))}
              </div>
              {evidence.length > 9 && (
                <p className="text-[11px] text-gray-500 text-center mt-2">
                  + {evidence.length - 9} {isNe ? 'थप प्रमाण' : 'more evidence items'}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Timeline */}
        {events.length > 0 && (
          <section className="px-3 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {isNe ? 'समयरेखा' : 'Timeline'}
              </h2>
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="glass-card p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300">{event.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                          <span>
                            {event.actor_type === 'ai' ? (isNe ? 'AI' : 'AI') : event.actor_type}
                          </span>
                          <span>{timeAgo(event.created_at, isNe)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
