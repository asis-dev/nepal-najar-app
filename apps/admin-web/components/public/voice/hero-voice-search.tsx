'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { VoiceSearchBar } from './voice-search-bar';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

const CYCLING_PLACEHOLDERS_EN = [
  'I need a passport...',
  'How do I get a driving license?',
  'My hospital bill is wrong...',
  'I want to register a business...',
  'I need a citizenship certificate...',
  'How to file taxes?',
  'Land registration process...',
  'Report a broken road...',
  'Birth certificate for my child...',
];

const CYCLING_PLACEHOLDERS_NE = [
  'मलाई पासपोर्ट चाहिन्छ...',
  'ड्राइभिङ लाइसेन्स कसरी बनाउने?',
  'अस्पताल बिल गलत छ...',
  'व्यापार दर्ता गर्नु छ...',
  'नागरिकता प्रमाणपत्र चाहिन्छ...',
  'कर कसरी फाइल गर्ने?',
  'जग्गा दर्ता प्रक्रिया...',
  'बिग्रेको सडक रिपोर्ट गर्ने...',
  'बच्चाको जन्म दर्ता...',
];

/**
 * Hero voice search bar for the landing page.
 * Unified input: type OR speak, same box, same language.
 * Language driven by user's preference (set during signup).
 * Placeholder cycles through example prompts to show users what they can ask.
 */
export function HeroVoiceSearch() {
  const router = useRouter();
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Cycle placeholder every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CYCLING_PLACEHOLDERS_EN.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = useCallback(
    (text: string) => {
      const encoded = encodeURIComponent(text);
      router.push(`/advisor?q=${encoded}`);
    },
    [router],
  );

  const currentPlaceholder = isNe
    ? CYCLING_PLACEHOLDERS_NE[placeholderIdx]
    : CYCLING_PLACEHOLDERS_EN[placeholderIdx];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Title — follows user's language */}
      <div className="text-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {isNe ? 'म तपाईंलाई कसरी मद्दत गर्न सक्छु?' : 'What can I help you with?'}
        </h2>
      </div>

      {/* Unified voice + text search bar — examples cycle inside the placeholder */}
      <VoiceSearchBar
        onSubmit={handleSubmit}
        size="hero"
        placeholder={currentPlaceholder}
        placeholderNe={currentPlaceholder}
      />

      {/* Quick action pills — language-aware */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {[
          { ne: 'पासपोर्ट', en: 'Passport' },
          { ne: 'नागरिकता', en: 'Citizenship' },
          { ne: 'ड्राइभिङ लाइसेन्स', en: 'License' },
          { ne: 'विदेश जाने', en: 'Go abroad' },
          { ne: 'व्यापार दर्ता', en: 'Business' },
          { ne: 'कर फाइल', en: 'Tax filing' },
        ].map((item) => (
          <button
            key={item.en}
            onClick={() => handleSubmit(isNe ? item.ne : item.en)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-[#DC143C]/30 hover:bg-[#DC143C]/5 hover:text-white active:scale-95"
          >
            {isNe ? item.ne : item.en}
          </button>
        ))}
      </div>
    </div>
  );
}
