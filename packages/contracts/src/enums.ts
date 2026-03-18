// Shared enums — single source of truth for API + Admin Web + Mobile

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum BlockerSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum BlockerStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

export enum BlockerType {
  FUNDING = 'funding',
  REGULATORY = 'regulatory',
  TECHNICAL = 'technical',
  POLITICAL = 'political',
  ENVIRONMENTAL = 'environmental',
  LAND_ACQUISITION = 'land_acquisition',
  CONTRACTOR = 'contractor',
  SUPPLY_CHAIN = 'supply_chain',
  COMMUNITY = 'community',
  OTHER = 'other',
}

export enum ConfidenceRating {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NEEDS_VERIFICATION = 'needs_verification',
}

export enum UserRole {
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  PROJECT_OFFICER = 'project_officer',
  BRANCH_MANAGER = 'branch_manager',
  DEPARTMENT_ADMIN = 'department_admin',
  MINISTRY_ADMIN = 'ministry_admin',
  NATIONAL_OVERSIGHT_ADMIN = 'national_oversight_admin',
  INDEPENDENT_VERIFIER = 'independent_verifier',
  SUPER_ADMIN = 'super_admin',
}

export enum GovernmentUnitType {
  MINISTRY = 'ministry',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  DIVISION = 'division',
  OFFICE = 'office',
}

export enum RegionType {
  COUNTRY = 'country',
  PROVINCE = 'province',
  DISTRICT = 'district',
  MUNICIPALITY = 'municipality',
  WARD = 'ward',
}

export enum BudgetRecordType {
  ALLOCATION = 'allocation',
  RELEASE = 'release',
  EXPENDITURE = 'expenditure',
  ADJUSTMENT = 'adjustment',
}

export enum ValidationState {
  UNVERIFIED = 'unverified',
  PARTIALLY_VERIFIED = 'partially_verified',
  VERIFIED = 'verified',
  DISPUTED = 'disputed',
}

export enum CitizenReportType {
  OBSERVATION = 'observation',
  COMPLAINT = 'complaint',
  CORRECTION = 'correction',
  PRAISE = 'praise',
}

export enum AnomalyType {
  BUDGET_MISMATCH = 'budget_mismatch',
  PROGRESS_JUMP = 'progress_jump',
  STALE_NO_UPDATE = 'stale_no_update',
  CONTRADICTED_CLAIM = 'contradicted_claim',
  MISSING_EVIDENCE = 'missing_evidence',
  SUSPICIOUS_TIMELINE = 'suspicious_timeline',
}

export enum NotificationType {
  PROJECT_UPDATE = 'project_update',
  BLOCKER_ALERT = 'blocker_alert',
  ESCALATION = 'escalation',
  VERIFICATION_REQUEST = 'verification_request',
  ANOMALY_DETECTED = 'anomaly_detected',
  DIGEST = 'digest',
  SYSTEM = 'system',
}
