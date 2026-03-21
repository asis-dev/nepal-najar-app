import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabase();

  // Get latest sweeps
  const { data: sweeps } = await supabase
    .from('intelligence_sweeps')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  // Get signal counts
  const { count: totalSignals } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true });

  const { count: relevantSignals } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true })
    .gte('relevance_score', 0.3);

  const { count: unprocessed } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true })
    .eq('tier1_processed', false);

  // Get source health
  const { data: sources } = await supabase
    .from('intelligence_sources')
    .select(
      'id, name, source_type, last_checked_at, consecutive_failures, total_signals, is_active',
    )
    .order('last_checked_at', { ascending: false });

  return NextResponse.json({
    sweeps: sweeps || [],
    signals: {
      total: totalSignals || 0,
      relevant: relevantSignals || 0,
      unprocessed: unprocessed || 0,
    },
    sources: sources || [],
  });
}
