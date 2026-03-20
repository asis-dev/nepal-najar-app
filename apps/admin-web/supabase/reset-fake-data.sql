-- ============================================================
-- SCORCHED EARTH: Reset all fabricated data in promises table
-- Run this ONCE against production Supabase to nuke fake numbers.
-- Keeps: titles, descriptions, categories, slugs (real RSP data)
-- Zeros: progress, evidence, budget, status, trust (all fabricated)
-- ============================================================

UPDATE promises SET
  status = 'not_started',
  progress = 0,
  linked_projects = 0,
  evidence_count = 0,
  estimated_budget_npr = NULL,
  spent_npr = NULL,
  funding_source = NULL,
  funding_source_ne = NULL,
  trust_level = 'unverified',
  signal_type = 'inferred',
  last_update = NOW()
WHERE 1=1;

-- Verify the reset
SELECT
  COUNT(*) as total_promises,
  COUNT(*) FILTER (WHERE status = 'not_started') as all_not_started,
  COUNT(*) FILTER (WHERE progress = 0) as all_zero_progress,
  COUNT(*) FILTER (WHERE estimated_budget_npr IS NULL) as all_null_budget,
  COUNT(*) FILTER (WHERE trust_level = 'unverified') as all_unverified
FROM promises;
