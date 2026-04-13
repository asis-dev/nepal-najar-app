'use client';
import { useEffect, useState, useRef } from 'react';
import type { FormSchema } from '@/lib/services/form-schemas';
import { BSDateInput } from './bs-date-input';
import { ShareFormQR } from '@/components/public/services/qr/share-form-qr';
import { todayBS, formatBSNepali } from '@/lib/nepali/date-converter';
import { markFormCompleted } from '@/components/public/services/pwa-install-prompt';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import {
  saveOfflineDraft,
  getOfflineDraft,
  getOfflineDraftRecord,
} from '@/lib/services/offline-store';
import { syncOfflineDrafts } from '@/lib/services/offline-sync';
import { VoiceFormField } from '@/components/public/voice/voice-form-field';
import CameraScanner, { type ScannedImage } from '@/components/public/vault/camera-scanner';

type Props = {
  schema: FormSchema;
  onComplete?: (data: Record<string, any>) => void;
  serviceSlug?: string;
};

function applyScanResultToValues(
  current: Record<string, any>,
  parsed: {
    docType?: string | null;
    number?: string | null;
    holderName?: string | null;
    issuedOn?: string | null;
    expiresOn?: string | null;
  },
) {
  const next = { ...current };
  if (parsed.holderName && !next.full_name_en) next.full_name_en = parsed.holderName;

  switch (parsed.docType) {
    case 'citizenship':
      if (parsed.number && !next.citizenship_no) next.citizenship_no = parsed.number;
      if (parsed.issuedOn && !next.citizenship_issue_date) next.citizenship_issue_date = parsed.issuedOn;
      break;
    case 'passport':
      if (parsed.number && !next.passport_no) next.passport_no = parsed.number;
      if (parsed.expiresOn && !next.passport_expiry) next.passport_expiry = parsed.expiresOn;
      break;
    case 'drivers_license':
      if (parsed.number && !next.driving_license_no) next.driving_license_no = parsed.number;
      if (parsed.expiresOn && !next.license_expiry) next.license_expiry = parsed.expiresOn;
      break;
    case 'national_id':
      if (parsed.number && !next.national_id_no) next.national_id_no = parsed.number;
      break;
    case 'pan':
      if (parsed.number && !next.pan_no) next.pan_no = parsed.number;
      break;
    case 'voter_id':
      if (parsed.number && !next.voter_id_no) next.voter_id_no = parsed.number;
      break;
  }

  return next;
}

export function UniversalServiceForm({ schema, onComplete, serviceSlug }: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [autofilledKeys, setAutofilledKeys] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const bsToday = todayBS();
  const { isOnline, wasOffline } = useNetworkStatus();
  const didSyncRef = useRef(false);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && !didSyncRef.current) {
      didSyncRef.current = true;
      syncOfflineDrafts().then((result) => {
        if (result.synced > 0) {
          setMsg(`Synced ${result.synced} offline draft${result.synced > 1 ? 's' : ''}`);
          setTimeout(() => setMsg(''), 3000);
        }
      });
    }
  }, [isOnline, wasOffline]);

  // Load draft + profile in parallel; fall back to IndexedDB if offline
  useEffect(() => {
    (async () => {
      try {
        if (!isOnline) {
          // Offline: load from IndexedDB only
          const offlineData = await getOfflineDraft(schema.slug);
          if (offlineData) {
            setValues(offlineData);
          }
          setLoading(false);
          return;
        }

        const [pRes, dRes, tRes] = await Promise.all([
          fetch('/api/me/identity'),
          fetch(`/api/me/drafts?service_slug=${schema.slug}`),
          fetch('/api/me/service-tasks'),
        ]);
        const pJson = await pRes.json();
        const dJson = await dRes.json();
        const tJson = await tRes.json();
        const apiDraft = dJson.drafts?.[0]?.data || {};
        const profile = pJson.profile || null;
        const activeTask =
          (tJson.tasks || []).find(
            (row: any) => row.serviceSlug === (serviceSlug || schema.slug) && row.status !== 'completed',
          ) || null;
        if (activeTask?.id) setTaskId(activeTask.id);

        // Also check IndexedDB for newer offline changes
        const offlineRecord = await getOfflineDraftRecord(schema.slug);
        let draft = apiDraft;
        const taskFormDraft = activeTask?.serviceForm?.data || {};

        // Merge: if IndexedDB draft is newer and unsynced, its fields take precedence
        if (offlineRecord && !offlineRecord.synced) {
          const apiUpdateTime = dJson.drafts?.[0]?.updated_at
            ? new Date(dJson.drafts[0].updated_at).getTime()
            : 0;
          if (offlineRecord.updatedAt > apiUpdateTime) {
            draft = { ...apiDraft, ...offlineRecord.data };
          }
        }

        // Merge: draft > profile autofill
        const autofilled: Record<string, any> = {};
        if (profile) {
          for (const s of schema.sections) {
            for (const f of s.fields) {
              const pk = f.profileKey || f.key;
              if (profile[pk] != null && profile[pk] !== '') {
                autofilled[f.key] = profile[pk];
              }
            }
          }
        }
        setValues({ ...autofilled, ...taskFormDraft, ...draft });
        setAutofilledKeys(new Set(Object.keys(autofilled)));
        setProfileLoaded(!!profile);
      } catch {
        // Network error — try IndexedDB fallback
        const offlineData = await getOfflineDraft(schema.slug);
        if (offlineData) {
          setValues(offlineData);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.slug, serviceSlug]);

  // Auto-save draft every 5s if dirty — works offline too
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      saveDraft(false);
    }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  async function saveDraft(explicit: boolean) {
    setSaving(true);
    try {
      if (!isOnline) {
        // Save to IndexedDB when offline
        await saveOfflineDraft(schema.slug, schema.slug, values);
        if (explicit) {
          setMsg('Draft saved offline');
          setOfflineBanner('You\'re offline — form saved locally. Will sync when back online.');
        }
      } else {
        await fetch('/api/me/drafts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceSlug: schema.slug,
            formKey: schema.slug,
            data: values,
          }),
        });
        if (taskId) {
          await fetch(`/api/me/service-tasks/${taskId}/form-state`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              formKey: schema.slug,
              data: values,
              submitted: false,
            }),
          });
        }
        // Also save to IndexedDB as backup
        await saveOfflineDraft(schema.slug, schema.slug, values);
        if (explicit) setMsg('Draft saved');
        setOfflineBanner(null);
      }
    } catch {
      // Network failed — save offline
      await saveOfflineDraft(schema.slug, schema.slug, values);
      if (explicit) {
        setMsg('Saved offline');
        setOfflineBanner('You\'re offline — form saved locally. Will sync when back online.');
      }
    } finally {
      setSaving(false);
      if (explicit) setTimeout(() => setMsg(''), 2000);
    }
  }

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitError('');
    // Validate required
    const missing: string[] = [];
    for (const s of schema.sections) {
      for (const f of s.fields) {
        if (f.required && !values[f.key]) {
          missing.push(f.label);
        }
      }
    }
    if (missing.length > 0) {
      setSubmitError(`Please fill required fields: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`);
      // Scroll to first missing field
      for (const s of schema.sections) {
        for (const f of s.fields) {
          if (f.required && !values[f.key]) {
            document.getElementById(`field-${f.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }
      return;
    }

    setSubmitting(true);
    try {
      await saveDraft(false);

      // Track as application
      const appRes = await fetch('/api/me/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          service_slug: schema.slug,
          service_title: schema.title,
          status: 'in_progress',
          notes: 'Form completed in-app',
        }),
      });
      if (!appRes.ok) console.warn('Application tracking failed:', appRes.status);

      // Mark draft submitted
      const draftRes = await fetch('/api/me/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: schema.slug,
          formKey: schema.slug,
          data: values,
          submitted: true,
        }),
      });
      if (!draftRes.ok) console.warn('Draft submission failed:', draftRes.status);

      // Update service task if linked
      if (taskId) {
        const taskRes = await fetch(`/api/me/service-tasks/${taskId}/form-state`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formKey: schema.slug,
            data: values,
            submitted: true,
          }),
        });
        if (!taskRes.ok) console.warn('Task update failed:', taskRes.status);
      }

      setSubmitted(true);
      markFormCompleted();
      onComplete?.(values);

      // Phase 2: Learn from form submission — save profile-mapped fields back to identity profile
      try {
        const profileUpdates: Record<string, string> = {};
        for (const s of schema.sections) {
          for (const f of s.fields) {
            if (f.profileKey && values[f.key]) {
              profileUpdates[f.profileKey] = values[f.key];
            }
          }
        }
        if (Object.keys(profileUpdates).length > 0) {
          fetch('/api/me/profile/learn', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ fields: profileUpdates, source: 'form_submission', sourceRef: schema.slug }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch { /* non-blocking */ }

      window.print();
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitError('Something went wrong submitting your form. Your draft is saved — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDocumentImport(image: ScannedImage) {
    setScanMessage('Reading document…');
    try {
      const formData = new FormData();
      const file = new File([image.blob], `doc_import_${Date.now()}.jpg`, { type: 'image/jpeg' });
      formData.append('file', file);
      const res = await fetch('/api/vault/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not read the document');
      }

      const nextValues = applyScanResultToValues(values, data);
      setValues(nextValues);

      await fetch('/api/me/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(applyScanResultToValues({}, data)),
      }).catch(() => {});

      setScanMessage(`Imported fields from ${data.title || 'document'}. Review before submitting.`);
      setShowScanner(false);
    } catch (error: any) {
      setScanMessage(error.message || 'Could not import fields from the document');
    }
  }

  if (loading) return <div className="text-zinc-400 py-4">Loading form…</div>;

  const field =
    'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 outline-none';

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {!profileLoaded && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 print:hidden">
          💡 Tip: Fill out <a href="/me/identity" className="underline font-semibold">your identity profile</a> once
          to autofill this and every future form.
        </div>
      )}
      {profileLoaded && autofilledKeys.size > 0 && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 print:hidden">
          ✨ <strong>{autofilledKeys.size} fields auto-filled</strong> from your identity profile.
          Fields marked <span className="inline-block px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-bold">AUTO</span> were
          pre-populated — review and edit if needed.
        </div>
      )}

      {(!isOnline || offlineBanner) && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 print:hidden">
          {'\uD83D\uDCF4'} {offlineBanner || 'You\'re offline — form saved locally. Will sync when back online.'}
        </div>
      )}

      <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-xs text-cyan-200 print:hidden">
        <div className="font-semibold uppercase tracking-wide text-cyan-300 mb-1">Scan to fill faster</div>
        <div>
          Scan citizenship, passport, license, PAN, voter ID, or national ID documents to pull visible numbers into this form.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
          >
            Scan and import document
          </button>
          {taskId && (
            <span className="rounded-full border border-cyan-500/20 px-2 py-1 text-[11px] text-cyan-100">
              Connected to active case
            </span>
          )}
          {scanMessage && <span className="text-[11px] text-cyan-100/80">{scanMessage}</span>}
        </div>
      </div>

      <div className="relative z-10 rounded-2xl bg-white text-black border-2 border-black p-6 print:border-0 print:p-0">
        <div className="text-center mb-4 pb-3 border-b-2 border-black">
          <div className="text-[10px] uppercase tracking-widest">Government of Nepal</div>
          <h2 className="text-2xl font-black">{schema.title}</h2>
          {schema.title_ne && <div className="text-lg">{schema.title_ne}</div>}
        </div>

        {schema.sections.map((s) => (
          <section key={s.title} className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide mb-2 border-b border-gray-300 pb-1">{s.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {s.fields.map((f) => (
                <div key={f.key} id={`field-${f.key}`} className={`break-inside-avoid ${submitError && f.required && !values[f.key] ? 'ring-2 ring-red-400 rounded-lg p-1 -m-1' : ''}`}>
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1 mb-0.5">
                    {f.label}{f.required && ' *'}
                    {autofilledKeys.has(f.key) && values[f.key] && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold print:hidden">AUTO</span>
                    )}
                  </label>
                  {f.type === 'date' ? (
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <BSDateInput
                          value={values[f.key] || ''}
                          onChange={(v) => setValues({ ...values, [f.key]: v })}
                          label={undefined}
                          required={f.required}
                        />
                      </div>
                      <VoiceFormField
                        value={values[f.key] || ''}
                        onChange={(v) => setValues({ ...values, [f.key]: v })}
                        fieldType="date"
                        isDateField
                        className="print:hidden"
                      />
                    </div>
                  ) : f.type === 'select' ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="flex-1 border-b border-black bg-transparent px-1 py-1 text-sm print:bg-white"
                        value={values[f.key] || ''}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      >
                        <option value="">—</option>
                        {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <VoiceFormField
                        value={values[f.key] || ''}
                        onChange={(v) => setValues({ ...values, [f.key]: v })}
                        fieldType="select"
                        options={f.options}
                        className="print:hidden"
                      />
                    </div>
                  ) : f.type === 'textarea' ? (
                    <div className="flex items-start gap-1">
                      <textarea
                        className="flex-1 border border-black bg-transparent px-1 py-1 text-sm resize-none print:bg-white"
                        rows={2}
                        value={values[f.key] || ''}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      />
                      <VoiceFormField
                        value={values[f.key] || ''}
                        onChange={(v) => setValues({ ...values, [f.key]: v })}
                        fieldType="textarea"
                        className="print:hidden mt-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type={f.type || 'text'}
                        className="flex-1 border-b border-black bg-transparent px-1 py-1 text-sm print:bg-white"
                        value={values[f.key] || ''}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      />
                      <VoiceFormField
                        value={values[f.key] || ''}
                        onChange={(v) => setValues({ ...values, [f.key]: v })}
                        fieldType="text"
                        className="print:hidden"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-8 grid grid-cols-2 gap-8 print:block">
          <div>
            <div className="text-xs text-gray-700 mb-8">Applicant signature:</div>
            <div className="border-b border-black h-0" />
          </div>
          <div>
            <div className="text-xs text-gray-700 mb-1">Date:</div>
            <div className="text-sm">{formatBSNepali(bsToday)}</div>
            <div className="text-[10px] text-gray-500">{new Date().toLocaleDateString()}</div>
            <div className="border-b border-black h-0 mt-4" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <button onClick={() => saveDraft(true)} disabled={saving} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          {saving ? 'Saving…' : '💾 Save draft'}
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : '✓ Complete & print'}
        </button>
        {msg && <div className="self-center text-xs text-emerald-400">{msg}</div>}
      </div>
      {submitError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400 print:hidden">
          {submitError}
        </div>
      )}
      <div className="text-[11px] text-zinc-500 print:hidden">
        Tip: after &quot;Complete &amp; print&quot; the form opens the browser print dialog. Save as PDF or print and take to the office.
      </div>

      {submitted && (
        <div className="space-y-4 print:hidden">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-bold text-emerald-300">Form completed!</div>
            <div className="text-xs text-emerald-400/60 mt-1">
              Tracked in <a href="/me/cases#tracked-applications" className="underline">My Cases</a>. Print the form and take it to the office.
            </div>
          </div>

          {/* Next steps guidance */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 p-4">
            <h4 className="text-sm font-bold text-zinc-200 mb-2">📋 What to do next</h4>
            <ol className="space-y-1.5 text-xs text-zinc-400 list-decimal list-inside">
              <li>Print this form (or save as PDF)</li>
              <li>Gather the required documents listed above</li>
              <li>Visit the relevant office with your printed form and documents</li>
              <li>Keep your case reference in <a href="/me/cases" className="text-red-400 underline">My Cases</a> for tracking</li>
            </ol>
          </div>

          <ShareFormQR
            serviceSlug={schema.slug}
            serviceTitle={schema.title}
            formData={{
              full_name_en: values.full_name_en,
              full_name_ne: values.full_name_ne,
              permanent_province: values.permanent_province,
              permanent_district: values.permanent_district,
              permanent_municipality: values.permanent_municipality,
              permanent_ward: values.permanent_ward,
              mobile: values.mobile,
              email: values.email,
            }}
          />
        </div>
      )}

      {showScanner && (
        <CameraScanner
          docType="other"
          serviceSlug={serviceSlug || schema.slug}
          onSave={(image) => void handleDocumentImport(image)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
