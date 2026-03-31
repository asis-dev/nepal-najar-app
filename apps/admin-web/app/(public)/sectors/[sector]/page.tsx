import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  Banknote,
  Users,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  promises,
  getPromisesByCategory,
  computeStats,
  CATEGORY_NE,
  type GovernmentPromise,
  type PromiseCategory,
} from '@/lib/data/promises';
import { publicGovUnits } from '@/lib/data/government-accountability';

/* ───────────────────────── helpers ───────────────────────── */

type SectorConfig = {
  category: PromiseCategory;
  slug: string;
  description: string;
  description_ne: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
};

const SECTORS: SectorConfig[] = [
  {
    category: 'Governance',
    slug: 'governance',
    icon: Scale,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950',
    description: 'Track Nepal government reform commitments — constitutional amendments, ministry restructuring, and transparency measures.',
    description_ne: 'संवैधानिक संशोधन, मन्त्रालय पुनर्संरचना र पारदर्शिता उपायहरू।',
  },
  {
    category: 'Anti-Corruption',
    slug: 'anti-corruption',
    icon: Fingerprint,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    description: 'Nepal anti-corruption commitments — asset investigations, accountability mechanisms, and CIAA reforms.',
    description_ne: 'सम्पत्ति अनुसन्धान, जवाफदेहिता संयन्त्र र अख्तियारको सुधार।',
  },
  {
    category: 'Infrastructure',
    slug: 'infrastructure',
    icon: Building2,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950',
    description: 'Nepal infrastructure development — roads, bridges, public works, and capital construction commitments.',
    description_ne: 'सडक, पुल, सार्वजनिक निर्माण र पूँजीगत निर्माण प्रतिबद्धताहरू।',
  },
  {
    category: 'Transport',
    slug: 'transport',
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    description: 'Nepal transport commitments — public transit, road networks, aviation, and logistics reform.',
    description_ne: 'सार्वजनिक यातायात, सडक सञ्जाल, उड्डयन र लजिस्टिक्स सुधार।',
  },
  {
    category: 'Energy',
    slug: 'energy',
    icon: Zap,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    description: 'Nepal energy commitments — hydropower expansion, electricity reliability, and renewable energy targets.',
    description_ne: 'जलविद्युत विस्तार, विद्युत विश्वसनीयता र नवीकरणीय ऊर्जा लक्ष्य।',
  },
  {
    category: 'Technology',
    slug: 'technology',
    icon: Cpu,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    description: 'Nepal digital transformation — e-governance, broadband access, and tech-enabled public services.',
    description_ne: 'ई-सरकार, ब्रोडब्यान्ड पहुँच र प्रविधि-सक्षम सार्वजनिक सेवाहरू।',
  },
  {
    category: 'Health',
    slug: 'health',
    icon: Heart,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950',
    description: 'Nepal health sector commitments — hospital upgrades, universal health coverage, and public health programs.',
    description_ne: 'अस्पताल सुधार, सार्वभौमिक स्वास्थ्य सुविधा र सार्वजनिक स्वास्थ्य कार्यक्रम।',
  },
  {
    category: 'Education',
    slug: 'education',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    description: 'Nepal education reform commitments — school improvement, digital classrooms, and higher education access.',
    description_ne: 'विद्यालय सुधार, डिजिटल कक्षाकोठा र उच्च शिक्षा पहुँच।',
  },
  {
    category: 'Environment',
    slug: 'environment',
    icon: Leaf,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    description: 'Nepal environment and climate commitments — conservation targets, pollution control, and sustainable development.',
    description_ne: 'संरक्षण लक्ष्य, प्रदूषण नियन्त्रण र दिगो विकास।',
  },
  {
    category: 'Economy',
    slug: 'economy',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    description: 'Nepal economic reform commitments — budget discipline, investment climate, and fiscal accountability.',
    description_ne: 'बजेट अनुशासन, लगानी वातावरण र वित्तीय जवाफदेहिता।',
  },
  {
    category: 'Social',
    slug: 'social',
    icon: Users,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950',
    description: 'Nepal social sector commitments — poverty reduction, social protection, and inclusion programs.',
    description_ne: 'गरिबी न्यूनीकरण, सामाजिक सुरक्षा र समावेशी कार्यक्रम।',
  },
];

function getSectorConfig(slug: string): SectorConfig | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

function categoryToSlug(cat: PromiseCategory): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', dot: 'bg-gray-300' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-600', dot: 'bg-blue-500' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600', dot: 'bg-green-500' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-600', dot: 'bg-red-500' },
} as const;

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return SECTORS.map((s) => ({ sector: s.slug }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector } = await params;
  const config = getSectorConfig(sector);

  if (!config) return createMetadata({ title: 'Sector Not Found' });

  const year = new Date().getFullYear();
  const commitments = getPromisesByCategory(config.category).filter((p) => p.isPublic !== false);
  const stats = computeStats(commitments);

  const title = `Nepal ${config.category} Commitments ${year} — ${stats.total} Tracked`;
  const description = `${config.description} Tracking ${stats.total} commitments: ${stats.delivered} delivered, ${stats.inProgress} in progress.`;

  return createMetadata({
    title,
    description,
    path: `/sectors/${sector}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function SectorJsonLd({ config, commitments }: { config: SectorConfig; commitments: GovernmentPromise[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';
  const stats = computeStats(commitments);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Nepal ${config.category} Government Commitments`,
    description: config.description,
    url: `${siteUrl}/sectors/${config.slug}`,
    about: {
      '@type': 'GovernmentService',
      name: `Nepal ${config.category} Sector`,
      serviceArea: { '@type': 'Country', name: 'Nepal' },
      description: config.description,
    },
    mainEntity: {
      '@type': 'ItemList',
      name: `${config.category} Commitments`,
      numberOfItems: stats.total,
      itemListElement: commitments.slice(0, 10).map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.title,
        url: `${siteUrl}/track/${config.slug}/${c.slug}`,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ───────────────────────── page ───────────────────────── */

export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  const config = getSectorConfig(sector);
  if (!config) notFound();

  const allCommitments = getPromisesByCategory(config.category).filter((p) => p.isPublic !== false);
  const stats = computeStats(allCommitments);

  const SectorIcon = config.icon;

  // Related ministries for this sector
  const relatedUnits = publicGovUnits.filter((u) =>
    u.promiseCategories.includes(config.category)
  );

  // Group by status for featured display
  const delivered = allCommitments.filter((c) => c.status === 'delivered');
  const inProgress = allCommitments.filter((c) => c.status === 'in_progress');
  const notStarted = allCommitments.filter((c) => c.status === 'not_started');
  const stalled = allCommitments.filter((c) => c.status === 'stalled');

  const year = new Date().getFullYear();

  return (
    <>
      <SectorJsonLd config={config} commitments={allCommitments} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-900 dark:hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-900 dark:text-gray-100">{config.category}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Hero header */}
          <header className="mb-8">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 ${config.bg}`}>
              <SectorIcon className={`h-8 w-8 ${config.color}`} />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Nepal {config.category} Commitments {year}
            </h1>
            <p className="mb-1 text-lg text-gray-600 dark:text-gray-400">{CATEGORY_NE[config.category]}</p>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">{config.description}</p>
          </header>

          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.delivered}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Delivered</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-950">
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">In Progress</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.stalled}</p>
              <p className="text-xs text-red-600 dark:text-red-500">Stalled</p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Sector Progress
              </h2>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.deliveryRate}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${stats.deliveryRate}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {stats.delivered} of {stats.total} commitments delivered
            </p>
          </div>

          {/* Responsible ministries */}
          {relatedUnits.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Responsible Ministries</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedUnits.map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/government/${unit.id}`}
                    className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
                  >
                    <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400">
                        {unit.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{unit.type}</p>
                    </div>
                    <ChevronRight className="ml-auto mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-500" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* All commitments by status */}
          {inProgress.length > 0 && (
            <CommitmentsSection
              title="In Progress"
              commitments={inProgress}
              status="in_progress"
            />
          )}

          {notStarted.length > 0 && (
            <CommitmentsSection
              title="Not Started"
              commitments={notStarted}
              status="not_started"
            />
          )}

          {delivered.length > 0 && (
            <CommitmentsSection
              title="Delivered"
              commitments={delivered}
              status="delivered"
            />
          )}

          {stalled.length > 0 && (
            <CommitmentsSection
              title="Stalled"
              commitments={stalled}
              status="stalled"
            />
          )}

          {/* Other sectors */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Other Sectors</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SECTORS.filter((s) => s.slug !== sector).map((s) => {
                const count = getPromisesByCategory(s.category).filter((p) => p.isPublic !== false).length;
                const Icon = s.icon;
                return (
                  <Link
                    key={s.slug}
                    href={`/sectors/${s.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <span className={`rounded-lg p-1.5 ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.category}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{count} commitments</p>
                    </div>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {stats.total} {config.category} commitments tracked from RSP "बाचा पत्र 2082" (Citizen Contract).{' '}
              <Link href="/how-it-works" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                How we track
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── sub-component ───────────────────────── */

function CommitmentsSection({
  title,
  commitments,
  status,
}: {
  title: string;
  commitments: GovernmentPromise[];
  status: keyof typeof STATUS_CONFIG;
}) {
  const s = STATUS_CONFIG[status];
  const SIcon = s.icon;

  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
        <SIcon className={`h-5 w-5 ${s.color}`} />
        {title}
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {commitments.length}
        </span>
      </h2>
      <div className="space-y-2">
        {commitments.map((commitment) => (
          <Link
            key={commitment.slug}
            href={`/track/${categoryToSlug(commitment.category)}/${commitment.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
          >
            <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${s.dot} mt-1.5`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400 line-clamp-1">
                {commitment.title}
              </p>
              {commitment.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {commitment.description}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">{commitment.progress}%</span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
