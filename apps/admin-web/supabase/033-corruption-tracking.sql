-- ============================================================
-- 033: Corruption Tracking Schema
-- ============================================================
-- Tracks corruption cases, involved entities (people/orgs/companies),
-- money flows, evidence, and timeline events. Designed for graph-style
-- exploration: entity relationships form a connection network, money
-- flows trace financial paths, and timeline events build a chronological
-- narrative for each case.
-- ============================================================

-- ===================
-- 1) corruption_cases
-- ===================
CREATE TABLE IF NOT EXISTS corruption_cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  title                 TEXT NOT NULL,
  title_ne              TEXT,
  summary               TEXT,
  summary_ne            TEXT,
  corruption_type       TEXT NOT NULL
    CHECK (corruption_type IN (
      'bribery','embezzlement','nepotism','money_laundering','land_grab',
      'procurement_fraud','tax_evasion','abuse_of_authority','kickback','other'
    )),
  status                TEXT NOT NULL DEFAULT 'alleged'
    CHECK (status IN (
      'alleged','under_investigation','charged','trial',
      'convicted','acquitted','asset_recovery','closed'
    )),
  severity              TEXT CHECK (severity IN ('minor','major','mega')),
  estimated_amount_npr  BIGINT,
  verified              BOOLEAN DEFAULT false,
  source_quality        TEXT CHECK (source_quality IN ('confirmed','reported','alleged')),
  related_commitment_ids INT[],
  related_body_slugs    TEXT[],
  tags                  TEXT[],
  cover_image_url       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 2) corruption_entities
-- =========================
CREATE TABLE IF NOT EXISTS corruption_entities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  name_ne           TEXT,
  entity_type       TEXT NOT NULL
    CHECK (entity_type IN (
      'person','politician','official','company',
      'organization','shell_company','bank_account','property'
    )),
  title             TEXT,
  title_ne          TEXT,
  photo_url         TEXT,
  bio               TEXT,
  party_affiliation TEXT,
  total_cases       INT DEFAULT 0,
  total_amount_npr  BIGINT DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================
-- 3) corruption_case_entities
-- ==============================
CREATE TABLE IF NOT EXISTS corruption_case_entities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES corruption_cases(id) ON DELETE CASCADE,
  entity_id           UUID NOT NULL REFERENCES corruption_entities(id) ON DELETE CASCADE,
  role                TEXT NOT NULL
    CHECK (role IN (
      'accused','witness','victim','investigator',
      'beneficiary','whistleblower','facilitator','accomplice'
    )),
  involvement_status  TEXT CHECK (involvement_status IN (
      'alleged','charged','convicted','acquitted','cooperating','fugitive'
    )),
  description         TEXT,
  joined_at           DATE,
  UNIQUE (case_id, entity_id, role)
);

-- =====================================
-- 4) corruption_entity_relationships
-- =====================================
CREATE TABLE IF NOT EXISTS corruption_entity_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_id         UUID NOT NULL REFERENCES corruption_entities(id) ON DELETE CASCADE,
  entity_b_id         UUID NOT NULL REFERENCES corruption_entities(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL
    CHECK (relationship_type IN (
      'business_partner','family','appointed_by','shell_company_of',
      'political_ally','employer_employee','financial_link',
      'co_accused','bribe_giver_receiver'
    )),
  description         TEXT,
  strength            TEXT CHECK (strength IN ('confirmed','probable','suspected')),
  evidence_ids        UUID[],
  case_ids            UUID[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================
-- 5) corruption_money_flows
-- ==========================
CREATE TABLE IF NOT EXISTS corruption_money_flows (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID NOT NULL REFERENCES corruption_cases(id) ON DELETE CASCADE,
  from_entity_id        UUID REFERENCES corruption_entities(id),
  to_entity_id          UUID REFERENCES corruption_entities(id),
  amount_npr            BIGINT,
  amount_foreign        NUMERIC,
  currency              TEXT DEFAULT 'NPR',
  purpose               TEXT,
  date                  DATE,
  date_precision        TEXT DEFAULT 'approximate'
    CHECK (date_precision IN ('exact','month','year','approximate')),
  verification_status   TEXT DEFAULT 'alleged'
    CHECK (verification_status IN ('confirmed','reported','alleged')),
  flow_type             TEXT CHECK (flow_type IN (
      'bribe','kickback','embezzlement','transfer','purchase',
      'investment','laundering','asset_acquisition'
    )),
  evidence_ids          UUID[],
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 6) corruption_evidence
-- =========================
CREATE TABLE IF NOT EXISTS corruption_evidence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES corruption_cases(id) ON DELETE CASCADE,
  evidence_type     TEXT NOT NULL
    CHECK (evidence_type IN (
      'news_article','ciaa_report','court_filing','government_document',
      'whistleblower','financial_record','property_record',
      'intelligence_signal','social_media','interview','leaked_document'
    )),
  title             TEXT,
  url               TEXT,
  source_name       TEXT,
  content_summary   TEXT,
  published_at      TIMESTAMPTZ,
  reliability       TEXT DEFAULT 'medium'
    CHECK (reliability IN ('high','medium','low')),
  signal_id         UUID,
  file_url          TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================
-- 7) corruption_timeline_events
-- ================================
CREATE TABLE IF NOT EXISTS corruption_timeline_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID NOT NULL REFERENCES corruption_cases(id) ON DELETE CASCADE,
  event_date            DATE NOT NULL,
  event_date_precision  TEXT DEFAULT 'exact'
    CHECK (event_date_precision IN ('exact','month','year')),
  event_type            TEXT NOT NULL
    CHECK (event_type IN (
      'allegation','complaint_filed','investigation_started',
      'fir_registered','arrested','charge_sheet_filed','trial_started',
      'verdict','appeal','asset_frozen','asset_recovered',
      'fugitive_declared','extradition','acquitted','pardoned','other'
    )),
  title                 TEXT NOT NULL,
  title_ne              TEXT,
  description           TEXT,
  entity_ids            UUID[],
  evidence_ids          UUID[],
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- corruption_cases
CREATE INDEX IF NOT EXISTS idx_corruption_cases_status
  ON corruption_cases(status);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_type
  ON corruption_cases(corruption_type);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_severity
  ON corruption_cases(severity);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_verified
  ON corruption_cases(verified);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_tags
  ON corruption_cases USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_related_commitments
  ON corruption_cases USING GIN (related_commitment_ids);
CREATE INDEX IF NOT EXISTS idx_corruption_cases_related_bodies
  ON corruption_cases USING GIN (related_body_slugs);

-- corruption_entities
CREATE INDEX IF NOT EXISTS idx_corruption_entities_type
  ON corruption_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_corruption_entities_party
  ON corruption_entities(party_affiliation);

-- corruption_case_entities
CREATE INDEX IF NOT EXISTS idx_corruption_case_entities_case
  ON corruption_case_entities(case_id);
CREATE INDEX IF NOT EXISTS idx_corruption_case_entities_entity
  ON corruption_case_entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_corruption_case_entities_role
  ON corruption_case_entities(role);

-- corruption_entity_relationships
CREATE INDEX IF NOT EXISTS idx_corruption_entity_rels_a
  ON corruption_entity_relationships(entity_a_id);
CREATE INDEX IF NOT EXISTS idx_corruption_entity_rels_b
  ON corruption_entity_relationships(entity_b_id);
CREATE INDEX IF NOT EXISTS idx_corruption_entity_rels_type
  ON corruption_entity_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_corruption_entity_rels_evidence
  ON corruption_entity_relationships USING GIN (evidence_ids);
CREATE INDEX IF NOT EXISTS idx_corruption_entity_rels_cases
  ON corruption_entity_relationships USING GIN (case_ids);

-- corruption_money_flows
CREATE INDEX IF NOT EXISTS idx_corruption_money_flows_case
  ON corruption_money_flows(case_id);
CREATE INDEX IF NOT EXISTS idx_corruption_money_flows_from
  ON corruption_money_flows(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_corruption_money_flows_to
  ON corruption_money_flows(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_corruption_money_flows_type
  ON corruption_money_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_corruption_money_flows_evidence
  ON corruption_money_flows USING GIN (evidence_ids);

-- corruption_evidence
CREATE INDEX IF NOT EXISTS idx_corruption_evidence_case
  ON corruption_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_corruption_evidence_type
  ON corruption_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_corruption_evidence_published
  ON corruption_evidence(published_at);
CREATE INDEX IF NOT EXISTS idx_corruption_evidence_reliability
  ON corruption_evidence(reliability);

-- corruption_timeline_events
CREATE INDEX IF NOT EXISTS idx_corruption_timeline_case
  ON corruption_timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_corruption_timeline_date
  ON corruption_timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_corruption_timeline_type
  ON corruption_timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_corruption_timeline_entities
  ON corruption_timeline_events USING GIN (entity_ids);
CREATE INDEX IF NOT EXISTS idx_corruption_timeline_evidence
  ON corruption_timeline_events USING GIN (evidence_ids);

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION corruption_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corruption_cases_updated_at
  BEFORE UPDATE ON corruption_cases
  FOR EACH ROW EXECUTE FUNCTION corruption_set_updated_at();

CREATE TRIGGER trg_corruption_entities_updated_at
  BEFORE UPDATE ON corruption_entities
  FOR EACH ROW EXECUTE FUNCTION corruption_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE corruption_cases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_entities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_case_entities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_money_flows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_timeline_events    ENABLE ROW LEVEL SECURITY;

-- Public read (anon SELECT)
CREATE POLICY corruption_cases_anon_read ON corruption_cases
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_entities_anon_read ON corruption_entities
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_case_entities_anon_read ON corruption_case_entities
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_entity_rels_anon_read ON corruption_entity_relationships
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_money_flows_anon_read ON corruption_money_flows
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_evidence_anon_read ON corruption_evidence
  FOR SELECT TO anon USING (true);
CREATE POLICY corruption_timeline_anon_read ON corruption_timeline_events
  FOR SELECT TO anon USING (true);

-- Authenticated write (INSERT, UPDATE, DELETE)
CREATE POLICY corruption_cases_auth_write ON corruption_cases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_entities_auth_write ON corruption_entities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_case_entities_auth_write ON corruption_case_entities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_entity_rels_auth_write ON corruption_entity_relationships
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_money_flows_auth_write ON corruption_money_flows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_evidence_auth_write ON corruption_evidence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY corruption_timeline_auth_write ON corruption_timeline_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
