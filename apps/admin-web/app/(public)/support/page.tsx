'use client';

import { Heart, CreditCard, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

const STRIPE_URL = 'https://buy.stripe.com/fZu14g9KPePD6aCgvn1RC00';

export default function SupportPage() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  return (
    <div className="public-page">
      <section className="public-section pb-12">
        <div className="public-shell max-w-2xl space-y-6">
          {/* Header */}
          <div className="glass-card p-6 text-center">
            <Heart className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <h1 className="text-2xl font-bold text-white">
              {isNe ? 'नेपाल रिपब्लिकलाई सहयोग गर्नुहोस्' : 'Support Nepal Republic'}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              {isNe
                ? 'उपयोगी लागे सहयोग गर्नुहोस्। तपाईंको सहयोगले यो प्लेटफर्म सबैका लागि निःशुल्क राख्न मद्दत गर्छ।'
                : 'If you find this useful, consider supporting us. Your contribution helps keep this platform free for everyone.'}
            </p>
          </div>

          {/* ── Pay by Card ── */}
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-300" />
              <h2 className="text-sm font-semibold text-gray-200">
                {isNe ? 'विदेशबाट पठाउनुहोस्' : 'Pay from anywhere'}
              </h2>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-[#635BFF]/20 bg-[#635BFF]/[0.06] p-4 transition-all hover:bg-[#635BFF]/[0.12] hover:border-[#635BFF]/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#635BFF]/20">
                <CreditCard className="h-5 w-5 text-[#635BFF]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white">
                  {isNe ? 'कार्डबाट पठाउनुहोस्' : 'Pay by Card'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Visa, Mastercard, Apple Pay, Google Pay
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-500">→</span>
            </a>
          </div>

          {/* Back */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              {isNe ? 'गृहपृष्ठमा फर्कनुहोस्' : 'Back to home'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
