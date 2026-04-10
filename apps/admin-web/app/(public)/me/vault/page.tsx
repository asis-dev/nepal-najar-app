'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  listMyVault,
  createVaultDoc,
  deleteVaultDoc,
  getSignedUrl,
  type CreateVaultDocInput,
} from '@/lib/vault/api';
import {
  DOC_TYPE_META,
  DOC_TYPE_ORDER,
  DOC_SERVICE_HINTS,
  type VaultDoc,
  type VaultDocType,
} from '@/lib/vault/types';
import CameraScanner, { type ScannedImage } from '@/components/public/vault/camera-scanner';

export default function VaultPage() {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<VaultDocType | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanUploading, setScanUploading] = useState(false);
  const [scanProgress, setScanProgress] = useState<string | null>(null);

  const handleScanSave = useCallback(async (image: ScannedImage, meta: { docType: string; docTitle: string }) => {
    setScanUploading(true);
    setScanProgress('Uploading...');
    try {
      const formData = new FormData();
      const file = new File([image.blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      formData.append('file', file);
      formData.append('doc_type', meta.docType);
      formData.append('doc_title', meta.docTitle);

      const res = await fetch('/api/vault/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      setScanProgress('Saved!');
      setShowScanner(false);
      reload();
    } catch (e: any) {
      setScanProgress(null);
      setError(e.message || 'Upload failed');
    } finally {
      setScanUploading(false);
      setTimeout(() => setScanProgress(null), 2000);
    }
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const rows = await listMyVault();
      setDocs(rows);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    if (!user) { setLoading(false); return; }
    reload();
  }, [authReady, user]);

  if (!authReady || loading) {
    return <div className="max-w-3xl mx-auto p-10 text-zinc-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Your Document Vault</h1>
        <p className="text-zinc-400 mb-6">
          Sign in to store and track your personal documents privately.
          <br />
          आफ्ना कागजात सुरक्षित राख्न साइन इन गर्नुहोस्।
        </p>
        <Link href="/login?next=/me/vault" className="inline-block px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">
          Sign in
        </Link>
      </div>
    );
  }

  const byType: Record<string, VaultDoc[]> = {};
  for (const d of docs) (byType[d.docType] ||= []).push(d);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">My Vault</h1>
          <p className="text-zinc-400 text-sm">
            Your private document locker. मेरो कागजात कोष।
          </p>
        </div>
        <Link href="/services" className="text-sm text-red-400 hover:underline">Services →</Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Privacy banner */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-400">
        🔐 Only you can see these documents. Files are stored privately in encrypted Supabase storage.
        Links expire after 10 minutes. Nothing is ever shared without your action.
      </div>

      {/* Expiring-soon strip */}
      <ExpiringSoon docs={docs} />

      {/* Grid by type */}
      <div className="grid gap-3">
        {DOC_TYPE_ORDER.map((t) => {
          const meta = DOC_TYPE_META[t];
          const items = byType[t] || [];
          return (
            <div key={t} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{meta.icon}</div>
                  <div>
                    <div className="font-semibold text-zinc-100">{meta.title.en}</div>
                    <div className="text-xs text-zinc-500">{meta.title.ne}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdd(t)}
                  className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  + Add
                </button>
              </div>

              {items.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {items.map((d) => (
                    <DocRow key={d.id} doc={d} onDeleted={reload} />
                  ))}
                </div>
              )}

              {DOC_SERVICE_HINTS[t].length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
                  Needed for:{' '}
                  {DOC_SERVICE_HINTS[t].slice(0, 3).map((slug, i) => (
                    <span key={slug}>
                      {i > 0 && ', '}
                      <Link href={`/services/search?q=${slug}`} className="text-red-400 hover:underline">
                        {slug.replace(/-/g, ' ')}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AddDocModal docType={showAdd} onClose={() => setShowAdd(null)} onSaved={() => { setShowAdd(null); reload(); }} />
      )}

      {showScanner && (
        <CameraScanner
          onSave={handleScanSave}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Upload progress toast */}
      {scanProgress && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 shadow-xl">
          {scanProgress}
        </div>
      )}

      {/* Floating Action Button — Scan */}
      <button
        onClick={() => setShowScanner(true)}
        disabled={scanUploading}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center justify-center transition-all disabled:bg-zinc-600"
        aria-label="Scan document"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
}

function DocRow({ doc, onDeleted }: { doc: VaultDoc; onDeleted: () => void }) {
  const [opening, setOpening] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function open() {
    if (!doc.storagePath) return;
    setOpening(true);
    const url = await getSignedUrl(doc.storagePath);
    setOpening(false);
    if (url) window.open(url, '_blank', 'noopener');
  }

  async function remove() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteVaultDoc(doc.id, doc.storagePath);
      onDeleted();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const expiryWarn = doc.expiresOn && new Date(doc.expiresOn).getTime() - Date.now() < 60 * 24 * 3600 * 1000;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-800/50 p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-100 truncate">{doc.title}</div>
        <div className="text-[11px] text-zinc-500 truncate">
          {doc.number && <>#{doc.number} · </>}
          {doc.expiresOn && (
            <span className={expiryWarn ? 'text-amber-400' : ''}>
              Expires {doc.expiresOn}
            </span>
          )}
          {doc.fileName && <> · {doc.fileName}</>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {doc.storagePath && (
          <button
            onClick={open}
            disabled={opening}
            className="text-xs px-3 py-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
          >
            {opening ? '…' : 'View'}
          </button>
        )}
        <button
          onClick={remove}
          disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-full bg-zinc-700 hover:bg-red-600/30 text-zinc-300 hover:text-red-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ExpiringSoon({ docs }: { docs: VaultDoc[] }) {
  const soon = docs
    .filter((d) => d.expiresOn && new Date(d.expiresOn).getTime() - Date.now() < 90 * 24 * 3600 * 1000)
    .sort((a, b) => (a.expiresOn! < b.expiresOn! ? -1 : 1));
  if (soon.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="text-xs uppercase tracking-wide text-amber-400 font-bold mb-2">Expiring soon · चाँडै सकिने</div>
      <div className="space-y-1">
        {soon.slice(0, 5).map((d) => (
          <div key={d.id} className="text-sm text-amber-200 flex justify-between gap-2">
            <span>{DOC_TYPE_META[d.docType].icon} {d.title}</span>
            <span className="text-xs text-amber-300">{d.expiresOn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddDocModal({
  docType,
  onClose,
  onSaved,
}: {
  docType: VaultDocType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = DOC_TYPE_META[docType];
  const [title, setTitle] = useState(meta.title.en);
  const [number, setNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  async function runScan(f: File) {
    setScanning(true);
    setScanMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await fetch('/api/vault/scan', { method: 'POST', body: fd });
      if (!r.ok) {
        setScanMsg('Auto-scan unavailable — fill in manually.');
        return;
      }
      const j = await r.json();
      if (j.ok) {
        if (j.title) setTitle(j.title);
        if (j.number) setNumber(j.number);
        if (j.issuedOn) setIssuedOn(j.issuedOn);
        if (j.expiresOn) setExpiresOn(j.expiresOn);
        setScanMsg(`✓ Auto-filled from image${j.confidence ? ` (${Math.round(j.confidence * 100)}%)` : ''}. Please double-check.`);
      } else {
        setScanMsg('Could not read document. Fill manually.');
      }
    } catch {
      setScanMsg('Scan failed. Fill manually.');
    } finally {
      setScanning(false);
    }
  }

  function onFilePicked(f: File | null) {
    setFile(f);
    if (f && f.type.startsWith('image/')) runScan(f);
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const input: CreateVaultDocInput = {
        docType,
        title: title.trim() || meta.title.en,
        number: number.trim() || undefined,
        issuedOn: issuedOn || undefined,
        expiresOn: expiresOn || undefined,
        notes: notes.trim() || undefined,
        file,
      };
      await createVaultDoc(input);
      onSaved();
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{meta.icon}</div>
            <div>
              <div className="font-bold text-zinc-100">Add {meta.title.en}</div>
              <div className="text-xs text-zinc-500">{meta.title.ne}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 px-2">✕</button>
        </div>

        <div className="space-y-3">
          <Field label="Title">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Number / ID">
            <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. passport number" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issued on">
              <input type="date" className="input" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
            </Field>
            {meta.hasExpiry && (
              <Field label="Expires on">
                <input type="date" className="input" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              </Field>
            )}
          </div>
          <Field label="File (photo or PDF)">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => onFilePicked(e.target.files?.[0] || null)}
              className="text-xs text-zinc-300"
            />
            <div className="text-[10px] text-zinc-500 mt-1">
              {scanning ? '🔍 Scanning document with AI…' : scanMsg || 'Stored privately. Photos auto-scanned to pre-fill fields.'}
            </div>
          </Field>
          <Field label="Notes">
            <textarea className="input h-16 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        {err && <div className="mt-3 text-xs text-red-400">{err}</div>}

        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
          >
            {saving ? 'Saving…' : 'Save to Vault'}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            background: rgb(39 39 42);
            border: 1px solid rgb(63 63 70);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            color: rgb(244 244 245);
          }
          .input:focus { outline: none; border-color: rgb(220 20 60); }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
