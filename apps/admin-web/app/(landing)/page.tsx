'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Mountain } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Dynamic import — globe uses WebGL, can't SSR
const NepalGlobe = dynamic(
  () => import('@/components/globe/nepal-globe').then(m => ({ default: m.NepalGlobe })),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-np-void" />,
  }
);

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden bg-np-void">
      {/* 3D Globe — fills the entire background */}
      <div className="absolute inset-0 z-0">
        <NepalGlobe />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 text-center max-w-2xl px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(6,182,212,0.2) 100%)',
              boxShadow: '0 0 40px rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Mountain className="w-7 h-7 text-primary-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-4 animate-slide-up"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
          {t('hero.title').split(' ')[0]}{' '}
          <span className="text-gradient-blue">{t('hero.title').split(' ')[1] || 'Najar'}</span>
        </h1>

        <p className="text-xl sm:text-2xl text-gray-200/90 mb-3 leading-relaxed max-w-lg mx-auto animate-slide-up font-display"
          style={{
            animationDelay: '0.1s',
            animationFillMode: 'both',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {t('hero.tagline')}
        </p>
        <p className="text-base sm:text-lg text-gray-400/80 mb-12 leading-relaxed max-w-lg mx-auto animate-slide-up"
          style={{
            animationDelay: '0.15s',
            animationFillMode: 'both',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {t('landing.tagline')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <Link
            href="/explore"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-300 group hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 8px 30px rgba(37,99,235,0.4), 0 0 80px rgba(37,99,235,0.15)',
              border: '1px solid rgba(96,165,250,0.2)',
            }}
          >
            {t('landing.exploreNepal')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-gray-300 font-medium text-sm transition-all duration-300 hover:text-white hover:-translate-y-0.5"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {t('landing.adminDashboard')}
          </Link>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center justify-center gap-8 mt-16 animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          {[
            { value: '20+', label: t('landing.projectsTracked') },
            { value: '7', label: t('landing.provinces') },
            { value: '54%', label: t('landing.avgProgress') },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-8">
              {i > 0 && <div className="w-px h-8 bg-white/10" />}
              <div className="text-center">
                <p className="text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400/70 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
