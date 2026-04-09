'use client';
import { useEffect, useState } from 'react';
import type { FormSchema } from '@/lib/services/form-schemas';
import { BSDateInput } from './bs-date-input';
import { ShareFormQR } from '@/components/public/services/qr/share-form-qr';
import { todayBS, formatBSNepali } from '@/lib/nepali/date-converter';

type Props = {
  schema: FormSchema;
  onComplete?: (data: Record<string, any>) => void;
};

export function UniversalServiceForm({ schema, onComplete }: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const bsToday = todayBS();

  // Load draft + profile in parallel
  useEffect(() => {
    (async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch('/api/me/identity'),
          fetch(`/api/me/drafts?service_slug=${schema.slug}`),
        ]);
        const pJson = await pRes.json();
        const dJson = await dRes.json();
        const draft = dJson.drafts?.[0]?.data || {};
        const profile = pJson.profile || null;

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
        setValues({ ...autofilled, ...draft });
        setProfileLoaded(!!profile);
      } finally {
        setLoading(false);
      }
    })();
  }, [schema.slug]);

  // Auto-save draft every 5s if dirty
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
      await fetch('/api/me/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: schema.slug,
          formKey: schema.slug,
          data: values,
        }),
      });
      if (explicit) setMsg('✓ Draft saved');
    } catch {
      if (explicit) setMsg('Save failed');
    } finally {
      setSaving(false);
      if (explicit) setTimeout(() => setMsg(''), 2000);
    }
  }

  async function submit() {
    // Validate required
    for (const s of schema.sections) {
      for (const f of s.fields) {
        if (f.required && !values[f.key]) {
          alert(`Missing: ${f.label}`);
          return;
        }
      }
    }
    await saveDraft(false);
    // Track as application
    await fetch('/api/me/applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service_slug: schema.slug,
        service_title: schema.title,
        status: 'in_progress',
        notes: 'Form completed in-app',
      }),
    });
    // Mark draft submitted
    await fetch('/api/me/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: schema.slug,
        formKey: schema.slug,
        data: values,
        submitted: true,
      }),
    });
    setSubmitted(true);
    onComplete?.(values);
    window.print();
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

      <div className="rounded-2xl bg-white text-black border-2 border-black p-6 print:border-0 print:p-0">
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
                <div key={f.key} className="break-inside-avoid">
                  <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                    {f.label}{f.required && ' *'}
                  </label>
                  {f.type === 'date' ? (
                    <BSDateInput
                      value={values[f.key] || ''}
                      onChange={(v) => setValues({ ...values, [f.key]: v })}
                      label={undefined}
                      required={f.required}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      className="w-full border-b border-black bg-transparent px-1 py-1 text-sm print:bg-white"
                      value={values[f.key] || ''}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    >
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="w-full border border-black bg-transparent px-1 py-1 text-sm resize-none print:bg-white"
                      rows={2}
                      value={values[f.key] || ''}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'}
                      className="w-full border-b border-black bg-transparent px-1 py-1 text-sm print:bg-white"
                      value={values[f.key] || ''}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
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
        <button onClick={submit} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">
          ✓ Complete & print
        </button>
        {msg && <div className="self-center text-xs text-emerald-400">{msg}</div>}
      </div>
      <div className="text-[11px] text-zinc-500 print:hidden">
        Tip: after "Complete & print" the form opens the browser print dialog. Save as PDF or print and take to the office.
      </div>

      {submitted && (
        <div className="space-y-4 print:hidden">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-bold text-emerald-300">Form completed!</div>
            <div className="text-xs text-emerald-400/60 mt-1">
              Tracked in <a href="/me/applications" className="underline">My Applications</a>. Print the form and take it to the office.
            </div>
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
    </div>
  );
}
