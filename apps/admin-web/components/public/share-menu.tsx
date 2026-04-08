'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Share, Share2 } from 'lucide-react';
import { shareToPlatform } from '@/lib/utils/share';
import type { SharePayload, ShareImageParams } from '@/lib/utils/share';

/* ═══════════════════════════════════════════
   PLATFORM ICONS (inline SVG)
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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   SHARE MENU COMPONENT
   Report-card-inspired styling with colored
   platform buttons and portal dropdown.
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
  const [fbCopied, setFbCopied] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Calculate position when opening
  useEffect(() => {
    if (!open || !btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 200; // slightly wider for styled buttons
    const menuHeight = 290;

    let top = rect.top - menuHeight - 4;
    let left = rect.right - menuWidth;

    if (top < 8) {
      top = rect.bottom + 4;
    }

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setMenuPos({ top, left });
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: globalThis.MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
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

  // Close on scroll (menu position would be stale)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open]);

  const payload: SharePayload = {
    url: shareUrl,
    text: shareText,
    title: shareTitle,
    ogParams,
  };

  const handleShare = useCallback(async (platform: 'x' | 'whatsapp' | 'facebook' | 'instagram' | 'copy' | 'native') => {
    if (platform === 'copy') {
      const result = await shareToPlatform('copy', payload);
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else if (platform === 'instagram') {
      setIgLoading(true);
      await shareToPlatform('instagram', payload);
      setIgLoading(false);
      setOpen(false);
    } else if (platform === 'facebook') {
      const result = await shareToPlatform('facebook', payload);
      if (result === 'copied') {
        setFbCopied(true);
        setTimeout(() => setFbCopied(false), 4000);
      }
      setOpen(false);
    } else {
      await shareToPlatform(platform, payload);
      setOpen(false);
    }
  }, [payload]);

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Report-card-inspired button styles — colored borders + tinted backgrounds
  const btnBase = 'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-all';

  const dropdown = open && menuPos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="w-[200px] rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-md shadow-xl shadow-black/40 p-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Platform grid — 2 columns for compact layout */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            {/* X / Twitter */}
            <button
              onClick={() => handleShare('x')}
              className={`${btnBase} border border-white/[0.12] bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]`}
            >
              <XIcon className="w-3 h-3" />
              X
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => handleShare('whatsapp')}
              className={`${btnBase} border border-[#25D366]/30 bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25`}
            >
              <WhatsAppIcon className="w-3 h-3" />
              WhatsApp
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleShare('facebook')}
              className={`${btnBase} border border-[#1877F2]/30 bg-[#1877F2]/15 text-[#60a5fa] hover:bg-[#1877F2]/25`}
            >
              <FacebookIcon className="w-3 h-3" />
              Facebook
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleShare('instagram')}
              disabled={igLoading}
              className={`${btnBase} border border-[#E4405F]/30 bg-[#E4405F]/15 text-[#f472b6] hover:bg-[#E4405F]/25 disabled:opacity-50`}
            >
              {igLoading ? (
                <div className="w-3 h-3 border-2 border-gray-500 border-t-pink-400 rounded-full animate-spin" />
              ) : (
                <InstagramIcon className="w-3 h-3" />
              )}
              {igLoading ? '...' : 'Instagram'}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] my-1.5" />

          {/* Copy + More row */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Copy Link */}
            <button
              onClick={() => handleShare('copy')}
              className={`${btnBase} ${
                copied
                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border border-white/[0.08] bg-white/[0.03] text-gray-300 hover:bg-white/[0.06]'
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>

            {/* Native share (mobile) or More */}
            {supportsNativeShare ? (
              <button
                onClick={() => handleShare('native')}
                className={`${btnBase} border border-primary-500/30 bg-primary-500/15 text-primary-400 hover:bg-primary-500/25`}
              >
                <Share2 className="w-3 h-3" />
                More
              </button>
            ) : (
              <div /> /* empty placeholder to maintain grid */
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
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
      {dropdown}

      {/* Facebook copy toast */}
      {fbCopied && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/90 backdrop-blur-md text-white text-xs font-medium shadow-xl shadow-black/30">
            <Check className="w-3.5 h-3.5" />
            Text copied — paste it in your Facebook post
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
