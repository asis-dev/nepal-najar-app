import { getSupabase } from '@/lib/supabase/server';

export async function resolveServiceCounterpartyRoute(
  serviceSlug: string,
  departmentKey?: string | null,
) {
  const db = getSupabase();
  let query = db
    .from('service_counterparty_routes')
    .select(`
      *,
      counterparty:service_counterparties(*)
    `)
    .eq('service_slug', serviceSlug)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('priority', { ascending: false })
    .limit(10);

  if (departmentKey) query = query.eq('department_key', departmentKey);

  const { data, error } = await query;
  if (error) return null;
  const rows = data || [];
  if (rows.length === 0) return null;

  if (departmentKey) {
    return rows[0] || null;
  }

  if (rows.length === 1) return rows[0];

  const primaryRows = rows.filter((row: any) => row.is_primary);
  if (primaryRows.length === 1) return primaryRows[0];

  const distinctCounterparties = new Set(rows.map((row: any) => row.counterparty_id).filter(Boolean));
  if (distinctCounterparties.size > 1) {
    return null;
  }

  return rows[0] || null;
}
