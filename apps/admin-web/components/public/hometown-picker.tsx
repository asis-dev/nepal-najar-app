'use client';

import { useState } from 'react';
import { MapPin, X, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { usePreferencesStore, NEPAL_PROVINCES } from '@/lib/stores/preferences';
import { useI18n } from '@/lib/i18n';
import { getScoreForRegion, getProvinceScores } from '@/lib/data/ward-scores';

export function HometownPicker() {
  const {
    province,
    hasSetHometown,
    showPicker,
    setHometown,
    dismissPicker,
  } = usePreferencesStore();
  const { t, locale } = useI18n();

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [step, setStep] = useState<'province' | 'district'>('province');

  // Don't show if already set or dismissed
  if (hasSetHometown || !showPicker) return null;

  const selectedProvinceData = NEPAL_PROVINCES.find((p) => p.name === selectedProvince);

  const handleProvinceSelect = (provinceName: string) => {
    setSelectedProvince(provinceName);
    setStep('district');
  };

  const handleDistrictSelect = (district: string) => {
    if (selectedProvince) {
      setHometown(selectedProvince, district);
    }
  };

  // Compute province scores for preview
  const provinceScores = getProvinceScores();

  const handleSkipDistrict = () => {
    if (selectedProvince) {
      setHometown(selectedProvince);
    }
  };

  // Get translated province name
  const getProvinceName = (name: string) => {
    if (locale === 'ne') {
      return t(`province.${name}`);
    }
    return name;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 mb-4 sm:mb-0">
        <div className="glass-card overflow-hidden" style={{
          boxShadow: '0 0 60px rgba(59,130,246,0.15), 0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div className="p-6 border-b border-np-border relative">
            <button
              onClick={dismissPicker}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-glow-sm">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {step === 'province'
                    ? t('hometown.whereAreYou')
                    : t('hometown.chooseDistrict').replace('{province}', getProvinceName(selectedProvince ?? ''))}
                </h3>
                <p className="text-xs text-gray-500">
                  {step === 'province'
                    ? t('hometown.whereFrom')
                    : t('hometown.selectDistrict')}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto p-4">
            {step === 'province' ? (
              <div className="space-y-2">
                {NEPAL_PROVINCES.map((prov) => {
                  const pScore = provinceScores.find((s) => s.province === prov.name);
                  return (
                    <button
                      key={prov.name}
                      onClick={() => handleProvinceSelect(prov.name)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 hover:bg-primary-500/10 hover:border-primary-500/20 border border-transparent group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏔</span>
                        <div>
                          <p className="text-sm font-medium text-gray-200 group-hover:text-white">
                            {locale === 'ne' ? prov.name_ne : prov.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {locale === 'ne' ? prov.name : prov.name_ne}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pScore && (
                          <span className={`text-xs font-semibold tabular-nums ${
                            pScore.score >= 60 ? 'text-emerald-400' : pScore.score >= 40 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {pScore.score}
                            <span className="text-[10px] text-gray-500">/100</span>
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : selectedProvinceData ? (
              <div className="space-y-2">
                {/* Back to provinces */}
                <button
                  onClick={() => {
                    setStep('province');
                    setSelectedProvince(null);
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300 mb-3 flex items-center gap-1"
                >
                  {t('hometown.backToProvinces')}
                </button>

                {/* Province score preview */}
                {(() => {
                  const pScore = provinceScores.find((s) => s.province === selectedProvince);
                  if (!pScore) return null;
                  return (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">
                          {t('hometown.provinceScore')}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {pScore.score}<span className="text-gray-500 font-normal">/100</span>
                          <span className="text-[10px] text-gray-500 ml-2">
                            #{pScore.rank} {t('hometown.ofSeven')}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {selectedProvinceData.districts.map((district) => (
                  <button
                    key={district}
                    onClick={() => handleDistrictSelect(district)}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 hover:bg-primary-500/10 hover:border-primary-500/20 border border-transparent group"
                  >
                    <span className="text-sm text-gray-300 group-hover:text-white">
                      {district}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-gray-600 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {step === 'district' && (
            <div className="p-4 border-t border-np-border">
              <button
                onClick={handleSkipDistrict}
                className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors"
              >
                {t('hometown.skipUseProvince')}
              </button>
            </div>
          )}

          {step === 'province' && (
            <div className="p-4 border-t border-np-border">
              <button
                onClick={dismissPicker}
                className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {t('hometown.maybeLater')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small trigger button to re-open the picker */
export function HometownTrigger() {
  const { province, hasSetHometown, setShowPicker } = usePreferencesStore();
  const { t, locale } = useI18n();

  if (!hasSetHometown) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary-400 border border-np-border hover:border-primary-500/30 transition-all"
      >
        <MapPin className="w-3 h-3" />
        {t('hometown.setLocation')}
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowPicker(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-primary-400 border border-primary-500/20 bg-primary-500/5 hover:bg-primary-500/10 transition-all"
    >
      <MapPin className="w-3 h-3" />
      {locale === 'ne' ? t(`province.${province}`) : province}
    </button>
  );
}
