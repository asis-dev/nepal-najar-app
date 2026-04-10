'use client';

import { useCallback, useRef, useState } from 'react';

/** Compressed image result ready for upload */
export interface ScannedImage {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

interface CameraScannerProps {
  /** Pre-set document type for the upload */
  docType?: string;
  /** Called when user confirms the scan */
  onSave: (image: ScannedImage, meta: { docType: string; docTitle: string }) => void;
  /** Called when user dismisses the scanner */
  onClose: () => void;
  /** Optional service slug context */
  serviceSlug?: string;
}

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOC_TYPES = [
  { value: 'citizenship', label: 'Citizenship' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'bluebook', label: 'Vehicle Bluebook' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'academic_certificate', label: 'Academic Certificate' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'marriage_certificate', label: 'Marriage Certificate' },
  { value: 'land_dhani_purja', label: 'Land Dhani Purja' },
  { value: 'other', label: 'Other Document' },
];

export default function CameraScanner({ docType, onSave, onClose, serviceSlug }: CameraScannerProps) {
  const [scanned, setScanned] = useState<ScannedImage | null>(null);
  const [rotation, setRotation] = useState(0);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState(docType || 'citizenship');
  const [docTitle, setDocTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /** Process a selected/captured image file */
  const processImage = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum 10MB.');
      return;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please select an image or PDF file.');
      return;
    }
    setError(null);

    // Load image
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      processLoadedImage(img, url);
    };
    img.onerror = () => {
      setError('Failed to load image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  /** Compress and prepare the loaded image */
  const processLoadedImage = useCallback((img: HTMLImageElement, originalUrl: string) => {
    // Calculate dimensions maintaining aspect ratio
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > MAX_WIDTH) {
      h = Math.round(h * (MAX_WIDTH / w));
      w = MAX_WIDTH;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, w, h);

    // Generate preview URL from canvas
    const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    canvas.toBlob(
      (blob) => {
        URL.revokeObjectURL(originalUrl);
        if (!blob) {
          setError('Failed to process image.');
          return;
        }
        setScanned({ blob, previewUrl, width: w, height: h });
        setRotation(0);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  }, []);

  /** Apply rotation + contrast enhancement and re-render */
  const applyTransforms = useCallback(() => {
    if (!scanned) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isRotated90 = rotation % 180 !== 0;
      const cw = isRotated90 ? img.height : img.width;
      const ch = isRotated90 ? img.width : img.height;
      canvas.width = cw;
      canvas.height = ch;

      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply contrast enhancement for document readability
      if (enhanceContrast) {
        ctx.filter = 'contrast(1.3) brightness(1.05)';
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }

      const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setScanned((prev) => prev ? { ...prev, blob, previewUrl, width: cw, height: ch } : prev);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.src = scanned.previewUrl;
  }, [scanned, rotation, enhanceContrast]);

  /** Rotate 90 degrees clockwise */
  const rotate90 = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
    // Apply will be triggered by user pressing "Apply" or we do it immediately
    setTimeout(applyTransforms, 50);
  }, [applyTransforms]);

  /** Toggle contrast enhancement */
  const toggleContrast = useCallback(() => {
    setEnhanceContrast((v) => !v);
    setTimeout(applyTransforms, 50);
  }, [applyTransforms]);

  /** Retake: clear current scan */
  const retake = useCallback(() => {
    setScanned(null);
    setRotation(0);
    setError(null);
  }, []);

  /** Save to vault */
  const handleSave = useCallback(async () => {
    if (!scanned) return;
    setSaving(true);
    try {
      const title = docTitle.trim() || DOC_TYPES.find((d) => d.value === selectedDocType)?.label || 'Document';
      onSave(scanned, { docType: selectedDocType, docTitle: title });
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }, [scanned, selectedDocType, docTitle, onSave]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file);
      // Reset so user can re-select same file
      e.target.value = '';
    },
    [processImage],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-sm px-3 py-1.5">
          Cancel
        </button>
        <h2 className="text-sm font-semibold text-zinc-100">Scan Document</h2>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {!scanned ? (
        /* Capture mode */
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center mb-4">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Scan a document</h3>
            <p className="text-sm text-zinc-400">
              Take a photo or select from gallery.
              <br />
              कागजात फोटो खिच्नुहोस् वा ग्यालरीबाट छान्नुहोस्।
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-base transition-colors"
          >
            Take Photo
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full max-w-xs py-4 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-100 font-semibold text-base border border-zinc-700 transition-colors"
          >
            Choose from Gallery
          </button>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 max-w-xs text-center">
              {error}
            </div>
          )}
        </div>
      ) : (
        /* Preview + edit mode */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Image preview */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img
              src={scanned.previewUrl}
              alt="Scanned document preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          {/* Edit controls */}
          <div className="flex items-center justify-center gap-3 px-4 py-3">
            <button
              onClick={rotate90}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700"
              title="Rotate 90 degrees"
            >
              <RotateIcon /> Rotate
            </button>
            <button
              onClick={toggleContrast}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                enhanceContrast
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <ContrastIcon /> Enhance
            </button>
          </div>

          {/* Metadata */}
          <div className="px-4 py-3 space-y-2 bg-zinc-900 border-t border-zinc-800">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Document Type</div>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Title (optional)</div>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={DOC_TYPES.find((d) => d.value === selectedDocType)?.label}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </label>
            </div>
            <div className="text-[10px] text-zinc-500">
              {(scanned.blob.size / 1024).toFixed(0)} KB &middot; {scanned.width} x {scanned.height}px &middot; JPEG
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 px-4 py-4 bg-zinc-950 border-t border-zinc-800">
            <button
              onClick={retake}
              className="flex-1 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-base border border-zinc-700"
            >
              Retake
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white font-bold text-base transition-colors"
            >
              {saving ? 'Saving...' : 'Save to Vault'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RotateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6" />
      <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
  );
}

function ContrastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
    </svg>
  );
}
