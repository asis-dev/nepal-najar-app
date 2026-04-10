'use client';

import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

interface VoiceButtonProps {
  onResult?: (text: string) => void;
  onInterim?: (text: string) => void;
  size?: 'normal' | 'large';
  showTranscript?: boolean;
  className?: string;
}

export function VoiceButton({
  onResult,
  onInterim,
  size = 'normal',
  showTranscript = true,
  className = '',
}: VoiceButtonProps) {
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  } = useVoiceInput({
    // lang auto-derived from user preferences
    onResult: (text) => {
      onResult?.(text);
    },
  });

  // Forward interim results
  if (onInterim && interimTranscript) {
    onInterim(interimTranscript);
  }

  if (!isSupported) return null;

  const btnSize = size === 'large' ? 'h-16 w-16' : 'h-14 w-14';
  const iconSize = size === 'large' ? 'h-7 w-7' : 'h-6 w-6';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Main mic button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`relative ${btnSize} rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
          isListening
            ? 'bg-[#DC143C] shadow-[0_0_30px_rgba(220,20,60,0.4)]'
            : 'bg-zinc-700 hover:bg-zinc-600 shadow-lg'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse opacity-40" />
            <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse-delayed opacity-20" />
          </>
        )}

        {/* Mic icon */}
        <svg
          className={`${iconSize} text-white relative z-10`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isListening ? (
            <>
              <rect x="4" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
              <rect x="8" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
              <rect x="12" y="3" width="2" height="18" rx="1" fill="currentColor" className="animate-voice-bar-3" />
              <rect x="16" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
              <rect x="20" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
            </>
          ) : (
            <>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </>
          )}
        </svg>
      </button>

      {/* Live transcript */}
      {showTranscript && (transcript || interimTranscript) && (
        <div className="max-w-xs text-center">
          {transcript && (
            <p className="text-sm text-white font-medium">{transcript}</p>
          )}
          {interimTranscript && !transcript && (
            <p className="text-sm text-zinc-400 italic">{interimTranscript}...</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 text-center max-w-xs">{error}</p>
      )}

      {/* Listening hint */}
      {isListening && !transcript && !interimTranscript && (
        <p className="text-xs text-zinc-500 animate-pulse">
          {isNe ? 'बोल्नुहोस्...' : 'Speak now...'}
        </p>
      )}
    </div>
  );
}
