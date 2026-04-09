'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { HOUSEHOLD_RELATIONSHIP_LABELS, type HouseholdMember, type HouseholdRelationship } from '@/lib/household/types';

interface HouseholdCardProps {
  locale?: 'en' | 'ne';
}

const RELATIONSHIP_OPTIONS: HouseholdRelationship[] = [
  'parent',
  'child',
  'spouse',
  'sibling',
  'relative',
  'other',
];

export function HouseholdCard({ locale = 'en' }: HouseholdCardProps) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState<HouseholdRelationship>('parent');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    try {
      const response = await fetch('/api/me/household-members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/me/household-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          relationship,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not add household member.');
        return;
      }
      setDisplayName('');
      setNotes('');
      setMembers((prev) => [...prev, data.member]);
    } catch {
      setError('Could not add household member.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
          <Users className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">
            {locale === 'ne' ? 'घरपरिवार र प्रतिनिधित्व' : 'Household & delegated help'}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {locale === 'ne'
              ? 'आफ्नो तर्फबाट वा परिवारका सदस्यका लागि सेवा कार्यहरू सुरु गर्न नामहरू राख्नुहोस्।'
              : 'Add family members so tasks can be tracked for a parent, child, spouse, or relative.'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === 'ne' ? 'लोड हुँदैछ…' : 'Loading household...'}
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-np-border px-4 py-3 text-sm text-gray-500">
            {locale === 'ne'
              ? 'अहिलेसम्म कुनै सदस्य थपिएको छैन।'
              : 'No household members added yet.'}
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-np-border bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-200">{member.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {HOUSEHOLD_RELATIONSHIP_LABELS[member.relationship][locale]}
                  </div>
                </div>
                {member.notes && (
                  <div className="max-w-[14rem] text-right text-xs text-gray-500">
                    {member.notes}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={locale === 'ne' ? 'जस्तै: आमा, बाबु, छोरा' : 'Example: Mother, Father, Son'}
            className="input w-full text-sm"
          />
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as HouseholdRelationship)}
            className="input w-full appearance-none text-sm"
          >
            {RELATIONSHIP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {HOUSEHOLD_RELATIONSHIP_LABELS[option][locale]}
              </option>
            ))}
          </select>
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={locale === 'ne' ? 'वैकल्पिक टिप: वृद्ध अभिभावक, काठमाडौँमा बस्छन्' : 'Optional note: elderly parent, lives in Kathmandu'}
          className="input w-full text-sm"
        />
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {locale === 'ne' ? 'सदस्य थप्नुहोस्' : 'Add household member'}
        </button>
      </form>
    </div>
  );
}
