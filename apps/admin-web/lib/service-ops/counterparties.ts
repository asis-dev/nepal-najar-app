import { getSupabase } from '@/lib/supabase/server';

export type {
  CounterpartyKind,
  CounterpartyAdoptionStage,
  CounterpartyChannelType,
  CounterpartyDirection,
  CounterpartySubmissionMode,
} from './counterparty-types';
export { COUNTERPARTY_STAGE_LABELS, COUNTERPARTY_MODE_LABELS } from './counterparty-types';

export async function getCounterpartySummary() {
  const db = getSupabase();
  const [{ data: counterparties }, { data: routes }] = await Promise.all([
    db
      .from('service_counterparties')
      .select('id, adoption_stage, kind')
      .eq('is_active', true),
    db
      .from('service_counterparty_routes')
      .select('id, submission_mode, supports_status_updates, supports_payment_confirmation')
      .eq('is_active', true),
  ]);

  const counterpartyRows = counterparties || [];
  const routeRows = routes || [];

  return {
    counterparties_total: counterpartyRows.length,
    active_counterparties: counterpartyRows.filter((row: any) => row.adoption_stage === 'active').length,
    pilot_counterparties: counterpartyRows.filter((row: any) => row.adoption_stage === 'pilot').length,
    blocked_counterparties: counterpartyRows.filter((row: any) => row.adoption_stage === 'blocked').length,
    direct_api_routes: routeRows.filter((row: any) => row.submission_mode === 'direct_api').length,
    inbox_routes: routeRows.filter((row: any) => row.submission_mode === 'department_inbox').length,
    human_bridge_routes: routeRows.filter((row: any) => row.submission_mode === 'human_bridge').length,
    status_sync_routes: routeRows.filter((row: any) => row.supports_status_updates).length,
    payment_confirmation_routes: routeRows.filter((row: any) => row.supports_payment_confirmation).length,
  };
}
