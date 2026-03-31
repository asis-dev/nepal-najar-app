'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Camera,
  FileText,
  Loader2,
  AlertCircle,
  ImageIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════ */

interface PhotoUploadProps {
  /** Called with array of public URLs after successful upload */
  onUpload: (urls: string[]) => void;
  /** Maximum number of files (default 5) */
  maxFiles?: number;
  /** Maximum file size in bytes (default 5MB) */
  maxSize?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** @deprecated Use useI18n() hook instead */
  isNe?: boolean;
}

interface PreviewFile {
  file: File;
  preview: string; // object URL for images, empty for PDFs
  id: string;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const ACCEPT_STRING = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const MAX_SIZE_DEFAULT = 5 * 1024 * 1024; // 5MB
const MAX_FILES_DEFAULT = 5;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export function PhotoUpload({
  onUpload,
  maxFiles = MAX_FILES_DEFAULT,
  maxSize = MAX_SIZE_DEFAULT,
  disabled = false,
}: PhotoUploadProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Validate and add files ──
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(incoming);

      // Check total count
      const totalCount = files.length + fileArray.length;
      if (totalCount > maxFiles) {
        setError(
          t('evidence.maxFilesError').replace('{maxFiles}', String(maxFiles)).replace('{count}', String(files.length)),
        );
        return;
      }

      const newFiles: PreviewFile[] = [];

      for (const file of fileArray) {
        // Type check
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(
            t('evidence.fileTypeError').replace('{name}', file.name),
          );
          return;
        }

        // Size check
        if (file.size > maxSize) {
          setError(
            t('evidence.fileSizeError').replace('{name}', file.name).replace('{size}', formatBytes(file.size)),
          );
          return;
        }

        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : '';

        newFiles.push({ file, preview, id: generateId() });
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, maxSize, t],
  );

  // ── Remove a file ──
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
    setError(null);
  }, []);

  // ── Upload all files ──
  const handleUpload = useCallback(async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append('files', f.file);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('evidence.uploadFailed'));
        return;
      }

      // Clean up previews
      for (const f of files) {
        if (f.preview) URL.revokeObjectURL(f.preview);
      }
      setFiles([]);

      onUpload(data.urls);
    } catch {
      setError(t('evidence.uploadFailedRetry'));
    } finally {
      setUploading(false);
    }
  }, [files, uploading, onUpload, t]);

  // ── Drag & drop handlers ──
  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [addFiles],
  );

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="space-y-3">
      {/* ── Drop Zone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2
          rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer
          transition-all duration-200
          ${
            dragOver
              ? 'border-primary-400 bg-primary-500/10'
              : 'border-white/[0.12] bg-white/[0.03] hover:border-white/[0.2] hover:bg-white/[0.05]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          onChange={onFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex items-center gap-3">
          {/* Camera icon for mobile, upload icon for desktop */}
          <div className="w-10 h-10 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary-400 sm:hidden" />
            <Upload className="w-5 h-5 text-primary-400 hidden sm:block" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-200">
              {t('evidence.uploadPhotos')}
            </p>
            <p className="text-[11px] text-gray-500">
              {t('evidence.dragAndDrop').replace('{maxFiles}', String(maxFiles)).replace('{maxSize}', formatBytes(maxSize))}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              JPG, PNG, WebP, GIF, PDF
            </p>
          </div>
        </div>
      </div>

      {/* ── Error message ── */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* ── File Previews ── */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {t('evidence.filesSelected').replace('{count}', String(files.length))}
            </p>
            <p className="text-[10px] text-gray-500">
              {formatBytes(files.reduce((sum, f) => sum + f.file.size, 0))}
              {' '}
              {t('evidence.total')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {files.map((pf) => (
              <div
                key={pf.id}
                className="relative group rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.03]"
              >
                {/* Preview */}
                {isImage(pf.file) && pf.preview ? (
                  <img
                    src={pf.preview}
                    alt={pf.file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-white/[0.02]">
                    <FileText className="w-8 h-8 text-gray-500" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                      PDF
                    </span>
                  </div>
                )}

                {/* File info overlay */}
                <div className="px-2 py-1.5 border-t border-white/[0.06]">
                  <p className="text-[10px] text-gray-400 truncate">{pf.file.name}</p>
                  <p className="text-[9px] text-gray-600">{formatBytes(pf.file.size)}</p>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(pf.id);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 border border-white/[0.1] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('evidence.uploading')}
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                {t('evidence.uploadFiles').replace('{count}', String(files.length))}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
