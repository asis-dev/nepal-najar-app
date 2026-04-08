import type { ServiceCategory } from './types';
import type { VaultDocType } from '@/lib/vault/types';
import type { WorkflowAction, WorkflowMode } from './workflow-definitions';

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
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
