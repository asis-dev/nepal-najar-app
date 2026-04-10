import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceBySlug } from '@/lib/services/catalog';
import { CATEGORY_LABELS, CATEGORY_ICONS, type ServiceCategory } from '@/lib/services/types';
import OfficeMap from '@/components/public/services/office-map';
import ShareButton from '@/components/public/services/share-button';
import ViewTracker from '@/components/public/services/view-tracker';
import SaveToVault from '@/components/public/services/save-to-vault';
import StartServiceTask from '@/components/public/services/start-service-task';
import { ReportIssue } from '@/components/public/services/report-issue';
import { WaitTimeWidget } from '@/components/public/services/wait-times';
import { PortalLinks } from '@/components/public/services/portal-links';
import { HospitalAppointmentPanel } from '@/components/public/services/hospital-appointment-panel';
import { UtilityBillPanel } from '@/components/public/services/utility-bill-panel';
import { TransportExecutionPanel } from '@/components/public/services/transport-execution-panel';
import { ServiceExecutionPanel } from '@/components/public/services/service-execution-panel';
import { CounterpartyStatusCard } from '@/components/public/services/counterparty-status-card';
import { IntegrationStatusCard } from '@/components/public/services/integration-status-card';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { withOgVersion } from '@/lib/share/brand';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { category: string; slug: string } }) {
  const svc = await getServiceBySlug(params.slug);
  if (!svc) return { title: 'Service — Nepal Republic' };
  const ogUrl = withOgVersion(`/api/og/service?slug=${encodeURIComponent(svc.slug)}`);
  return {
    title: `${svc.title.en} · ${svc.title.ne} — Nepal Republic`,
    description: svc.summary.en,
    openGraph: {
      title: `${svc.title.en} · ${svc.title.ne}`,
      description: svc.summary.en,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: svc.title.en,
      description: svc.summary.en,
      images: [ogUrl],
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: { category: string; slug: string } }) {
  const svc = await getServiceBySlug(params.slug);
  if (!svc || svc.category !== params.category) notFound();

  const cat = svc.category as ServiceCategory;
  const workflow = getWorkflowDefinition(svc);
  const shouldShowGenericExecutionPanel =
    svc.providerType !== 'hospital' &&
    svc.providerType !== 'utility' &&
    svc.category !== 'transport' &&
    ((workflow.actions?.length || 0) > 0 || workflow.mode !== 'guide_only');

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <ViewTracker slug={svc.slug} category={cat} />
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-400 mb-4">
        <Link href="/services" className="hover:text-zinc-200">Services</Link>
        <span className="mx-2">/</span>
        <Link href={`/services/${cat}`} className="hover:text-zinc-200">{CATEGORY_LABELS[cat].en}</Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="text-4xl mb-3">{CATEGORY_ICONS[cat]}</div>
        <h1 className="text-3xl md:text-4xl font-black mb-1">{svc.title.en}</h1>
        <div className="text-xl text-zinc-300 mb-3">{svc.title.ne}</div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-zinc-400">{svc.providerName}</div>
          <ShareButton title={svc.title.en} slug={`${cat}/${svc.slug}`} />
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
        <p className="text-zinc-200 mb-1">{svc.summary.en}</p>
        <p className="text-zinc-400 text-sm">{svc.summary.ne}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase text-zinc-500">Time</div>
            <div className="text-sm font-semibold text-zinc-200">{svc.estimatedTime?.en || '—'}</div>
            <div className="text-xs text-zinc-500">{svc.estimatedTime?.ne || ''}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-zinc-500">Fee</div>
            <div className="text-sm font-semibold text-zinc-200">{svc.feeRange?.en || 'Free'}</div>
            <div className="text-xs text-zinc-500">{svc.feeRange?.ne || ''}</div>
          </div>
        </div>
        {svc.officialUrl && (
          <a
            href={svc.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-400 hover:underline"
          >
            Official site ↗
          </a>
        )}
      </div>

      {/* Apply in-app CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-red-600/20 to-red-500/10 border border-red-500/30 p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Fill this form from home</h3>
            <p className="text-xs text-zinc-400">Autofills from your profile · Saves drafts · Print-ready PDF</p>
          </div>
          <Link
            href={`/services/${cat}/${svc.slug}/apply`}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors"
          >
            📝 Apply in-app
          </Link>
        </div>
      </div>

      <StartServiceTask serviceSlug={svc.slug} serviceTitle={svc.title.en} />
      <CounterpartyStatusCard serviceSlug={svc.slug} />
      <IntegrationStatusCard serviceSlug={svc.slug} />

      {svc.providerType === 'hospital' && (
        <HospitalAppointmentPanel serviceSlug={svc.slug} serviceTitle={svc.title.en} />
      )}

      {svc.providerType === 'utility' && (
        <UtilityBillPanel serviceSlug={svc.slug} serviceTitle={svc.title.en} />
      )}

      {svc.category === 'transport' && (
        <TransportExecutionPanel serviceSlug={svc.slug} serviceTitle={svc.title.en} />
      )}

      {shouldShowGenericExecutionPanel && (
        <ServiceExecutionPanel serviceSlug={svc.slug} serviceTitle={svc.title.en} category={cat} />
      )}

      <PortalLinks serviceSlug={svc.slug} />

      {svc.documents.length > 0 && <SaveToVault serviceSlug={svc.slug} serviceTitle={svc.title.en} />}

      {/* Documents */}
      {svc.documents.length > 0 && (
        <Section title="Documents needed" titleNe="आवश्यक कागजात">
          <ul className="space-y-2">
            {svc.documents.map((d, i) => (
              <li key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <div className="flex items-start gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${d.required ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    {d.required ? 'Required' : 'Optional'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100">{d.title.en}</div>
                    <div className="text-xs text-zinc-400">{d.title.ne}</div>
                    {d.notes && (
                      <div className="text-[11px] text-zinc-500 mt-1">
                        {d.notes.en} · {d.notes.ne}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Steps */}
      {svc.steps.length > 0 && (
        <Section title="Step by step" titleNe="चरणबद्ध प्रक्रिया">
          <ol className="space-y-3">
            {svc.steps.map((s) => (
              <li key={s.order} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center justify-center">
                    {s.order}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100">{s.title.en}</div>
                    <div className="text-sm text-zinc-300">{s.title.ne}</div>
                    <div className="text-xs text-zinc-400 mt-2">{s.detail.en}</div>
                    <div className="text-xs text-zinc-500 mt-1">{s.detail.ne}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Offices */}
      {svc.offices.length > 0 && (
        <Section title="Where to go" titleNe="कहाँ जाने">
          {svc.offices.some((o) => o.lat && o.lng) && (
            <div className="mb-3">
              <OfficeMap
                markers={svc.offices
                  .filter((o) => o.lat && o.lng)
                  .map((o) => ({ lat: o.lat!, lng: o.lng!, label: o.name.en }))}
              />
            </div>
          )}
          <div className="grid gap-3">
            {svc.offices.map((o, i) => (
              <div key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
                <div className="font-semibold text-zinc-100">{o.name.en}</div>
                <div className="text-sm text-zinc-400 mb-2">{o.name.ne}</div>
                <div className="text-xs text-zinc-500">{o.address.en} · {o.address.ne}</div>
                {o.hours && (
                  <div className="text-xs text-zinc-500 mt-1">🕐 {o.hours.en}</div>
                )}
                <div className="mt-3 flex gap-2 text-xs">
                  {o.phone && (
                    <a href={`tel:${o.phone}`} className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
                      📞 {o.phone}
                    </a>
                  )}
                  {o.lat && o.lng && (
                    <a
                      href={`https://maps.google.com/?q=${o.lat},${o.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                      📍 Directions
                    </a>
                  )}
                </div>
                <WaitTimeWidget serviceSlug={svc.slug} officeName={o.name.en} officeIndex={i} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Common problems */}
      {svc.commonProblems.length > 0 && (
        <Section title="Common problems" titleNe="सामान्य समस्या">
          <div className="space-y-3">
            {svc.commonProblems.map((p, i) => (
              <div key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
                <div className="text-sm font-semibold text-zinc-100">⚠️ {p.problem.en}</div>
                <div className="text-xs text-zinc-400 mb-2">{p.problem.ne}</div>
                <div className="text-sm text-zinc-300">💡 {p.solution.en}</div>
                <div className="text-xs text-zinc-500">{p.solution.ne}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {svc.faqs.length > 0 && (
        <Section title="FAQ" titleNe="प्रश्नोत्तर">
          <div className="space-y-3">
            {svc.faqs.map((f, i) => (
              <details key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 group">
                <summary className="cursor-pointer font-semibold text-zinc-100 list-none">
                  {f.q.en}
                  <div className="text-xs text-zinc-400 font-normal">{f.q.ne}</div>
                </summary>
                <div className="mt-3 text-sm text-zinc-300">{f.a.en}</div>
                <div className="text-xs text-zinc-500 mt-1">{f.a.ne}</div>
              </details>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-8 flex justify-center">
        <ReportIssue serviceSlug={svc.slug} />
      </div>

      {svc.verifiedAt && (
        <div className="mt-4 text-xs text-zinc-500 text-center">
          ✓ Verified {svc.verifiedAt} by Nepal Republic
        </div>
      )}
    </div>
  );
}

function Section({ title, titleNe, children }: { title: string; titleNe: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      <div className="text-xs text-zinc-500 mb-3">{titleNe}</div>
      {children}
    </section>
  );
}
