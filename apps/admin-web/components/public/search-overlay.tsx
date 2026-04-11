'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAllPromises } from '@/lib/hooks/use-promises';
import type { GovernmentPromise } from '@/lib/data/promises';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════ */

const statusConfig: Record<string, { labelKey: string; dot: string }> = {
  not_started: { labelKey: 'commitment.notStarted', dot: 'bg-gray-400' },
  in_progress: { labelKey: 'commitment.inProgress', dot: 'bg-emerald-400' },
  delivered: { labelKey: 'commitment.delivered', dot: 'bg-blue-400' },
  stalled: { labelKey: 'commitment.stalled', dot: 'bg-red-400' },
};

/* ═══════════════════════════════════════════
   KNOWN CATEGORIES
   ═══════════════════════════════════════════ */

const CATEGORIES = [
  { en: 'Infrastructure', ne: 'पूर्वाधार' },
  { en: 'Health', ne: 'स्वास्थ्य' },
  { en: 'Education', ne: 'शिक्षा' },
  { en: 'Governance', ne: 'शासन' },
  { en: 'Anti-Corruption', ne: 'भ्रष्टाचार विरोधी' },
  { en: 'Transport', ne: 'यातायात' },
  { en: 'Energy', ne: 'ऊर्जा' },
  { en: 'Technology', ne: 'प्रविधि' },
  { en: 'Environment', ne: 'वातावरण' },
  { en: 'Economy', ne: 'अर्थतन्त्र' },
  { en: 'Social', ne: 'सामाजिक' },
];

/* ═══════════════════════════════════════════
   KNOWN PEOPLE
   ═══════════════════════════════════════════ */

const KNOWN_PEOPLE = [
  { name: 'Balen Shah', name_ne: 'बालेन शाह', role: 'Prime Minister' },
  { name: 'Rabi Lamichhane', name_ne: 'रवि लामिछाने', role: 'RSP Chairman' },
  { name: 'Swarnim Wagle', name_ne: 'स्वर्णिम वाग्ले', role: 'Finance Minister' },
  { name: 'Shishir Khanal', name_ne: 'शिशिर खनाल', role: 'Foreign Minister' },
  { name: 'Ram Chandra Paudel', name_ne: 'रामचन्द्र पौडेल', role: 'President' },
  { name: 'KP Sharma Oli', name_ne: 'केपी शर्मा ओली', role: 'Former PM' },
  { name: 'Pushpa Kamal Dahal', name_ne: 'पुष्पकमल दाहाल', role: 'Former PM' },
  { name: 'Sher Bahadur Deuba', name_ne: 'शेरबहादुर देउवा', role: 'NC President' },
];

/* ═══════════════════════════════════════════
   HIGHLIGHT TEXT
   ═══════════════════════════════════════════ */

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-bold text-primary-300">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   SEARCH OVERLAY
   ═══════════════════════════════════════════ */

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { data: promises } = useAllPromises();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setActiveIndex(-1);
      // Focus the visible input — mobile or desktop
      requestAnimationFrame(() => {
        const isMobile = window.innerWidth < 768;
        const ref = isMobile ? mobileInputRef : desktopInputRef;
        ref.current?.focus();
      });
    }
  }, [isOpen]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Click-outside to close (desktop)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  /* ── Search logic ── */

  const commitmentResults = useMemo(() => {
    if (!promises || !debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return promises
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.title_ne.includes(debouncedQuery) ||
          p.description.toLowerCase().includes(q) ||
          p.description_ne.includes(debouncedQuery) ||
          p.category.toLowerCase().includes(q) ||
          (p.category_ne && p.category_ne.includes(debouncedQuery)) ||
          p.slug.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [promises, debouncedQuery]);

  const categoryResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return CATEGORIES.filter(
      (c) => c.en.toLowerCase().includes(q) || c.ne.includes(debouncedQuery),
    ).slice(0, 3);
  }, [debouncedQuery]);

  const peopleResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return KNOWN_PEOPLE.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.name_ne.includes(debouncedQuery) ||
        p.role.toLowerCase().includes(q),
    ).slice(0, 3);
  }, [debouncedQuery]);

  const hasResults =
    commitmentResults.length > 0 || categoryResults.length > 0 || peopleResults.length > 0;
  const hasQuery = debouncedQuery.trim().length > 0;

  // Trending titles (first 5 from promises)
  const trendingTitles = useMemo(() => {
    if (!promises) return [];
    return promises
      .filter((p) => p.status === 'in_progress' || p.status === 'delivered')
      .slice(0, 5)
      .map((p) => (locale === 'ne' ? p.title_ne : p.title));
  }, [promises, locale]);

  /* ── Keyboard nav ── */

  const totalResults = commitmentResults.length + categoryResults.length + peopleResults.length;

  const handleNavigate = useCallback(
    (href: string) => {
      // Navigate first, then close — on mobile, closing first can
      // unmount the portal before router.push fires.
      router.push(href);
      // Delay close so the navigation has time to start
      requestAnimationFrame(() => onClose());
    },
    [onClose, router],
  );

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      // Determine which result is active
      let idx = activeIndex;
      if (idx < commitmentResults.length) {
        handleNavigate(`/explore/first-100-days/${commitmentResults[idx].slug}`);
        return;
      }
      idx -= commitmentResults.length;
      if (idx < categoryResults.length) {
        handleNavigate(`/explore/first-100-days?category=${categoryResults[idx].en}`);
        return;
      }
      idx -= categoryResults.length;
      if (idx < peopleResults.length) {
        handleNavigate(`/explore/first-100-days?actor=${encodeURIComponent(peopleResults[idx].name)}`);
        return;
      }
    }
  };

  if (!isOpen) return null;

  // Portal to document.body so the overlay escapes any parent stacking context (e.g. sticky nav)
  if (typeof document === 'undefined') return null;

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  let runningIndex = 0;

  return createPortal(
    <>
      {/* ── Mobile: full-screen overlay ── */}
      <div className="fixed inset-0 z-[100] flex flex-col bg-np-void/95 backdrop-blur-xl md:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:text-white"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                locale === 'ne'
                  ? 'वचनबद्धता, विषय, व्यक्ति खोज्नुहोस्...'
                  : 'Search commitments, topics, people...'
              }
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] py-2.5 pl-10 pr-10 text-base text-white placeholder:text-gray-500 outline-none transition-colors focus:border-primary-500/40"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  mobileInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {renderResultsContent({
            hasQuery,
            hasResults,
            debouncedQuery,
            commitmentResults,
            categoryResults,
            peopleResults,
            trendingTitles,
            locale,
            activeIndex,
            runningIndex: 0,
            onNavigate: handleNavigate,
            onSetQuery: (q: string) => {
              setQuery(q);
              setActiveIndex(-1);
            },
            t,
          })}
        </div>
      </div>

      {/* ── Desktop: dropdown panel ── */}
      <div className="fixed inset-0 z-[100] hidden md:block">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Dropdown */}
        <div
          ref={overlayRef}
          className="absolute left-1/2 top-20 w-full max-w-2xl -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-np-surface/95 shadow-2xl backdrop-blur-xl">
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                ref={desktopInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  locale === 'ne'
                    ? 'वचनबद्धता, विषय, व्यक्ति खोज्नुहोस्...'
                    : 'Search commitments, topics, people...'
                }
                className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    desktopInputRef.current?.focus();
                  }}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-xs text-gray-500 lg:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto px-2 py-3">
              {renderResultsContent({
                hasQuery,
                hasResults,
                debouncedQuery,
                commitmentResults,
                categoryResults,
                peopleResults,
                trendingTitles,
                locale,
                activeIndex,
                runningIndex: 0,
                onNavigate: handleNavigate,
                onSetQuery: (q: string) => {
                  setQuery(q);
                  setActiveIndex(-1);
                },
                t,
              })}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ═══════════════════════════════════════════
   SHARED RESULTS RENDERER
   ═══════════════════════════════════════════ */

interface ResultsContentProps {
  hasQuery: boolean;
  hasResults: boolean;
  debouncedQuery: string;
  commitmentResults: GovernmentPromise[];
  categoryResults: { en: string; ne: string }[];
  peopleResults: { name: string; name_ne: string; role: string }[];
  trendingTitles: string[];
  locale: string;
  activeIndex: number;
  runningIndex: number;
  onNavigate: (href: string) => void;
  onSetQuery: (q: string) => void;
  t: (key: string) => string;
}

function renderResultsContent(props: ResultsContentProps) {
  const {
    hasQuery,
    hasResults,
    debouncedQuery,
    commitmentResults,
    categoryResults,
    peopleResults,
    trendingTitles,
    locale,
    activeIndex,
    onNavigate,
    onSetQuery,
    t,
  } = props;

  let runningIdx = 0;

  /* ── Empty state: before typing ── */
  if (!hasQuery) {
    return (
      <div className="space-y-5 px-2">
        {/* Quick categories */}
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {locale === 'ne' ? 'विषयहरू' : 'Categories'}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <button
                key={cat.en}
                onClick={() => onSetQuery(locale === 'ne' ? cat.ne : cat.en)}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white"
              >
                {locale === 'ne' ? cat.ne : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Trending */}
        {trendingTitles.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {locale === 'ne' ? 'लोकप्रिय खोजहरू' : 'Popular searches'}
            </p>
            <div className="space-y-1">
              {trendingTitles.map((title, i) => (
                <button
                  key={i}
                  onClick={() => onSetQuery(title)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
                >
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                  <span className="truncate">{title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── No results ── */
  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-3 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-400">
          {locale === 'ne'
            ? `'${debouncedQuery}' को लागि कुनै नतिजा छैन। अर्को शब्द प्रयोग गर्नुहोस्।`
            : `No results for '${debouncedQuery}'. Try a different search.`}
        </p>
      </div>
    );
  }

  /* ── Results ── */
  return (
    <div className="space-y-4 px-1">
      {/* Commitments */}
      {commitmentResults.length > 0 && (
        <div>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {locale === 'ne' ? 'वचनबद्धताहरू' : 'Commitments'}
          </p>
          <div className="space-y-0.5">
            {commitmentResults.map((promise) => {
              const idx = runningIdx++;
              const isActive = idx === activeIndex;
              const status = statusConfig[promise.status] || statusConfig.not_started;
              return (
                <button
                  key={promise.id}
                  onClick={() => onNavigate(`/explore/first-100-days/${promise.slug}`)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-gray-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <HighlightText
                        text={locale === 'ne' ? promise.title_ne : promise.title}
                        query={debouncedQuery}
                      />
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      <HighlightText
                        text={locale === 'ne' ? promise.category_ne : promise.category}
                        query={debouncedQuery}
                      />
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-semibold text-gray-500">
                    {promise.progress}%
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      {categoryResults.length > 0 && (
        <div>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {locale === 'ne' ? 'विषयहरू' : 'Categories'}
          </p>
          <div className="flex flex-wrap gap-2 px-2">
            {categoryResults.map((cat) => {
              const idx = runningIdx++;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={cat.en}
                  onClick={() =>
                    onNavigate(`/explore/first-100-days?category=${cat.en}`)
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-100 ${
                    isActive
                      ? 'border-primary-500/40 bg-primary-500/15 text-primary-300'
                      : 'border-white/[0.1] bg-white/[0.05] text-gray-300 hover:border-white/[0.2] hover:text-white'
                  }`}
                >
                  <HighlightText
                    text={locale === 'ne' ? cat.ne : cat.en}
                    query={debouncedQuery}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* People */}
      {peopleResults.length > 0 && (
        <div>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {locale === 'ne' ? 'व्यक्तिहरू' : 'People'}
          </p>
          <div className="space-y-0.5">
            {peopleResults.map((person) => {
              const idx = runningIdx++;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={person.name}
                  onClick={() =>
                    onNavigate(
                      `/explore/first-100-days?actor=${encodeURIComponent(person.name)}`,
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-gray-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-300">
                    {person.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <HighlightText
                        text={locale === 'ne' ? person.name_ne : person.name}
                        query={debouncedQuery}
                      />
                    </p>
                    <p className="text-xs text-gray-500">{person.role}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
