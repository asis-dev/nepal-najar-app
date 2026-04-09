'use client';
import { useEffect, useState } from 'react';

type Profile = Record<string, any>;

const SECTIONS: Array<{
  title: string;
  fields: Array<{ key: string; label: string; type?: string; options?: string[]; placeholder?: string }>;
}> = [
  {
    title: 'Name',
    fields: [
      { key: 'full_name_en', label: 'Full name (English)' },
      { key: 'full_name_ne', label: 'पूरा नाम (नेपाली)' },
      { key: 'father_name_en', label: "Father's name" },
      { key: 'mother_name_en', label: "Mother's name" },
      { key: 'grandfather_name_en', label: "Grandfather's name" },
      { key: 'spouse_name_en', label: "Spouse's name" },
    ],
  },
  {
    title: 'Identity numbers',
    fields: [
      { key: 'citizenship_no', label: 'Citizenship no.' },
      { key: 'citizenship_issue_date', label: 'Citizenship issue date', type: 'date' },
      { key: 'citizenship_issue_district', label: 'Citizenship issue district' },
      { key: 'passport_no', label: 'Passport no.' },
      { key: 'passport_expiry', label: 'Passport expiry', type: 'date' },
      { key: 'pan_no', label: 'PAN no.' },
      { key: 'national_id_no', label: 'National ID no.' },
      { key: 'voter_id_no', label: 'Voter ID no.' },
      { key: 'driving_license_no', label: "Driver's license no." },
    ],
  },
  {
    title: 'Demographics',
    fields: [
      { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other', 'prefer_not'] },
      { key: 'blood_group', label: 'Blood group' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'religion', label: 'Religion' },
      { key: 'ethnicity', label: 'Ethnicity / caste' },
      { key: 'marital_status', label: 'Marital status' },
    ],
  },
  {
    title: 'Permanent address',
    fields: [
      { key: 'permanent_province', label: 'Province' },
      { key: 'permanent_district', label: 'District' },
      { key: 'permanent_municipality', label: 'Municipality' },
      { key: 'permanent_ward', label: 'Ward no.' },
      { key: 'permanent_tole', label: 'Tole / street' },
    ],
  },
  {
    title: 'Temporary address',
    fields: [
      { key: 'temporary_province', label: 'Province' },
      { key: 'temporary_district', label: 'District' },
      { key: 'temporary_municipality', label: 'Municipality' },
      { key: 'temporary_ward', label: 'Ward no.' },
      { key: 'temporary_tole', label: 'Tole / street' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'emergency_contact_name', label: 'Emergency contact name' },
      { key: 'emergency_contact_phone', label: 'Emergency contact phone' },
    ],
  },
  {
    title: 'Occupation',
    fields: [
      { key: 'occupation', label: 'Occupation' },
      { key: 'employer', label: 'Employer' },
      { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number' },
    ],
  },
];

export function ProfileEditor() {
  const [p, setP] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/me/identity')
      .then((r) => r.json())
      .then((j) => setP(j.profile || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/me/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (res.ok) setMsg('✓ Saved');
      else {
        const j = await res.json();
        setMsg('Error: ' + (j.error || 'failed'));
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  if (loading) return <div className="text-zinc-400">Loading…</div>;

  const field =
    'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 outline-none';

  return (
    <div className="space-y-6 pb-24">
      {SECTIONS.map((s) => (
        <section key={s.title} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-sm font-bold text-zinc-200 mb-3 uppercase tracking-wide">{s.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {s.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select className={field} value={p[f.key] || ''} onChange={(e) => setP({ ...p, [f.key]: e.target.value })}>
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    className={field}
                    placeholder={f.placeholder}
                    value={p[f.key] || ''}
                    onChange={(e) => setP({ ...p, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="fixed bottom-4 left-4 right-4 md:right-6 md:left-auto md:w-auto z-40">
        <button
          onClick={save}
          disabled={saving}
          className="w-full md:w-auto rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 shadow-xl"
        >
          {saving ? 'Saving…' : '💾 Save profile'}
        </button>
        {msg && <div className="mt-2 text-center text-xs text-emerald-400">{msg}</div>}
      </div>
    </div>
  );
}
