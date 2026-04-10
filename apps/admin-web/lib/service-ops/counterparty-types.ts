export type CounterpartyKind = 'government' | 'public_institution' | 'private_institution' | 'provider' | 'partner';
export type CounterpartyAdoptionStage = 'identified' | 'outreach' | 'pilot' | 'active' | 'blocked';
export type CounterpartyChannelType = 'api' | 'portal' | 'inbox' | 'email' | 'phone' | 'physical' | 'webhook';
export type CounterpartyDirection = 'outbound' | 'inbound' | 'bidirectional';
export type CounterpartySubmissionMode =
  | 'direct_api'
  | 'portal_assisted'
  | 'department_inbox'
  | 'human_bridge'
  | 'document_exchange'
  | 'manual';

export const COUNTERPARTY_STAGE_LABELS: Record<CounterpartyAdoptionStage, string> = {
  identified: 'Identified',
  outreach: 'Outreach',
  pilot: 'Pilot',
  active: 'Active',
  blocked: 'Blocked',
};

export const COUNTERPARTY_MODE_LABELS: Record<CounterpartySubmissionMode, string> = {
  direct_api: 'Direct API',
  portal_assisted: 'Portal-assisted',
  department_inbox: 'Department inbox',
  human_bridge: 'Human bridge',
  document_exchange: 'Document exchange',
  manual: 'Manual',
};
