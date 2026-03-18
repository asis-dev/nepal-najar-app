export const DomainEvents = {
  // User events
  USER_CREATED: 'user.created',
  ROLE_ASSIGNED: 'role.assigned',

  // Organization events
  GOVERNMENT_UNIT_CREATED: 'government_unit.created',
  GOVERNMENT_UNIT_UPDATED: 'government_unit.updated',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_STATUS_CHANGED: 'project.status_changed',

  // Milestone events
  MILESTONE_CREATED: 'milestone.created',
  MILESTONE_COMPLETED: 'milestone.completed',
  MILESTONE_BLOCKED: 'milestone.blocked',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',

  // Blocker events
  BLOCKER_OPENED: 'blocker.opened',
  BLOCKER_UPDATED: 'blocker.updated',
  BLOCKER_RESOLVED: 'blocker.resolved',
  BLOCKER_ESCALATED: 'blocker.escalated',

  // Budget events
  BUDGET_RECORD_ADDED: 'budget.record_added',

  // Evidence events
  EVIDENCE_ATTACHED: 'evidence.attached',

  // Update events
  PROJECT_UPDATE_POSTED: 'project.update_posted',

  // Validation events
  CITIZEN_REPORT_SUBMITTED: 'citizen_report.submitted',
  VERIFICATION_REQUESTED: 'verification.requested',
  VERIFICATION_RESPONDED: 'verification.responded',

  // Intelligence events
  ANOMALY_FLAGGED: 'anomaly.flagged',
  CONFIDENCE_RECOMPUTED: 'confidence.recomputed',
  POTENTIAL_PROJECT_DISCOVERED: 'potential_project.discovered',
} as const;
