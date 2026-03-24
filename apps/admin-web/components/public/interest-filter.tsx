'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { PromiseCategory } from '@/lib/data/promises';

interface CategoryGroup {
  id: string;
  label: string;
  labelNe: string;
  emoji: string;
  covers: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'build', label: 'Build', labelNe: 'निर्माण', emoji: '🏗️', covers: ['Infrastructure', 'Transport', 'Energy'] },
  { id: 'economy', label: 'Economy', labelNe: 'अर्थतन्त्र', emoji: '💰', covers: ['Economy'] },
  { id: 'health-edu', label: 'Health & Education', labelNe: 'स्वास्थ्य र शिक्षा', emoji: '🏥', covers: ['Health', 'Education'] },
  { id: 'governance', label: 'Governance', labelNe: 'शासन', emoji: '🏛️', covers: ['Governance', 'Anti-Corruption'] },
  { id: 'digital-env', label: 'Digital & Environment', labelNe: 'डिजिटल र वातावरण', emoji: '💻', covers: ['Technology', 'Environment'] },
  { id: 'society', label: 'Society & World', labelNe: 'समाज र विश्व', emoji: '🤝', covers: ['Social'] },
];

/**
 * Resolve selected group IDs into actual PromiseCategory values
 */
export function resolveCategories(selectedGroupIds: string[]): PromiseCategory[] {
  if (!selectedGroupIds.length) return [];
  const cats: string[] = [];
  for (const gid of selectedGroupIds) {
    const group = CATEGORY_GROUPS.find(g => g.id === gid);
    if (group) cats.push(...group.covers);
  }
  return cats as PromiseCategory[];
}

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  isMobile?: boolean;
}

export function InterestFilter({ selected, onChange, isMobile }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const hasFilters = selected.length > 0;

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors duration-200 ${
          hasFilters
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
        }`}
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        {hasFilters && <span className="text-[10px] font-bold">{selected.length}</span>}
      </button>

      {/* Dropdown — simple checkbox list */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* List */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl min-w-[200px] py-1">
            {/* Clear all */}
            {hasFilters && (
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                Clear all
              </button>
            )}

            {CATEGORY_GROUPS.map(group => {
              const isSelected = selected.includes(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => toggle(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-gray-600 bg-transparent'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Label */}
                  <span className="text-xs text-gray-300">
                    {group.emoji} {group.label}
                  </span>
                </button>
              );
            })}

            {/* Done button */}
            <div className="border-t border-white/5 mt-1 pt-1 px-3 pb-1">
              <button
                onClick={() => setOpen(false)}
                className="w-full text-center text-[11px] text-cyan-400 hover:text-cyan-300 py-1"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
