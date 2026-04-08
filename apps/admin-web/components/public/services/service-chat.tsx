'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface CitedService {
  id?: string;
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  cited?: CitedService[];
  cached?: boolean;
  topService?: CitedService | null;
}

interface Props {
  locale?: 'en' | 'ne';
  contextServiceSlug?: string;
}

const STARTERS_EN = [
  'How do I renew my driving license?',
  'What documents do I need for a passport?',
  'How do I pay my NEA bill?',
  'How do I get citizenship?',
];
const STARTERS_NE = [
  'लाइसेन्स नवीकरण कसरी गर्ने?',
  'राहदानीका लागि के-के कागजात चाहिन्छ?',
  'NEA बिल कसरी तिर्ने?',
  'नागरिकता कसरी लिने?',
];

export default function ServiceChat({ locale = 'en', contextServiceSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/services/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale, contextServiceSlug }),
      });
      const j = await r.json();
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: j.answer || (locale === 'ne' ? 'माफ गर्नुहोस्, जवाफ दिन सकिएन।' : 'Sorry, I could not answer.'),
          cited: j.cited || [],
          cached: j.cached,
          topService: j.topService || null,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: locale === 'ne' ? 'नेटवर्क समस्या।' : 'Network error.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const starters = locale === 'ne' ? STARTERS_NE : STARTERS_EN;

  async function startRecording() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'voice.webm');
          const r = await fetch('/api/services/voice', { method: 'POST', body: fd });
          if (r.ok) {
            const j = await r.json();
            if (j.text?.trim()) {
              await send(j.text.trim());
              return;
            }
          }
        } catch {}
        finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (err) {
      alert(locale === 'ne' ? 'माइक्रोफोन पहुँच अस्वीकृत।' : 'Microphone access denied.');
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-red-600 hover:bg-red-500 text-white px-5 py-3 text-sm font-bold shadow-lg shadow-red-500/30 flex items-center gap-2"
      >
        💬 {locale === 'ne' ? 'सोध्नुहोस्' : 'Ask Nepal Republic'}
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(92vw,400px)] h-[min(80vh,560px)] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div>
          <div className="font-bold text-sm text-zinc-100">
            {locale === 'ne' ? 'सेवा सहायक' : 'Services Assistant'}
          </div>
          <div className="text-[10px] text-zinc-500">Nepal Republic · AI</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-100 px-2">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 mb-2">
              {locale === 'ne' ? 'सरकारी सेवाबारे सोध्नुहोस्:' : 'Ask about any Nepali service:'}
            </div>
            {starters.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="block w-full text-left text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-100 whitespace-pre-wrap'
              }`}
            >
              {m.text}
              {m.cited && m.cited.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-zinc-700 pt-2">
                  <div className="text-[10px] uppercase text-zinc-400 mb-1">
                    {locale === 'ne' ? 'सम्बन्धित सेवा' : 'Related services'}
                  </div>
                  {m.cited.slice(0, 3).map((c) => (
                    <Link
                      key={c.slug}
                      href={`/services/${c.category}/${c.slug}`}
                      className="block text-[11px] text-red-300 hover:text-red-200 hover:underline"
                    >
                      → {locale === 'ne' ? c.title.ne : c.title.en}
                    </Link>
                  ))}
                </div>
              )}
              {m.role === 'assistant' && m.topService && (
                <div className="mt-3">
                  <Link
                    href={`/services/${m.topService.category}/${m.topService.slug}`}
                    className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    {locale === 'ne' ? 'यो सेवा सुरु गर्नुहोस्' : 'Start this service'}
                  </Link>
                </div>
              )}
              {m.role === 'assistant' && m.cached && (
                <div className="text-[9px] text-zinc-500 mt-1">cached</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-xs text-zinc-500">{locale === 'ne' ? 'सोच्दै…' : 'Thinking…'}</div>
        )}
        {transcribing && (
          <div className="text-xs text-zinc-500">{locale === 'ne' ? 'आवाज पढ्दै…' : 'Transcribing…'}</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 border-t border-zinc-800 flex gap-2"
      >
        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={recording ? stopRecording : undefined}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          title={locale === 'ne' ? 'थिचेर बोल्नुहोस्' : 'Hold to speak'}
          className={`rounded-lg px-3 text-sm shrink-0 ${recording ? 'bg-red-600 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700'} text-white`}
        >
          🎙
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={locale === 'ne' ? 'आफ्नो प्रश्न लेख्नुहोस्…' : 'Type your question…'}
          className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-4 text-sm font-semibold"
        >
          →
        </button>
      </form>
    </div>
  );
}
