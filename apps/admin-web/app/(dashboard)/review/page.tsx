import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const supabase = getSupabase();

  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id,title,source_id,relevance_score,confidence,classification,matched_promise_ids,review_status,review_required,discovered_at')
    .eq('review_required', true)
    .order('discovered_at', { ascending: false })
    .limit(100);

  const items = signals || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Review Queue</h1>
        <p className="text-sm text-gray-400 mt-1">
          Signals flagged for human review (low confidence, medium relevance, or broad multi-match).
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm text-gray-300">
          Total pending review: <span className="font-semibold text-white">{items.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((signal) => (
          <div key={signal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white font-medium">{signal.title}</h2>
                <p className="text-xs text-gray-500 mt-1">{signal.source_id} • {new Date(signal.discovered_at).toLocaleString()}</p>
              </div>
              <span className="text-xs uppercase rounded-full px-2 py-1 border border-amber-500/30 bg-amber-500/10 text-amber-300">
                {signal.review_status || 'pending'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-black/20 px-2 py-1 text-gray-300">Class: <span className="text-white">{signal.classification || 'neutral'}</span></div>
              <div className="rounded-lg bg-black/20 px-2 py-1 text-gray-300">Confidence: <span className="text-white">{typeof signal.confidence === 'number' ? signal.confidence.toFixed(2) : '0.00'}</span></div>
              <div className="rounded-lg bg-black/20 px-2 py-1 text-gray-300">Relevance: <span className="text-white">{typeof signal.relevance_score === 'number' ? signal.relevance_score.toFixed(2) : '0.00'}</span></div>
              <div className="rounded-lg bg-black/20 px-2 py-1 text-gray-300">Promise IDs: <span className="text-white">{(signal.matched_promise_ids || []).join(', ') || 'none'}</span></div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
            Nothing needs review right now.
          </div>
        )}
      </div>
    </div>
  );
}
