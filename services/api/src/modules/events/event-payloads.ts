/**
 * Type-safe event payload interfaces for all domain events.
 * Each interface corresponds to an event in DomainEvents constants.
 */

// ── User Events ──────────────────────────────────────────────

export interface UserCreatedEvent {
  userId: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  timestamp: Date;
}

export interface RoleAssignedEvent {
  userId: string;
  roleId: string;
  roleName: string;
  governmentUnitId: string | null;
  assignedBy: string;
  timestamp: Date;
}

// ── Organization Events ──────────────────────────────────────

export interface GovernmentUnitCreatedEvent {
  governmentUnitId: string;
  name: string;
  type: string;
  parentId: string | null;
  createdBy: string;
  timestamp: Date;
}

export interface GovernmentUnitUpdatedEvent {
  governmentUnitId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  updatedBy: string;
  timestamp: Date;
}

// ── Project Events ───────────────────────────────────────────

export interface ProjectCreatedEvent {
  projectId: string;
  title: string;
  governmentUnitId: string;
  createdBy: string;
  timestamp: Date;
}

export interface ProjectUpdatedEvent {
  projectId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  updatedBy: string;
  timestamp: Date;
}

export interface ProjectStatusChangedEvent {
  projectId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: Date;
}

// ── Milestone Events ─────────────────────────────────────────

export interface MilestoneCreatedEvent {
  milestoneId: string;
  projectId: string;
  title: string;
  createdBy: string;
  timestamp: Date;
}

export interface MilestoneCompletedEvent {
  milestoneId: string;
  projectId: string;
  completedBy: string;
  timestamp: Date;
}

export interface MilestoneBlockedEvent {
  milestoneId: string;
  projectId: string;
  blockerId: string;
  timestamp: Date;
}

// ── Task Events ──────────────────────────────────────────────

export interface TaskCreatedEvent {
  taskId: string;
  projectId: string;
  milestoneId: string | null;
  title: string;
  createdBy: string;
  timestamp: Date;
}

export interface TaskAssignedEvent {
  taskId: string;
  projectId: string;
  assigneeId: string;
  assignedBy: string;
  timestamp: Date;
}

export interface TaskCompletedEvent {
  taskId: string;
  projectId: string;
  completedBy: string;
  timestamp: Date;
}

// ── Blocker Events ───────────────────────────────────────────

export interface BlockerOpenedEvent {
  blockerId: string;
  projectId: string;
  blockerType: string;
  severity: string;
  reportedBy: string;
  timestamp: Date;
}

export interface BlockerUpdatedEvent {
  blockerId: string;
  projectId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  updatedBy: string;
  timestamp: Date;
}

export interface BlockerResolvedEvent {
  blockerId: string;
  projectId: string;
  resolvedBy: string;
  resolutionNote: string | null;
  timestamp: Date;
}

export interface BlockerEscalatedEvent {
  blockerId: string;
  projectId: string;
  escalatedTo: string;
  escalatedBy: string;
  timestamp: Date;
}

// ── Budget Events ────────────────────────────────────────────

export interface BudgetRecordAddedEvent {
  recordId: string;
  projectId: string;
  recordType: string;
  amount: number;
  currency: string;
  createdBy: string;
  timestamp: Date;
}

// ── Evidence Events ──────────────────────────────────────────

export interface EvidenceAttachedEvent {
  evidenceId: string;
  projectId: string | null;
  milestoneId: string | null;
  fileType: string;
  uploadedBy: string;
  timestamp: Date;
}

// ── Update Events ────────────────────────────────────────────

export interface ProjectUpdatePostedEvent {
  updateId: string;
  projectId: string;
  updateType: string;
  visibility: string;
  postedBy: string;
  timestamp: Date;
}

// ── Validation Events ────────────────────────────────────────

export interface CitizenReportSubmittedEvent {
  reportId: string;
  projectId: string;
  reportType: string;
  submittedBy: string;
  timestamp: Date;
}

export interface VerificationRequestedEvent {
  verificationId: string;
  projectId: string;
  requestedBy: string;
  timestamp: Date;
}

export interface VerificationRespondedEvent {
  verificationId: string;
  projectId: string;
  respondedBy: string;
  timestamp: Date;
}

// ── Intelligence Events ──────────────────────────────────────

export interface AnomalyFlaggedEvent {
  anomalyId: string;
  projectId: string;
  anomalyType: string;
  severity: string;
  timestamp: Date;
}

export interface ConfidenceRecomputedEvent {
  projectId: string;
  previousRating: string;
  newRating: string;
  timestamp: Date;
}

export interface PotentialProjectDiscoveredEvent {
  potentialProjectId: string;
  sourceUrl: string | null;
  title: string;
  timestamp: Date;
}

// ── Event payload map (for type-safe emit/listen) ────────────

export interface DomainEventMap {
  'user.created': UserCreatedEvent;
  'role.assigned': RoleAssignedEvent;
  'government_unit.created': GovernmentUnitCreatedEvent;
  'government_unit.updated': GovernmentUnitUpdatedEvent;
  'project.created': ProjectCreatedEvent;
  'project.updated': ProjectUpdatedEvent;
  'project.status_changed': ProjectStatusChangedEvent;
  'milestone.created': MilestoneCreatedEvent;
  'milestone.completed': MilestoneCompletedEvent;
  'milestone.blocked': MilestoneBlockedEvent;
  'task.created': TaskCreatedEvent;
  'task.assigned': TaskAssignedEvent;
  'task.completed': TaskCompletedEvent;
  'blocker.opened': BlockerOpenedEvent;
  'blocker.updated': BlockerUpdatedEvent;
  'blocker.resolved': BlockerResolvedEvent;
  'blocker.escalated': BlockerEscalatedEvent;
  'budget.record_added': BudgetRecordAddedEvent;
  'evidence.attached': EvidenceAttachedEvent;
  'project.update_posted': ProjectUpdatePostedEvent;
  'citizen_report.submitted': CitizenReportSubmittedEvent;
  'verification.requested': VerificationRequestedEvent;
  'verification.responded': VerificationRespondedEvent;
  'anomaly.flagged': AnomalyFlaggedEvent;
  'confidence.recomputed': ConfidenceRecomputedEvent;
  'potential_project.discovered': PotentialProjectDiscoveredEvent;
}
