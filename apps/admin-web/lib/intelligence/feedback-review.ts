import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

export type FeedbackType = 'bug' | 'feature' | 'content' | 'general';
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved' | 'archived';
export type FeedbackPriority = 'low' | 'medium' | 'high';
export type FeedbackRecommendation =
  | 'ignore'
  | 'clarify'
  | 'content_update'
  | 'bug_fix'
  | 'feature_request'
  | 'investigate';
export type FeedbackReviewStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'applied';

export interface FeedbackProposedAction {
  type:
    | 'archive_feedback'
    | 'request_clarification'
    | 'review_content'
    | 'queue_bug_fix'
    | 'queue_feature'
    | 'investigate_issue';
  target: string;
  summary: string;
  requiresApproval: boolean;
  confidence: number;
}

export interface FeedbackAutopilotResult {
  summary: string;
  usefulnessScore: number;
  validityScore: number;
  actionabilityScore: number;
  confidence: number;
  priority: FeedbackPriority;
  recommendation: FeedbackRecommendation;
  proposedActions: FeedbackProposedAction[];
  handoffPrompt: string;
}

export interface FeedbackRow {
  id: string;
  user_id: string;
  feedback_type: FeedbackType;
  message: string;
  rating: number | null;
  page_context: string | null;
  user_agent: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  ai_summary: string | null;
  ai_confidence: number | null;
  ai_usefulness_score: number | null;
  ai_validity_score: number | null;
  ai_actionability_score: number | null;
  ai_priority: FeedbackPriority | null;
  ai_recommendation: FeedbackRecommendation | null;
  ai_review_status: FeedbackReviewStatus;
  ai_proposed_actions: FeedbackProposedAction[] | null;
  ai_handoff_prompt: string | null;
  ai_review_provider: string | null;
  ai_review_model: string | null;
  ai_reviewed_at: string | null;
  ai_approved_at: string | null;
  ai_applied_at: string | null;
}

function normalizeScore(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function normalizePriority(value: unknown): FeedbackPriority {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}

function normalizeRecommendation(value: unknown): FeedbackRecommendation {
  switch (value) {
    case 'ignore':
    case 'clarify':
    case 'content_update':
    case 'bug_fix':
    case 'feature_request':
    case 'investigate':
      return value;
    default:
      return 'investigate';
  }
}

function normalizeReviewStatus(value: unknown): FeedbackReviewStatus {
  switch (value) {
    case 'reviewed':
    case 'approved':
    case 'rejected':
    case 'applied':
      return value;
    default:
      return 'pending';
  }
}

function normalizeProposedActions(
  value: unknown,
): FeedbackProposedAction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const action = item as Record<string, unknown>;
      const type = action.type;
      if (
        type !== 'archive_feedback' &&
        type !== 'request_clarification' &&
        type !== 'review_content' &&
        type !== 'queue_bug_fix' &&
        type !== 'queue_feature' &&
        type !== 'investigate_issue'
      ) {
        return null;
      }

      return {
        type,
        target: typeof action.target === 'string' ? action.target : 'general',
        summary: typeof action.summary === 'string' ? action.summary : '',
        requiresApproval: action.requiresApproval !== false,
        confidence: normalizeScore(action.confidence, 0.5),
      } satisfies FeedbackProposedAction;
    })
    .filter((action): action is FeedbackProposedAction => Boolean(action));
}

function parseJSON<T>(text: string): T | null {
  try {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildAdminNotesAppendix(
  currentNotes: string | null | undefined,
  label: string,
  text: string,
): string {
  const base = currentNotes?.trim();
  const appendix = `${label}: ${text}`.trim();
  return base ? `${base}\n\n${appendix}` : appendix;
}

function mapFeedbackRow(row: Record<string, unknown>): FeedbackRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    feedback_type: (row.feedback_type as FeedbackType) || 'general',
    message: String(row.message || ''),
    rating: typeof row.rating === 'number' ? row.rating : null,
    page_context: typeof row.page_context === 'string' ? row.page_context : null,
    user_agent: typeof row.user_agent === 'string' ? row.user_agent : null,
    status: (row.status as FeedbackStatus) || 'new',
    admin_notes: typeof row.admin_notes === 'string' ? row.admin_notes : null,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
    ai_summary: typeof row.ai_summary === 'string' ? row.ai_summary : null,
    ai_confidence: typeof row.ai_confidence === 'number' ? row.ai_confidence : null,
    ai_usefulness_score:
      typeof row.ai_usefulness_score === 'number'
        ? row.ai_usefulness_score
        : null,
    ai_validity_score:
      typeof row.ai_validity_score === 'number' ? row.ai_validity_score : null,
    ai_actionability_score:
      typeof row.ai_actionability_score === 'number'
        ? row.ai_actionability_score
        : null,
    ai_priority:
      typeof row.ai_priority === 'string'
        ? normalizePriority(row.ai_priority)
        : null,
    ai_recommendation:
      typeof row.ai_recommendation === 'string'
        ? normalizeRecommendation(row.ai_recommendation)
        : null,
    ai_review_status: normalizeReviewStatus(row.ai_review_status),
    ai_proposed_actions: normalizeProposedActions(row.ai_proposed_actions),
    ai_handoff_prompt:
      typeof row.ai_handoff_prompt === 'string' ? row.ai_handoff_prompt : null,
    ai_review_provider:
      typeof row.ai_review_provider === 'string' ? row.ai_review_provider : null,
    ai_review_model:
      typeof row.ai_review_model === 'string' ? row.ai_review_model : null,
    ai_reviewed_at:
      typeof row.ai_reviewed_at === 'string' ? row.ai_reviewed_at : null,
    ai_approved_at:
      typeof row.ai_approved_at === 'string' ? row.ai_approved_at : null,
    ai_applied_at:
      typeof row.ai_applied_at === 'string' ? row.ai_applied_at : null,
  };
}

async function fetchFeedbackById(feedbackId: string): Promise<FeedbackRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('id', feedbackId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapFeedbackRow(data as Record<string, unknown>) : null;
}

export async function listFeedbackForAdmin(options?: {
  status?: FeedbackStatus;
  aiReviewStatus?: FeedbackReviewStatus;
  limit?: number;
}): Promise<FeedbackRow[]> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  let query = supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.aiReviewStatus) {
    query = query.eq('ai_review_status', options.aiReviewStatus);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => mapFeedbackRow(row as Record<string, unknown>));
}

export async function getFeedbackCounts(): Promise<{
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
  archived: number;
  aiPending: number;
  aiReviewed: number;
  aiApproved: number;
  aiRejected: number;
  aiApplied: number;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_feedback')
    .select('status, ai_review_status');

  if (error) {
    throw new Error(error.message);
  }

  const counts = {
    total: 0,
    new: 0,
    reviewed: 0,
    resolved: 0,
    archived: 0,
    aiPending: 0,
    aiReviewed: 0,
    aiApproved: 0,
    aiRejected: 0,
    aiApplied: 0,
  };

  for (const row of data || []) {
    counts.total++;
    const status = String(row.status || 'new') as FeedbackStatus;
    const aiStatus = normalizeReviewStatus(row.ai_review_status);

    if (status in counts) {
      counts[status as 'new' | 'reviewed' | 'resolved' | 'archived']++;
    }

    if (aiStatus === 'pending') counts.aiPending++;
    if (aiStatus === 'reviewed') counts.aiReviewed++;
    if (aiStatus === 'approved') counts.aiApproved++;
    if (aiStatus === 'rejected') counts.aiRejected++;
    if (aiStatus === 'applied') counts.aiApplied++;
  }

  return counts;
}

export async function getPendingFeedbackIds(limit = 20): Promise<string[]> {
  const supabase = getSupabase();
  const cappedLimit = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await supabase
    .from('user_feedback')
    .select('id')
    .eq('status', 'new')
    .in('ai_review_status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(cappedLimit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => String(row.id));
}

async function analyzeFeedbackWithAI(
  feedback: FeedbackRow,
): Promise<{
  result: FeedbackAutopilotResult;
  provider: string;
  model: string;
}> {
  const systemPrompt = `You are the Nepal Republic feedback autopilot.
Review product feedback from citizens and decide if it is useful, valid, and actionable.

Rules:
- Be practical. This is an early-stage solo product, so prioritize clear, specific feedback.
- "Validity" means internal credibility and plausibility, not certainty that the user is objectively correct.
- "Usefulness" means whether the feedback helps improve product quality, trust, usability, or data accuracy.
- "Actionability" means whether an operator or engineer could do something concrete next.
- Do not claim code changes were applied. You are only reviewing and proposing actions.
- For vague, emotional, or duplicate feedback, prefer "clarify" or "ignore" instead of forcing a fix.
- For content/copy/data issues, prefer "content_update" or "investigate".
- For product defects, prefer "bug_fix".
- For suggestions that should go into the backlog, prefer "feature_request".

Respond in JSON only:
{
  "summary": "one short paragraph",
  "usefulnessScore": 0.0,
  "validityScore": 0.0,
  "actionabilityScore": 0.0,
  "confidence": 0.0,
  "priority": "low|medium|high",
  "recommendation": "ignore|clarify|content_update|bug_fix|feature_request|investigate",
  "proposedActions": [
    {
      "type": "archive_feedback|request_clarification|review_content|queue_bug_fix|queue_feature|investigate_issue",
      "target": "short target label",
      "summary": "specific next action",
      "requiresApproval": true,
      "confidence": 0.0
    }
  ],
  "handoffPrompt": "a concise operator prompt describing the change or investigation to run next"
}`;

  const userPrompt = `Review this Nepal Republic feedback:

Type: ${feedback.feedback_type}
Rating: ${feedback.rating ?? 'not provided'}
Page context: ${feedback.page_context || 'not provided'}
Status: ${feedback.status}
Message:
${feedback.message}

Admin notes so far:
${feedback.admin_notes || 'none'}

Evaluate it for a small solo operator workflow.`;

  const response = await aiComplete('reason', systemPrompt, userPrompt);
  const parsed = parseJSON<FeedbackAutopilotResult>(response.content);

  if (!parsed) {
    throw new Error('Failed to parse feedback autopilot response');
  }

  return {
    result: {
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : feedback.message.slice(0, 240),
      usefulnessScore: normalizeScore(parsed.usefulnessScore, 0.5),
      validityScore: normalizeScore(parsed.validityScore, 0.5),
      actionabilityScore: normalizeScore(parsed.actionabilityScore, 0.5),
      confidence: normalizeScore(parsed.confidence, 0.5),
      priority: normalizePriority(parsed.priority),
      recommendation: normalizeRecommendation(parsed.recommendation),
      proposedActions: normalizeProposedActions(parsed.proposedActions),
      handoffPrompt:
        typeof parsed.handoffPrompt === 'string'
          ? parsed.handoffPrompt.trim()
          : '',
    },
    provider: response.provider,
    model: response.model,
  };
}

export async function reviewFeedbackItem(
  feedbackId: string,
): Promise<FeedbackRow> {
  const supabase = getSupabase();
  const feedback = await fetchFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error(`Feedback ${feedbackId} not found`);
  }

  const analyzed = await analyzeFeedbackWithAI(feedback);

  const { data, error } = await supabase
    .from('user_feedback')
    .update({
      ai_summary: analyzed.result.summary,
      ai_confidence: analyzed.result.confidence,
      ai_usefulness_score: analyzed.result.usefulnessScore,
      ai_validity_score: analyzed.result.validityScore,
      ai_actionability_score: analyzed.result.actionabilityScore,
      ai_priority: analyzed.result.priority,
      ai_recommendation: analyzed.result.recommendation,
      ai_review_status: 'reviewed',
      ai_proposed_actions: analyzed.result.proposedActions,
      ai_handoff_prompt: analyzed.result.handoffPrompt,
      ai_review_provider: analyzed.provider,
      ai_review_model: analyzed.model,
      ai_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to update feedback ${feedbackId}`);
  }

  return mapFeedbackRow(data as Record<string, unknown>);
}

export async function runFeedbackAutopilot(limit = 10): Promise<FeedbackRow[]> {
  const ids = await getPendingFeedbackIds(limit);
  const reviewed: FeedbackRow[] = [];

  for (const id of ids) {
    reviewed.push(await reviewFeedbackItem(id));
  }

  return reviewed;
}

export async function approveFeedbackReview(
  feedbackId: string,
  reviewer = 'admin',
  notes?: string | null,
): Promise<FeedbackRow> {
  const supabase = getSupabase();
  const feedback = await fetchFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error(`Feedback ${feedbackId} not found`);
  }

  const { data, error } = await supabase
    .from('user_feedback')
    .update({
      ai_review_status: 'approved',
      ai_approved_at: new Date().toISOString(),
      status: feedback.status === 'new' ? 'reviewed' : feedback.status,
      admin_notes: notes
        ? buildAdminNotesAppendix(
            feedback.admin_notes,
            `Approved by ${reviewer}`,
            notes,
          )
        : feedback.admin_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to approve feedback ${feedbackId}`);
  }

  return mapFeedbackRow(data as Record<string, unknown>);
}

export async function rejectFeedbackReview(
  feedbackId: string,
  reviewer = 'admin',
  notes?: string | null,
): Promise<FeedbackRow> {
  const supabase = getSupabase();
  const feedback = await fetchFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error(`Feedback ${feedbackId} not found`);
  }

  const { data, error } = await supabase
    .from('user_feedback')
    .update({
      ai_review_status: 'rejected',
      admin_notes: notes
        ? buildAdminNotesAppendix(
            feedback.admin_notes,
            `Rejected by ${reviewer}`,
            notes,
          )
        : feedback.admin_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to reject feedback ${feedbackId}`);
  }

  return mapFeedbackRow(data as Record<string, unknown>);
}

export async function applyFeedbackAutopilotDecision(
  feedbackId: string,
  reviewer = 'admin',
): Promise<FeedbackRow> {
  const supabase = getSupabase();
  const feedback = await fetchFeedbackById(feedbackId);
  if (!feedback) {
    throw new Error(`Feedback ${feedbackId} not found`);
  }

  if (feedback.ai_review_status !== 'approved') {
    throw new Error('Feedback must be approved before applying the autopilot decision');
  }

  let nextStatus: FeedbackStatus = feedback.status;
  if (feedback.ai_recommendation === 'ignore') {
    nextStatus = 'archived';
  } else if (feedback.status === 'new') {
    nextStatus = 'reviewed';
  }

  const noteLines: string[] = [];
  if (feedback.ai_summary) {
    noteLines.push(`Autopilot summary: ${feedback.ai_summary}`);
  }
  if (feedback.ai_handoff_prompt) {
    noteLines.push(`Autopilot handoff: ${feedback.ai_handoff_prompt}`);
  }

  const { data, error } = await supabase
    .from('user_feedback')
    .update({
      ai_review_status: 'applied',
      ai_applied_at: new Date().toISOString(),
      status: nextStatus,
      admin_notes:
        noteLines.length > 0
          ? buildAdminNotesAppendix(
              feedback.admin_notes,
              `Autopilot applied by ${reviewer}`,
              noteLines.join('\n'),
            )
          : feedback.admin_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to apply feedback ${feedbackId}`);
  }

  return mapFeedbackRow(data as Record<string, unknown>);
}
