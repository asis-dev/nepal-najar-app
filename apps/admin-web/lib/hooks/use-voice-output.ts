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
 * Voice output hook using server-side Edge TTS.
 *
 * - Nepali: ne-NP-HemkalaNeural (female)
 * - English: en-US-AriaNeural (female)
 *
 * Calls /api/tts to generate audio, then plays it via HTMLAudioElement.
 * Falls back to browser SpeechSynthesis if the server call fails.
 */
export function useVoiceOutput({
  lang = 'ne-NP',
}: UseVoiceOutputProps = {}): UseVoiceOutputReturn {
  const [isSpeaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const isSupported = typeof window !== 'undefined';

  const stop = useCallback(() => {
    // Abort any in-flight fetch
    abortRef.current?.abort();
    abortRef.current = null;

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Revoke blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Also cancel any browser speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Stop any current playback
      stop();

      const ttsLang = lang === 'ne-NP' ? 'ne' : 'en';
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 500), lang: ttsLang }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`TTS API error: ${res.status}`);

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => setSpeaking(true);
        audio.onended = () => {
          setSpeaking(false);
          audioRef.current = null;
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setSpeaking(false);
          audioRef.current = null;
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
          }
        };

        await audio.play();
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('[TTS] Server TTS failed, falling back to browser:', err.message);

        // Fallback to browser SpeechSynthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Find best voice
            const voices = window.speechSynthesis.getVoices();
            const prefix = lang.split('-')[0];
            const voice =
              voices.find((v) => v.lang === lang) ||
              voices.find((v) => v.lang.startsWith(prefix)) ||
              null;
            if (voice) utterance.voice = voice;

            utterance.onstart = () => setSpeaking(true);
            utterance.onend = () => setSpeaking(false);
            utterance.onerror = () => setSpeaking(false);

            window.speechSynthesis.speak(utterance);
          } catch {
            setSpeaking(false);
          }
        }
      }
    },
    [isSupported, lang, stop],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isSupported };
}
