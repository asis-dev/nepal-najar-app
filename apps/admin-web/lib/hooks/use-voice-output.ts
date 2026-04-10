'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type VoiceLang = 'ne-NP' | 'en-US';

interface UseVoiceOutputProps {
  lang?: VoiceLang;
}

interface UseVoiceOutputReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

/**
 * Find the best voice for a given language.
 * For Nepali (ne-NP): prefer Nepali voice, fall back to Hindi (hi-IN), then default.
 */
function findBestVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (lang === 'ne-NP') {
    // Try Nepali first
    const nepali = voices.find((v) => v.lang.startsWith('ne'));
    if (nepali) return nepali;

    // Fall back to Hindi (closest widely-available language)
    const hindi = voices.find((v) => v.lang.startsWith('hi'));
    if (hindi) return hindi;

    // Try any Devanagari-script language
    const devanagari = voices.find(
      (v) => v.lang.startsWith('mr') || v.lang.startsWith('sa')
    );
    if (devanagari) return devanagari;
  }

  // For English or fallback
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;

  const prefix = lang.split('-')[0];
  const partial = voices.find((v) => v.lang.startsWith(prefix));
  if (partial) return partial;

  return null;
}

export function useVoiceOutput({
  lang = 'ne-NP',
}: UseVoiceOutputProps = {}): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && !!window.speechSynthesis;

  // Preload voices (Chrome needs this)
  useEffect(() => {
    if (!isSupported) return;
    window.speechSynthesis.getVoices();
    const handleVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set language
      utterance.lang = lang;

      // Find best voice
      const voice = findBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      // Slightly slower for clarity
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;

      // Chrome bug: speechSynthesis sometimes pauses after 15 seconds.
      // Workaround: keep it alive with a periodic resume.
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 14000);

      utterance.onend = () => {
        clearInterval(keepAlive);
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        clearInterval(keepAlive);
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}
