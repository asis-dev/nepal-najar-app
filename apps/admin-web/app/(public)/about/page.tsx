'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  ClipboardCheck,
  Landmark,
  Scale,
  Swords,
  Newspaper,
  MessageSquareWarning,
  ShieldAlert,
  Satellite,
  Brain,
  Rss,
  Users,
  Volume2,
  Pause,
  Play,
  Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   ABOUT — App explainer page
   Nepal Republic: Public commitments. Public record.
   ═══════════════════════════════════════════════ */

const features = [
  {
    icon: Target,
    title: 'Track Commitments',
    titleNe: 'वचनबद्धता ट्र्याक गर्नुहोस्',
    body: '109 government commitments tracked with real-time progress bars, AI-classified evidence, and source links. See exactly what was promised and what has been delivered.',
    bodyNe: '१०९ सरकारी वचनबद्धता वास्तविक समयमा प्रगति पट्टी, एआई-वर्गीकृत प्रमाण, र स्रोत लिङ्कसहित ट्र्याक गरिएको।',
    accent: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: ClipboardCheck,
    title: 'Report Card',
    titleNe: 'रिपोर्ट कार्ड',
    body: 'An overall government performance score combining progress across all commitments, transparency metrics, and community trust indicators.',
    bodyNe: 'सबै वचनबद्धतामा प्रगति, पारदर्शिता मापदण्ड, र सामुदायिक विश्वास सूचकहरू मिलाएर समग्र सरकारी प्रदर्शन स्कोर।',
    accent: 'from-emerald-500/20 to-green-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Landmark,
    title: 'Government Ministries',
    titleNe: 'सरकारी मन्त्रालयहरू',
    body: 'See which ministries and government bodies are responsible for what, how each is performing, and where accountability gaps exist.',
    bodyNe: 'कुन मन्त्रालय र सरकारी निकायहरू कुन कामको लागि जिम्मेवार छन्, प्रत्येकको प्रदर्शन कस्तो छ, र जवाफदेहिता कहाँ कमजोर छ।',
    accent: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: ShieldAlert,
    title: 'Corruption Tracker',
    titleNe: 'भ्रष्टाचार ट्र्याकर',
    body: 'Track corruption cases, ongoing investigations, and money trails. Every accusation is sourced, every resolution is documented.',
    bodyNe: 'भ्रष्टाचारका घटना, चलिरहेका अनुसन्धान, र रकम प्रवाह ट्र्याक गर्नुहोस्। हरेक आरोपको स्रोत छ, हरेक समाधान दस्तावेज गरिएको छ।',
    accent: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-400',
  },
  {
    icon: MessageSquareWarning,
    title: 'Civic Issues',
    titleNe: 'नागरिक समस्या',
    body: 'Report local problems — potholes, water supply, waste management — and track whether they get resolved. Citizens hold local government accountable.',
    bodyNe: 'स्थानीय समस्या — खाल्डा, पानी आपूर्ति, फोहोर व्यवस्थापन — रिपोर्ट गर्नुहोस् र समाधान भयो कि भएन ट्र्याक गर्नुहोस्।',
    accent: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
  },
  {
    icon: Scale,
    title: 'Constitution',
    titleNe: 'संविधान',
    body: 'Browse all 302 articles of Nepal\'s constitution and see which ones are linked to active government commitments. Understand the legal foundation.',
    bodyNe: 'नेपालको संविधानका सबै ३०२ धारा हेर्नुहोस् र कुन सक्रिय सरकारी वचनबद्धतासँग जोडिएको छ बुझ्नुहोस्।',
    accent: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Swords,
    title: 'Disputes',
    titleNe: 'विवादहरू',
    body: 'Track political disagreements, contradictory claims, and disputed facts. When officials say different things, we document both sides.',
    bodyNe: 'राजनीतिक असहमति, विरोधाभासी दाबी, र विवादित तथ्यहरू ट्र्याक गर्नुहोस्। अधिकारीहरूले फरक कुरा भन्दा, हामी दुवै पक्ष दस्तावेज गर्छौं।',
    accent: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: Newspaper,
    title: 'Daily Brief',
    titleNe: 'दैनिक ब्रिफिङ',
    body: 'AI-generated summary of what happened today across all tracked commitments. One page, every morning, with audio narration.',
    bodyNe: 'सबै ट्र्याक गरिएका वचनबद्धतामा आज के भयो भन्ने एआई-उत्पन्न सारांश। एक पृष्ठ, हरेक बिहान, अडियो कथनसहित।',
    accent: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Brain,
    title: 'AI Intelligence Engine',
    titleNe: 'AI बुद्धिमत्ता इन्जिन',
    body: 'Scans 80+ RSS feeds, YouTube channels, social media, and government portals every 4 hours. AI classifies signals, detects contradictions, and generates accountability scores automatically.',
    bodyNe: 'हरेक ४ घण्टामा ८०+ RSS फिड, YouTube च्यानल, सामाजिक सञ्जाल, र सरकारी पोर्टलहरू स्क्यान गर्छ। AI ले स्वचालित रूपमा संकेतहरू वर्गीकरण, विरोधाभास पत्ता लगाउने, र जवाफदेहिता स्कोर उत्पन्न गर्छ।',
    accent: 'from-emerald-500/20 to-cyan-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Satellite,
    title: 'Source Network',
    titleNe: 'स्रोत नेटवर्क',
    body: '80+ verified feeds across news, government portals, social media, YouTube, and international organizations. AI discovers new sources automatically.',
    bodyNe: 'समाचार, सरकारी पोर्टल, सामाजिक सञ्जाल, YouTube, र अन्तर्राष्ट्रिय संस्थाहरूमा ८०+ प्रमाणित फिड। AI ले स्वचालित रूपमा नयाँ स्रोतहरू खोज्छ।',
    accent: 'from-purple-500/20 to-fuchsia-500/20',
    iconColor: 'text-purple-400',
  },
];

export default function AboutPage() {
  const [audioLang, setAudioLang] = useState<'en' | 'ne'>('en');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioSrc = audioLang === 'en' ? '/audio/about-en.mp3' : '/audio/about-ne.mp3';

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleLangSwitch = (lang: 'en' | 'ne') => {
    if (lang === audioLang) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
    setAudioLang(lang);
  };

  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nepal Republic',
    alternateName: 'नेपाल रिपब्लिक',
    url: 'https://www.nepalrepublic.org',
    description:
      'AI-powered civic intelligence platform. Scans 80+ sources daily to track 109 government commitments, verify evidence, and score accountability.',
    inLanguage: ['en', 'ne'],
    publisher: {
      '@type': 'Organization',
      name: 'Nepal Republic',
      url: 'https://www.nepalrepublic.org',
    },
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      {/* Background grid */}
      <div className="absolute inset-0 z-0 nepal-hero-grid" />
      <div className="mountain-ridge opacity-60" />

      <div className="relative z-10">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="public-section pt-14 sm:pt-16 lg:pt-20">
          <div className="public-shell text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">
              <Info className="h-3.5 w-3.5" />
              नेपाल रिपब्लिकको बारेमा
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-sans text-[2.5rem] font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-[3.4rem] lg:text-[4.2rem]">
              Track promises.
              <br />
              Report reality.
              <br />
              <span className="text-primary-400">Verify the truth.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
              Nepal Republic uses AI to track government commitments, surface
              real-world issues, and analyze evidence so you can see how the
              system actually performs.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              Nepal Republic ले AI प्रयोग गरी सरकारी वचनबद्धता ट्र्याक गर्छ,
              वास्तविक समस्याहरू सतहमा ल्याउँछ, र प्रमाणहरू विश्लेषण गर्छ —
              ताकि तपाईं प्रणाली कसरी काम गर्दैछ भन्ने देख्न सक्नुहोस्।
            </p>
          </div>
        </section>

        {/* ── Audio Player ─────────────────────────────────────────── */}
        <section className="public-section pt-8 sm:pt-10">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="glass-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary-500/15 to-primary-600/15 p-3">
                    <Volume2 className="h-5 w-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Listen to this guide
                    </p>
                    <p className="text-xs text-gray-500">
                      यो गाइड सुन्नुहोस्
                    </p>
                  </div>
                </div>

                {/* Language toggle */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => handleLangSwitch('en')}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      audioLang === 'en'
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.07]'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleLangSwitch('ne')}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      audioLang === 'ne'
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.07]'
                    }`}
                  >
                    नेपाली
                  </button>
                </div>

                {/* Player controls */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-300 transition-colors hover:bg-primary-500/30"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="ml-0.5 h-4 w-4" />
                    )}
                  </button>
                  <audio
                    ref={audioRef}
                    key={audioSrc}
                    src={audioSrc}
                    onEnded={() => setIsPlaying(false)}
                    onPause={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    className="h-8 w-full"
                    controls
                    controlsList="nodownload"
                    preload="none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What is Nepal Republic? ──────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary-400/80">
                  What is Nepal Republic? / नेपाल रिपब्लिक के हो?
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Accountability for every commitment
                </h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Nepal Republic tracks <span className="font-semibold text-white">109 government commitments</span> made
                    by Nepal&apos;s RSP-led government. Each commitment is monitored
                    continuously through AI-powered intelligence gathering and
                    community-submitted evidence.
                  </p>
                  <p>
                    Every commitment shows its current status — not started, in
                    progress, stalled, or delivered — backed by real sources: news
                    articles, official documents, budget data, parliamentary
                    records, and citizen reports.
                  </p>
                  <p>
                    The platform is designed so that any Nepali citizen can answer
                    a simple question: <span className="italic text-gray-300">&quot;Is my government keeping its promises?&quot;</span>
                  </p>
                </div>
                <div className="mt-5 space-y-3 text-sm leading-7 text-gray-500">
                  <p>
                    नेपाल रिपब्लिकले नेपालको आरएसपी नेतृत्वको सरकारले गरेका <span className="font-semibold text-gray-400">१०९ सरकारी वचनबद्धता</span> ट्र्याक
                    गर्छ। प्रत्येक वचनबद्धता एआई-संचालित बुद्धिमत्ता सङ्कलन र
                    सामुदायिक प्रमाणद्वारा निरन्तर अनुगमन गरिन्छ।
                  </p>
                  <p>
                    प्लेटफर्म यसरी डिजाइन गरिएको छ कि कुनै पनि नेपाली नागरिकले
                    एउटा सरल प्रश्नको उत्तर पाउन सकून: <span className="italic text-gray-400">&quot;मेरो सरकारले आफ्ना वाचा पालना गरिरहेको छ?&quot;</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What can you do here? ───────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Features / सुविधाहरू
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                What can you do here?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                यहाँ तपाईं के गर्न सक्नुहुन्छ?
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="glass-card relative overflow-hidden p-5 transition-all duration-500 hover:border-white/[0.12]"
                  >
                    <div className="relative">
                      <div
                        className={`rounded-2xl bg-gradient-to-br ${feature.accent} p-3 w-fit`}
                      >
                        <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {feature.titleNe}
                      </p>
                      <p className="mt-3 text-[13px] leading-6 text-gray-400">
                        {feature.body}
                      </p>
                      <p className="mt-2 text-[12px] leading-5 text-gray-600">
                        {feature.bodyNe}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How does it work? ────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  Intelligence pipeline / बुद्धिमत्ता पाइपलाइन
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  How does it work?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  यो कसरी काम गर्छ?
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1: Collect */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-400">
                      1
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Rss className="h-4 w-4 text-blue-400" />
                        <h3 className="text-base font-semibold text-white">
                          Collect
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        We continuously scan <span className="font-semibold text-white">80+ sources</span> including
                        national newspapers, RSS feeds, YouTube channels,
                        Facebook pages, X accounts, government portals,
                        parliament records, and international organization reports.
                        New sources are discovered automatically by AI.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        हामी ८०+ स्रोतहरू निरन्तर स्क्यान गर्छौं जसमा राष्ट्रिय
                        पत्रिका, आरएसएस फिड, युट्युब च्यानल, फेसबुक पेज, एक्स
                        खाता, सरकारी पोर्टल, र अन्तर्राष्ट्रिय संस्थाका रिपोर्टहरू समावेश छन्।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Classify */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-400">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-violet-400" />
                        <h3 className="text-base font-semibold text-white">
                          Classify
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        AI reads every article, video transcript, and social post.
                        It determines which of the 109 commitments each piece of
                        evidence relates to, whether it confirms or contradicts
                        progress, and extracts key facts, quotes, and dates.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        एआईले हरेक लेख, भिडियो ट्रान्सक्रिप्ट, र सामाजिक पोस्ट
                        पढ्छ। यसले १०९ वचनबद्धतामध्ये कुनसँग सम्बन्धित छ निर्धारण गर्छ,
                        प्रगति पुष्टि वा खण्डन गर्छ कि भनेर मूल्याङ्कन गर्छ।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Verify */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
                      3
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-base font-semibold text-white">
                          Verify
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Citizens submit ground-level evidence — photos, documents,
                        firsthand accounts. Trusted community verifiers review
                        submissions. AI signals and community evidence combine
                        into a final score that no single source can dominate.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        नागरिकहरूले जमिनी स्तरको प्रमाण पेश गर्छन् — फोटो, कागजात,
                        प्रत्यक्षदर्शी विवरण। विश्वसनीय सामुदायिक प्रमाणकर्ताहरूले
                        पेशहरू समीक्षा गर्छन्। एआई सङ्केत र सामुदायिक प्रमाण मिलेर
                        अन्तिम स्कोर बनाउँछन्।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How is scoring calculated? ───────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  Scoring / स्कोरिङ
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  How is the Republic Index calculated?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  रिपब्लिक इन्डेक्स कसरी गणना गरिन्छ?
                </p>

                <div className="mt-6 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Each commitment receives an <span className="font-semibold text-white">A through F letter grade</span> based
                    on its progress percentage, evidence quality, and timeline adherence.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { grade: 'A', label: '80-100%', desc: 'Strong delivery', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                      { grade: 'B', label: '60-79%', desc: 'Good progress', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                      { grade: 'C', label: '40-59%', desc: 'Partial progress', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                      { grade: 'D', label: '20-39%', desc: 'Minimal effort', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                      { grade: 'E', label: '1-19%', desc: 'Nearly stalled', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                      { grade: 'F', label: '0%', desc: 'Not started', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
                    ].map(({ grade, label, desc, color }) => (
                      <div
                        key={grade}
                        className={`rounded-xl border p-3 text-center ${color}`}
                      >
                        <p className="text-xl font-bold">{grade}</p>
                        <p className="text-xs opacity-80">{label}</p>
                        <p className="mt-0.5 text-[11px] opacity-60">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <p>
                    The overall <span className="font-semibold text-white">Republic Index</span> is
                    the weighted average of all 109 commitment grades, factoring
                    in commitment importance, evidence volume, and community
                    consensus. When community evidence is strong, it carries 60%
                    weight against 40% AI assessment — ensuring citizen voices
                    lead the score.
                  </p>
                </div>

                <div className="mt-4 text-xs leading-6 text-gray-600">
                  <p>
                    समग्र रिपब्लिक इन्डेक्स सबै १०९ वचनबद्धता ग्रेडको भारित
                    औसत हो, जसमा वचनबद्धताको महत्त्व, प्रमाणको मात्रा, र सामुदायिक
                    सहमति समावेश हुन्छ। सामुदायिक प्रमाण बलियो हुँदा ६०% भार
                    हुन्छ — नागरिकको आवाजले स्कोर निर्धारण गर्छ।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who builds this? ─────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  Independence / स्वतन्त्रता
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Who builds this?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  यो कसले बनाउँछ?
                </p>

                <div className="mt-5 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Nepal Republic is an <span className="font-semibold text-white">independent civic technology project</span>.
                    It is not affiliated with, funded by, or endorsed by any
                    political party, government body, or commercial interest.
                  </p>
                  <p>
                    The platform applies the same standard of evidence to every
                    commitment regardless of which party or minister is responsible.
                    Scoring is algorithmic and transparent — the methodology is
                    documented and the data sources are public.
                  </p>
                  <p>
                    Our goal is simple: give every Nepali citizen the information
                    they need to hold their government accountable.
                  </p>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-6 text-gray-600">
                  <p>
                    नेपाल रिपब्लिक एक <span className="text-gray-500">स्वतन्त्र नागरिक प्रविधि परियोजना</span> हो।
                    यो कुनै पनि राजनीतिक दल, सरकारी निकाय, वा व्यावसायिक स्वार्थसँग
                    सम्बद्ध, आर्थिक सहयोग प्राप्त, वा समर्थित छैन।
                  </p>
                  <p>
                    हाम्रो लक्ष्य सरल छ: हरेक नेपाली नागरिकलाई आफ्नो सरकारलाई
                    जवाफदेही बनाउन आवश्यक जानकारी दिनु।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Get Started CTA ──────────────────────────────────────── */}
        <section className="public-section pb-14 pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="glass-card mx-auto max-w-3xl p-6 text-center sm:p-8">
              <Satellite className="mx-auto h-8 w-8 text-primary-400" />
              <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Start exploring
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                अन्वेषण सुरु गर्नुहोस्
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-400">
                Browse all 109 commitments, check the report card, or see
                what&apos;s happening today in the daily brief.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
                >
                  Go to Home
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/explore/first-100-days"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  Browse Commitments
                </Link>
                <Link
                  href="/report-card"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  Report Card
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
