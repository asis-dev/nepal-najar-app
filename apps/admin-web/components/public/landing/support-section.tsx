'use client';

import { Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════
   Support Nepal Republic — donation CTA
   ═══════════════════════════════════════════ */

export function SupportSection() {
  const { locale } = useI18n();
  return (
    <section className="mt-8 px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
        <div className="glass-card p-5 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-bold text-gray-200">
              {locale === 'ne' ? 'नेपाल रिपब्लिकलाई सहयोग गर्नुहोस्' : 'Support Nepal Republic'}
            </h3>
          </div>
          <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
            {locale === 'ne'
              ? 'उपयोगी लागे सहयोग गर्नुहोस्। तपाईंको सहयोगले यो प्लेटफर्म सबैका लागि निःशुल्क राख्न मद्दत गर्छ।'
              : 'If you find this useful, consider supporting us. Your contribution helps keep this platform free for everyone.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://buy.stripe.com/fZu14g9KPePD6aCgvn1RC00"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5147e5] shadow-lg shadow-[#635BFF]/20"
            >
              <Heart className="h-4 w-4" />
              {locale === 'ne' ? 'सहयोग गर्नुहोस्' : 'Support Us'}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
