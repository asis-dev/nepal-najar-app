'use client';

import { useCallback, useState } from 'react';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

interface VoiceFormFieldProps {
  /** Current value of the field */
  value: string;
  /** Called when voice input produces a result */
  onChange: (value: string) => void;
  /** For select fields: list of valid options to match against */
  options?: string[];
  /** For date fields: attempt to parse spoken date into BS format */
  isDateField?: boolean;
  /** Field type hint */
  fieldType?: 'text' | 'textarea' | 'select' | 'date';
  className?: string;
}

/** Nepali month names to numeric */
const NEPALI_MONTHS: Record<string, string> = {
  'बैशाख': '01', 'baishakh': '01', 'baisakh': '01',
  'जेठ': '02', 'jestha': '02', 'jeth': '02',
  'असार': '03', 'ashar': '03', 'asar': '03',
  'श्रावण': '04', 'shrawan': '04', 'sawan': '04', 'saun': '04',
  'भदौ': '05', 'bhadra': '05', 'bhadau': '05',
  'असोज': '06', 'ashoj': '06', 'asoj': '06',
  'कार्तिक': '07', 'kartik': '07',
  'मंसिर': '08', 'mangsir': '08', 'mansir': '08',
  'पुष': '09', 'push': '09', 'poush': '09', 'pus': '09',
  'माघ': '10', 'magh': '10',
  'फागुन': '11', 'falgun': '11', 'phagun': '11',
  'चैत': '12', 'chaitra': '12', 'chait': '12',
};

/**
 * Try to parse spoken date text into a BS date string (YYYY-MM-DD).
 * Handles patterns like "asoj 15" or "2082 asoj 15" or "15 asoj 2082".
 */
function parseSpokenDate(text: string): string | null {
  const lower = text.toLowerCase().trim();

  // Try to find a month name
  let month: string | null = null;
  let monthKey = '';
  for (const [name, num] of Object.entries(NEPALI_MONTHS)) {
    if (lower.includes(name)) {
      month = num;
      monthKey = name;
      break;
    }
  }
  if (!month) return null;

  // Extract numbers from the text
  const numbers = lower
    .replace(monthKey, '')
    .match(/\d+/g)
    ?.map(Number) ?? [];

  if (numbers.length === 0) return null;

  let year = 2082; // Default year
  let day = 1;

  if (numbers.length === 1) {
    // Just a day
    day = numbers[0];
  } else if (numbers.length >= 2) {
    // Check if first or second is a year (>= 2000)
    if (numbers[0] >= 2000) {
      year = numbers[0];
      day = numbers[1];
    } else if (numbers[1] >= 2000) {
      day = numbers[0];
      year = numbers[1];
    } else {
      day = numbers[0];
    }
  }

  if (day < 1 || day > 32) return null;

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

/**
 * Find the closest matching option from spoken text using simple string similarity.
 */
function matchSpokenToOption(spoken: string, options: string[]): string | null {
  const lowerSpoken = spoken.toLowerCase().trim();

  // Exact match
  const exact = options.find((o) => o.toLowerCase() === lowerSpoken);
  if (exact) return exact;

  // Contains match
  const contains = options.find(
    (o) =>
      o.toLowerCase().includes(lowerSpoken) ||
      lowerSpoken.includes(o.toLowerCase())
  );
  if (contains) return contains;

  // Partial word match
  const words = lowerSpoken.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const option of options) {
    const optWords = option.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of words) {
      for (const ow of optWords) {
        if (ow.includes(w) || w.includes(ow)) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

/**
 * Small microphone icon button that can be placed beside any form field.
 * Tapping it starts voice recognition and fills the field value.
 */
export function VoiceFormField({
  value,
  onChange,
  options,
  isDateField,
  fieldType,
  className = '',
}: VoiceFormFieldProps) {
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  const handleResult = useCallback(
    (text: string) => {
      // For select fields, try to match to options
      if ((fieldType === 'select' || options) && options?.length) {
        const matched = matchSpokenToOption(text, options);
        if (matched) {
          onChange(matched);
          setShowFeedback(`"${text}" -> ${matched}`);
        } else {
          setShowFeedback(`Could not match "${text}"`);
        }
        setTimeout(() => setShowFeedback(null), 3000);
        return;
      }

      // For date fields, try to parse
      if (fieldType === 'date' || isDateField) {
        const parsed = parseSpokenDate(text);
        if (parsed) {
          onChange(parsed);
          setShowFeedback(`"${text}" -> ${parsed}`);
        } else {
          // Fall back to raw text
          onChange(text);
          setShowFeedback(null);
        }
        setTimeout(() => setShowFeedback(null), 3000);
        return;
      }

      // Default: just set the text
      onChange(text);
    },
    [onChange, options, fieldType, isDateField],
  );

  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';

  const {
    isListening,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceInput({
    // lang auto-derived from user preferences
    onResult: handleResult,
  });

  if (!isSupported) return null;

  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
          isListening
            ? 'bg-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.4)]'
            : 'bg-zinc-700 hover:bg-zinc-600'
        }`}
        aria-label={isListening ? 'Stop voice input' : 'Voice input'}
        title={isNe ? 'बोलेर भर्नुहोस्' : 'Fill by speaking'}
      >
        {isListening ? (
          // Small animated bars
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
            <rect x="4" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
            <rect x="8" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
            <rect x="12" y="3" width="2" height="18" rx="1" fill="currentColor" className="animate-voice-bar-3" />
            <rect x="16" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
            <rect x="20" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* Feedback tooltip */}
      {showFeedback && (
        <span className="ml-1.5 text-[10px] text-amber-400 animate-pulse">
          {showFeedback}
        </span>
      )}
    </span>
  );
}
