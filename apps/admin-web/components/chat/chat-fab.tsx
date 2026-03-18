'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, MapPin, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChat, ChatMessage } from '@/lib/hooks/use-chat';

export function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Don't show FAB on the dedicated chat page
  if (pathname === '/chat') return null;

  return (
    <>
      {/* Floating Chat Panel */}
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 ${
            isOpen
              ? 'bg-np-elevated border border-np-border-bright rotate-0'
              : 'bg-gradient-to-br from-primary-600 to-primary-700 shadow-glow-md hover:shadow-glow-lg hover:scale-105'
          }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] glass-card overflow-hidden flex flex-col animate-slide-up"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-np-border"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), transparent)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-bold text-white">Ask Nepal</span>
          <span className="text-[10px] text-gray-500">EN / ने</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/chat"
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Open full chat"
          >
            <Minimize2 className="w-3.5 h-3.5 text-gray-400 rotate-180" />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-primary-400/50 mx-auto mb-3" />
            <p className="text-xs text-gray-500">
              Ask about projects, progress, or delays in English or नेपाली
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MiniMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-np-border p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="input !py-2 !text-xs flex-1"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn-primary !px-3 !py-2"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

function MiniMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
        isUser
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-np-elevated text-gray-200 rounded-bl-sm border border-np-border'
      }`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.sources.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/projects/${s.id}`}
                className="inline-flex items-center gap-1 text-[9px] text-primary-300 hover:text-primary-200"
              >
                <MapPin className="w-2.5 h-2.5" />
                {s.title.length > 25 ? s.title.slice(0, 25) + '...' : s.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
