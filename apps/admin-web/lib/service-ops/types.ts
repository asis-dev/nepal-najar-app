export type ServiceTaskQueueState =
  | 'new'
  | 'assigned'
  | 'in_review'
  | 'waiting_on_citizen'
  | 'waiting_on_provider'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type ServiceDepartmentMemberRole =
  | 'owner'
  | 'manager'
  | 'case_worker'
  | 'reviewer'
  | 'approver'
  | 'viewer';

export type ServiceTaskDecisionType =
  | 'accepted'
  | 'requested_info'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'transferred'
  | 'resolved'
  | 'closed';

export interface ServiceTaskOpsContext {
  userId: string;
  role: string | null;
  isElevated: boolean;
  departmentsScope: string[] | null;
}
