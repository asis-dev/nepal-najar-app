'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Check,
  X,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface DocumentScannerProps {
  onFieldsExtracted?: (fields: Record<string, string>) => void;
  onClose?: () => void;
}

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
}

interface ExtractionResult {
  documentType: string;
  confidence: number;
  fields: ExtractedField[];
  profileUpdates: {
    newFields: number;
    matchingFields: number;
  };
  unlockedServices: { name: string; href: string }[];
}

function confidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-400';
  if (confidence >= 70) return 'text-amber-400';
  return 'text-red-400';
}

function confidenceBg(confidence: number): string {
  if (confidence >= 90) return 'bg-green-400/10 border-green-400/20';
  if (confidence >= 70) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-red-400/10 border-red-400/20';
}

export default function DocumentScanner({
  onFieldsExtracted,
  onClose,
}: DocumentScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(selectedFile);

    // Convert to base64 and send to API
    const base64Reader = new FileReader();
    base64Reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setProcessing(true);

      try {
        const response = await fetch('/api/me/profile/extract-from-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            fileName: selectedFile.name,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || `Server error (${response.status})`
          );
        }

        const data: ExtractionResult = await response.json();
        setResult(data);
        // Select all fields by default
        setSelectedFields(new Set(data.fields.map((f) => f.key)));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to process document'
        );
      } finally {
        setProcessing(false);
      }
    };
    base64Reader.readAsDataURL(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type.startsWith('image/')) {
        handleFile(droppedFile);
      } else {
        setError('Please upload an image file');
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleDone = useCallback(() => {
    if (result && onFieldsExtracted) {
      const confirmed: Record<string, string> = {};
      for (const field of result.fields) {
        if (selectedFields.has(field.key)) {
          confirmed[field.key] = field.value;
        }
      }
      onFieldsExtracted(confirmed);
    }
    onClose?.();
  }, [result, selectedFields, onFieldsExtracted, onClose]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setProcessing(false);
    setResult(null);
    setError(null);
    setSelectedFields(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Document Scanner
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {!processing && !result && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 p-8
            rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50'
            }
          `}
        >
          {preview ? (
            <img
              src={preview}
              alt="Document preview"
              className="max-h-40 rounded-lg object-contain"
            />
          ) : (
            <>
              <Upload className="h-10 w-10 text-zinc-500" />
              <div className="text-center">
                <p className="text-sm text-zinc-300">
                  Drop a document image here
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  or click to upload
                </p>
              </div>
              {/* Mobile camera button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Processing State */}
      {processing && (
        <div className="flex flex-col items-center gap-4 py-10">
          {preview && (
            <img
              src={preview}
              alt="Document preview"
              className="max-h-32 rounded-lg object-contain opacity-60"
            />
          )}
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            <span className="text-sm text-zinc-400">
              Analyzing document...
            </span>
          </div>
          {/* Skeleton shimmer */}
          <div className="w-full space-y-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-zinc-800 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Document Type */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10">
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-300">
                Document Type:{' '}
                <span className="font-medium text-zinc-100">
                  {result.documentType}
                </span>
              </p>
              <p className={`text-xs ${confidenceColor(result.confidence)}`}>
                Confidence: {result.confidence}%
              </p>
            </div>
          </div>

          {/* Preview thumbnail */}
          {preview && (
            <div className="flex justify-center">
              <img
                src={preview}
                alt="Uploaded document"
                className="max-h-28 rounded-lg object-contain border border-zinc-800"
              />
            </div>
          )}

          {/* Extracted Fields */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Extracted Fields
            </h3>
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 divide-y divide-zinc-800">
              {result.fields.map((field) => {
                const isSelected = selectedFields.has(field.key);
                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleField(field.key)}
                        className={`
                          flex items-center justify-center h-5 w-5 rounded shrink-0 transition-colors border
                          ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-zinc-800 border-zinc-600 hover:border-zinc-500'
                          }
                        `}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">{field.label}</p>
                        <p className="text-sm text-zinc-200 truncate">
                          {field.value}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`
                        text-xs px-2 py-0.5 rounded-full border shrink-0 ml-2
                        ${confidenceBg(field.confidence)}
                        ${confidenceColor(field.confidence)}
                      `}
                    >
                      {field.confidence}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile Updates Summary */}
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Profile Updates
            </h3>
            <p className="text-sm text-zinc-300">
              <span className="font-medium text-zinc-100">
                {result.profileUpdates.newFields}
              </span>{' '}
              {result.profileUpdates.newFields === 1 ? 'field' : 'fields'} will
              update your profile
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {result.profileUpdates.matchingFields}{' '}
              {result.profileUpdates.matchingFields === 1 ? 'field' : 'fields'}{' '}
              already match
            </p>
          </div>

          {/* Unlocked Services */}
          {result.unlockedServices.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Unlocked Services
              </h3>
              <div className="space-y-2">
                {result.unlockedServices.map((service) => (
                  <a
                    key={service.name}
                    href={service.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors group"
                  >
                    <Lock className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {service.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            >
              Scan Another
            </button>
            <button
              onClick={handleDone}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
