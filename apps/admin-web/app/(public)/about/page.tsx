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
  Timer,
  Send,
  FileText,
  Building2,
  Bot,
  Route,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   ABOUT — App explainer page
   Nepal Republic: AI between citizens and government.
   ═══════════════════════════════════════════════ */

const stats = [
  { value: '95+', label: 'Government Services', labelNe: 'सरकारी सेवाहरू' },
  { value: '58', label: 'Government Authorities', labelNe: 'सरकारी निकायहरू' },
  { value: '87', label: 'Active Routes', labelNe: 'सक्रिय मार्गहरू' },
  { value: '109', label: 'Promises Tracked', labelNe: 'वचनहरू ट्र्याक' },
];

const features = [
  {
    icon: Bot,
    title: 'AI Fills Your Forms',
    titleNe: 'AI ले तपाईंको फारम भर्छ',
    body: 'Describe what you need in plain language or voice. AI understands your request, identifies the right service, and fills out the government forms for you — no bureaucracy to decode.',
    bodyNe: 'तपाईंलाई के चाहिएको हो भनेर सरल भाषा वा आवाजमा भन्नुहोस्। AI ले तपाईंको अनुरोध बुझ्छ, सही सेवा पहिचान गर्छ, र सरकारी फारम तपाईंको लागि भर्छ।',
    accent: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Route,
    title: 'Routed to the Right Desk',
    titleNe: 'सही डेस्कमा पठाइन्छ',
    body: 'Your case is automatically routed to the correct government authority — from ward offices to federal ministries. 87 routes map every service to its responsible desk.',
    bodyNe: 'तपाईंको केस स्वचालित रूपमा सही सरकारी निकायमा पठाइन्छ — वडा कार्यालयदेखि संघीय मन्त्रालयसम्म। ८७ मार्गहरूले हरेक सेवालाई जिम्मेवार डेस्कमा जोड्छन्।',
    accent: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Timer,
    title: 'Deadlines Enforced',
    titleNe: 'समयसीमा लागू',
    body: 'Every route has an SLA — from 1 hour for ambulance dispatch to 90 days for trademark registration. The system tracks deadlines, sends warnings, and escalates when authorities miss them.',
    bodyNe: 'हरेक मार्गमा SLA छ — एम्बुलेन्सको लागि १ घण्टादेखि ट्रेडमार्कको लागि ९० दिनसम्म। प्रणालीले समयसीमा ट्र्याक गर्छ, चेतावनी पठाउँछ, र ढिला भएमा माथि पठाउँछ।',
    accent: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
  {
    icon: Send,
    title: 'Government Can Reply',
    titleNe: 'सरकारले जवाफ दिन सक्छ',
    body: 'Authorities receive secure, expiring reply links to respond directly — approve, reject, update status, or request more info. No login required on their side.',
    bodyNe: 'निकायहरूले सुरक्षित, म्याद सकिने लिङ्कबाट सिधै जवाफ दिन सक्छन् — स्वीकृत, अस्वीकृत, स्थिति अपडेट, वा थप जानकारी माग।',
    accent: 'from-emerald-500/20 to-green-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: ClipboardCheck,
    title: 'Full Case History',
    titleNe: 'पूरा केस इतिहास',
    body: 'Every step is recorded: what you submitted, what the government responded, what deadlines were met or missed. Your complete paper trail in one place.',
    bodyNe: 'हरेक चरण रेकर्ड हुन्छ: तपाईंले के बुझायौं, सरकारले के जवाफ दियो, कुन समयसीमा पूरा भयो वा भएन। तपाईंको पूरा अभिलेख एकै ठाउँमा।',
    accent: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: FileText,
    title: '66 AI Workflows',
    titleNe: '६६ AI कार्यप्रवाह',
    body: 'From passport applications to land registration — 66 step-by-step workflows guide you through every government process. AI handles the complexity so you do not have to.',
    bodyNe: 'राहदानी आवेदनदेखि जग्गा दर्तासम्म — ६६ चरणबद्ध कार्यप्रवाहले तपाईंलाई हरेक सरकारी प्रक्रियामा मार्गदर्शन गर्छ।',
    accent: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Building2,
    title: '58 Authorities Mapped',
    titleNe: '५८ निकायहरू जोडिएका',
    body: '58 government bodies are connected — ministries, departments, municipalities, hospitals, universities, courts, and more. Each mapped with real contact channels and SLA targets.',
    bodyNe: '५८ सरकारी निकायहरू जोडिएका छन् — मन्त्रालय, विभाग, नगरपालिका, अस्पताल, विश्वविद्यालय, अदालत र अन्य। प्रत्येकमा वास्तविक सम्पर्क र SLA लक्ष्य।',
    accent: 'from-purple-500/20 to-fuchsia-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: ShieldAlert,
    title: 'Corruption Tracking',
    titleNe: 'भ्रष्टाचार ट्र्याकिङ',
    body: 'Track corruption cases, investigations, and accountability signals with linked sources and public evidence. AI scans 40,000+ signals to flag contradictions and broken promises.',
    bodyNe: 'भ्रष्टाचारका घटना, अनुसन्धान, र जवाफदेहिताका संकेतहरू स्रोत र प्रमाणसहित ट्र्याक गर्नुहोस्। AI ले ४०,०००+ संकेतहरू स्क्यान गर्छ।',
    accent: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-400',
  },
  {
    icon: Newspaper,
    title: 'Daily Intelligence Brief',
    titleNe: 'दैनिक बुद्धिमत्ता ब्रिफ',
    body: 'AI generates daily briefings from 80+ news sources, 17 YouTube channels, and social media. Audio summaries in English and Nepali — delivered twice a day.',
    bodyNe: '८०+ समाचार स्रोत, १७ YouTube च्यानल, र सोसल मिडियाबाट AI ले दैनिक ब्रिफिङ बनाउँछ। अंग्रेजी र नेपालीमा अडियो — दिनमा दुई पटक।',
    accent: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: Target,
    title: '109 Promises Tracked',
    titleNe: '१०९ वचनहरू ट्र्याक',
    body: 'Every RSP government commitment is tracked with progress scores, letter grades (A-F), evidence, and source links. See which promises are moving and which are stalled.',
    bodyNe: 'RSP सरकारका हरेक वचन प्रगति स्कोर, ग्रेड (A-F), प्रमाण, र स्रोत लिङ्कसहित ट्र्याक गरिन्छ। कुन वचन अगाडि बढ्दैछ र कुन रोकिएको छ हेर्नुहोस्।',
    accent: 'from-teal-500/20 to-emerald-500/20',
    iconColor: 'text-teal-400',
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
      'AI-powered citizen platform for Nepal. Get services done, track issues, and follow accountability in one place.',
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
              AI-powered citizen
              <br />
              platform
              <br />
              <span className="text-primary-400">for Nepal.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
              From everyday services to national accountability, this is
              AI-powered navigation for Nepal.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              दैनिक सेवादेखि राष्ट्रिय जवाफदेहितासम्म,
              यो नेपालका लागि AI-संचालित नेभिगेसन प्लेटफर्म हो।
            </p>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        <section className="public-section pt-8 sm:pt-10">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-card p-4 text-center"
                  >
                    <div className="text-2xl font-bold text-primary-400 sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs font-medium text-gray-300">
                      {stat.label}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {stat.labelNe}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      Listen to what this app does
                    </p>
                    <p className="text-xs text-gray-500">
                      यो एप के गर्छ भनेर सुन्नुहोस्
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
                  An AI layer between citizens and government
                </h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Nepal Republic is an <span className="font-semibold text-white">AI-powered citizen platform</span> that
                    handles the hard part of dealing with Nepal&apos;s government. You describe what you need.
                    AI fills your forms, routes your case to the right authority out of 58 mapped government bodies,
                    and enforces deadlines so your request does not disappear into the system.
                  </p>
                  <p>
                    On the other side, the platform tracks public accountability: 109 government promises scored
                    with letter grades, corruption signals flagged from 40,000+ intelligence sources, and daily
                    AI briefings from 80+ news feeds. Everything is linked, sourced, and kept as public record.
                  </p>
                  <p>
                    The result is one platform where a citizen can get a passport, report a broken road,
                    check if a minister kept a promise, and see today&apos;s accountability brief — all without
                    learning how the bureaucracy works.
                  </p>
                </div>
                <div className="mt-5 space-y-3 text-sm leading-7 text-gray-500">
                  <p>
                    नेपाल रिपब्लिक एक <span className="font-semibold text-gray-400">AI-संचालित नागरिक प्लेटफर्म</span> हो
                    जसले नेपालको सरकारसँग व्यवहार गर्ने गाह्रो काम सम्हाल्छ। तपाईंले
                    आफ्नो आवश्यकता भन्नुहोस्। AI ले फारम भर्छ, तपाईंको केस ५८ सरकारी
                    निकायमध्ये सही निकायमा पठाउँछ, र समयसीमा लागू गर्छ।
                  </p>
                  <p>
                    अर्कोतर्फ, प्लेटफर्मले सार्वजनिक जवाफदेहिता ट्र्याक गर्छ: १०९ सरकारी
                    वचनहरू ग्रेड सहित, ४०,०००+ बुद्धिमत्ता स्रोतबाट भ्रष्टाचार संकेत, र
                    ८०+ समाचार फिडबाट दैनिक AI ब्रिफिङ। सबै जोडिएको, स्रोत सहित, र
                    सार्वजनिक अभिलेखको रूपमा राखिएको।
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
                What&apos;s built / के बनिसकेको छ
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
                  The loop / प्रक्रिया
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  How does it work?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  यो कसरी काम गर्छ?
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1: You describe */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-400">
                      1
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-400" />
                        <h3 className="text-base font-semibold text-white">
                          You describe, AI handles
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Type or speak what you need in plain Nepali or English.
                        AI identifies the right service from 95+ options, fills
                        out all required government forms, and prepares your
                        submission. You review and confirm — that&apos;s it.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        तपाईंलाई चाहिएको कुरा सरल नेपाली वा अंग्रेजीमा टाइप वा
                        बोल्नुहोस्। AI ले ९५+ सेवाहरूबाट सही सेवा पहिचान गर्छ,
                        सबै सरकारी फारम भर्छ, र तपाईंको निवेदन तयार गर्छ।
                        तपाईंले जाँच्नुहोस् र पुष्टि गर्नुहोस् — बस्।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Routed with deadlines */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-400">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-violet-400" />
                        <h3 className="text-base font-semibold text-white">
                          Routed with deadlines
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Your case is routed to the correct government desk — one
                        of 58 mapped authorities across federal ministries,
                        departments, municipalities, hospitals, and courts.
                        Every route has an SLA deadline. The system warns when
                        deadlines approach and escalates when they pass.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        तपाईंको केस सही सरकारी डेस्कमा पठाइन्छ — ५८ जोडिएका
                        निकायमध्ये एउटामा। हरेक मार्गमा SLA समयसीमा हुन्छ।
                        समयसीमा नजिक आउँदा चेतावनी दिन्छ र बित्दा माथि
                        पठाउँछ।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Government responds */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
                      3
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-base font-semibold text-white">
                          Government responds
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Authorities receive secure reply links to approve, reject,
                        update status, or request more information — no login
                        needed. Every response is logged in your case history.
                        If they do not respond, the system knows and the public
                        record reflects it.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        निकायहरूले सुरक्षित लिङ्कबाट स्वीकृत, अस्वीकृत, स्थिति
                        अपडेट, वा थप जानकारी माग गर्न सक्छन् — लगइन चाहिँदैन।
                        हरेक जवाफ तपाईंको केस इतिहासमा रेकर्ड हुन्छ। जवाफ
                        नदिएमा पनि प्रणालीले थाहा पाउँछ।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Everything is tracked */}
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">
                      4
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Satellite className="h-4 w-4 text-amber-400" />
                        <h3 className="text-base font-semibold text-white">
                          Everything is public record
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Meanwhile, AI scans 80+ news sources, 17 YouTube channels,
                        and social media twice daily. 109 government promises are
                        graded A-F. Corruption is flagged. Daily intelligence
                        briefs are published with audio in English and Nepali.
                        The public record keeps growing whether officials act or not.
                      </p>
                      <p className="mt-2 text-xs leading-6 text-gray-600">
                        यसैबीच, AI ले दिनमा दुई पटक ८०+ समाचार स्रोत, १७ YouTube
                        च्यानल, र सोसल मिडिया स्क्यान गर्छ। १०९ सरकारी वचनहरूलाई
                        A-F ग्रेड दिइन्छ। भ्रष्टाचार संकेत चिन्हित हुन्छ। दैनिक
                        बुद्धिमत्ता ब्रिफ अंग्रेजी र नेपालीमा प्रकाशित हुन्छ।
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
                  How does accountability scoring work?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  जवाफदेहिता स्कोरिङ कसरी काम गर्छ?
                </p>

                <div className="mt-6 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Every government commitment is scored based on progress signals,
                    evidence quality, source depth, review coverage, and whether
                    actions match words. AI cross-references 40,000+ signals
                    to flag contradictions between what officials say and what
                    actually happens.
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
                    Scoring exists so citizens can see at a glance whether
                    public action is moving, stalled, contradicted, or unsupported.
                    It is one layer alongside services, case routing, and SLA
                    enforcement.
                  </p>
                </div>

                <div className="mt-4 text-xs leading-6 text-gray-600">
                  <p>
                    हरेक सरकारी वचनलाई प्रगति संकेत, प्रमाणको गुणस्तर, स्रोतको
                    गहिराइ, र कार्य शब्दसँग मेल खान्छ कि भन्नेमा आधारित स्कोर
                    दिइन्छ। AI ले ४०,०००+ संकेतहरू क्रस-रेफरेन्स गरी अधिकारीहरूको
                    भनाइ र वास्तविकतामा विरोधाभास पत्ता लगाउँछ।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What kind of platform? ──────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  Independence / स्वतन्त्रता
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  What kind of platform is this?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  यो कस्तो प्लेटफर्म हो?
                </p>

                <div className="mt-5 space-y-4 text-sm leading-7 text-gray-400">
                  <p>
                    Nepal Republic is an <span className="font-semibold text-white">independent citizen platform</span>.
                    It is not a government portal, not a news aggregator, and not a complaint box.
                    It is a system that uses AI to make government actually reachable — and then
                    holds that same government accountable with public evidence.
                  </p>
                  <p>
                    On one side: 95+ services with AI form filling, 66 step-by-step workflows,
                    automatic routing to 58 authorities, SLA deadlines, and partner reply links.
                    On the other side: 109 promise scorecards, corruption tracking, daily intelligence
                    briefs, and 40,000+ signal monitoring.
                  </p>
                  <p>
                    The standard is simple: if a Nepali opens the app with a problem,
                    Nepal Republic handles it — fills the forms, finds the right desk,
                    tracks the deadline, and keeps the public record.
                  </p>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-6 text-gray-600">
                  <p>
                    नेपाल रिपब्लिक एक <span className="text-gray-500">स्वतन्त्र नागरिक प्लेटफर्म</span> हो।
                    यो सरकारी पोर्टल होइन, समाचार सङ्कलनकर्ता होइन, र गुनासो बक्स
                    होइन। यो AI प्रयोग गरेर सरकारलाई वास्तवमा पहुँचयोग्य बनाउने —
                    र त्यही सरकारलाई सार्वजनिक प्रमाणसहित जवाफदेही बनाउने प्रणाली हो।
                  </p>
                  <p>
                    एकातर्फ: ९५+ सेवाहरू AI फारम भर्ने, ६६ कार्यप्रवाह, ५८ निकायमा
                    स्वचालित राउटिङ, SLA समयसीमा, र साझेदार जवाफ लिङ्क। अर्कोतर्फ:
                    १०९ वचन स्कोरकार्ड, भ्रष्टाचार ट्र्याकिङ, दैनिक बुद्धिमत्ता ब्रिफ,
                    र ४०,०००+ संकेत अनुगमन।
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
                Start with what you need
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                तपाईंलाई चाहिएको कुराबाट सुरु गर्नुहोस्
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-400">
                Describe your problem. AI handles the rest — forms, routing,
                deadlines. Or explore services, check the daily brief, and see
                how your government is performing.
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
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  Explore 95+ Services
                </Link>
                <Link
                  href="/daily"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  Daily Brief
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
