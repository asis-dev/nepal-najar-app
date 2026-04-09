'use client';

import { useState, useMemo } from 'react';
import { adToBs, bsToAd, formatBS, BS_MONTHS, BS_MONTHS_EN, todayBS } from '@/lib/nepali/date-converter';

/**
 * Dual BS/AD date input — essential for Nepal government forms.
 * User can enter in either format; the other updates automatically.
 */
export function BSDateInput({
  value,
  onChange,
  label,
  required,
}: {
  value: string; // ISO date string (AD)
  onChange: (isoDate: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [mode, setMode] = useState<'ad' | 'bs'>('bs');

  const today = useMemo(() => todayBS(), []);

  const bsValue = useMemo(() => {
    if (!value) return { year: today.year, month: today.month, day: today.day };
    try {
      return adToBs(new Date(value));
    } catch {
      return { year: today.year, month: today.month, day: today.day };
    }
  }, [value, today]);

  function handleADChange(iso: string) {
    onChange(iso);
  }

  function handleBSChange(field: 'year' | 'month' | 'day', val: number) {
    const updated = { ...bsValue, [field]: val };
    try {
      const ad = bsToAd(updated.year, updated.month, updated.day);
      onChange(ad.toISOString().slice(0, 10));
    } catch {
      // invalid date combination
    }
  }

  const bsYears = Array.from({ length: 30 }, (_, i) => today.year - 15 + i);

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-gray-700">
            {label}{required && ' *'}
          </label>
          <button
            type="button"
            onClick={() => setMode(mode === 'bs' ? 'ad' : 'bs')}
            className="text-[10px] text-blue-600 hover:underline print:hidden"
          >
            {mode === 'bs' ? 'Switch to AD' : 'Switch to BS (बि.सं.)'}
          </button>
        </div>
      )}

      {mode === 'ad' ? (
        <div>
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleADChange(e.target.value)}
            className="w-full border-b border-black bg-transparent px-1 py-1 text-sm print:bg-white"
          />
          {value && (
            <div className="text-[10px] text-gray-500 mt-0.5">
              BS: {formatBS(bsValue)} ({BS_MONTHS_EN[bsValue.month - 1]})
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex gap-1">
            <select
              value={bsValue.year}
              onChange={(e) => handleBSChange('year', Number(e.target.value))}
              className="flex-1 border-b border-black bg-transparent px-1 py-1 text-sm"
            >
              {bsYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={bsValue.month}
              onChange={(e) => handleBSChange('month', Number(e.target.value))}
              className="flex-1 border-b border-black bg-transparent px-1 py-1 text-sm"
            >
              {BS_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m} ({BS_MONTHS_EN[i]})</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={32}
              value={bsValue.day}
              onChange={(e) => handleBSChange('day', Number(e.target.value))}
              className="w-14 border-b border-black bg-transparent px-1 py-1 text-sm text-center"
              placeholder="Day"
            />
          </div>
          {value && (
            <div className="text-[10px] text-gray-500 mt-0.5">
              AD: {value}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
