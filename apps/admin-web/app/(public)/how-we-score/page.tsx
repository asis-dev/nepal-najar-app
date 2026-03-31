'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, BarChart3, Eye, Banknote, Users, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const SUB_SCORES = [
  {
    icon: BarChart3,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    weight: '30%',
    key: 'deliveryRate',
    en: { name: 'Delivery Rate', desc: 'What percentage of tracked commitments have been fully delivered? This is the hardest metric to move — it requires completion, not just activity.' },
    ne: { name: 'डेलिभरी दर', desc: 'ट्र्याक गरिएका प्रतिबद्धतामध्ये कतिप्रतिशत पूर्ण रूपमा सम्पन्न भएको छ? यो सबैभन्दा गाह्रो मेट्रिक हो — गतिविधि मात्र होइन, पूर्णता चाहिन्छ।' },
  },
  {
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    weight: '30%',
    key: 'avgProgress',
    en: { name: 'Average Progress', desc: 'The mean progress percentage across all tracked commitments. Each commitment is scored 0-100% based on evidence of government action — committee formation, budget allocation, construction started, etc.' },
    ne: { name: 'औसत प्रगति', desc: 'सबै ट्र्याक गरिएका प्रतिबद्धताहरूको औसत प्रगति प्रतिशत। प्रत्येक प्रतिबद्धतालाई सरकारी कारबाहीको प्रमाणमा आधारित ०-१००% अंक दिइएको छ।' },
  },
  {
    icon: Shield,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    weight: '15%',
    key: 'trustScore',
    en: { name: 'Trust Score', desc: 'What percentage of commitments have verified or partially verified evidence? Higher trust means more data points from multiple independent sources confirm the status.' },
    ne: { name: 'विश्वास स्कोर', desc: 'कति प्रतिबद्धताहरूमा प्रमाणित वा आंशिक प्रमाणित प्रमाण छ? उच्च विश्वासको अर्थ धेरै स्वतन्त्र स्रोतहरूबाट पुष्टि भएको छ।' },
  },
  {
    icon: Banknote,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    weight: '20%',
    key: 'budgetUtilization',
    en: { name: 'Budget Utilization', desc: 'How much of the estimated budget has actually been spent? This tracks whether allocated funds are being deployed. Currently limited — budget execution data from the Finance Ministry is not yet systematically available.' },
    ne: { name: 'बजेट उपयोग', desc: 'अनुमानित बजेटको कति वास्तवमा खर्च भएको छ? अहिले सीमित — अर्थ मन्त्रालयको बजेट कार्यान्वयन डाटा अझै व्यवस्थित रूपमा उपलब्ध छैन।' },
  },
  {
    icon: Users,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    weight: '10%',
    key: 'citizenSentiment',
    en: { name: 'Citizen Sentiment', desc: 'The ratio of positive to negative public votes on commitments. This reflects what citizens think about government performance based on their direct experience. Voting is open to everyone.' },
    ne: { name: 'नागरिक भावना', desc: 'प्रतिबद्धताहरूमा सकारात्मक र नकारात्मक सार्वजनिक मतको अनुपात। यसले नागरिकहरूले सरकारी कार्यसम्पादनबारे के सोच्छन् भन्ने प्रतिबिम्बित गर्छ।' },
  },
];

export default function HowWeScorePage() {
  const { locale, t } = useI18n();
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
          {t('common.back')}
        </Link>

        {/* Header */}
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          {isNe ? 'हामी कसरी स्कोर गर्छौं' : 'How We Score'}
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {isNe
            ? 'रिपब्लिक इन्डेक्स ५ भारित मेट्रिक्सबाट गणना गरिन्छ। प्रत्येकले सरकारी प्रदर्शनको फरक पक्ष मापन गर्छ।'
            : 'The Republic Index is computed from 5 weighted metrics. Each measures a different aspect of government performance.'}
        </p>

        {/* Formula summary */}
        <div className="glass-card p-4 mb-6">
          <div className="text-center mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              {isNe ? 'सूत्र' : 'Formula'}
            </span>
          </div>
          <div className="text-center text-sm text-gray-300 font-mono">
            Score = (0.30 × Delivery) + (0.30 × Progress) + (0.15 × Trust) + (0.20 × Budget) + (0.10 × Sentiment)
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-gray-500">
              {isNe ? 'ग्रेड: A (≥80) · B (≥60) · C (≥40) · D (≥20) · F (<20)' : 'Grade: A (≥80) · B (≥60) · C (≥40) · D (≥20) · F (<20)'}
            </span>
          </div>
        </div>

        {/* Sub-scores detail */}
        <div className="space-y-4 mb-8">
          {SUB_SCORES.map((s) => {
            const Icon = s.icon;
            const info = isNe ? s.ne : s.en;
            return (
              <div key={s.key} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{info.name}</h3>
                  </div>
                  <span className={`text-xs font-bold ${s.color}`}>{s.weight}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{info.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Data confidence */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              {isNe ? 'डाटा विश्वसनीयता' : 'Data Confidence'}
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            {isNe
              ? 'हामी स्कोर तब मात्र देखाउँछौं जब पर्याप्त प्रमाणित डाटा छ। ५ भन्दा कम प्रमाणित डाटा बिन्दुहरू भएमा, स्कोर "अपर्याप्त" चिन्हित हुन्छ र भ्रामक संख्या देखाउनुको सट्टा लुकाइन्छ।'
              : 'We only show scores when sufficient verified data exists. When fewer than 5 verified data points are available, the score is flagged as "insufficient" and hidden rather than showing a misleading number.'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2">
              <div className="text-[10px] text-emerald-400 font-medium">
                {isNe ? 'पर्याप्त' : 'Sufficient'}
              </div>
              <div className="text-[9px] text-gray-500">10+ {isNe ? 'बिन्दु' : 'points'}</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 py-2">
              <div className="text-[10px] text-amber-400 font-medium">
                {isNe ? 'आंशिक' : 'Partial'}
              </div>
              <div className="text-[9px] text-gray-500">5-9 {isNe ? 'बिन्दु' : 'points'}</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 py-2">
              <div className="text-[10px] text-red-400 font-medium">
                {isNe ? 'अपर्याप्त' : 'Insufficient'}
              </div>
              <div className="text-[9px] text-gray-500">&lt;5 {isNe ? 'बिन्दु' : 'points'}</div>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="glass-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-white mb-2">
            {isNe ? 'हाम्रा स्रोतहरू' : 'Our Sources'}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            {isNe
              ? 'हामी ८०+ RSS फिडहरू, १७ YouTube च्यानलहरू, २८ Facebook पेजहरू, र सरकारी पोर्टलहरूबाट स्वचालित रूपमा समाचार र सिग्नलहरू संकलन गर्छौं। प्रत्येक सिग्नललाई AI ले वर्गीकरण गर्छ: पुष्टि गर्छ, खण्डन गर्छ, वा तटस्थ।'
              : 'We automatically collect news and signals from 80+ RSS feeds, 17 YouTube channels, 28 Facebook pages, and government portals. Each signal is AI-classified as: confirms, contradicts, or neutral.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['Kathmandu Post', 'Republica', 'Kantipur', 'OnlineKhabar', 'Setopati', 'Nepal Press', 'Khabarhub', 'Rising Nepal', 'News24', 'NTV'].map((src) => (
              <span key={src} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">
                {src}
              </span>
            ))}
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">
              +70 {isNe ? 'थप' : 'more'}
            </span>
          </div>
        </div>

        {/* Limitations */}
        <div className="glass-card p-4 border-l-2 border-amber-500/30">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">
            {isNe ? 'हालका सीमितताहरू' : 'Current Limitations'}
          </h3>
          <ul className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
            <li>• {isNe ? 'बजेट कार्यान्वयन डाटा अझै अपूर्ण छ (बजेट उपयोग स्कोर कम छ)' : 'Budget execution data is still incomplete (budget utilization score is low)'}</li>
            <li>• {isNe ? 'नागरिक मतदान भर्खर सुरु भएको छ (नागरिक भावना स्कोर कम छ)' : 'Citizen voting just launched (citizen sentiment score is low)'}</li>
            <li>• {isNe ? 'ऐतिहासिक ब्याकफिल हाल रोकेको छ; प्रणाली हालका/लाइभ स्रोतहरूमा केन्द्रित छ' : 'Historical backfill is currently paused; the tracker focuses on live/current sources'}</li>
            <li>• {isNe ? 'स्कोर स्वचालित रूपमा अद्यावधिक हुन्छ जब नयाँ प्रमाण उपलब्ध हुन्छ' : 'Score auto-updates as new evidence becomes available'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
