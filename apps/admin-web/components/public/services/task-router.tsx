'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import type { HouseholdMember } from '@/lib/household/types';
import { HOUSEHOLD_RELATIONSHIP_LABELS } from '@/lib/household/types';

interface ServiceOption {
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
}

export function TaskRouter({ locale = 'en' }: { locale?: 'en' | 'ne' }) {
  const router = useRouter();
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeReason, setRouteReason] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [targetMemberId, setTargetMemberId] = useState('');

  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/household-members')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setMembers(data?.members || []))
      .catch(() => setMembers([]));
  }, [authReady, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setRouteReason(null);
    setFollowUpPrompt(null);
    setServiceOptions([]);
    try {
      const response = await fetch('/api/me/service-tasks/from-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale, targetMemberId: targetMemberId || undefined }),
      });
      const data = await response.json();
      if (data.serviceOptions?.length && (data.ambiguous || !response.ok)) {
        setRouteReason(data.routeReason || null);
        setFollowUpPrompt(data.followUpPrompt || null);
        setServiceOptions(data.serviceOptions || []);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Could not route that request.');
        return;
      }

      if (data.requiresAuth && data.service) {
        router.push(`/services/${data.service.category}/${data.service.slug}`);
        return;
      }

      if (data.task) {
        router.push('/me/tasks');
        return;
      }

      if (data.service) {
        router.push(`/services/${data.service.category}/${data.service.slug}`);
        return;
      }
    } catch {
      setError('Something went wrong while routing your request.');
    } finally {
      setLoading(false);
    }
  }

  const samples =
    locale === 'ne'
      ? [
          'मेरो लाइसेन्स नवीकरण गर्नुपर्‍यो',
          'अस्पतालको समय बुक गर्नुपर्‍यो',
          'मेरो NEA बिल तिर्नुपर्‍यो',
          'नागरिकता बनाउन के चाहिन्छ?',
        ]
      : [
          'Renew my driving license',
          'Book hospital appointment',
          'Pay my electricity bill',
          'What do I need for citizenship certificate?',
        ];

  return (
    <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-zinc-900 to-zinc-950 p-5 md:p-6">
      <div className="text-xs uppercase tracking-wide text-red-400 font-bold mb-2">
        Assistant-first
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-zinc-100">
        {locale === 'ne' ? 'तपाईंलाई के काम छ?' : 'What do you need help with?'}
      </h2>
      <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-2xl">
        {locale === 'ne'
          ? 'सेवा खोज्नु पर्दैन। समस्या लेख्नुहोस्, Nepal Republic ले सही सेवा र अर्को कदम देखाउँछ।'
          : "Don't hunt through categories. Describe the problem and Nepal Republic will route you to the right service and next step."}
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            locale === 'ne'
              ? 'जस्तै: लाइसेन्स नवीकरण गर्नुपर्‍यो, बिर अस्पतालमा समय चाहियो, NEA बिल तिर्नुपर्‍यो'
              : 'Example: renew my license, book a hospital appointment, pay my NEA bill'
          }
          className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none"
        />
        {user && members.length > 0 && (
          <select
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-100 focus:border-red-500 focus:outline-none md:w-64"
          >
            <option value="">{locale === 'ne' ? 'मेरो लागि' : 'For me'}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName} · {HOUSEHOLD_RELATIONSHIP_LABELS[member.relationship][locale]}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {loading ? (locale === 'ne' ? 'रुट गर्दै…' : 'Routing…') : (locale === 'ne' ? 'सुरु गर्नुहोस्' : 'Start')}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {(routeReason || followUpPrompt || serviceOptions.length > 0) && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          {routeReason && (
            <div className="text-sm text-zinc-300">{routeReason}</div>
          )}
          {followUpPrompt && (
            <div className="mt-2 text-xs text-zinc-500">{followUpPrompt}</div>
          )}
          {serviceOptions.length > 0 && (
            <div className="mt-3 grid gap-2">
              {serviceOptions.slice(0, 4).map((option) => (
                <Link
                  key={option.slug}
                  href={`/services/${option.category}/${option.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left hover:border-red-500/40 hover:bg-zinc-900/80"
                >
                  <div className="text-sm font-semibold text-zinc-100">
                    {locale === 'ne' ? option.title.ne : option.title.en}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{option.providerName}</div>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => router.push(`/services/search?q=${encodeURIComponent(question.trim())}`)}
                className="mt-1 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                {locale === 'ne' ? 'थप विकल्प हेर्नुहोस्' : 'See more options'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {samples.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setQuestion(sample)}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
}
