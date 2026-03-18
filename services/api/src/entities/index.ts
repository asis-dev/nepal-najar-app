// Identity
export { User } from './user.entity';
export { Role } from './role.entity';
export { Permission } from './permission.entity';
export { UserRole } from './user-role.entity';
export { RolePermission } from './role-permission.entity';

// Organization
export { Region } from './region.entity';
export { GovernmentUnit } from './government-unit.entity';
export { GovernmentUnitMember } from './government-unit-member.entity';

// Delivery
export { Project } from './project.entity';
export { ProjectVersion } from './project-version.entity';
export { ProjectMilestone } from './project-milestone.entity';
export { MilestoneVersion } from './milestone-version.entity';
export { ProjectTask } from './project-task.entity';
export { TaskDependency } from './task-dependency.entity';
export { ProjectBlocker } from './project-blocker.entity';
export { EscalationRecord } from './escalation-record.entity';

// Finance
export { ProjectBudgetRecord } from './project-budget-record.entity';
export { FundingSource } from './funding-source.entity';
export { Contractor } from './contractor.entity';
export { ProjectContractor } from './project-contractor.entity';

// Evidence & Updates
export { EvidenceAttachment } from './evidence-attachment.entity';
export { EvidenceReview } from './evidence-review.entity';
export { ProjectUpdate } from './project-update.entity';

// Validation & Intelligence
export { CitizenReport } from './citizen-report.entity';
export { ExternalFinding } from './external-finding.entity';
export { ResearchJob } from './research-job.entity';
export { ResearchFinding } from './research-finding.entity';
export { VerificationRequest } from './verification-request.entity';
export { VerificationResponse } from './verification-response.entity';
export { ConfidenceAssessment } from './confidence-assessment.entity';
export { AnomalyFlag } from './anomaly-flag.entity';
export { PotentialProject } from './potential-project.entity';

// Interaction
export { Watchlist } from './watchlist.entity';
export { Notification } from './notification.entity';

// Audit
export { AuditLog } from './audit-log.entity';
