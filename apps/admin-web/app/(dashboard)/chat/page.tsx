'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Send, Sparkles, MapPin,
  Loader2, Trash2, Globe2
} from 'lucide-react';
import Link from 'next/link';
import { useChat, ChatMessage } from '@/lib/hooks/use-chat';

const suggestions = [
  'What projects are happening in Bagmati Province?',
  'Show me delayed projects across Nepal',
  'कर्णालीमा के भइरहेको छ?',
  'Which province has the most active projects?',
  'Tell me about road construction projects',
  'What is the overall progress in Nepal?',
];

export default function ChatPage() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary-400" />
            Ask Nepal Republic
          </h1>
          <p className="section-subtitle">
            Ask questions about development projects in English or नेपाली
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={(text) => sendMessage(text)} />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))' }}
              >
                <Sparkles className="w-4 h-4 text-primary-400" />
              </div>
              <div className="glass-card px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-np-border p-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Nepal's development progress..."
                className="input resize-none min-h-[44px] max-h-[120px] pr-4"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary flex items-center gap-2 !py-3 !px-4"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-gray-500 mt-2">
            Powered by AI · Answers are based on project data in the system
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))',
          boxShadow: '0 0 40px rgba(59,130,246,0.15)',
        }}
      >
        <Globe2 className="w-8 h-8 text-primary-400" />
      </div>
      <h2 className="text-xl font-display font-bold text-white mb-2">
        Ask Nepal Republic
      </h2>
      <p className="text-sm text-gray-400 max-w-md mb-8">
        Ask questions about development projects, progress, delays, and more.
        I understand both English and नेपाली.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onSuggestionClick(text)}
            className="glass-card-hover px-4 py-3 text-left text-sm text-gray-300 hover:text-white transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-primary-400 mb-1.5" />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary-600' : ''
        }`}
        style={isUser ? {} : {
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))',
        }}
      >
        {isUser ? (
          <span className="text-xs font-bold text-white">U</span>
        ) : (
          <Sparkles className="w-4 h-4 text-primary-400" />
        )}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block px-4 py-3 rounded-xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'glass-card text-gray-200 rounded-tl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Source links */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <Link
                key={source.id}
                href={`/projects/${source.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium
                  bg-primary-500/10 text-primary-300 hover:bg-primary-500/20 transition-colors border border-primary-500/20"
              >
                <MapPin className="w-3 h-3" />
                {source.title}
              </Link>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
