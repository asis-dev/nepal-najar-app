import Link from 'next/link';
import { getAllServices } from '@/lib/services/catalog';
import { CATEGORY_LABELS, CATEGORY_ICONS, type ServiceCategory } from '@/lib/services/types';
import { ServicesInstantSearch } from '@/components/public/services/instant-search';
import { TaskRouter } from '@/components/public/services/task-router';

export const revalidate = 300;

export default async function ServicesHomePage() {
  const services = await getAllServices();
  const categories = Object.keys(CATEGORY_LABELS) as ServiceCategory[];

  const byCat = categories.map((cat) => ({
    cat,
    count: services.filter((s) => s.category === cat).length,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-4">
          NEW · नयाँ
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
          Nepal Services Directory
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
          Every government and essential service — documents, fees, steps, offices.
          <br className="hidden md:block" />
          नेपालका सबै सरकारी र अत्यावश्यक सेवा — कागजात, शुल्क, प्रक्रिया, कार्यालय।
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/me/tasks"
            className="inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            Continue my tasks
          </Link>
          <Link
            href="/me/vault"
            className="inline-flex rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Open my vault
          </Link>
        </div>
      </div>

      <div className="mb-10 max-w-4xl mx-auto">
        <TaskRouter locale="en" />
      </div>

      {/* Instant client-side search */}
      <div className="max-w-2xl mx-auto mb-10">
        <ServicesInstantSearch services={services} />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {byCat.map(({ cat, count }) => (
          <Link
            key={cat}
            href={`/services/${cat}`}
            className="group rounded-2xl bg-zinc-900 border border-zinc-800 p-5 hover:border-red-500/50 hover:bg-zinc-900/80 transition"
          >
            <div className="text-3xl mb-2">{CATEGORY_ICONS[cat]}</div>
            <div className="text-sm font-bold text-zinc-100 mb-1">{CATEGORY_LABELS[cat].en}</div>
            <div className="text-xs text-zinc-400 mb-2">{CATEGORY_LABELS[cat].ne}</div>
            <div className="text-[11px] text-zinc-500">
              {count} {count === 1 ? 'service' : 'services'}
            </div>
          </Link>
        ))}
      </div>

      {/* Popular services */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Most needed · धेरै चाहिने</h2>
        <div className="grid gap-3">
          {services.slice(0, 10).map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.category}/${s.slug}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-red-500/50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-2xl shrink-0">{CATEGORY_ICONS[s.category]}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-100 truncate">{s.title.en}</div>
                  <div className="text-xs text-zinc-400 truncate">{s.title.ne} · {s.providerName}</div>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 shrink-0 hidden md:block">
                {s.feeRange?.en || 'Free'}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-zinc-500">
        Verified manually by Nepal Republic. Something wrong?{' '}
        <a href="mailto:hello@nepalrepublic.org" className="text-red-400 hover:underline">
          Tell us
        </a>
        .
      </div>
    </div>
  );
}
