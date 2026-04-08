'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Zap,
  Target,
  TrendingUp,
  Brain,
  BarChart3,
  AlertTriangle,
  Layers,
  Timer,
  CheckCircle2,
  MessageSquare,
  Rocket,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ── Complexity Tiers ── */
const COMPLEXITY_TIERS = [
  {
    tier: 'quick-win',
    icon: Zap,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    en: {
      name: 'Quick Win',
      window: '1–30 days',
      desc: 'Executive orders, directives, appointments — things a PM can do immediately.',
      examples: 'Form cabinet with 18 ministries, issue anti-corruption directive',
    },
    ne: {
      name: 'छिटो जित',
      window: '१–३० दिन',
      desc: 'कार्यकारी आदेश, निर्देशन, नियुक्ति — प्रधानमन्त्रीले तुरुन्तै गर्न सक्ने कुराहरू।',
      examples: '१८ मन्त्रालयसहित मन्त्रिपरिषद् गठन, भ्रष्टाचार विरोधी निर्देशन',
    },
  },
  {
    tier: 'medium',
    icon: Target,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    en: {
      name: 'Medium',
      window: '30–180 days',
      desc: 'Policy reform, program launches, budget allocations — requires coordination across departments.',
      examples: 'Launch digital land registry, reform procurement rules',
    },
    ne: {
      name: 'मध्यम',
      window: '३०–१८० दिन',
      desc: 'नीति सुधार, कार्यक्रम सुरुवात, बजेट विनियोजन — विभागहरू बीच समन्वय चाहिन्छ।',
      examples: 'डिजिटल भूमि दर्ता सुरु, खरिद नियमहरू सुधार',
    },
  },
  {
    tier: 'long-term',
    icon: Timer,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    en: {
      name: 'Long-Term',
      window: '180–365 days',
      desc: 'Legislation, infrastructure, institutional reform — requires sustained effort over months.',
      examples: 'Build new highways, pass constitutional amendments, education reform',
    },
    ne: {
      name: 'दीर्घकालीन',
      window: '१८०–३६५ दिन',
      desc: 'कानुन, पूर्वाधार, संस्थागत सुधार — महिनौंको निरन्तर प्रयास चाहिन्छ।',
      examples: 'नयाँ राजमार्ग निर्माण, संवैधानिक संशोधन, शिक्षा सुधार',
    },
  },
  {
    tier: 'structural',
    icon: Layers,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    en: {
      name: 'Structural',
      window: '1–2+ years',
      desc: 'Fundamental institutional change — deep reform that takes years to implement.',
      examples: 'Federal restructuring, tax system overhaul, judicial reform',
    },
    ne: {
      name: 'संरचनात्मक',
      window: '१–२+ वर्ष',
      desc: 'मौलिक संस्थागत परिवर्तन — कार्यान्वयन गर्न वर्षौं लाग्ने गहिरो सुधार।',
      examples: 'संघीय पुनर्संरचना, कर प्रणाली सुधार, न्यायिक सुधार',
    },
  },
];

/* ── Effort Tiers ── */
const EFFORT_TIERS = [
  {
    tier: 'intent',
    icon: MessageSquare,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    en: { name: 'Intent', desc: 'Speeches, announcements, plans, committee formations — talk, not yet action.' },
    ne: { name: 'मनसाय', desc: 'भाषण, घोषणा, योजना, समिति गठन — कुरा, अझै कार्य होइन।' },
  },
  {
    tier: 'action',
    icon: Rocket,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    en: { name: 'Action', desc: 'Budget allocations, policy changes, bills tabled, contracts signed — concrete steps.' },
    ne: { name: 'कार्य', desc: 'बजेट विनियोजन, नीति परिवर्तन, विधेयक पेश, करार हस्ताक्षर — ठोस कदम।' },
  },
  {
    tier: 'delivery',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    en: { name: 'Delivery', desc: 'Infrastructure completed, services launched, laws enacted — tangible results citizens can see.' },
    ne: { name: 'वितरण', desc: 'पूर्वाधार निर्माण सम्पन्न, सेवाहरू सुरु, कानून लागू — नागरिकले देख्न सक्ने ठोस परिणाम।' },
  },
];

/* ── Dynamic Weights Table ── */
const WEIGHT_PHASES = [
  {
    en: { phase: 'First 2 weeks', intent: '60%', action: '35%', delivery: '5%' },
    ne: { phase: 'पहिलो २ हप्ता', intent: '६०%', action: '३५%', delivery: '५%' },
  },
  {
    en: { phase: 'Month 1-2', intent: '30%', action: '55%', delivery: '15%' },
    ne: { phase: 'महिना १-२', intent: '३०%', action: '५५%', delivery: '१५%' },
  },
  {
    en: { phase: 'Month 3-6', intent: '10%', action: '50%', delivery: '40%' },
    ne: { phase: 'महिना ३-६', intent: '१०%', action: '५०%', delivery: '४०%' },
  },
  {
    en: { phase: 'Month 6-12', intent: '5%', action: '25%', delivery: '70%' },
    ne: { phase: 'महिना ६-१२', intent: '५%', action: '२५%', delivery: '७०%' },
  },
  {
    en: { phase: 'Past deadline', intent: '2%', action: '13%', delivery: '85%' },
    ne: { phase: 'समय सीमा पछि', intent: '२%', action: '१३%', delivery: '८५%' },
  },
];

export default function HowWeScorePage() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isNe ? 'पछाडि' : 'Back'}
        </Link>

        {/* Header */}
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          {isNe ? 'हामी कसरी स्कोर गर्छौं' : 'How We Score'}
        </h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          {isNe
            ? 'रिपब्लिक स्कोर AI-संचालित समय-समायोजित प्रणाली प्रयोग गर्छ। हामी "तिनीहरूले यस समयमा जे अपेक्षा गरिएको थियो, सोही गरिरहेका छन्?" भनेर मूल्याङ्कन गर्छौं — सबै कुरा सम्पन्न भएको छ कि छैन भन्ने मात्र होइन।'
            : 'The Republic Score uses an AI-powered, time-adjusted system. We evaluate "are they doing what\'s expected at THIS point in time?" — not "have they delivered everything?"'}
        </p>

        {/* ────── KEY CONCEPT ────── */}
        <div className="glass-card p-4 mb-6 border-l-2 border-cyan-500/40">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              {isNe ? 'मुख्य अवधारणा' : 'Key Concept'}
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {isNe
              ? 'सरकार मात्र ९ दिनको छ भने सबैकुरा पूरा नभएको भनेर D/F ग्रेड दिनु उचित हुँदैन। समय-समायोजित प्रणालीले प्रत्येक प्रतिबद्धताको जटिलता र समयरेखा बुझ्छ — छिटो जित पहिलो हप्तामा अपेक्षित हुन्छ, तर संरचनात्मक सुधारहरूलाई वर्षौं लाग्छ।'
              : 'A government that\'s only 9 days old shouldn\'t get a D for not having delivered everything. The time-adjusted system understands each commitment\'s complexity and timeline — quick wins are expected in the first week, but structural reforms take years.'}
          </p>
        </div>

        {/* ────── SECTION 1: COMPLEXITY TIERS ────── */}
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          {isNe ? '१. प्रत्येक प्रतिबद्धताको आफ्नै समयरेखा छ' : '1. Every Commitment Has Its Own Timeline'}
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">
          {isNe
            ? 'AI ले प्रत्येक १०९ प्रतिबद्धतालाई ४ जटिलता तहमध्ये एकमा वर्गीकरण गर्छ:'
            : 'AI classifies each of the 109 commitments into one of 4 complexity tiers:'}
        </p>

        <div className="space-y-3 mb-8">
          {COMPLEXITY_TIERS.map((t) => {
            const Icon = t.icon;
            const info = isNe ? t.ne : t.en;
            return (
              <div key={t.tier} className={`glass-card p-3 border-l-2 ${t.border}`}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-white">{info.name}</span>
                    <span className={`ml-2 text-[10px] ${t.color}`}>{info.window}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{info.desc}</p>
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  {isNe ? 'उदाहरण' : 'e.g.'}: {info.examples}
                </p>
              </div>
            );
          })}
        </div>

        {/* ────── SECTION 2: EFFORT TIERS ────── */}
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          {isNe ? '२. हामी ३ प्रकारको प्रयास मापन गर्छौं' : '2. We Measure 3 Types of Effort'}
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">
          {isNe
            ? 'प्रत्येक सिग्नल (समाचार, भाषण, बजेट) लाई AI ले प्रयास तहमा वर्गीकरण गर्छ:'
            : 'Every signal (news article, speech, budget document) is AI-classified into an effort tier:'}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {EFFORT_TIERS.map((e) => {
            const Icon = e.icon;
            const info = isNe ? e.ne : e.en;
            return (
              <div key={e.tier} className="glass-card p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${e.bg} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${e.color}`} />
                </div>
                <div className={`text-xs font-semibold ${e.color} mb-1`}>{info.name}</div>
                <p className="text-[10px] text-gray-500 leading-relaxed">{info.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ────── SECTION 3: DYNAMIC WEIGHTS ────── */}
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          {isNe ? '३. भारहरू समयसँगै परिवर्तन हुन्छ' : '3. Weights Shift Over Time'}
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">
          {isNe
            ? 'सुरुका दिनहरूमा, मनसाय सिग्नलहरू (भाषण, योजना) मूल्यवान छन्। समय बित्दै जाँदा, वितरण नै मुख्य कुरा हो।'
            : 'In the early days, intent signals (speeches, plans) are valuable. As time passes, only delivery matters.'}
        </p>

        <div className="glass-card overflow-hidden mb-8">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-3 py-2 text-gray-500 font-medium">
                  {isNe ? 'चरण' : 'Phase'}
                </th>
                <th className="text-center px-2 py-2 text-cyan-400/70 font-medium">
                  {isNe ? 'मनसाय' : 'Intent'}
                </th>
                <th className="text-center px-2 py-2 text-blue-400/70 font-medium">
                  {isNe ? 'कार्य' : 'Action'}
                </th>
                <th className="text-center px-2 py-2 text-emerald-400/70 font-medium">
                  {isNe ? 'वितरण' : 'Delivery'}
                </th>
              </tr>
            </thead>
            <tbody>
              {WEIGHT_PHASES.map((w, i) => {
                const info = isNe ? w.ne : w.en;
                return (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2 text-gray-400">{info.phase}</td>
                    <td className="text-center px-2 py-2 text-cyan-400">{info.intent}</td>
                    <td className="text-center px-2 py-2 text-blue-400">{info.action}</td>
                    <td className="text-center px-2 py-2 text-emerald-400">{info.delivery}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ────── SECTION 4: TRAJECTORIES ────── */}
        <h2 className="text-base font-semibold text-white mb-3">
          {isNe ? '४. प्रत्येक प्रतिबद्धताले एक दिशा पाउँछ' : '4. Every Commitment Gets a Trajectory'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {[
            { label: isNe ? 'अगाडि' : 'Ahead', color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: isNe ? 'अपेक्षा भन्दा बढी प्रगति' : 'More progress than expected' },
            { label: isNe ? 'ट्र्याकमा' : 'On Track', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: isNe ? 'अपेक्षा अनुरूप' : 'Meeting expectations' },
            { label: isNe ? 'पछाडि' : 'Behind', color: 'text-amber-400', bg: 'bg-amber-500/10', desc: isNe ? 'अपेक्षा भन्दा कम' : 'Less than expected' },
            { label: isNe ? 'ढिला' : 'Overdue', color: 'text-red-400', bg: 'bg-red-500/10', desc: isNe ? 'समयसीमा बितेपछि' : 'Past deadline' },
            { label: isNe ? 'अत्ति चाँडो' : 'Too Early', color: 'text-gray-400', bg: 'bg-gray-500/10', desc: isNe ? 'अझै सुरु हुने अपेक्षा छैन' : 'Not expected to start yet' },
          ].map((t) => (
            <div key={t.label} className={`${t.bg} rounded-lg p-2.5 text-center`}>
              <div className={`text-xs font-semibold ${t.color} mb-0.5`}>{t.label}</div>
              <div className="text-[9px] text-gray-500">{t.desc}</div>
            </div>
          ))}
        </div>

        {/* ────── SECTION 5: OVERALL SCORE ────── */}
        <h2 className="text-base font-semibold text-white mb-3">
          {isNe ? '५. समग्र रिपब्लिक स्कोर' : '5. Overall Republic Score'}
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed mb-3">
          {isNe
            ? 'समग्र स्कोर प्रत्येक जटिलता तहको भारित औसत हो। कार्यालयमा कति दिन भयो भन्ने आधारमा भारहरू परिवर्तन हुन्छ:'
            : 'The overall score is a weighted average across complexity tiers. The weights shift based on how far into the term:'}
        </p>
        <div className="glass-card p-3 mb-3">
          <div className="text-[11px] text-gray-400 space-y-1.5">
            <div className="flex justify-between">
              <span>{isNe ? 'पहिलो २ हप्ता' : 'First 2 weeks'}:</span>
              <span className="text-gray-300">
                {isNe ? 'छिटो जित' : 'Quick-wins'} 70% · {isNe ? 'मध्यम' : 'Medium'} 25% · {isNe ? 'दीर्घ' : 'Long'} 5%
              </span>
            </div>
            <div className="flex justify-between">
              <span>{isNe ? 'महिना ३-१२' : 'Month 3-12'}:</span>
              <span className="text-gray-300">
                {isNe ? 'छिटो जित' : 'Quick-wins'} 10% · {isNe ? 'मध्यम' : 'Medium'} 25% · {isNe ? 'दीर्घ' : 'Long'} 35% · {isNe ? 'संरचनात्मक' : 'Structural'} 30%
              </span>
            </div>
            <div className="flex justify-between">
              <span>{isNe ? '१ वर्ष पछि' : 'After 1 year'}:</span>
              <span className="text-gray-300">
                {isNe ? 'दीर्घ' : 'Long'} 35% · {isNe ? 'संरचनात्मक' : 'Structural'} 40% · {isNe ? 'मध्यम' : 'Medium'} 20%
              </span>
            </div>
          </div>
        </div>

        {/* Grade scale */}
        <div className="glass-card p-3 mb-8">
          <div className="text-center mb-2">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              {isNe ? 'ग्रेड' : 'Grades'}
            </span>
          </div>
          <div className="flex justify-center gap-3 text-xs">
            <span className="text-emerald-400 font-bold">A <span className="font-normal text-gray-500">≥80</span></span>
            <span className="text-blue-400 font-bold">B <span className="font-normal text-gray-500">≥60</span></span>
            <span className="text-amber-400 font-bold">C <span className="font-normal text-gray-500">≥40</span></span>
            <span className="text-orange-400 font-bold">D <span className="font-normal text-gray-500">≥20</span></span>
            <span className="text-red-400 font-bold">F <span className="font-normal text-gray-500">&lt;20</span></span>
          </div>
        </div>

        {/* ────── SECTION 6: DATA SOURCES ────── */}
        <h2 className="text-base font-semibold text-white mb-3">
          {isNe ? '६. हाम्रा डाटा स्रोतहरू' : '6. Our Data Sources'}
        </h2>
        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            {isNe
              ? 'AI ले हरेक १२ घण्टामा ८०+ स्रोतहरूबाट स्वचालित रूपमा सिग्नल संकलन र वर्गीकरण गर्छ। कुनै मानवीय हस्तक्षेप आवश्यक पर्दैन।'
              : 'AI automatically collects and classifies signals from 80+ sources every 12 hours. No human intervention needed.'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              80+ RSS {isNe ? 'फिडहरू' : 'feeds'}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              17 YouTube {isNe ? 'च्यानलहरू' : 'channels'}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              28 Facebook {isNe ? 'पेजहरू' : 'pages'}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              X, TikTok, Telegram, Reddit
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {isNe ? 'सरकारी पोर्टलहरू' : 'Government portals'}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {isNe ? 'संसदीय कागजातहरू' : 'Parliament records'}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Kathmandu Post', 'Republica', 'Kantipur', 'OnlineKhabar', 'Setopati', 'Nepal Press', 'Khabarhub', 'News24', 'NTV'].map((src) => (
              <span key={src} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">
                {src}
              </span>
            ))}
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">
              +70 {isNe ? 'थप' : 'more'}
            </span>
          </div>
        </div>

        {/* ────── DATA CONFIDENCE ────── */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              {isNe ? 'डाटा विश्वसनीयता' : 'Data Confidence'}
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            {isNe
              ? 'पर्याप्त प्रमाणित डाटा नभएसम्म हामी स्कोर देखाउँदैनौं। "अत्ति चाँडो" प्रतिबद्धताहरूले ५० (तटस्थ) पाउँछन् र ग्रेडिङ्गमा पर्दैनन्।'
              : 'We don\'t show scores without sufficient verified data. "Too early" commitments score 50 (neutral) and are excluded from grading.'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2">
              <div className="text-[10px] text-emerald-400 font-medium">
                {isNe ? 'पर्याप्त' : 'Sufficient'}
              </div>
              <div className="text-[9px] text-gray-500">50+ {isNe ? 'सिग्नल' : 'signals'}</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 py-2">
              <div className="text-[10px] text-amber-400 font-medium">
                {isNe ? 'आंशिक' : 'Partial'}
              </div>
              <div className="text-[9px] text-gray-500">15-49 {isNe ? 'सिग्नल' : 'signals'}</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 py-2">
              <div className="text-[10px] text-red-400 font-medium">
                {isNe ? 'अपर्याप्त' : 'Insufficient'}
              </div>
              <div className="text-[9px] text-gray-500">&lt;15 {isNe ? 'सिग्नल' : 'signals'}</div>
            </div>
          </div>
        </div>

        {/* ────── TRANSPARENCY NOTE ────── */}
        <div className="glass-card p-4 border-l-2 border-cyan-500/30 mb-6">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">
            {isNe ? 'पारदर्शिता' : 'Transparency'}
          </h3>
          <ul className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
            <li>• {isNe
              ? 'सबै स्कोरिङ कोड ओपन-सोर्स छ — कसैले पनि लजिक जाँच गर्न सक्छ'
              : 'All scoring code is open-source — anyone can inspect the logic'}</li>
            <li>• {isNe
              ? 'AI मोडेलहरू: Qwen 3.6+ (नि:शुल्क वर्गीकरण), GPT-4.1-mini (गहिरो विश्लेषण)'
              : 'AI models: Qwen 3.6+ (free classification), GPT-4.1-mini (deep analysis)'}</li>
            <li>• {isNe
              ? 'स्कोर हरेक स्विपमा स्वचालित रूपमा पुनर्गणना हुन्छ (दिनमा २ पटक)'
              : 'Score auto-recomputes every sweep (2x daily)'}</li>
            <li>• {isNe
              ? 'एडमिनले AI समयरेखा ओभरराइड गर्न सक्छ — ओभरराइडहरू चिन्हित हुन्छन्'
              : 'Admins can override AI timelines — overrides are flagged'}</li>
            <li>• {isNe
              ? 'कुनै पनि AI लागत $५/महिना भन्दा कम (नि:शुल्क मोडेलहरू पहिला प्रयोग गरिन्छ)'
              : 'Total AI cost under $5/month (free models used first)'}</li>
          </ul>
        </div>

        {/* ────── LIMITATIONS ────── */}
        <div className="glass-card p-4 border-l-2 border-amber-500/30">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">
            {isNe ? 'हालका सीमितताहरू' : 'Current Limitations'}
          </h3>
          <ul className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
            <li>• {isNe
              ? 'AI ले कहिलेकाहीँ सिग्नलहरूलाई गलत वर्गीकरण गर्छ — एडमिन समीक्षाले यसलाई सच्छ'
              : 'AI occasionally misclassifies signals — admin review corrects this'}</li>
            <li>• {isNe
              ? 'बजेट कार्यान्वयन डाटा अझै सीमित छ'
              : 'Budget execution data is still limited'}</li>
            <li>• {isNe
              ? 'नागरिक मतदान भर्खर सुरु भएको छ — नमूना आकार बढ्दै छ'
              : 'Citizen voting just launched — sample size is growing'}</li>
            <li>• {isNe
              ? 'केही प्रतिबद्धताहरूमा "अपर्याप्त" डाटा विश्वसनीयता छ — थप सिग्नल आवश्यक छ'
              : 'Some commitments have "insufficient" data confidence — more signals needed'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
