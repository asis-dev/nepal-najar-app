'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import type { AssistantTaskIntake, ServiceTaskRecord } from '@/lib/services/task-types';

interface AppointmentWindow {
  label: string;
  startsAt: string;
  endsAt: string;
  bookingMode: 'walk_in' | 'external_portal' | 'phone' | 'hybrid';
  note: string;
}

interface AppointmentPlan {
  providerKey: string;
  hospitalName: string;
  bookingMode: 'walk_in' | 'external_portal' | 'phone' | 'hybrid';
  bookingUrl?: string;
  phone?: string | null;
  specialties: string[];
  appointmentWindows: AppointmentWindow[];
  intakeNote: string;
  confirmationHint: string;
}

function recommendSpecialty(plan: AppointmentPlan, intake?: AssistantTaskIntake | null) {
  const specialties = plan.specialties || [];
  if (specialties.length === 0) return '';

  const findBy = (pattern: RegExp) =>
    specialties.find((option) => pattern.test(option.toLowerCase())) || '';

  if (intake?.health?.specialtyHint === 'pediatric' || intake?.subject === 'child') {
    return findBy(/pediatric|paediatric|child/) || specialties[0];
  }

  if (intake?.health?.specialtyHint === 'maternity') {
    return findBy(/gyn|obstetric|maternity/) || specialties[0];
  }

  if (intake?.health?.visitGoal === 'specialist' || intake?.care_need === 'specialist') {
    return specialties.find((option) => !/general|opd|internal medicine/i.test(option)) || specialties[0];
  }

  if (intake?.health?.visitGoal === 'same_day' || intake?.care_need === 'same_day' || intake?.urgency === 'today') {
    return findBy(/general|internal medicine|opd/) || specialties[0];
  }

  return specialties[0];
}

function buildRecommendation(plan: AppointmentPlan, intake?: AssistantTaskIntake | null) {
  const specialty = recommendSpecialty(plan, intake);
  const preferredWindow = plan.appointmentWindows?.[0]?.label || '';

  let rationale = specialty
    ? `NepalRepublic recommends ${specialty} as the best starting point.`
    : null;

  if (intake?.subject === 'child') {
    rationale = specialty
      ? `NepalRepublic picked ${specialty} because this looks like a child health case.`
      : rationale;
  } else if (intake?.health?.specialtyHint === 'maternity') {
    rationale = specialty
      ? `NepalRepublic picked ${specialty} because this looks like a maternity-related visit.`
      : rationale;
  } else if (intake?.health?.visitGoal === 'specialist' || intake?.care_need === 'specialist') {
    rationale = specialty
      ? `NepalRepublic picked ${specialty} because the request sounds like specialist care.`
      : rationale;
  } else if (intake?.health?.visitGoal === 'same_day' || intake?.care_need === 'same_day' || intake?.urgency === 'today') {
    rationale = specialty
      ? `NepalRepublic picked ${specialty} as the fastest same-day starting point.`
      : rationale;
  }

  return {
    specialty,
    preferredWindow,
    rationale,
  };
}

export function HospitalAppointmentPanel({
  serviceSlug,
  serviceTitle,
}: {
  serviceSlug: string;
  serviceTitle: string;
}) {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [plan, setPlan] = useState<AppointmentPlan | null>(null);
  const [task, setTask] = useState<ServiceTaskRecord | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [windowLabel, setWindowLabel] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/services/hospitals/${serviceSlug}/appointment-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.plan) return;
        setPlan(data.plan);
        setSpecialty(data.plan.specialties?.[0] || '');
        setWindowLabel(data.plan.appointmentWindows?.[0]?.label || '');
      })
      .catch(() => {});
  }, [serviceSlug]);

  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/service-tasks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = (data?.tasks || []).find((row: ServiceTaskRecord) => row.serviceSlug === serviceSlug && row.status !== 'completed');
        setTask(match || null);
      })
      .catch(() => {});
  }, [authReady, user, serviceSlug]);

  const selectedWindow = useMemo(
    () => plan?.appointmentWindows.find((item) => item.label === windowLabel) || null,
    [plan, windowLabel],
  );
  const recommendation = useMemo(
    () => (plan ? buildRecommendation(plan, task?.assistantIntake) : null),
    [plan, task],
  );

  useEffect(() => {
    if (!plan || !recommendation) return;
    setSpecialty((current) => {
      if (current && current !== plan.specialties[0]) return current;
      return recommendation.specialty || current || plan.specialties?.[0] || '';
    });
    setWindowLabel((current) => {
      if (current && current !== plan.appointmentWindows?.[0]?.label) return current;
      return recommendation.preferredWindow || current || plan.appointmentWindows?.[0]?.label || '';
    });
  }, [plan, recommendation]);

  async function savePreference() {
    if (!task) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/me/service-tasks/${task.id}/hospital-appointment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty,
          preferredWindow: windowLabel,
          note,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save hospital appointment preference');
      setMessage(data.confirmationHint || 'Appointment preference saved.');
    } catch (error: any) {
      setMessage(error.message || 'Could not save hospital appointment preference');
    } finally {
      setSaving(false);
    }
  }

  if (!plan) return null;

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 mb-6">
      <div className="text-xs uppercase tracking-wide text-cyan-300 font-bold mb-1">Hospital adapter</div>
      <h3 className="text-lg font-semibold text-zinc-100">Prepare the appointment path from here</h3>
      <p className="text-sm text-zinc-400 mt-1">{plan.intakeNote}</p>
      {recommendation?.rationale && task?.assistantIntake?.domain === 'health' && (
        <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          {recommendation.rationale}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Booking mode</div>
          <div className="text-sm text-zinc-200 capitalize">{plan.bookingMode.replace('_', ' ')}</div>
          <div className="mt-2 text-xs text-zinc-400">
            {plan.bookingUrl ? (
              <a href={plan.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
                Open booking surface ↗
              </a>
            ) : plan.phone ? (
              <a href={`tel:${plan.phone}`} className="text-cyan-300 hover:underline">
                Call {plan.phone}
              </a>
            ) : (
              'This hospital still depends on queue/desk workflow.'
            )}
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Best next windows</div>
          <div className="space-y-1 text-sm text-zinc-300">
            {plan.appointmentWindows.slice(0, 3).map((window) => (
              <div key={window.label}>• {window.label} — {window.note}</div>
            ))}
          </div>
        </div>
      </div>

      {!authReady || !user ? (
        <div className="mt-4">
          <Link
            href="/login?next=/services"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Sign in to save appointment preference
          </Link>
        </div>
      ) : !task ? (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          Start the {serviceTitle} workflow first, then NepalRepublic can save the appointment preference into your task.
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-zinc-300">
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Department / specialty</div>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              >
                {plan.specialties.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-zinc-300">
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Preferred window</div>
              <select
                value={windowLabel}
                onChange={(e) => setWindowLabel(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              >
                {plan.appointmentWindows.map((window) => (
                  <option key={window.label} value={window.label}>{window.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm text-zinc-300">
            <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Notes</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Symptoms, visit reason, or anything important"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            />
          </label>

          {selectedWindow && (
            <div className="mt-3 text-xs text-zinc-400">
              Selected: {selectedWindow.label} · {selectedWindow.note}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={savePreference}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save appointment preference'}
            </button>
            <Link href="/me/tasks" className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800">
              Open My Tasks
            </Link>
          </div>

          {message && (
            <div className="mt-3 text-sm text-cyan-200">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
