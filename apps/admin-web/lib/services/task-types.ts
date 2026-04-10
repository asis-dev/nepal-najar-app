import type { ServiceCategory } from './types';
import type { VaultDocType } from '@/lib/vault/types';
import type { WorkflowAction, WorkflowMode } from './workflow-definitions';

export interface AssistantTaskIntake {
  domain?: 'health' | 'utilities' | 'license' | 'citizenship' | 'passport' | 'general';
  subject?: 'self' | 'parent' | 'child' | 'family' | 'unknown';
  urgency?: 'today' | 'soon' | 'routine' | 'unknown';
  care_need?: 'same_day' | 'specialist' | 'admission' | 'booking' | 'general' | 'unknown';
  health?: {
    hospitalHint?: 'bir' | 'tuth' | 'patan' | 'civil' | 'kanti' | 'maternity' | 'unknown';
    specialtyHint?: 'general' | 'pediatric' | 'maternity' | 'specialist' | 'unknown';
    visitGoal?: 'same_day' | 'specialist' | 'admission' | 'booking' | 'unknown';
  };
  utilities?: {
    provider?: 'nea' | 'kukl' | 'unknown';
    amountKnown?: boolean;
    accountKnown?: boolean;
  };
  license?: {
    intent?: 'renewal' | 'new' | 'trial' | 'unknown';
  };
  citizenship?: {
    intent?: 'descent' | 'birth' | 'duplicate' | 'unknown';
  };
  passport?: {
    intent?: 'new' | 'renewal' | 'tracking' | 'unknown';
  };
}

export interface UtilityLookupSnapshot {
  provider_key?: 'nea' | 'kukl';
  source?: 'manual' | 'ocr' | 'live';
  customer_id?: string | null;
  service_office?: string | null;
  branch?: string | null;
  due_amount_npr?: number | null;
  official_lookup_url?: string | null;
  scan_meta?: Record<string, unknown> | null;
  saved_at?: string | null;
}

export interface ServiceFormSnapshot {
  serviceSlug?: string | null;
  formKey?: string | null;
  data?: Record<string, unknown>;
  submitted?: boolean;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

export interface TaskResolutionPlan {
  status: 'needs_citizen' | 'needs_department' | 'needs_provider' | 'resolved';
  headline: string;
  citizenAction: string;
  departmentAction: string;
  providerAction: string;
  blockers: string[];
  citizenContext?: string | null;
}

export type ServiceTaskStatus =
  | 'intake'
  | 'collecting_docs'
  | 'ready'
  | 'in_progress'
  | 'booked'
  | 'submitted'
  | 'completed'
  | 'blocked';

export interface ServiceTaskDocStatus {
  docType: VaultDocType;
  label: string;
  haveIt: boolean;
}

export interface ServiceTaskRecord {
  id: string;
  ownerId: string;
  targetMemberId?: string | null;
  targetMemberName?: string | null;
  serviceSlug: string;
  serviceTitle: string;
  serviceCategory: ServiceCategory;
  locale: 'en' | 'ne';
  status: ServiceTaskStatus;
  progress: number;
  currentStep: number;
  totalSteps: number;
  summary?: string;
  nextAction?: string;
  missingDocs: ServiceTaskDocStatus[];
  readyDocs: ServiceTaskDocStatus[];
  notes?: string;
  workflowMode: WorkflowMode;
  requiresAppointment: boolean;
  supportsOnlinePayment: boolean;
  officeVisitRequired: boolean;
  milestones: string[];
  actions: WorkflowAction[];
  actionState: Record<string, { completed: boolean; value?: string; completedAt?: string }>;
  assignedDepartmentKey?: string | null;
  assignedDepartmentName?: string | null;
  assignedOfficeName?: string | null;
  assignedAuthorityLevel?: string | null;
  assignedRoleTitle?: string | null;
  routingReason?: string | null;
  routingConfidence?: number | null;
  queueState?: string | null;
  waitingOnParty?: string | null;
  assistantIntake?: AssistantTaskIntake | null;
  utilityLookup?: UtilityLookupSnapshot | null;
  serviceForm?: ServiceFormSnapshot | null;
  resolutionPlan?: TaskResolutionPlan | null;
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
