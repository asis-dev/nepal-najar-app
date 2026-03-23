import { getSupabase } from '@/lib/supabase/server';
import {
  scanForNewCommitments,
  type Signal as DiscoverySignal,
} from './commitment-discovery';
import { transcribeAndIngest } from './collectors/audio-transcriber';
import { runStatusPipeline } from './status-pipeline';
import { reviewFeedbackItem } from './feedback-review';
import { summarizePilotTracker } from './pilot-summary';
import { processSignalsBatch } from './brain';

export type IntelligenceJobType =
  | 'process_signals_batch'
  | 'discover_commitment'
  | 'transcribe_url'
  | 'run_status_pipeline'
  | 'review_feedback'
  | 'summarize_pilot_tracker';
export type IntelligenceJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

interface JobPayloadMap {
  process_signals_batch: { batchSize: number; trigger: string; sequence: number };
  discover_commitment: { signalId: string };
  transcribe_url: { url: string };
  run_status_pipeline: { trigger: string };
  review_feedback: { feedbackId: string };
  summarize_pilot_tracker: { days: number; trigger: string };
}

export interface IntelligenceJobRow<T extends IntelligenceJobType = IntelligenceJobType> {
  id: string;
  job_type: T;
  status: IntelligenceJobStatus;
  priority: number;
  dedupe_key: string | null;
  payload: JobPayloadMap[T];
  result: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  available_at: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface EnqueueJobInput<T extends IntelligenceJobType> {
  jobType: T;
  payload: JobPayloadMap[T];
  dedupeKey?: string;
  priority?: number;
  availableAt?: string;
  maxAttempts?: number;
}

interface ProcessJobsResult {
  claimed: number;
  completed: number;
  failed: number;
  requeued: number;
  jobs: Array<{
    id: string;
    jobType: IntelligenceJobType;
    status: 'completed' | 'failed' | 'requeued';
    message?: string;
  }>;
}

function buildDedupeKey<T extends IntelligenceJobType>(
  jobType: T,
  payload: JobPayloadMap[T],
): string {
  if (jobType === 'process_signals_batch') {
    const analysisPayload = payload as JobPayloadMap['process_signals_batch'];
    return `signal-analysis:${analysisPayload.trigger}:${analysisPayload.sequence}`;
  }

  if (jobType === 'discover_commitment') {
    const discoverPayload = payload as JobPayloadMap['discover_commitment'];
    return `discover:${discoverPayload.signalId}`;
  }

  if (jobType === 'run_status_pipeline') {
    const statusPayload = payload as JobPayloadMap['run_status_pipeline'];
    const bucket = new Date().toISOString().slice(0, 13);
    return `status-pipeline:${statusPayload.trigger}:${bucket}`;
  }

  if (jobType === 'review_feedback') {
    const feedbackPayload = payload as JobPayloadMap['review_feedback'];
    return `feedback-review:${feedbackPayload.feedbackId}`;
  }

  if (jobType === 'summarize_pilot_tracker') {
    const summaryPayload = payload as JobPayloadMap['summarize_pilot_tracker'];
    const bucket = new Date().toISOString().slice(0, 13);
    return `pilot-summary:${summaryPayload.days}:${summaryPayload.trigger}:${bucket}`;
  }

  const transcribePayload = payload as JobPayloadMap['transcribe_url'];
  return `transcribe:${transcribePayload.url.trim()}`;
}

export async function enqueueIntelligenceJob<T extends IntelligenceJobType>({
  jobType,
  payload,
  dedupeKey,
  priority = 0,
  availableAt,
  maxAttempts = 3,
}: EnqueueJobInput<T>): Promise<IntelligenceJobRow<T>> {
  const supabase = getSupabase();
  const key = dedupeKey || buildDedupeKey(jobType, payload);

  const { data: existing } = await supabase
    .from('intelligence_jobs')
    .select('*')
    .eq('dedupe_key', key)
    .in('status', ['pending', 'running', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as IntelligenceJobRow<T>;
  }

  const { data, error } = await supabase
    .from('intelligence_jobs')
    .insert({
      job_type: jobType,
      status: 'pending',
      priority,
      dedupe_key: key,
      payload,
      max_attempts: maxAttempts,
      available_at: availableAt || new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to enqueue ${jobType}`);
  }

  return data as IntelligenceJobRow<T>;
}

export async function enqueueDiscoveryJobsForSignals(
  signals: Array<Pick<DiscoverySignal, 'id'>>,
): Promise<IntelligenceJobRow<'discover_commitment'>[]> {
  const jobs: IntelligenceJobRow<'discover_commitment'>[] = [];

  for (const signal of signals) {
    jobs.push(
      await enqueueIntelligenceJob({
        jobType: 'discover_commitment',
        payload: { signalId: signal.id },
        priority: 50,
      }),
    );
  }

  return jobs;
}

export async function enqueueSignalAnalysisJobs(options: {
  batchSize: number;
  jobCount: number;
  trigger?: string;
}): Promise<IntelligenceJobRow<'process_signals_batch'>[]> {
  const jobs: IntelligenceJobRow<'process_signals_batch'>[] = [];
  const batchSize = Math.max(1, Math.min(options.batchSize, 50));
  const jobCount = Math.max(1, Math.min(options.jobCount, 12));
  const trigger = options.trigger || 'manual';

  for (let sequence = 0; sequence < jobCount; sequence++) {
    jobs.push(
      await enqueueIntelligenceJob({
        jobType: 'process_signals_batch',
        payload: { batchSize, trigger, sequence },
        priority: 70,
      }),
    );
  }

  return jobs;
}

export async function enqueueTranscriptionJobs(
  urls: string[],
): Promise<IntelligenceJobRow<'transcribe_url'>[]> {
  const jobs: IntelligenceJobRow<'transcribe_url'>[] = [];

  for (const url of urls) {
    jobs.push(
      await enqueueIntelligenceJob({
        jobType: 'transcribe_url',
        payload: { url },
        priority: 40,
      }),
    );
  }

  return jobs;
}

export async function enqueueStatusPipelineJob(
  trigger = 'manual',
): Promise<IntelligenceJobRow<'run_status_pipeline'>> {
  return enqueueIntelligenceJob({
    jobType: 'run_status_pipeline',
    payload: { trigger },
    priority: 60,
  });
}

export async function enqueueFeedbackReviewJobs(
  feedbackIds: string[],
): Promise<IntelligenceJobRow<'review_feedback'>[]> {
  const jobs: IntelligenceJobRow<'review_feedback'>[] = [];

  for (const feedbackId of feedbackIds) {
    jobs.push(
      await enqueueIntelligenceJob({
        jobType: 'review_feedback',
        payload: { feedbackId },
        priority: 35,
      }),
    );
  }

  return jobs;
}

export async function enqueuePilotSummaryJob(
  days = 14,
  trigger = 'manual',
): Promise<IntelligenceJobRow<'summarize_pilot_tracker'>> {
  return enqueueIntelligenceJob({
    jobType: 'summarize_pilot_tracker',
    payload: {
      days: Math.max(1, Math.min(days, 90)),
      trigger,
    },
    priority: 25,
  });
}

async function releaseStaleRunningJobs(maxAgeMinutes = 20): Promise<number> {
  const supabase = getSupabase();
  const cutoffIso = new Date(
    Date.now() - maxAgeMinutes * 60_000,
  ).toISOString();

  const { data: staleJobs, error } = await supabase
    .from('intelligence_jobs')
    .select('id')
    .eq('status', 'running')
    .lt('locked_at', cutoffIso);

  if (error || !staleJobs || staleJobs.length === 0) {
    return 0;
  }

  const staleIds = staleJobs.map((job) => job.id);
  const { error: updateError } = await supabase
    .from('intelligence_jobs')
    .update({
      status: 'pending',
      available_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
      last_error: 'Job lock expired; requeued automatically.',
    })
    .in('id', staleIds);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return staleIds.length;
}

async function claimPendingJobs(options?: {
  limit?: number;
  workerId?: string;
  jobTypes?: IntelligenceJobType[];
}): Promise<IntelligenceJobRow[]> {
  const supabase = getSupabase();
  const limit = options?.limit ?? 10;
  const workerId = options?.workerId || `worker-${Date.now()}`;
  const nowIso = new Date().toISOString();

  let query = supabase
    .from('intelligence_jobs')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('available_at', nowIso)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (options?.jobTypes && options.jobTypes.length > 0) {
    query = query.in('job_type', options.jobTypes);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    throw new Error(error?.message || 'Failed to query intelligence jobs');
  }

  const claimed: IntelligenceJobRow[] = [];

  for (const candidate of candidates as IntelligenceJobRow[]) {
    if (candidate.attempts >= candidate.max_attempts) {
      continue;
    }

    const { data: updated } = await supabase
      .from('intelligence_jobs')
      .update({
        status: 'running',
        attempts: candidate.attempts + 1,
        locked_at: nowIso,
        locked_by: workerId,
        updated_at: nowIso,
        last_error: null,
      })
      .eq('id', candidate.id)
      .eq('status', candidate.status)
      .select('*')
      .maybeSingle();

    if (updated) {
      claimed.push(updated as IntelligenceJobRow);
    }
  }

  return claimed;
}

async function completeJob(
  jobId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('intelligence_jobs')
    .update({
      status: 'completed',
      result,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function failJob(
  job: IntelligenceJobRow,
  errorMessage: string,
): Promise<'failed' | 'requeued'> {
  const supabase = getSupabase();
  const shouldRetry = job.attempts < job.max_attempts;
  const delayMinutes = Math.min(Math.max(job.attempts, 1) * 5, 30);
  const availableAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  const { error } = await supabase
    .from('intelligence_jobs')
    .update({
      status: shouldRetry ? 'pending' : 'failed',
      available_at: shouldRetry ? availableAt : new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
      last_error: errorMessage,
    })
    .eq('id', job.id);

  if (error) {
    throw new Error(error.message);
  }

  return shouldRetry ? 'requeued' : 'failed';
}

async function loadDiscoverySignal(signalId: string): Promise<DiscoverySignal | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('id, source_id, signal_type, title, content, url, published_at, author, media_type, metadata')
    .eq('id', signalId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as DiscoverySignal | null) || null;
}

async function processSingleJob(
  job: IntelligenceJobRow,
): Promise<Record<string, unknown>> {
  if (job.job_type === 'process_signals_batch') {
    const payload = job.payload as JobPayloadMap['process_signals_batch'];
    const result = await processSignalsBatch(payload.batchSize);
    return {
      trigger: payload.trigger,
      sequence: payload.sequence,
      batchSize: payload.batchSize,
      ...result,
    };
  }

  if (job.job_type === 'discover_commitment') {
    const signalId = (job.payload as JobPayloadMap['discover_commitment']).signalId;
    const signal = await loadDiscoverySignal(signalId);

    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const discoveries = await scanForNewCommitments([signal]);
    return {
      signalId,
      discoveriesFound: discoveries.length,
      discoveries,
    };
  }

  if (job.job_type === 'transcribe_url') {
    const url = (job.payload as JobPayloadMap['transcribe_url']).url;
    const result = await transcribeAndIngest([url]);
    return { url, ...result };
  }

  if (job.job_type === 'run_status_pipeline') {
    const trigger =
      (job.payload as JobPayloadMap['run_status_pipeline']).trigger || 'manual';
    const result = await runStatusPipeline();
    return {
      trigger,
      analyzed: result.analyzed,
      persisted: result.persisted,
      recommendations: result.recommendations.length,
    };
  }

  if (job.job_type === 'review_feedback') {
    const feedbackId =
      (job.payload as JobPayloadMap['review_feedback']).feedbackId;
    const reviewed = await reviewFeedbackItem(feedbackId);
    return {
      feedbackId,
      reviewStatus: reviewed.ai_review_status,
      recommendation: reviewed.ai_recommendation,
      priority: reviewed.ai_priority,
    };
  }

  if (job.job_type === 'summarize_pilot_tracker') {
    const payload = job.payload as JobPayloadMap['summarize_pilot_tracker'];
    const summary = await summarizePilotTracker(payload.days, {
      trigger: payload.trigger,
      generatedByJobId: job.id,
    });
    return {
      days: payload.days,
      trigger: payload.trigger,
      summaryId: summary.id,
      overallHealth: summary.overallHealth,
      confidence: summary.confidence,
    };
  }

  throw new Error(`Unsupported intelligence job type: ${job.job_type}`);
}

export async function processIntelligenceJobs(options?: {
  limit?: number;
  workerId?: string;
  jobTypes?: IntelligenceJobType[];
}): Promise<ProcessJobsResult> {
  const result: ProcessJobsResult = {
    claimed: 0,
    completed: 0,
    failed: 0,
    requeued: 0,
    jobs: [],
  };

  await releaseStaleRunningJobs();

  const target = Math.max(1, options?.limit ?? 10);

  for (let processed = 0; processed < target; processed++) {
    const jobs = await claimPendingJobs({
      ...options,
      limit: 1,
    });
    const job = jobs[0];

    if (!job) {
      break;
    }

    result.claimed++;

    try {
      const jobResult = await processSingleJob(job);
      await completeJob(job.id, jobResult);
      result.completed++;
      result.jobs.push({
        id: job.id,
        jobType: job.job_type,
        status: 'completed',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown job processing error';
      const status = await failJob(job, message);
      if (status === 'requeued') result.requeued++;
      else result.failed++;
      result.jobs.push({
        id: job.id,
        jobType: job.job_type,
        status,
        message,
      });
    }
  }

  return result;
}
