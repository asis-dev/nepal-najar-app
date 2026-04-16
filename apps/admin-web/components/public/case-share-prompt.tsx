'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/* ═══════════════════════════════════════════
   CASE SHARE PROMPT — Sticky bottom bar

   After viewing a corruption case for 10+ seconds,
   shows a floating prompt to share on WhatsApp/Viber.

   Research: the "forward this" prompt is the #1 viral
   mechanic for Nepal — WhatsApp + Viber dominate.
   ═══════════════════════════════════════════ */

interface CaseSharePromptProps {
  /** Case title (Nepali preferred) */
  title: string;
  /** Case slug for URL */
  slug: string;
  /** Estimated amount in NPR */
  estimatedAmountNpr?: number | null;
  /** Location string */
  location?: string | null;
  /** Total reaction count for social proof */
  reactionCount?: number;
}

function formatAmountNepali(amount: number): string {
  if (amount >= 1_00_00_00_000) return `${(amount / 1_00_00_00_000).toFixed(1)} \u0905\u0930\u092C`;
  if (amount >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1)} \u0915\u0930\u094B\u0921`;
  if (amount >= 1_00_000) return `${(amount / 1_00_000).toFixed(1)} \u0932\u093E\u0916`;
  return amount.toLocaleString();
}

export function CaseSharePrompt({
  title,
  slug,
  estimatedAmountNpr,
  location,
  reactionCount = 0,
}: CaseSharePromptProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show after 10 seconds on the page
  useEffect(() => {
    // Check if already dismissed this session
    const dismissKey = `case-share-dismissed-${slug}`;
    if (typeof sessionStorage !== 'undefined') {
      try {
        if (sessionStorage.getItem(dismissKey)) {
          setDismissed(true);
          return;
        }
      } catch { /* noop */ }
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, 10_000);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    const dismissKey = `case-share-dismissed-${slug}`;
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch { /* noop */ }
  }, [slug]);

  if (dismissed || !visible) return null;

  // Build the share message
  const siteUrl = 'nepalrepublic.org';
  const caseUrl = `${siteUrl}/corruption/${slug}`;

  const lines = [
    `\uD83D\uDEA8 \u092D\u094D\u0930\u0937\u094D\u091F\u093E\u091A\u093E\u0930 \u0930\u093F\u092A\u094B\u0930\u094D\u091F: ${title}`,
  ];
  if (estimatedAmountNpr && estimatedAmountNpr > 0) {
    lines.push(`\uD83D\uDCB0 \u0930\u0915\u092E: \u0930\u0942 ${formatAmountNepali(estimatedAmountNpr)}`);
  }
  if (location) {
    lines.push(`\uD83D\uDCCD ${location}`);
  }
  if (reactionCount > 0) {
    lines.push(`\uD83D\uDE21 ${reactionCount} \u091C\u0928\u093E\u0932\u0947 \u092A\u094D\u0930\u0924\u093F\u0915\u094D\u0930\u093F\u092F\u093E \u0926\u093F\u0907\u0938\u0915\u0947`);
  }
  lines.push('');
  lines.push(`\uD83D\uDC49 \u0939\u0947\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D: ${caseUrl}`);
  lines.push('');
  lines.push(`\u2014 Nepal Republic (\u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915)`);

  const shareText = lines.join('\n');
  const encodedText = encodeURIComponent(shareText);

  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  const viberUrl = `viber://forward?text=${encodedText}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-full duration-300">
      <div className="mx-auto max-w-lg px-3 pb-3">
        <div className="relative rounded-2xl border border-red-500/30 bg-gray-900/95 backdrop-blur-lg shadow-2xl shadow-black/40 p-4">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Prompt text */}
          <div className="mb-3 pr-6">
            <p className="text-sm font-semibold text-white mb-0.5">
              {'\uD83D\uDEA8'} Forward this case
            </p>
            <p className="text-xs text-gray-400">
              Share on WhatsApp/Viber to spread awareness
            </p>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-sm font-medium transition-all hover:bg-[#25D366]/25 active:scale-[0.98]"
            >
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </a>

            {/* Viber */}
            <a
              href={viberUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 bg-[#7360F2]/15 border border-[#7360F2]/30 text-[#a78bfa] text-sm font-medium transition-all hover:bg-[#7360F2]/25 active:scale-[0.98]"
            >
              <ViberIcon className="w-4 h-4" />
              Viber
            </a>

            {/* Copy */}
            <CopyButton text={shareText} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Copy button with feedback ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-sm font-medium transition-all active:scale-[0.98] ${
        copied
          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
          : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08]'
      }`}
    >
      {copied ? '\u2714' : '\uD83D\uDCCB'}
      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  );
}

/* ── Inline icons ── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.768.39 9.954c-.13 3.187-.298 9.163 5.6 10.853l.005.001-.004 2.478s-.04.998.621 1.204c.66.206.941-.217 1.504-.89l.125-.15c.694-.833 1.652-2.058 2.378-2.995 5.694.537 10.064-1.137 10.583-1.348.06-.024.452-.151.855-.348 1.298-.635 2.105-1.754 2.405-3.328.397-2.075.472-5.37.073-7.59-.252-1.4-.86-2.479-1.836-3.339-.043-.039-.087-.077-.131-.115C20.475 2.537 17.025.476 11.398.002zM11.5 1.498c5.173.417 8.318 2.26 10.178 4.122.036.03.072.062.106.094.81.713 1.29 1.582 1.497 2.735.36 2.002.303 5.098-.06 7.003-.233 1.222-.835 2.07-1.852 2.567-.34.166-.674.278-.713.293-.434.177-4.427 1.7-9.655 1.276l-.088.105c-.9 1.073-1.817 2.15-2.397 2.867l-.08.096c-.322.387-.59.708-.73.548-.101-.114-.087-.625-.071-1.004l.003-.072.01-.292.003-.072v-2.617l-.308-.076C2.212 17.697 2.377 12.425 2.487 9.896c.114-2.834.778-5.12 2.267-6.6 1.91-1.754 5.577-2.016 7.236-2.036l-.49.238zm-.131 3.003a.483.483 0 00-.477.488.483.483 0 00.489.477c1.674-.015 3.157.56 4.39 1.687 1.232 1.126 1.911 2.596 2.035 4.4a.483.483 0 00.968-.067c-.142-2.088-.942-3.815-2.395-5.143C14.926 4.609 13.17 3.914 11.369 3.5zm.038 1.925a.483.483 0 00-.436.526c.108 1.15.555 2.097 1.35 2.834.797.737 1.785 1.126 2.937 1.165a.483.483 0 00.032-.966c-.914-.03-1.67-.328-2.289-.9-.62-.573-.975-1.312-1.068-2.223a.483.483 0 00-.526-.436zm5.206 3.897c-.265-.007-.554.04-.837.165l-.028.013c-.25.12-.484.279-.73.456-.455.33-.728.67-.838 1.036-.077.254-.07.5.017.737l.006.014c.372 1.09 1.01 2.067 1.87 2.855l.026.025c.07.065.142.13.215.193a10.733 10.733 0 003.247 1.977l.02.007c.133.045.264.076.395.086.253.018.487-.058.7-.23.333-.27.558-.618.68-.978v-.003c.095-.279.048-.52-.137-.718-.378-.407-.79-.776-1.205-1.143l-.12-.105c-.268-.23-.557-.237-.832-.048l-.597.41c-.137.094-.28.084-.406-.002a7.147 7.147 0 01-1.27-1.12 6.486 6.486 0 01-.963-1.342c-.08-.148-.067-.283.057-.41l.378-.627c.168-.287.149-.573-.051-.831a37.64 37.64 0 00-.614-.713l-.02-.022a25.48 25.48 0 00-.473-.514.623.623 0 00-.41-.164zm-5.31-2.014a.483.483 0 00-.467.498c.03.706.222 1.295.59 1.77.366.475.857.769 1.444.899a.483.483 0 10.218-.941c-.38-.084-.676-.265-.918-.579-.241-.314-.377-.72-.399-1.18a.483.483 0 00-.468-.467z" />
    </svg>
  );
}
