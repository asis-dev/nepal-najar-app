import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServicesByCategory } from '@/lib/services/catalog';
import { CATEGORY_LABELS, CATEGORY_ICONS, type ServiceCategory } from '@/lib/services/types';

export const revalidate = 300;

const VALID: ServiceCategory[] = [
  'identity','transport','tax','health','utilities',
  'business','land','banking','education','legal',
];

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = params.category as ServiceCategory;
  if (!VALID.includes(cat)) notFound();

  const services = await getServicesByCategory(cat);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/services" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All services
      </Link>

      <div className="mt-4 mb-8">
        <div className="text-5xl mb-3">{CATEGORY_ICONS[cat]}</div>
        <h1 className="text-3xl md:text-4xl font-black">{CATEGORY_LABELS[cat].en}</h1>
        <p className="text-zinc-400 text-lg mt-1">{CATEGORY_LABELS[cat].ne}</p>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-400">
          <p className="mb-1">We&apos;re still researching services in this category.</p>
          <p className="text-sm">यस श्रेणीमा सेवा थप्दै छौं।</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${cat}/${s.slug}`}
              className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 hover:border-red-500/50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-zinc-100 mb-1">{s.title.en}</div>
                  <div className="text-sm text-zinc-400 mb-2">{s.title.ne}</div>
                  <div className="text-xs text-zinc-500 line-clamp-2">{s.summary.en}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] uppercase text-zinc-500">Fee</div>
                  <div className="text-xs font-semibold text-zinc-300">{s.feeRange?.en || 'Free'}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 text-[11px] text-zinc-500">
                <span>⏱ {s.estimatedTime?.en || '—'}</span>
                <span>·</span>
                <span className="truncate">{s.providerName}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
