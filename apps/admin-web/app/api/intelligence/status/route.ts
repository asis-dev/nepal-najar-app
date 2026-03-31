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

  const { count: tier1Processed } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true })
    .eq('tier1_processed', true);

  const [pendingJobs, runningJobs, failedJobs] = await Promise.all([
    supabase
      .from('intelligence_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('job_type', 'process_signals_batch')
      .eq('status', 'pending'),
    supabase
      .from('intelligence_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('job_type', 'process_signals_batch')
      .eq('status', 'running'),
    supabase
      .from('intelligence_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('job_type', 'process_signals_batch')
      .eq('status', 'failed'),
  ]);

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
      tier1Processed: tier1Processed || 0,
      relevant: relevantSignals || 0,
      unprocessed: unprocessed || 0,
    },
    jobs: {
      processSignalsBatch: {
        pending: pendingJobs.count || 0,
        running: runningJobs.count || 0,
        failed: failedJobs.count || 0,
      },
    },
    sources: sources || [],
  });
}
