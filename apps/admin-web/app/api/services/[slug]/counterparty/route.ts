import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Public endpoint: returns the mapped counterparty + route for a service slug.
 * Used by the service detail page to show "who handles this" and integration mode.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const db = getSupabase();

  const { data: routes, error } = await db
    .from('service_counterparty_routes')
    .select(`
      id,
      service_slug,
      submission_mode,
      response_capture_mode,
      office_name,
      geography_scope,
      is_primary,
      required_human_review,
      supports_document_exchange,
      supports_status_updates,
      supports_payment_confirmation,
      sla_target_hours,
      escalation_policy,
      auto_follow_up,
      metadata,
      counterparty:service_counterparties(
        id, key, name, name_ne, kind, authority_level,
        jurisdiction_scope, adoption_stage,
        contact_email, contact_phone
      )
    `)
    .eq('service_slug', params.slug)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const primary = (routes || []).find((r: any) => r.is_primary) || (routes || [])[0] || null;

  return NextResponse.json({
    routes: routes || [],
    primary,
  });
}
