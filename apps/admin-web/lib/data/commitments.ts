import type {
  CommitmentReviewState,
  CommitmentScope,
  GovernmentPromise,
  PromiseStatus,
  SignalType,
  TrustLevel,
} from './promises';

export interface PublicCommitment {
  id: string;
  slug: string;
  title: string;
  title_ne: string;
  summary: string;
  summary_ne: string;
  scope: CommitmentScope;
  actors: string[];
  status: PromiseStatus;
  progress: number;
  evidence_count: number;
  source_count: number;
  last_signal_at?: string;
  last_update?: string;
  trust_level: TrustLevel;
  signal_type: SignalType;
  review_state: CommitmentReviewState;
  is_public: boolean;
}

export function isPublicCommitment(
  commitment: Pick<GovernmentPromise, 'reviewState' | 'isPublic' | 'mergedIntoId'>,
): boolean {
  if (commitment.isPublic === false) return false;
  if (commitment.reviewState === 'candidate' || commitment.reviewState === 'rejected') return false;
  if (commitment.mergedIntoId) return false;
  return true;
}

export function toPublicCommitment(commitment: GovernmentPromise): PublicCommitment {
  return {
    id: commitment.id,
    slug: commitment.slug,
    title: commitment.title,
    title_ne: commitment.title_ne,
    summary: commitment.summary || commitment.description,
    summary_ne: commitment.summary_ne || commitment.description_ne,
    scope: commitment.scope || commitment.geoScope || 'unknown',
    actors: commitment.actors || [],
    status: commitment.status,
    progress: commitment.progress,
    evidence_count: commitment.evidenceCount,
    source_count: commitment.sourceCount ?? 0,
    last_signal_at: commitment.lastSignalAt || commitment.lastActivityDate,
    last_update: commitment.lastUpdate,
    trust_level: commitment.trustLevel,
    signal_type: commitment.signalType,
    review_state: commitment.reviewState || 'reviewed',
    is_public: commitment.isPublic !== false,
  };
}
