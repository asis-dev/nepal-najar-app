'use client';

import { useVoiceOutput } from '@/lib/hooks/use-voice-output';

interface SpeakButtonProps {
  text: string;
  lang?: 'ne-NP' | 'en-US';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A small speaker icon button that reads text aloud using speech synthesis.
 * Defaults to Nepali.
 */
export function SpeakButton({
  text,
  lang = 'ne-NP',
  label,
  size = 'sm',
  className = '',
}: SpeakButtonProps) {
  const { speak, stop, isSpeaking, isSupported } = useVoiceOutput({ lang });

  if (!isSupported) return null;

  const sizeClass = size === 'md' ? 'h-8 w-8' : 'h-6 w-6';
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? stop() : speak(text))}
      className={`inline-flex items-center gap-1 rounded-full transition-all duration-200 ${
        isSpeaking
          ? 'bg-[#DC143C]/20 text-[#DC143C]'
          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
      } ${label ? 'px-2.5 py-1' : `${sizeClass} items-center justify-center`} ${className}`}
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
      title={lang === 'ne-NP' ? 'सुन्नुहोस्' : 'Read aloud'}
    >
      <svg
        className={`${iconSize} ${isSpeaking ? 'animate-speaker-pulse' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {isSpeaking ? (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </>
        )}
      </svg>
      {label && (
        <span className={`text-xs font-medium ${isSpeaking ? 'text-[#DC143C]' : ''}`}>
          {label}
        </span>
      )}
    </button>
  );
}
