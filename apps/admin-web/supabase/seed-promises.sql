-- ============================================================
-- Seed: Government Promises (RSP Bacha Patra 2082)
-- Generated from apps/admin-web/lib/data/promises.ts
-- Idempotent: uses ON CONFLICT ... DO UPDATE
-- ============================================================

-- ── PROMISES ─────────────────────────────────────────────────

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('1', 'directly-elected-executive', 'Directly Elected Executive System', 'प्रत्यक्ष निर्वाचित कार्यकारी प्रणाली', 'Governance', 'सुशासन', 'not_started', 0, 0, 0,
   'Prepare constitutional amendment discussion paper within 3 months for directly elected head of state',
   'प्रत्यक्ष निर्वाचित राज्य प्रमुखका लागि ३ महिनाभित्र संविधान संशोधन छलफल पत्र तयार गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('2', 'limit-18-ministries', 'Limit Federal Ministries to 18', 'संघीय मन्त्रालय १८ मा सीमित', 'Governance', 'सुशासन', 'not_started', 0, 0, 0,
   'Reduce federal ministries to 18, eliminate duplication between federal, provincial, and local governments',
   'संघीय मन्त्रालय १८ मा घटाउने, संघ, प्रदेश र स्थानीय सरकारबीचको दोहोरोपन हटाउने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('3', 'budget-60-percent-local', 'Allocate 60% Budget to Provincial & Local Governments', 'बजेटको ६०% प्रदेश र स्थानीय सरकारलाई', 'Governance', 'सुशासन', 'not_started', 0, 0, 0,
   'Increase budget allocation to provincial and local governments from current 35% to 60%',
   'प्रदेश र स्थानीय सरकारलाई बजेट विनियोजन हालको ३५% बाट ६०% मा वृद्धि गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('4', 'investigate-assets-since-1990', 'Investigate Assets of Public Officials Since 1990', '१९९० देखि सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान', 'Anti-Corruption', 'भ्रष्टाचार निवारण', 'not_started', 0, 0, 0,
   'Investigate assets of all public office holders since 2047 BS and nationalize illegally acquired assets',
   '२०४७ सालदेखि सबै सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान गरी अवैध सम्पत्ति राष्ट्रियकरण गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('5', 'mandatory-asset-disclosure', 'Mandatory Public Asset Disclosure', 'अनिवार्य सार्वजनिक सम्पत्ति विवरण', 'Anti-Corruption', 'भ्रष्टाचार निवारण', 'not_started', 0, 0, 0,
   'All public office holders must publicly disclose assets before assuming office',
   'सबै सार्वजनिक पदाधिकारीले पद ग्रहण गर्नुअघि सार्वजनिक रूपमा सम्पत्ति विवरण खुलाउनुपर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('6', '100-days-100-works', '100 Days, 100 Works Plan', '१०० दिन, १०० काम योजना', 'Anti-Corruption', 'भ्रष्टाचार निवारण', 'not_started', 0, 0, 0,
   'Complete 100 specific short-term tasks in the first 100 days including corruption checks',
   'पहिलो १०० दिनमा भ्रष्टाचार जाँच सहित १०० विशिष्ट अल्पकालीन कार्य सम्पन्न गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('7', 'procurement-transparency', 'Public Procurement Transparency Portal', 'सार्वजनिक खरिद पारदर्शिता पोर्टल', 'Anti-Corruption', 'भ्रष्टाचार निवारण', 'not_started', 0, 0, 0,
   'Open portal for all government procurement data, contracts, and spending',
   'सबै सरकारी खरिद तथ्याङ्क, सम्झौता र खर्चका लागि खुला पोर्टल',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('8', 'gdp-growth-7-percent', '7% Annual GDP Growth Target', 'वार्षिक ७% जीडीपी वृद्धि लक्ष्य', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Achieve 7% average annual GDP growth, targeting $100 billion GDP within 5 years',
   '५ वर्षभित्र $१०० अर्ब जीडीपी लक्ष्य गरी औसत वार्षिक ७% जीडीपी वृद्धि हासिल गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('9', 'create-500000-jobs', 'Create 500,000 Jobs', '५ लाख रोजगारी सिर्जना', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Create 500,000 jobs through startups, entrepreneurship, foreign investment, and digital economy',
   'स्टार्टअप, उद्यमशीलता, विदेशी लगानी र डिजिटल अर्थतन्त्रमार्फत ५ लाख रोजगारी सिर्जना',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('10', 'exports-30-billion', 'Raise Exports to $30 Billion', 'निर्यात $३० अर्बमा पुर्याउने', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Raise exports to $30 billion within a decade, largely through IT services',
   'मुख्यतया सूचना प्रविधि सेवामार्फत एक दशकभित्र निर्यात $३० अर्बमा पुर्याउने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('11', 'tax-reform', 'Tax Reform — Reduce Citizen Burden', 'कर सुधार — नागरिक भार कम गर्ने', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Adjust income tax for family expenses, reduce tax burden on middle class',
   'पारिवारिक खर्चका लागि आयकर समायोजन, मध्यम वर्गको कर भार कम गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('12', '30000-mw-electricity', 'Generate 30,000 MW Electricity in 10 Years', '१० वर्षमा ३०,००० मेगावाट बिजुली उत्पादन', 'Energy', 'ऊर्जा', 'not_started', 0, 0, 0,
   'Achieve 30,000 MW electricity generation and become energy exporter',
   '३०,००० मेगावाट बिजुली उत्पादन हासिल गरी ऊर्जा निर्यातक बन्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('13', 'melamchi-water-supply', 'Complete Melamchi Water Supply', 'मेलम्ची खानेपानी आयोजना सम्पन्न', 'Infrastructure', 'पूर्वाधार', 'not_started', 0, 0, 0,
   'Deliver clean drinking water to Kathmandu Valley through the Melamchi tunnel',
   'मेलम्ची सुरुङमार्फत काठमाडौं उपत्यकामा सफा खानेपानी वितरण',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('14', 'national-pride-projects', 'Complete All National Pride Projects in 2 Years', '२ वर्षमा सबै राष्ट्रिय गौरवका आयोजना सम्पन्न', 'Infrastructure', 'पूर्वाधार', 'not_started', 0, 0, 0,
   'Complete all designated national pride projects within 2 years of government formation',
   'सरकार गठनको २ वर्षभित्र सबै तोकिएका राष्ट्रिय गौरवका आयोजना सम्पन्न गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('15', 'east-west-highway-4-lane', 'East-West Highway 4-Lane Expansion', 'पूर्व-पश्चिम राजमार्ग ४ लेन विस्तार', 'Transport', 'यातायात', 'not_started', 0, 0, 0,
   'Upgrade the entire East-West Highway (Mahendra Highway) to 4-lane divided highway',
   'सम्पूर्ण पूर्व-पश्चिम राजमार्ग (महेन्द्र राजमार्ग) लाई ४ लेन विभाजित राजमार्गमा स्तरोन्नति',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('16', 'east-west-electric-railway', 'East-West Electric Railway', 'पूर्व-पश्चिम विद्युतीय रेलमार्ग', 'Transport', 'यातायात', 'not_started', 0, 0, 0,
   'Build an east-west electric railway line for passengers and goods transport',
   'यात्रु र मालवस्तु ढुवानीका लागि पूर्व-पश्चिम विद्युतीय रेलमार्ग निर्माण',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('17', 'airport-modernization', 'Operationalize Bhairahawa & Pokhara Airports', 'भैरहवा र पोखरा विमानस्थल सञ्चालन', 'Transport', 'यातायात', 'not_started', 0, 0, 0,
   'Fully operationalize Bhairahawa (Gautam Buddha) and Pokhara international airports',
   'भैरहवा (गौतम बुद्ध) र पोखरा अन्तर्राष्ट्रिय विमानस्थल पूर्ण सञ्चालन',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('18', 'online-not-queue', '"Online, Not Queue" — Digital Government Services', '"अनलाइन, लाइन होइन" — डिजिटल सरकारी सेवा', 'Technology', 'प्रविधि', 'not_started', 0, 0, 0,
   'Eliminate queues for all government services, end middlemen and brokers',
   'सबै सरकारी सेवामा लाइन हटाउने, बिचौलिया र दलालको अन्त्य गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('19', 'digital-parks-7-provinces', 'Digital Parks in All 7 Provinces', 'सातवटै प्रदेशमा डिजिटल पार्क', 'Technology', 'प्रविधि', 'not_started', 0, 0, 0,
   'Establish technology/digital parks in each province for IT industry growth',
   'सूचना प्रविधि उद्योग वृद्धिका लागि प्रत्येक प्रदेशमा प्रविधि/डिजिटल पार्क स्थापना',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('20', 'it-strategic-industry', 'Declare IT as National Strategic Industry', 'सूचना प्रविधिलाई राष्ट्रिय रणनीतिक उद्योग घोषणा', 'Technology', 'प्रविधि', 'not_started', 0, 0, 0,
   'Declare IT strategic industry, create promotion board, allow IP-backed loans, 500,000 tech jobs target',
   'सूचना प्रविधिलाई रणनीतिक उद्योग घोषणा, प्रवर्धन बोर्ड गठन, बौद्धिक सम्पत्तिमा ऋण, ५ लाख प्रविधि रोजगारी लक्ष्य',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('21', 'crypto-regulation', 'Cryptocurrency Regulation & Pilot', 'क्रिप्टोकरेन्सी नियमन र पाइलट', 'Technology', 'प्रविधि', 'not_started', 0, 0, 0,
   'Study global crypto regulations, craft national policy, launch pilot mining projects within 1 year',
   'विश्वव्यापी क्रिप्टो नियमन अध्ययन, राष्ट्रिय नीति तर्जुमा, १ वर्षभित्र पाइलट माइनिङ आयोजना सुरु',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('22', 'universal-health-insurance', 'Universal Health Insurance — 100% Coverage', 'विश्वव्यापी स्वास्थ्य बीमा — १००% कभरेज', 'Health', 'स्वास्थ्य', 'not_started', 0, 0, 0,
   '100% insured quality healthcare for all citizens through universal health insurance',
   'विश्वव्यापी स्वास्थ्य बीमामार्फत सबै नागरिकका लागि १००% बीमा गरिएको गुणस्तरीय स्वास्थ्य सेवा',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('23', 'national-ambulance-service', 'Centralized National Ambulance Service', 'केन्द्रीकृत राष्ट्रिय एम्बुलेन्स सेवा', 'Health', 'स्वास्थ्य', 'not_started', 0, 0, 0,
   'Establish a centralized, nationwide ambulance service reachable through single hotline',
   'एकल हटलाइनमार्फत पहुँचयोग्य केन्द्रीकृत, राष्ट्रव्यापी एम्बुलेन्स सेवा स्थापना',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('24', 'free-education-3-children', 'Free Education for Up to 3 Children', '३ सन्तानसम्म निःशुल्क शिक्षा', 'Education', 'शिक्षा', 'not_started', 0, 0, 0,
   'Free education through high school for up to 3 children per family',
   'प्रति परिवार ३ सन्तानसम्म माध्यमिक तहसम्म निःशुल्क शिक्षा',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('25', 'skill-in-education', '"Skill in Education" National Expansion', '"शिक्षामा सीप" राष्ट्रिय विस्तार', 'Education', 'शिक्षा', 'not_started', 0, 0, 0,
   'Expand the successful Kathmandu "Skill in Education" program to all districts nationally',
   'काठमाडौंको सफल "शिक्षामा सीप" कार्यक्रम सबै जिल्लामा राष्ट्रिय रूपमा विस्तार गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('26', 'zero-dropout-rate', 'Zero Dropout Rate — School Retention Program', 'शून्य छुट दर — विद्यालय अवधारण कार्यक्रम', 'Education', 'शिक्षा', 'not_started', 0, 0, 0,
   'Achieve zero dropout through smart classrooms, labs, libraries, and retention programs',
   'स्मार्ट कक्षाकोठा, प्रयोगशाला, पुस्तकालय र अवधारण कार्यक्रममार्फत शून्य छुट दर हासिल',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('27', 'clean-kathmandu-valley', 'Clean Kathmandu Valley Campaign', 'स्वच्छ काठमाडौं उपत्यका अभियान', 'Environment', 'वातावरण', 'not_started', 0, 0, 0,
   'Comprehensive waste management, river cleanup, and air quality improvement for Kathmandu Valley',
   'काठमाडौं उपत्यकाका लागि व्यापक फोहोर व्यवस्थापन, नदी सफाइ र वायु गुणस्तर सुधार',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('28', 'river-restoration', 'Bagmati & Major River Restoration', 'बागमती र प्रमुख नदी पुनर्स्थापना', 'Environment', 'वातावरण', 'not_started', 0, 0, 0,
   'Restore Bagmati and other major rivers through sewage treatment and encroachment removal',
   'ढल शोधन र अतिक्रमण हटाउनेमार्फत बागमती र अन्य प्रमुख नदी पुनर्स्थापना',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('29', 'land-reform-commission', 'Land Reform — Commission in 100 Days', 'भूमि सुधार — १०० दिनमा आयोग', 'Social', 'सामाजिक', 'not_started', 0, 0, 0,
   'Establish land commission in 100 days, solve landless/squatter ownership in 1000 days, create Land Bank',
   '१०० दिनमा भूमि आयोग स्थापना, १००० दिनमा भूमिहीन/सुकुम्बासी स्वामित्व समाधान, भूमि बैंक गठन',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('30', 'overseas-voting-diaspora', 'Overseas Voting for Diaspora Nepalis', 'प्रवासी नेपालीका लागि विदेशबाट मतदान', 'Governance', 'सुशासन', 'not_started', 0, 0, 0,
   'Enable overseas voting for Nepali citizens abroad and support for dual citizenship',
   'विदेशमा बसोबास गर्ने नेपाली नागरिकका लागि विदेशबाट मतदान र दोहोरो नागरिकताको समर्थन',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('31', 'cooperatives-crisis', 'Cooperatives Crisis Resolution — Return Depositors Money', 'सहकारी संकट समाधान — निक्षेपकर्ताको पैसा फिर्ता', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Resolve cooperatives crisis through legal settlement and return depositors money',
   'कानूनी समाधानमार्फत सहकारी संकट समाधान गरी निक्षेपकर्ताको पैसा फिर्ता गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('32', 'double-tourism', 'Double Tourist Numbers & Spending', 'पर्यटक संख्या र खर्च दोब्बर', 'Economy', 'अर्थतन्त्र', 'not_started', 0, 0, 0,
   'Double international tourist arrivals and per-tourist spending within 5 years',
   '५ वर्षभित्र अन्तर्राष्ट्रिय पर्यटक आगमन र प्रति-पर्यटक खर्च दोब्बर गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('33', 'dalit-apology', 'Official State Apology to Dalit Community', 'दलित समुदायलाई आधिकारिक राज्य माफी', 'Social', 'सामाजिक', 'not_started', 0, 0, 0,
   'Issue official state apology to Dalit community for centuries of historical discrimination',
   'शताब्दियौंको ऐतिहासिक विभेदका लागि दलित समुदायलाई आधिकारिक राज्य माफी जारी गर्ने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('34', 'social-security-expansion', 'Social Security Expansion — Pension & Insurance', 'सामाजिक सुरक्षा विस्तार — पेन्सन र बीमा', 'Social', 'सामाजिक', 'not_started', 0, 0, 0,
   'Expand social security with pension fund for athletes, subsidized first-home loans, elder care',
   'खेलाडीका लागि पेन्सन कोष, सहुलियत पहिलो घर ऋण, जेष्ठ नागरिक हेरचाहसहित सामाजिक सुरक्षा विस्तार',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;

INSERT INTO promises (id, slug, title, title_ne, category, category_ne, status, progress, linked_projects, evidence_count, description, description_ne, trust_level, estimated_budget_npr, spent_npr, funding_source, funding_source_ne)
VALUES
  ('35', 'fast-track-citizenship', 'Fast-Track Citizenship & Passport Processing', 'द्रुत नागरिकता र राहदानी प्रशोधन', 'Governance', 'सुशासन', 'not_started', 0, 0, 0,
   'Eliminate passport and citizenship backlogs through digitization and process reform',
   'डिजिटलाइजेसन र प्रक्रिया सुधारमार्फत राहदानी र नागरिकताको ढिलाइ हटाउने',
   'unverified', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, title_ne = EXCLUDED.title_ne,
  category = EXCLUDED.category, category_ne = EXCLUDED.category_ne,
  status = EXCLUDED.status, progress = EXCLUDED.progress,
  linked_projects = EXCLUDED.linked_projects, evidence_count = EXCLUDED.evidence_count,
  description = EXCLUDED.description, description_ne = EXCLUDED.description_ne,
  trust_level = EXCLUDED.trust_level, estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  spent_npr = EXCLUDED.spent_npr, funding_source = EXCLUDED.funding_source,
  funding_source_ne = EXCLUDED.funding_source_ne;


-- ── DATA SOURCES ─────────────────────────────────────────────

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('kathmandu-post', 'Kathmandu Post', 'https://kathmandupost.com/national', 'news', 'en', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('online-khabar', 'Online Khabar', 'https://english.onlinekhabar.com', 'news', 'en', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('republica', 'MyRepublica', 'https://myrepublica.nagariknetwork.com/category/national', 'news', 'en', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('himalayan-times', 'Himalayan Times', 'https://thehimalayantimes.com/nepal', 'news', 'en', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('nepali-times', 'Nepali Times', 'https://www.nepalitimes.com', 'news', 'en', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('mof-gov', 'Ministry of Finance', 'https://mof.gov.np', 'government', 'ne', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('mopit-gov', 'Ministry of Infrastructure', 'https://mopit.gov.np', 'government', 'ne', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('moud-gov', 'Ministry of Urban Development', 'https://moud.gov.np', 'government', 'ne', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('moewri-gov', 'Ministry of Energy', 'https://moewri.gov.np', 'government', 'ne', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;

INSERT INTO data_sources (slug, name, url, source_type, language, scrape_frequency, is_active)
VALUES
  ('moha-gov', 'Ministry of Home Affairs', 'https://moha.gov.np', 'government', 'ne', 'twice_daily', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, url = EXCLUDED.url, source_type = EXCLUDED.source_type,
  language = EXCLUDED.language, scrape_frequency = EXCLUDED.scrape_frequency,
  is_active = EXCLUDED.is_active;
