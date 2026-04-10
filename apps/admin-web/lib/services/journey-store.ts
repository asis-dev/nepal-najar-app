/**
 * Journey Store — persists active service journeys to localStorage.
 * Used by the Service Advisor to track multi-step government processes.
 */

export interface JourneyStep {
  order: number;
  serviceSlug: string;
  serviceTitle: string;
  serviceTitleNe?: string;
  why: string;
  documents: string[];
  estimatedTime: string;
  fee: string;
  portalUrl: string;
  category: string;
  done: boolean;
}

export interface Journey {
  id: string;
  query: string;
  steps: JourneyStep[];
  createdAt: string;
  summary: string;
}

const STORAGE_KEY = 'nepal-republic-journey';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function saveJourney(query: string, steps: JourneyStep[], summary: string): Journey {
  const journey: Journey = {
    id: generateId(),
    query,
    steps: steps.map((s) => ({ ...s, done: false })),
    createdAt: new Date().toISOString(),
    summary,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
  } catch {
    // localStorage full or unavailable — silent fail
  }
  return journey;
}

export function getActiveJourney(): Journey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Journey;
  } catch {
    return null;
  }
}

export function markStepDone(stepIndex: number): Journey | null {
  const journey = getActiveJourney();
  if (!journey || stepIndex < 0 || stepIndex >= journey.steps.length) return null;
  journey.steps[stepIndex].done = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
  } catch {
    // silent
  }
  return journey;
}

export function clearJourney(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
