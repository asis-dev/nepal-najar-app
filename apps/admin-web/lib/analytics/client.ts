'use client';

import type { PilotEventName } from './events';

const VISITOR_ID_KEY = 'nepal-najar-pilot-visitor-id';
const SESSION_ID_KEY = 'nepal-najar-pilot-session-id';

interface TrackPilotEventOptions {
  pagePath?: string;
  metadata?: Record<string, unknown>;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreate(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const next = createId();
  storage.setItem(key, next);
  return next;
}

function getEventIdentity() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return {
      visitorId: getOrCreate(window.localStorage, VISITOR_ID_KEY),
      sessionId: getOrCreate(window.sessionStorage, SESSION_ID_KEY),
    };
  } catch {
    return null;
  }
}

export function trackPilotEvent(
  eventName: PilotEventName,
  options: TrackPilotEventOptions = {},
) {
  if (typeof window === 'undefined') return;

  const identity = getEventIdentity();
  if (!identity) return;

  const payload = {
    eventName,
    pagePath: options.pagePath ?? window.location.pathname,
    metadata: options.metadata ?? {},
    visitorId: identity.visitorId,
    sessionId: identity.sessionId,
  };

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort only.
  });
}

