'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Copy, Share, Share2, X } from 'lucide-react';
import { shareToPlatform } from '@/lib/utils/share';
import type { SharePayload, ShareImageParams } from '@/lib/utils/share';

/* ═══════════════════════════════════════════
   PLATFORM ICONS (inline SVG for X & WhatsApp)
   ═══════════════════════════════════════════ */

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   SHARE MENU COMPONENT
   ═══════════════════════════════════════════ */

interface ShareMenuProps {
  /** Page URL to share (relative path or absolute) */
  shareUrl: string;
  /** Short share text — describe what's being shared */
  shareText: string;
  /** Page title */
  shareTitle: string;
  /** OG image params for native/Instagram sharing */
  ogParams?: ShareImageParams;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function ShareMenu({
  shareUrl,
  shareText,
  shareTitle,
  ogParams,
  size = 'sm',
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const payload: SharePayload = {
    url: shareUrl,
    text: shareText,
    title: shareTitle,
    ogParams,
  };

  const handleShare = useCallback(async (platform: 'x' | 'whatsapp' | 'facebook' | 'copy' | 'native') => {
    if (platform === 'copy') {
      const result = await shareToPlatform('copy', payload);
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      await shareToPlatform(platform, payload);
    }
    if (platform !== 'copy') setOpen(false);
  }, [payload]);

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="shrink-0 p-1.5 rounded-lg transition-colors text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]"
        aria-label="Share"
        aria-expanded={open}
      >
        <Share className={iconSize} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-md shadow-xl shadow-black/40 py-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* X / Twitter */}
          <button
            onClick={() => handleShare('x')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
            Share on X
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            WhatsApp
          </button>

          {/* Copy Link */}
          <button
            onClick={() => handleShare('copy')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          {/* Native share (mobile only — for Instagram, SMS, etc.) */}
          {supportsNativeShare && (
            <>
              <div className="mx-2 my-1 border-t border-white/[0.06]" />
              <button
                onClick={() => handleShare('native')}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                More...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
