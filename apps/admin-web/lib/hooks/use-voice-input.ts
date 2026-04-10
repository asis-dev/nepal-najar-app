'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

type VoiceLang = 'ne-NP' | 'en-US' | 'hi-IN';

/** Map app locale ('en' | 'ne') to Web Speech API lang code.
 *  Chrome on Android/desktop often doesn't support 'ne-NP' but accepts 'ne'.
 *  We try 'ne' first; if it fails we retry with 'hi-IN' (Hindi — close enough
 *  and universally supported). */
function localeToVoiceLang(locale: 'en' | 'ne'): VoiceLang {
  return locale === 'ne' ? 'ne-NP' : 'en-US';
}

/** Fallback chain for Nepali voice recognition */
const NEPALI_FALLBACK_LANGS: VoiceLang[] = ['ne-NP', 'hi-IN'];

interface UseVoiceInputProps {
  /** Override lang — if omitted, uses user's preferred locale from profile */
  lang?: VoiceLang;
  continuous?: boolean;
  onResult?: (text: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
  lang: VoiceLang;
  toggleLang: () => void;
  setLang: (lang: VoiceLang) => void;
}

export function useVoiceInput({
  lang: overrideLang,
  continuous = false,
  onResult,
}: UseVoiceInputProps = {}): UseVoiceInputReturn {
  const preferredLocale = useUserPreferencesStore((s) => s.locale);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<VoiceLang>(
    overrideLang ?? localeToVoiceLang(preferredLocale),
  );

  // Sync with preference changes (e.g. user switches language in settings)
  useEffect(() => {
    if (!overrideLang) {
      setLang(localeToVoiceLang(preferredLocale));
    }
  }, [preferredLocale, overrideLang]);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);

  // Keep callback ref up to date
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // Auto-stop after 10 seconds of silence
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }, 10000);
  }, [clearSilenceTimer]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearSilenceTimer]);

  const fallbackIndexRef = useRef(0);

  const createRecognition = useCallback((recognitionLang: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = recognitionLang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer();
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript(finalText);
        setInterimTranscript('');
        onResultRef.current?.(finalText);
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are not real errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // If language isn't supported, try fallback chain (ne-NP → hi-IN)
      if (
        (event.error === 'language-not-supported' || event.error === 'network') &&
        lang.startsWith('ne') &&
        fallbackIndexRef.current < NEPALI_FALLBACK_LANGS.length
      ) {
        const nextLang = NEPALI_FALLBACK_LANGS[fallbackIndexRef.current];
        fallbackIndexRef.current++;
        // Retry with fallback language
        try {
          recognitionRef.current = null;
          const fallback = createRecognition(nextLang);
          recognitionRef.current = fallback;
          fallback.start();
        } catch {}
        return;
      }

      setError(
        event.error === 'not-allowed'
          ? 'Microphone access denied. Please allow microphone access in your browser settings and try again.'
          : event.error === 'language-not-supported'
            ? 'Voice input for this language is not supported on your device. Try typing instead.'
            : event.error === 'service-not-allowed'
              ? 'Voice input is not available. Please try typing instead.'
              : event.error === 'audio-capture'
                ? 'No microphone found. Please connect a microphone and try again.'
                : `Voice input error. Please try typing instead.`
      );
      setIsListening(false);
      clearSilenceTimer();
    };

    recognition.onend = () => {
      setIsListening(false);
      clearSilenceTimer();
      recognitionRef.current = null;
    };

    return recognition;
  }, [lang, continuous, resetSilenceTimer, clearSilenceTimer]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Check microphone permission first (if Permissions API available)
    try {
      if (navigator.permissions) {
        const permResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permResult.state === 'denied') {
          setError(
            'Microphone access is blocked. Please go to your browser settings and allow microphone access for this site, then try again.'
          );
          return;
        }
      }
    } catch {
      // Permissions API not available or doesn't support 'microphone' — continue anyway
    }

    // On mobile, pre-request mic access via getUserMedia before starting Speech API
    // This prevents crashes on iOS/Android where Speech API start() fails silently
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Got access — stop the stream immediately (we just needed the permission)
        stream.getTracks().forEach((t) => t.stop());
      } catch (micErr: any) {
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setError(
            'Microphone access denied. Please allow microphone access in your browser settings and try again.'
          );
        } else if (micErr.name === 'NotFoundError') {
          setError('No microphone found on this device.');
        } else {
          setError('Could not access microphone. Please try typing instead.');
        }
        return;
      }
    }

    // Stop any existing session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    fallbackIndexRef.current = 0;

    try {
      const recognition = createRecognition(lang);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('not allowed') || msg.includes('denied')) {
        setError(
          'Microphone access denied. Please allow microphone access in your browser settings and try again.'
        );
      } else {
        setError('Voice input is not available on this device. Please try typing instead.');
      }
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [isSupported, lang, createRecognition]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ne-NP' ? 'en-US' : 'ne-NP'));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [clearSilenceTimer]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
    lang,
    toggleLang,
    setLang,
  };
}
