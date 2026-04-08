export type ComplaintIssueType =
  | 'roads'
  | 'water'
  | 'electricity'
  | 'health'
  | 'education'
  | 'sanitation'
  | 'internet'
  | 'safety'
  | 'employment'
  | 'environment'
  | 'other';

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'submitted'
  | 'triaged'
  | 'routed'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'needs_info'
  | 'rejected'
  | 'duplicate'
  | 'reopened';

export interface ComplaintCase {
  id: string;
  user_id: string;
  title: string;
  title_ne: string | null;
  description: string;
  description_ne: string | null;
  raw_transcript: string | null;
  input_mode: 'text' | 'voice' | 'mixed';
  language: string;
  issue_type: ComplaintIssueType;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  trust_level: 'unverified' | 'partial' | 'verified' | 'disputed';
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward_number: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  department_key: string | null;
  assigned_department_key: string | null;
  assigned_user_id: string | null;
  sla_policy_key: string | null;
  sla_target_hours: number | null;
  sla_due_at: string | null;
  sla_breached_at: string | null;
  sla_paused_at: string | null;
  sla_pause_reason: string | null;
  sla_total_paused_minutes: number;
  department_response_at: string | null;
  first_acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  escalation_level: number;
  reopened_count: number;
  citizen_satisfaction: number | null;
  citizen_satisfaction_note: string | null;
  satisfaction_submitted_at: string | null;
  ai_route_confidence: number | null;
  ai_triage: Record<string, unknown> | null;
  duplicate_of: string | null;
  is_public: boolean;
  is_anonymous: boolean;
  follower_count: number;
  evidence_count: number;
  updates_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintAuthorityChainNode {
  id: string;
  complaint_id: string;
  node_order: number;
  node_type: 'primary_authority' | 'department_head' | 'ministry' | 'minister' | 'oversight';
  authority_level: 'local' | 'district' | 'provincial' | 'federal' | 'ministry' | 'national';
  department_key: string | null;
  authority_name: string;
  authority_name_ne: string | null;
  office: string | null;
  office_ne: string | null;
  ministry_slug: string | null;
  minister_slug: string | null;
  official_name: string | null;
  official_title: string | null;
  facebook_url: string | null;
  confidence: number | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintAssignment {
  id: string;
  complaint_id: string;
  department_key: string;
  assignee_user_id: string | null;
  assigned_by: string | null;
  assignment_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  released_at: string | null;
}

export interface ComplaintEscalation {
  id: string;
  complaint_id: string;
  from_department_key: string | null;
  to_department_key: string;
  trigger_type: 'manual' | 'sla_breach' | 'stale' | 'review';
  reason: string;
  created_by: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface ComplaintSlaPolicy {
  key: string;
  label: string;
  issue_type: ComplaintIssueType | null;
  severity: ComplaintSeverity | null;
  department_key: string | null;
  ack_hours: number;
  resolve_hours: number;
  escalation_hours: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplaintEvent {
  id: string;
  complaint_id: string;
  actor_id: string | null;
  actor_type: 'citizen' | 'ai' | 'admin' | 'official' | 'system';
  event_type:
    | 'submitted'
    | 'triaged'
    | 'routed'
    | 'status_change'
    | 'acknowledged'
    | 'citizen_update'
    | 'official_update'
    | 'evidence_added'
    | 'needs_info'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'duplicate_marked';
  visibility: 'public' | 'internal';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ComplaintEvidence {
  id: string;
  complaint_id: string;
  user_id: string;
  evidence_type: 'photo' | 'video' | 'audio' | 'document' | 'link' | 'text';
  media_urls: string[];
  source_url: string | null;
  note: string | null;
  note_ne: string | null;
  language: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}
