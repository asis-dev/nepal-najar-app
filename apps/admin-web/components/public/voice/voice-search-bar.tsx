'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

interface VoiceSearchBarProps {
  placeholder?: string;
  placeholderNe?: string;
  onSubmit: (text: string, source?: 'voice' | 'text') => void;
  size?: 'normal' | 'hero';
  disabled?: boolean;
  initialValue?: string;
  className?: string;
}

export function VoiceSearchBar({
  placeholder = 'What do you need to do?',
  placeholderNe = 'के गर्नु पर्छ? बोल्नुहोस्...',
  onSubmit,
  size = 'normal',
  disabled = false,
  initialValue = '',
  className = '',
}: VoiceSearchBarProps) {
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';

  // Update text when initialValue changes
  useEffect(() => {
    if (initialValue) setText(initialValue);
  }, [initialValue]);

  const handleVoiceResult = useCallback((voiceText: string) => {
    setText(voiceText);
    // Auto-submit after voice result — mark as voice input
    setTimeout(() => onSubmit(voiceText, 'voice'), 300);
  }, [onSubmit]);

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  } = useVoiceInput({
    onResult: handleVoiceResult,
    // lang auto-derived from user preferences
  });

  // Show interim transcript live in the input
  useEffect(() => {
    if (interimTranscript && isListening) {
      setText(interimTranscript);
    }
  }, [interimTranscript, isListening]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed, 'text');
    }
  }, [text, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !disabled) {
        handleSubmit();
      }
    },
    [handleSubmit, disabled],
  );

  const isHero = size === 'hero';
  const currentPlaceholder = isNe ? placeholderNe : placeholder;

  return (
    <div className={`relative ${className}`}>
      {/* Gradient border for hero mode */}
      {isHero && (
        <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-[#DC143C] via-[#003893] to-[#DC143C] opacity-60 blur-[2px] animate-gradient-shift" />
      )}

      <div
        className={`relative flex items-center gap-2 bg-zinc-900 border transition-colors ${
          isHero
            ? 'rounded-3xl border-zinc-700/50 px-5 py-4'
            : 'rounded-2xl border-zinc-700/50 px-4 py-3'
        } ${
          isListening ? 'border-[#DC143C]/50 ring-2 ring-[#DC143C]/20' : ''
        }`}
      >
        {/* Text input — type OR speak, same field */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          disabled={disabled || isListening}
          className={`flex-1 min-w-0 bg-transparent text-white outline-none placeholder-zinc-500 ${
            isHero ? 'text-lg' : 'text-sm'
          } ${isListening ? 'text-zinc-400 italic' : ''}`}
        />

        {/* Submit button */}
        {text.trim() && !isListening && (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className={`flex-shrink-0 rounded-xl bg-[#DC143C] font-semibold text-white transition-all hover:bg-[#DC143C]/80 active:scale-95 disabled:opacity-40 ${
              isHero ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-xs'
            }`}
          >
            {isNe ? 'खोज्नुहोस्' : 'Go'}
          </button>
        )}

        {/* Mic button — the LARGEST interactive element, same box as typing */}
        {isSupported && (
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            className={`relative flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
              isListening
                ? 'bg-[#DC143C] shadow-[0_0_24px_rgba(220,20,60,0.5)]'
                : 'bg-zinc-700 hover:bg-zinc-600'
            } ${isHero ? 'h-14 w-14' : 'h-11 w-11'}`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {/* Pulse animation */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse opacity-40" />
                <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse-delayed opacity-20" />
              </>
            )}

            <svg
              className={`text-white relative z-10 ${isHero ? 'h-6 w-6' : 'h-5 w-5'}`}
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
        )}
      </div>

      {/* Error display */}
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}

      {/* Listening indicator below the bar */}
      {isListening && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="flex gap-0.5">
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-1" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-2" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-3" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-2" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-1" />
          </div>
          <span className="text-xs text-zinc-500 animate-pulse">
            {isNe ? 'सुन्दैछ...' : 'Listening...'}
          </span>
        </div>
      )}
    </div>
  );
}
