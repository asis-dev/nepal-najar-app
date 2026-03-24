'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PromiseCategory } from '@/lib/data/promises';

/* ═══════════════════════════════════════════
   GROUPED INTEREST CATEGORIES (6 user-friendly groups)
   ═══════════════════════════════════════════ */
interface CategoryGroup {
  id: string;
  label: string;
  labelNe: string;
  emoji: string;
  covers: string[]; // maps to actual PromiseCategory values
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'build', label: 'Build', labelNe: 'निर्माण', emoji: '🏗️', covers: ['Infrastructure', 'Transport'] },
  { id: 'economy', label: 'Economy', labelNe: 'अर्थतन्त्र', emoji: '💰', covers: ['Economy', 'Agriculture'] },
  { id: 'health-edu', label: 'Health & Education', labelNe: 'स्वास्थ्य र शिक्षा', emoji: '🏥', covers: ['Health', 'Education'] },
  { id: 'governance', label: 'Governance', labelNe: 'शासन', emoji: '🏛️', covers: ['Governance', 'Anti-Corruption'] },
  { id: 'digital-env', label: 'Digital & Environment', labelNe: 'डिजिटल र वातावरण', emoji: '💻', covers: ['Technology', 'Environment', 'Energy'] },
  { id: 'society', label: 'Society & World', labelNe: 'समाज र विश्व', emoji: '🤝', covers: ['Social', 'Foreign Policy'] },
];

// Flat list for backward compat
const ALL_CATEGORIES: string[] = CATEGORY_GROUPS.map(g => g.id);

/* ═══════════════════════════════════════════
   InterestFilter Component
   ═══════════════════════════════════════════ */
export interface InterestFilterProps {
  selected: string[];
  onChange: (categories: string[]) => void;
  isMobile?: boolean;
}

export function InterestFilter({ selected, onChange, isMobile }: InterestFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  /* ── Click-outside to close (desktop only) ── */
  useEffect(() => {
    if (!open || isMobile) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, isMobile]);

  /* ── Prevent body scroll when mobile sheet is open ── */
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMobile]);

  const toggle = useCallback(
    (cat: string) => {
      if (selected.includes(cat)) {
        onChange(selected.filter((c) => c !== cat));
      } else {
        onChange([...selected, cat]);
      }
    },
    [selected, onChange],
  );

  const selectAll = useCallback(() => onChange([]), [onChange]);
  const clearAll = useCallback(() => onChange([...ALL_CATEGORIES]), [onChange]);
  const done = useCallback(() => setOpen(false), []);

  const activeCount = selected.length;
  const hasFilters = activeCount > 0;

  /* ── Pill renderer ── */
  const renderPills = (pillSize: 'sm' | 'lg') => (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_GROUPS.map((group) => {
        const isSelected = selected.includes(group.id);
        return (
          <button
            key={group.id}
            onClick={() => toggle(group.id)}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 ${
              pillSize === 'lg' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'
            } ${
              isSelected
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'bg-white/[0.06] text-gray-400 border border-white/[0.08] hover:bg-white/[0.1] hover:text-gray-300'
            }`}
          >
            <span>{group.emoji}</span>
            <span>{group.label}</span>
            {isSelected && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );

  /* ── Action buttons ── */
  const renderActions = (size: 'sm' | 'lg') => (
    <div className={`flex items-center justify-between ${size === 'lg' ? 'pt-3' : 'pt-2'}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={selectAll}
          className={`rounded-full border border-white/[0.08] bg-white/[0.04] font-medium text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-gray-300 ${
            size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
          }`}
        >
          All
        </button>
        <button
          onClick={clearAll}
          className={`rounded-full border border-white/[0.08] bg-white/[0.04] font-medium text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-gray-300 ${
            size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
          }`}
        >
          Clear
        </button>
      </div>
      <button
        onClick={done}
        className={`rounded-full bg-white/[0.1] font-semibold text-white transition-colors hover:bg-white/[0.15] ${
          size === 'lg' ? 'px-5 py-1.5 text-sm' : 'px-4 py-1 text-xs'
        }`}
      >
        Done
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-0.5 focus:outline-none"
        aria-label="Filter categories"
      >
        <ChevronDown
          className={`h-3 w-3 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
        {/* Active-filter dot indicator */}
        {hasFilters && (
          <span className="relative flex h-1.5 w-1.5 -ml-0.5 -mt-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </span>
        )}
      </button>

      {/* ── Desktop dropdown ── */}
      {!isMobile && open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-[320px] rounded-2xl border border-white/[0.1] p-4"
          style={{
            background: 'rgba(12, 14, 24, 0.85)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'filterDropdownIn 150ms ease-out',
          }}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Show me:
          </p>
          {renderPills('sm')}
          {renderActions('sm')}
        </div>
      )}

      {/* ── Mobile bottom sheet ── */}
      {isMobile && open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={done}
            style={{ animation: 'filterBackdropIn 150ms ease-out' }}
          />
          {/* Sheet */}
          <div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/[0.1] px-5 pb-8 pt-4 max-h-[70vh] overflow-y-auto"
            style={{
              background: 'rgba(12, 14, 24, 0.95)',
              backdropFilter: 'blur(24px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
              animation: 'filterSheetIn 150ms ease-out',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-4">
              <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Filter by Category</p>
              <button onClick={done} className="p-1 rounded-full hover:bg-white/[0.1] transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {renderPills('lg')}
            {renderActions('lg')}
          </div>
        </>
      )}

    </div>
  );
}
