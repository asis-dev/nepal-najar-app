import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServiceBySlug } from '@/lib/services/catalog';
import { getOrBuildSchema } from '@/lib/services/form-schemas';
import { UniversalServiceForm } from '@/components/public/services/form/universal-form';
import { CATEGORY_LABELS, type ServiceCategory } from '@/lib/services/types';
import { DocReadiness } from '@/components/public/services/doc-readiness';
import { PaymentCheckout } from '@/components/public/services/payment-checkout';

/** Extract numeric NPR amount from a fee string like "Rs. 5,000" or "Rs. 100–500" */
function parseFeeNPR(fee: string): number | null {
  // Take first number found (for ranges, use the lower bound)
  const match = fee.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Check if a fee string represents a payable amount (not free, not zero) */
function isPayableFee(fee?: string): boolean {
  if (!fee) return false;
  const lower = fee.toLowerCase();
  if (lower.includes('free') || lower.includes('निःशुल्क')) return false;
  const amount = parseFeeNPR(fee);
  return amount !== null && amount > 0;
}

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { category: string; slug: string } }) {
  const svc = await getServiceBySlug(params.slug);
  if (!svc) return { title: 'Apply — Nepal Republic' };
  return {
    title: `Apply: ${svc.title.en} — Nepal Republic`,
    description: `Fill the ${svc.title.en} form online. Autofills from your profile. Print-ready PDF.`,
  };
}

export default async function ApplyPage({ params }: { params: { category: string; slug: string } }) {
  const svc = await getServiceBySlug(params.slug);
  if (!svc || svc.category !== params.category) notFound();
  const cat = svc.category as ServiceCategory;
  const schema = getOrBuildSchema(svc.slug, svc.title.en);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-400 mb-4">
        <Link href="/services" className="hover:text-zinc-200">Services</Link>
        <span className="mx-2">/</span>
        <Link href={`/services/${cat}`} className="hover:text-zinc-200">{CATEGORY_LABELS[cat].en}</Link>
        <span className="mx-2">/</span>
        <Link href={`/services/${cat}/${svc.slug}`} className="hover:text-zinc-200">{svc.title.en}</Link>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        📝 APPLY IN-APP
      </div>
      <h1 className="text-2xl md:text-3xl font-black mb-1">{svc.title.en}</h1>
      <div className="text-lg text-zinc-300 mb-2">{svc.title.ne}</div>

      {/* Fee + time summary */}
      <div className="flex items-center gap-4 text-sm text-zinc-400 mb-6">
        {svc.feeRange && <span>Fee: {svc.feeRange.en}</span>}
        {svc.estimatedTime && <span>Time: {svc.estimatedTime.en}</span>}
        {svc.officialUrl && (
          <a href={svc.officialUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">
            Official portal ↗
          </a>
        )}
      </div>

      {/* Document checklist */}
      {svc.documents.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
          <h3 className="text-xs font-bold uppercase text-amber-300 mb-2">Documents you'll need</h3>
          <ul className="space-y-1">
            {svc.documents.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={d.required ? 'text-red-400' : 'text-zinc-500'}>{d.required ? '●' : '○'}</span>
                <span className="text-zinc-200">{d.title.en}</span>
                <span className="text-zinc-500 text-xs">{d.title.ne}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-400/60 mt-2">
            Tip: Upload these to your <a href="/me/vault" className="underline">Document Vault</a> for easy access.
          </p>
        </div>
      )}

      {svc.documents.length > 0 && (
        <DocReadiness serviceSlug={svc.slug} documents={svc.documents} />
      )}

      <UniversalServiceForm schema={schema} serviceSlug={svc.slug} />

      {/* Payment section — only shown if service has a payable fee */}
      {svc.feeRange && isPayableFee(svc.feeRange.en) && (
        <PaymentCheckout
          serviceSlug={svc.slug}
          serviceTitle={svc.title.en}
          feeAmount={svc.feeRange.en}
          feeAmountNPR={parseFeeNPR(svc.feeRange.en) || 0}
        />
      )}
    </div>
  );
}
