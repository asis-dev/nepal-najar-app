import type { ComplaintAuthContext } from '@/lib/complaints/access';
import { isComplaintOwner } from '@/lib/complaints/access';
import type { ComplaintCase } from '@/lib/complaints/types';

type ComplaintIdentityShape = Pick<ComplaintCase, 'user_id' | 'is_anonymous'>;

export function shouldMaskAnonymousReporter(
  complaint: ComplaintIdentityShape,
  auth: ComplaintAuthContext,
): boolean {
  if (!complaint.is_anonymous) return false;
  if (auth.isElevated) return false;
  return !isComplaintOwner(complaint, auth.user?.id ?? null);
}

export function sanitizeComplaintForViewer<T extends ComplaintIdentityShape>(
  complaint: T,
  auth: ComplaintAuthContext,
): T {
  if (!shouldMaskAnonymousReporter(complaint, auth)) return complaint;
  return {
    ...complaint,
    user_id: 'anonymous',
  };
}

export function sanitizeReporterNameForViewer(
  complaint: ComplaintIdentityShape,
  auth: ComplaintAuthContext,
  reporterName: string,
): string {
  if (shouldMaskAnonymousReporter(complaint, auth)) return 'Anonymous';
  return reporterName;
}

export function sanitizeEventActorForViewer<T extends {
  actor_id: string | null;
  actor_type: string;
  actor_name?: string;
}>(
  event: T,
  complaint: ComplaintIdentityShape,
  auth: ComplaintAuthContext,
): T {
  if (!shouldMaskAnonymousReporter(complaint, auth)) return event;
  const reporterEvent = event.actor_type === 'citizen' && event.actor_id === complaint.user_id;
  if (!reporterEvent) return event;
  return {
    ...event,
    actor_id: null,
    actor_name: 'Anonymous Citizen',
  };
}

export function sanitizeEvidenceSubmitterForViewer<T extends {
  user_id: string;
  submitter_name?: string;
}>(
  evidence: T,
  complaint: ComplaintIdentityShape,
  auth: ComplaintAuthContext,
): T {
  if (!shouldMaskAnonymousReporter(complaint, auth)) return evidence;
  if (evidence.user_id !== complaint.user_id) return evidence;
  return {
    ...evidence,
    user_id: 'anonymous',
    submitter_name: 'Anonymous Citizen',
  };
}
