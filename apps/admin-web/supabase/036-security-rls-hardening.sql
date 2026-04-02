-- 036-security-rls-hardening.sql
-- Tighten backend-managed tables so writes are service-role only.

BEGIN;

-- ---------------------------------------------------------------------------
-- Core ingestion / commitments tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service full access promises" ON promises;
CREATE POLICY "Service full access promises" ON promises
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access articles" ON scraped_articles;
CREATE POLICY "Service full access articles" ON scraped_articles
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access runs" ON scrape_runs;
CREATE POLICY "Service full access runs" ON scrape_runs
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access sources" ON data_sources;
CREATE POLICY "Service full access sources" ON data_sources
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access updates" ON promise_updates;
CREATE POLICY "Service full access updates" ON promise_updates
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access government org units" ON government_org_units;
CREATE POLICY "Service full access government org units" ON government_org_units
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service full access votes" ON public_votes;
CREATE POLICY "Service full access votes" ON public_votes
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Intelligence + pipeline tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service write officials" ON officials;
CREATE POLICY "Service write officials" ON officials
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write sources" ON intelligence_sources;
CREATE POLICY "Service write sources" ON intelligence_sources
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write signals" ON intelligence_signals;
CREATE POLICY "Service write signals" ON intelligence_signals
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write sweeps" ON intelligence_sweeps;
CREATE POLICY "Service write sweeps" ON intelligence_sweeps
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write jobs" ON intelligence_jobs;
CREATE POLICY "Service write jobs" ON intelligence_jobs
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "pda_service_write" ON promise_daily_activity;
CREATE POLICY "pda_service_write" ON promise_daily_activity
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write pilot events" ON pilot_events;
CREATE POLICY "Service write pilot events" ON pilot_events
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write pilot summaries" ON pilot_summaries;
CREATE POLICY "Service write pilot summaries" ON pilot_summaries
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "notifications_insert_service" ON user_notifications;
CREATE POLICY "notifications_insert_service" ON user_notifications
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Corruption core graph tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS corruption_cases_auth_write ON corruption_cases;
CREATE POLICY corruption_cases_service_write ON corruption_cases
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_entities_auth_write ON corruption_entities;
CREATE POLICY corruption_entities_service_write ON corruption_entities
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_case_entities_auth_write ON corruption_case_entities;
CREATE POLICY corruption_case_entities_service_write ON corruption_case_entities
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_entity_rels_auth_write ON corruption_entity_relationships;
CREATE POLICY corruption_entity_rels_service_write ON corruption_entity_relationships
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_money_flows_auth_write ON corruption_money_flows;
CREATE POLICY corruption_money_flows_service_write ON corruption_money_flows
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_evidence_auth_write ON corruption_evidence;
CREATE POLICY corruption_evidence_service_write ON corruption_evidence
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corruption_timeline_auth_write ON corruption_timeline_events;
CREATE POLICY corruption_timeline_service_write ON corruption_timeline_events
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
