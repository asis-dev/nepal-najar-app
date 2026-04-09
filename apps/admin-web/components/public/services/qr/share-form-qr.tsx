'use client';

import { useState, useEffect } from 'react';

/**
 * QR code for sharing a pre-filled form link with family members.
 * Generates a URL with base64-encoded form data in query params.
 * Family member scans QR → opens the form with data pre-filled.
 */
export function ShareFormQR({
  serviceSlug,
  serviceTitle,
  formData,
}: {
  serviceSlug: string;
  serviceTitle: string;
  formData: Record<string, any>;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Build share URL with encoded form data
    const data = btoa(JSON.stringify(formData));
    const url = `${window.location.origin}/services/share?slug=${encodeURIComponent(serviceSlug)}&d=${encodeURIComponent(data)}`;
    setShareUrl(url);

    // Use a free QR API to generate the QR image
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    setQrUrl(qr);
  }, [serviceSlug, formData]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({
        title: `${serviceTitle} — Nepal Republic`,
        text: `Fill this form with pre-filled data from Nepal Republic`,
        url: shareUrl,
      });
    }
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 print:hidden">
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-3">Share with family</h3>
      <p className="text-xs text-zinc-500 mb-4">
        Share this pre-filled form with a family member. They scan the QR or tap the link to open the form with your shared data already filled in.
      </p>

      <div className="flex flex-col items-center gap-4">
        {qrUrl && (
          <div className="rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR Code" width={200} height={200} className="block" />
          </div>
        )}

        <div className="w-full flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy link'}
          </button>
          {'share' in navigator && (
            <button
              onClick={nativeShare}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
            >
              📤 Share
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-zinc-600 text-center">
        Only name, address, and contact info are shared. No identity numbers or sensitive data.
      </div>
    </div>
  );
}
