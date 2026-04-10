'use client';

import { useState, useCallback } from 'react';
import CameraScanner, { type ScannedImage } from '@/components/public/vault/camera-scanner';

interface QuickScanButtonProps {
  /** The document type to pre-select */
  docType?: string;
  /** Service slug context */
  serviceSlug?: string;
  /** Called after successful scan + upload */
  onScanned?: (docType: string) => void;
}

/**
 * A compact "Scan document" button for the Document Readiness section.
 * Opens the camera scanner pre-configured for a specific document type.
 */
export function QuickScanButton({ docType, serviceSlug, onScanned }: QuickScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleSave = useCallback(
    async (image: ScannedImage, meta: { docType: string; docTitle: string }) => {
      setUploading(true);
      setUploadStatus('uploading');
      try {
        const formData = new FormData();
        const file = new File([image.blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        formData.append('file', file);
        formData.append('doc_type', meta.docType);
        formData.append('doc_title', meta.docTitle);
        if (serviceSlug) formData.append('service_slug', serviceSlug);

        const res = await fetch('/api/vault/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }

        setUploadStatus('success');
        setShowScanner(false);
        onScanned?.(meta.docType);

        // Reset after brief success indicator
        setTimeout(() => setUploadStatus('idle'), 2000);
      } catch (e: any) {
        console.error('[quick-scan] upload error:', e);
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      } finally {
        setUploading(false);
      }
    },
    [serviceSlug, onScanned],
  );

  return (
    <>
      <button
        onClick={() => setShowScanner(true)}
        disabled={uploading}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
          uploadStatus === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : uploadStatus === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
        }`}
      >
        {uploadStatus === 'success' ? (
          <>Saved</>
        ) : uploadStatus === 'error' ? (
          <>Failed — retry</>
        ) : uploadStatus === 'uploading' ? (
          <>Uploading...</>
        ) : (
          <>
            <CameraIcon />
            Scan document
          </>
        )}
      </button>

      {showScanner && (
        <CameraScanner
          docType={docType}
          serviceSlug={serviceSlug}
          onSave={handleSave}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default QuickScanButton;
