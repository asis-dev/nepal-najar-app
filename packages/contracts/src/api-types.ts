// Shared API response and request types

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ─── Project DTOs ───

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  priority: string;
  government_unit_name: string;
  region_name: string | null;
  current_progress_percent: number;
  validation_state: string;
  confidence_rating: string | null;
  open_blockers_count: number;
  last_official_update_at: string | null;
  start_date: string | null;
  target_end_date: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  government_unit_id: string;
  region_id: string | null;
  actual_end_date: string | null;
  public_visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  milestones: MilestoneSummary[];
  blockers: BlockerSummary[];
  budget_summary: BudgetSummary | null;
}

export interface MilestoneSummary {
  id: string;
  title: string;
  sequence_number: number;
  weight_percent: number;
  status: string;
  due_date: string | null;
  completion_date: string | null;
  requires_evidence: boolean;
}

export interface BlockerSummary {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  escalation_level: number;
  opened_at: string;
  expected_resolution_date: string | null;
  owner_unit_name: string;
}

export interface BudgetSummary {
  total_allocated: number;
  total_released: number;
  total_spent: number;
  currency: string;
}

// ─── Dashboard DTOs ───

export interface NationalDashboard {
  total_active_projects: number;
  total_completed_projects: number;
  average_progress: number;
  delayed_percent: number;
  blocked_percent: number;
  total_open_blockers: number;
  top_blocker_categories: { type: string; count: number }[];
  ministry_summaries: MinistryDashboardSummary[];
}

export interface MinistryDashboardSummary {
  government_unit_id: string;
  name: string;
  active_projects: number;
  delayed_projects: number;
  blocked_projects: number;
  average_progress: number;
  total_budget_allocated: number;
}

export interface DistrictDashboard {
  region_id: string;
  region_name: string;
  active_projects: number;
  delayed_projects: number;
  recent_completions: number;
  citizen_report_count: number;
  projects: ProjectSummary[];
}

export interface MyAreaDashboard {
  region: { id: string; name: string; type: string };
  new_projects: ProjectSummary[];
  updated_projects: ProjectSummary[];
  delayed_projects: ProjectSummary[];
  local_alerts: AlertItem[];
}

export interface AlertItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

// ─── Confidence ───

export interface ConfidenceDetail {
  overall_score: number;
  official_signal_score: number;
  evidence_score: number;
  external_signal_score: number;
  citizen_signal_score: number;
  anomaly_penalty_score: number;
  rating: string;
  computed_at: string;
}
