/**
 * Phase 5 — Execution Adapters
 * Registry and base types for service execution adapters.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExecutionMode = 'guidance_only' | 'assisted' | 'direct';

export type ExecutionLevel = 'direct' | 'assisted' | 'guided';

export interface AdapterCapabilities {
  canPrefill: boolean;
  canSubmitDigitally: boolean;
  canBookAppointment: boolean;
  canProcessPayment: boolean;
  canTrackStatus: boolean;
  canEscalate: boolean;
}

export interface ExecutionContext {
  userId: string;
  serviceSlug: string;
  taskId: string;
  draftValues: Record<string, string>;
  documents: Array<{ type: string; vaultDocId: string }>;
}

export interface ExecutionResult {
  success: boolean;
  mode: ExecutionMode;
  referenceNumber?: string;
  submittedAt?: string;
  nextSteps: string[];
  estimatedWait?: string;
  trackingUrl?: string;
  error?: string;
}

export interface ExecutionStep {
  order: number;
  action: string;
  description: string;
  requiresUser: boolean;  // true = user must do this step manually
  automatable: boolean;   // true = system can do this
}

export interface ServiceAdapter {
  slug: string;
  family: string;
  mode: ExecutionMode;
  executionLevel: ExecutionLevel;
  capabilities: AdapterCapabilities;

  /** Normalize intake data for this service */
  normalizeIntake(values: Record<string, string>): Record<string, string>;

  /** Map profile fields to service-specific fields */
  mapProfileToForm(
    profile: Record<string, string | null>,
  ): Record<string, string>;

  /** Get required documents for this service */
  getRequiredDocuments(): Array<{
    type: string;
    label: string;
    required: boolean;
  }>;

  /** Whether online submission is possible */
  canExecute(): boolean;

  /** Step-by-step for assisted/guided flows */
  getExecutionSteps(): ExecutionStep[];

  /** Generate submission payload */
  generatePayload(context: ExecutionContext): Record<string, unknown>;

  /** Execute (for direct mode) or provide guidance */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

import { healthAdapters } from './health';
import { passportAdapters } from './passport';
import { licenseAdapters } from './license';
import { utilityAdapters } from './utilities';

const ALL_ADAPTERS: ServiceAdapter[] = [
  ...healthAdapters,
  ...passportAdapters,
  ...licenseAdapters,
  ...utilityAdapters,
];

const adapterMap = new Map<string, ServiceAdapter>();
for (const a of ALL_ADAPTERS) {
  adapterMap.set(a.slug, a);
}

export function getAdapter(serviceSlug: string): ServiceAdapter | null {
  return adapterMap.get(serviceSlug) ?? null;
}

export function listAdapters(): Array<{
  slug: string;
  family: string;
  mode: ExecutionMode;
  executionLevel: ExecutionLevel;
}> {
  return ALL_ADAPTERS.map((a) => ({
    slug: a.slug,
    family: a.family,
    mode: a.mode,
    executionLevel: a.executionLevel,
  }));
}
