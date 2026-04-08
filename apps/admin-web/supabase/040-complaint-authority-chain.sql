-- ============================================================
-- 040: Complaint Authority Chain (Nepal hierarchy + minister linking)
-- ============================================================

-- 1) Enrich department registry with ministry ownership + social metadata
ALTER TABLE complaint_departments
  ADD COLUMN IF NOT EXISTS ministry_slug TEXT,
  ADD COLUMN IF NOT EXISTS ministry_name TEXT,
  ADD COLUMN IF NOT EXISTS ministry_name_ne TEXT,
  ADD COLUMN IF NOT EXISTS department_head_title TEXT,
  ADD COLUMN IF NOT EXISTS department_head_title_ne TEXT,
  ADD COLUMN IF NOT EXISTS facebook_page_url TEXT;

UPDATE complaint_departments
SET
  ministry_slug = CASE key
    WHEN 'infrastructure' THEN 'infrastructure'
    WHEN 'transport' THEN 'infrastructure'
    WHEN 'urban' THEN 'urban'
    WHEN 'water' THEN 'energy'
    WHEN 'sanitation' THEN 'urban'
    WHEN 'electricity' THEN 'energy'
    WHEN 'health' THEN 'health'
    WHEN 'education' THEN 'education'
    WHEN 'internet' THEN 'ict'
    WHEN 'safety' THEN 'home'
    WHEN 'employment' THEN 'industry'
    WHEN 'environment' THEN 'forests'
    WHEN 'local-municipality' THEN 'federal-affairs'
    WHEN 'home-affairs' THEN 'home'
    ELSE 'opm'
  END,
  ministry_name = CASE key
    WHEN 'infrastructure' THEN 'Ministry of Physical Infrastructure and Transport'
    WHEN 'transport' THEN 'Ministry of Physical Infrastructure and Transport'
    WHEN 'urban' THEN 'Ministry of Urban Development'
    WHEN 'water' THEN 'Ministry of Energy, Water Resources and Irrigation'
    WHEN 'sanitation' THEN 'Ministry of Urban Development'
    WHEN 'electricity' THEN 'Ministry of Energy, Water Resources and Irrigation'
    WHEN 'health' THEN 'Ministry of Health and Population'
    WHEN 'education' THEN 'Ministry of Education, Science and Technology'
    WHEN 'internet' THEN 'Ministry of Communication and Information Technology'
    WHEN 'safety' THEN 'Ministry of Home Affairs'
    WHEN 'employment' THEN 'Ministry of Labour, Employment and Social Security'
    WHEN 'environment' THEN 'Ministry of Forests and Environment'
    WHEN 'local-municipality' THEN 'Ministry of Federal Affairs and General Administration'
    WHEN 'home-affairs' THEN 'Ministry of Home Affairs'
    ELSE 'Office of the Prime Minister and Council of Ministers'
  END,
  ministry_name_ne = CASE key
    WHEN 'infrastructure' THEN 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय'
    WHEN 'transport' THEN 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय'
    WHEN 'urban' THEN 'सहरी विकास मन्त्रालय'
    WHEN 'water' THEN 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय'
    WHEN 'sanitation' THEN 'सहरी विकास मन्त्रालय'
    WHEN 'electricity' THEN 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय'
    WHEN 'health' THEN 'स्वास्थ्य तथा जनसंख्या मन्त्रालय'
    WHEN 'education' THEN 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय'
    WHEN 'internet' THEN 'सञ्चार तथा सूचना प्रविधि मन्त्रालय'
    WHEN 'safety' THEN 'गृह मन्त्रालय'
    WHEN 'employment' THEN 'श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय'
    WHEN 'environment' THEN 'वन तथा वातावरण मन्त्रालय'
    WHEN 'local-municipality' THEN 'संघीय मामिला तथा सामान्य प्रशासन मन्त्रालय'
    WHEN 'home-affairs' THEN 'गृह मन्त्रालय'
    ELSE 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय'
  END,
  department_head_title = CASE key
    WHEN 'local-municipality' THEN 'Mayor / Chairperson'
    WHEN 'water' THEN 'Division Chief'
    WHEN 'sanitation' THEN 'Division Chief'
    WHEN 'transport' THEN 'Director General'
    WHEN 'infrastructure' THEN 'Director General'
    WHEN 'electricity' THEN 'Executive Director'
    WHEN 'safety' THEN 'Chief District Officer / Police Chief'
    ELSE 'Secretary / Director'
  END,
  department_head_title_ne = CASE key
    WHEN 'local-municipality' THEN 'मेयर / अध्यक्ष'
    WHEN 'water' THEN 'शाखा प्रमुख'
    WHEN 'sanitation' THEN 'शाखा प्रमुख'
    WHEN 'transport' THEN 'महानिर्देशक'
    WHEN 'infrastructure' THEN 'महानिर्देशक'
    WHEN 'electricity' THEN 'कार्यकारी निर्देशक'
    WHEN 'safety' THEN 'प्रमुख जिल्ला अधिकारी / प्रहरी प्रमुख'
    ELSE 'सचिव / निर्देशक'
  END;

-- 2) Complaint authority chain nodes
CREATE TABLE IF NOT EXISTS complaint_authority_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  node_order SMALLINT NOT NULL CHECK (node_order >= 0 AND node_order <= 20),
  node_type TEXT NOT NULL CHECK (node_type IN (
    'primary_authority',
    'department_head',
    'ministry',
    'minister',
    'oversight'
  )),
  authority_level TEXT NOT NULL CHECK (authority_level IN (
    'local',
    'district',
    'provincial',
    'federal',
    'ministry',
    'national'
  )),
  department_key TEXT REFERENCES complaint_departments(key) ON DELETE SET NULL,
  authority_name TEXT NOT NULL,
  authority_name_ne TEXT,
  office TEXT,
  office_ne TEXT,
  ministry_slug TEXT,
  minister_slug TEXT,
  official_name TEXT,
  official_title TEXT,
  facebook_url TEXT,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_authority_chain_case
  ON complaint_authority_chain(complaint_id, is_active, node_order);
CREATE INDEX IF NOT EXISTS idx_complaint_authority_chain_minister
  ON complaint_authority_chain(minister_slug, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_authority_chain_ministry
  ON complaint_authority_chain(ministry_slug, is_active, created_at DESC);

CREATE OR REPLACE FUNCTION update_complaint_authority_chain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_authority_chain_updated_at ON complaint_authority_chain;
CREATE TRIGGER trg_complaint_authority_chain_updated_at
  BEFORE UPDATE ON complaint_authority_chain
  FOR EACH ROW EXECUTE FUNCTION update_complaint_authority_chain_updated_at();

-- 3) RLS
ALTER TABLE complaint_authority_chain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS complaint_authority_chain_select ON complaint_authority_chain;
CREATE POLICY complaint_authority_chain_select ON complaint_authority_chain
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM civic_complaints c
      WHERE c.id = complaint_id
        AND (
          c.is_public = TRUE
          OR c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
          )
        )
    )
  );

DROP POLICY IF EXISTS complaint_authority_chain_admin_all ON complaint_authority_chain;
CREATE POLICY complaint_authority_chain_admin_all ON complaint_authority_chain
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );
