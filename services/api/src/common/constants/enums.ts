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

export enum EscalationStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum BudgetRecordType {
  ALLOCATION = 'allocation',
  RELEASE = 'release',
  EXPENDITURE = 'expenditure',
  ADJUSTMENT = 'adjustment',
}

export enum EvidenceSourceType {
  OFFICIAL_UPLOAD = 'official_upload',
  CITIZEN_UPLOAD = 'citizen_upload',
  VERIFIER_UPLOAD = 'verifier_upload',
  SYSTEM_CAPTURE = 'system_capture',
}

export enum EvidenceVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export enum UpdateType {
  PROGRESS = 'progress',
  MILESTONE = 'milestone',
  BLOCKER = 'blocker',
  BUDGET = 'budget',
  GENERAL = 'general',
  OFFICIAL_STATEMENT = 'official_statement',
}

export enum UpdateVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  LEADERSHIP = 'leadership',
}

export enum CitizenReportType {
  OBSERVATION = 'observation',
  COMPLAINT = 'complaint',
  CORRECTION = 'correction',
  PRAISE = 'praise',
}

export enum CitizenReportStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
}

export enum VerificationStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  REVIEWED = 'reviewed',
  EXPIRED = 'expired',
}

export enum AnomalyType {
  BUDGET_MISMATCH = 'budget_mismatch',
  PROGRESS_JUMP = 'progress_jump',
  STALE_NO_UPDATE = 'stale_no_update',
  CONTRADICTED_CLAIM = 'contradicted_claim',
  MISSING_EVIDENCE = 'missing_evidence',
  SUSPICIOUS_TIMELINE = 'suspicious_timeline',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ConfidenceRating {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NEEDS_VERIFICATION = 'needs_verification',
}

export enum ValidationState {
  UNVERIFIED = 'unverified',
  PARTIALLY_VERIFIED = 'partially_verified',
  VERIFIED = 'verified',
  DISPUTED = 'disputed',
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

export enum ResearchJobType {
  SOURCE_SCAN = 'source_scan',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  DISCOVERY = 'discovery',
  ANOMALY_CHECK = 'anomaly_check',
}

export enum ResearchJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
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

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
}

export enum FundingSourceType {
  GOVERNMENT = 'government',
  FOREIGN_AID = 'foreign_aid',
  LOAN = 'loan',
  PPP = 'public_private_partnership',
  NGO = 'ngo',
  OTHER = 'other',
}

export enum PublicVisibility {
  PUBLIC = 'public',
  RESTRICTED = 'restricted',
  INTERNAL = 'internal',
}

export enum ExternalFindingClassification {
  CONFIRMS = 'confirms',
  CONTRADICTS = 'contradicts',
  NEUTRAL = 'neutral',
  UNRELATED = 'unrelated',
}
