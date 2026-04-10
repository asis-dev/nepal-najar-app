-- Nepal Republic — Full counterparty rollout
-- Maps EVERY service to a counterparty with real routes, SLA targets, and escalation policies.
-- All counterparties set to 'active' — no more pilot-only.

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Upgrade all existing counterparties from pilot/identified → active
-- ════════════════════════════════════════════════════════════════════════════

update service_counterparties set adoption_stage = 'active', updated_at = now() where adoption_stage in ('pilot', 'identified');

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Add ALL missing counterparties
-- ════════════════════════════════════════════════════════════════════════════

insert into service_counterparties (
  key, name, name_ne, department_key, kind, authority_level, jurisdiction_scope,
  service_category, adoption_stage, default_submission_mode, default_response_mode, notes
) values

-- ── IDENTITY / DISTRICT ADMINISTRATION ──────────────────────────────────────
('cdo-office-general', 'Chief District Officer — General', 'प्रमुख जिल्ला अधिकारी कार्यालय',
 'district-administration', 'government', 'district', 'National (all 77 districts)',
 'identity', 'active', 'department_inbox', 'department_inbox',
 'Citizenship issuance, migration certificates, recommendation letters. Each district has one CDO office. High volume, critical identity workflows.'),

-- ── PASSPORT ────────────────────────────────────────────────────────────────
('passport-regional-offices', 'Regional Passport Offices', 'क्षेत्रीय राहदानी कार्यालयहरू',
 'passport', 'government', 'provincial', 'Provincial capitals',
 'identity', 'active', 'portal_assisted', 'portal_assisted',
 'Regional offices handle passport applications outside Kathmandu. Same portal system as central office.'),

-- ── LOCAL GOVERNMENT ────────────────────────────────────────────────────────
('local-govt-general', 'Municipal / Rural Municipality Offices', 'नगरपालिका / गाउँपालिका कार्यालय',
 'local-govt', 'government', 'local', 'All 753 local governments',
 'identity', 'active', 'department_inbox', 'department_inbox',
 'Birth/death/marriage registration, recommendation letters, local verification. Ward secretaries handle most citizen services directly.'),

('election-commission-nepal', 'Election Commission Nepal', 'नेपाल निर्वाचन आयोग',
 'local-govt', 'government', 'federal', 'National',
 'identity', 'active', 'portal_assisted', 'portal_assisted',
 'Voter registration and voter ID card issuance. Online portal exists for registration.'),

('national-id-authority', 'National ID Management Center', 'राष्ट्रिय परिचयपत्र व्यवस्थापन केन्द्र',
 'local-govt', 'government', 'federal', 'National',
 'identity', 'active', 'portal_assisted', 'portal_assisted',
 'National ID (NID) card issuance. Biometric enrollment at district offices, card issued centrally.'),

-- ── TRANSPORT ───────────────────────────────────────────────────────────────
('dotm-zonal-offices', 'DoTM Zonal Transport Offices', 'यातायात व्यवस्था कार्यालय (क्षेत्रीय)',
 'transport', 'government', 'district', 'All zones',
 'transport', 'active', 'portal_assisted', 'portal_assisted',
 'License trial, renewal, bluebook, vehicle registration, pollution test. Bagmati zone office is highest volume.'),

-- ── TAX ─────────────────────────────────────────────────────────────────────
('ird-regional', 'IRD Regional / Taxpayer Service Offices', 'आन्तरिक राजस्व कार्यालय (क्षेत्रीय)',
 'tax', 'government', 'district', 'All tax offices',
 'tax', 'active', 'portal_assisted', 'portal_assisted',
 'PAN registration, VAT filing, income tax, customs. Taxpayer portal handles most submissions.'),

('municipality-revenue', 'Municipality Revenue Section', 'नगरपालिका राजस्व शाखा',
 'tax', 'government', 'local', 'All municipalities',
 'tax', 'active', 'department_inbox', 'department_inbox',
 'House-land tax (मालपोत), integrated property tax. Most municipalities have local revenue counters.'),

-- ── LAND ────────────────────────────────────────────────────────────────────
('land-revenue-offices', 'Land Revenue Offices', 'मालपोत कार्यालय',
 'land', 'government', 'district', 'All 77 districts',
 'land', 'active', 'department_inbox', 'department_inbox',
 'Land registration, ownership transfer (mutation), parcha (land ownership certificate). Critical property workflows.'),

('survey-offices', 'Land Survey Offices', 'नापी कार्यालय',
 'land', 'government', 'district', 'All 77 districts',
 'land', 'active', 'department_inbox', 'department_inbox',
 'Land measurement, kitta mapping, boundary disputes. Physical survey required for most transactions.'),

-- ── HEALTH ──────────────────────────────────────────────────────────────────
('tuth-hospital', 'Tribhuvan University Teaching Hospital (TUTH)', 'त्रिभुवन विश्वविद्यालय शिक्षण अस्पताल',
 'health', 'public_institution', 'provider', 'Kathmandu',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Largest teaching hospital. OPD registration, specialist referrals, emergency services.'),

('patan-hospital', 'Patan Hospital', 'पाटन अस्पताल',
 'health', 'public_institution', 'provider', 'Lalitpur',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Major hospital in Lalitpur. OPD, maternity, emergency. Token-based queue system.'),

('civil-hospital-kathmandu', 'Civil Hospital Kathmandu', 'सिभिल अस्पताल काठमाडौं',
 'health', 'public_institution', 'provider', 'Kathmandu',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Government civil hospital. General OPD and specialist services.'),

('health-insurance-board', 'Health Insurance Board', 'स्वास्थ्य बीमा बोर्ड',
 'health', 'government', 'federal', 'National',
 'health', 'active', 'portal_assisted', 'portal_assisted',
 'National health insurance enrollment and claims. Online portal for enrollment.'),

('kanti-childrens', 'Kanti Children Hospital', 'कान्ती बाल अस्पताल',
 'health', 'public_institution', 'provider', 'Kathmandu',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Specialized pediatric hospital. OPD and emergency for children.'),

('maternity-hospital-thapathali', 'Maternity Hospital Thapathali', 'प्रसूति गृह थापाथली',
 'health', 'public_institution', 'provider', 'Kathmandu',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Government maternity hospital. Prenatal, delivery, postnatal care.'),

('bharatpur-cancer-hospital', 'BP Koirala Memorial Cancer Hospital', 'बी.पी. कोइराला मेमोरियल क्यान्सर अस्पताल',
 'health', 'public_institution', 'provider', 'Bharatpur, Chitwan',
 'health', 'active', 'department_inbox', 'department_inbox',
 'National cancer referral center. OPD, chemotherapy, radiation.'),

('ambulance-service-nepal', 'Nepal Ambulance Service (102)', 'नेपाल एम्बुलेन्स सेवा (१०२)',
 'health', 'government', 'federal', 'National',
 'health', 'active', 'human_bridge', 'human_bridge',
 'Emergency ambulance dispatch via 102 hotline. Phone-based coordination.'),

('vaccination-centers', 'Government Vaccination Centers', 'सरकारी खोप केन्द्रहरू',
 'health', 'government', 'local', 'All districts',
 'health', 'active', 'department_inbox', 'department_inbox',
 'Child immunization, COVID-19, routine vaccination. Ward health posts are primary delivery points.'),

-- ── UTILITIES ───────────────────────────────────────────────────────────────
('ntc-nepal-telecom', 'Nepal Telecom (NTC)', 'नेपाल टेलिकम',
 'utilities', 'provider', 'provider', 'National',
 'utilities', 'active', 'portal_assisted', 'portal_assisted',
 'SIM registration, mobile services, ADSL internet. Has online portal and customer centers.'),

('ncell-pvt-ltd', 'Ncell Pvt. Ltd.', 'एनसेल प्रा. लि.',
 'utilities', 'provider', 'provider', 'National',
 'utilities', 'active', 'portal_assisted', 'portal_assisted',
 'SIM registration and mobile services. Ncell centers and authorized dealers.'),

('worldlink-communications', 'WorldLink Communications', 'वर्ल्डलिंक कम्युनिकेसन्स',
 'utilities', 'provider', 'provider', 'Urban areas',
 'utilities', 'active', 'portal_assisted', 'portal_assisted',
 'Internet service provider. Online application, technician visit for installation.'),

('lpg-distributors', 'LPG Gas Distributors', 'एलपीजी ग्यास वितरकहरू',
 'utilities', 'provider', 'provider', 'National',
 'utilities', 'active', 'human_bridge', 'human_bridge',
 'LPG gas cylinder booking and delivery. Phone-based booking with local distributors.'),

('municipality-waste-mgmt', 'Municipality Waste Management', 'नगरपालिका फोहोर व्यवस्थापन',
 'utilities', 'government', 'local', 'Urban municipalities',
 'utilities', 'active', 'department_inbox', 'department_inbox',
 'Garbage collection registration and schedule management. Ward-level service.'),

-- ── BUSINESS ────────────────────────────────────────────────────────────────
('office-company-registrar', 'Office of the Company Registrar', 'कम्पनी रजिस्ट्रार कार्यालय',
 'business', 'government', 'federal', 'National',
 'business', 'active', 'portal_assisted', 'portal_assisted',
 'Company registration, sole proprietorship, annual returns. Online portal available.'),

('dept-of-industry', 'Department of Industry', 'उद्योग विभाग',
 'business', 'government', 'federal', 'National',
 'business', 'active', 'portal_assisted', 'department_inbox',
 'Industry registration, cottage industry permits. Mixed portal and physical process.'),

('dept-of-commerce', 'Department of Commerce, Supplies and Consumer Protection', 'वाणिज्य, आपूर्ति तथा उपभोक्ता संरक्षण विभाग',
 'business', 'government', 'federal', 'National',
 'business', 'active', 'portal_assisted', 'department_inbox',
 'Trademark registration, food/product licensing, consumer protection.'),

('tourism-board', 'Nepal Tourism Board', 'नेपाल पर्यटन बोर्ड',
 'business', 'government', 'federal', 'National',
 'business', 'active', 'portal_assisted', 'department_inbox',
 'Trekking permits (TIMS), tourism licenses. Online application with office verification.'),

('ngo-social-welfare', 'Social Welfare Council', 'समाज कल्याण परिषद्',
 'business', 'government', 'federal', 'National',
 'business', 'active', 'department_inbox', 'department_inbox',
 'NGO/INGO registration and annual renewal. Mostly document-based process.'),

-- ── BANKING ─────────────────────────────────────────────────────────────────
('nrb-central-bank', 'Nepal Rastra Bank', 'नेपाल राष्ट्र बैंक',
 'banking', 'government', 'federal', 'National',
 'banking', 'active', 'portal_assisted', 'portal_assisted',
 'Central bank. Forex cards, regulatory approvals, banking licenses.'),

('commercial-banks-general', 'Commercial Banks (General)', 'वाणिज्य बैंकहरू',
 'banking', 'private_institution', 'provider', 'National',
 'banking', 'active', 'human_bridge', 'department_inbox',
 'Account opening, KYC, loans, remittance. Each bank has own process but KYC requirements are standardized by NRB.'),

('esewa-fonepay', 'eSewa / Fonepay', 'इसेवा / फोनपे',
 'banking', 'private_institution', 'provider', 'National',
 'banking', 'active', 'portal_assisted', 'portal_assisted',
 'Digital wallet registration. Fully online with KYC verification.'),

('khalti-digital', 'Khalti Digital Wallet', 'खल्ती डिजिटल वालेट',
 'banking', 'private_institution', 'provider', 'National',
 'banking', 'active', 'portal_assisted', 'portal_assisted',
 'Digital wallet registration. App-based onboarding with KYC.'),

('remittance-operators', 'Licensed Remittance Operators', 'इजाजतपत्र प्राप्त रेमिट्यान्स संस्थाहरू',
 'banking', 'private_institution', 'provider', 'National',
 'banking', 'active', 'human_bridge', 'human_bridge',
 'Inward remittance collection. IME, Prabhu, Western Union etc. Agent-based with phone/office pickup.'),

-- ── EDUCATION ───────────────────────────────────────────────────────────────
('neb-exam-board', 'National Examination Board (NEB)', 'राष्ट्रिय परीक्षा बोर्ड',
 'education', 'government', 'federal', 'National',
 'education', 'active', 'portal_assisted', 'portal_assisted',
 'SEE results, grade sheets, exam registration. Online result portal available.'),

('scholarship-board', 'Scholarship Board / University Grants Commission', 'छात्रवृत्ति बोर्ड / विश्वविद्यालय अनुदान आयोग',
 'education', 'government', 'federal', 'National',
 'education', 'active', 'portal_assisted', 'department_inbox',
 'Government scholarship applications, foreign study NOC. Online portal for applications.'),

('loksewa-aayog', 'Public Service Commission (Loksewa Aayog)', 'लोक सेवा आयोग',
 'education', 'government', 'federal', 'National',
 'education', 'active', 'portal_assisted', 'portal_assisted',
 'Government job examinations and recruitment. Online application portal.'),

('ssf-board', 'Social Security Fund', 'सामाजिक सुरक्षा कोष',
 'education', 'government', 'federal', 'National',
 'education', 'active', 'portal_assisted', 'portal_assisted',
 'SSF registration for employers and employees. Online portal for registration and contributions.'),

-- ── LABOR ───────────────────────────────────────────────────────────────────
('dept-foreign-employment', 'Department of Foreign Employment', 'वैदेशिक रोजगार विभाग',
 'labor', 'government', 'federal', 'National',
 'identity', 'active', 'portal_assisted', 'portal_assisted',
 'Labor permits for foreign employment. Online application with physical verification.'),

('nrn-association', 'Non-Resident Nepali Association / NRNA', 'गैरआवासीय नेपाली संघ',
 'labor', 'government', 'federal', 'National',
 'identity', 'active', 'portal_assisted', 'department_inbox',
 'NRN card issuance. Application through embassies and online portal.'),

-- ── LEGAL ───────────────────────────────────────────────────────────────────
('supreme-court-nepal', 'Supreme Court / District Courts', 'सर्वोच्च अदालत / जिल्ला अदालत',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Case filing, case status lookup, hearing dates. Limited online access.'),

('ciaa-nepal', 'Commission for Investigation of Abuse of Authority (CIAA)', 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Anti-corruption complaints. Physical and online complaint filing.'),

('nhrc-nepal', 'National Human Rights Commission', 'राष्ट्रिय मानव अधिकार आयोग',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Human rights complaints and investigations. Physical and online filing.'),

('consumer-protection-forum', 'Consumer Protection Forum / Department of Commerce', 'उपभोक्ता संरक्षण मञ्च',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Consumer complaints against businesses, products, services. Online complaint form available.'),

('lokpal-ombudsman', 'Lokpal (National Ombudsman)', 'लोकपाल',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Ombudsman complaints against government bodies. Physical filing with some online intake.'),

('legal-aid-council', 'Legal Aid Council', 'कानूनी सहायता परिषद्',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Free legal aid for indigent citizens. District-level legal aid committees.'),

('rti-commission', 'National Information Commission', 'राष्ट्रिय सूचना आयोग',
 'legal', 'government', 'federal', 'National',
 'legal', 'active', 'department_inbox', 'department_inbox',
 'Right to Information requests and appeals. RTI applications to any public body.')

on conflict (key) do update set
  name = excluded.name,
  name_ne = excluded.name_ne,
  department_key = excluded.department_key,
  kind = excluded.kind,
  authority_level = excluded.authority_level,
  jurisdiction_scope = excluded.jurisdiction_scope,
  service_category = excluded.service_category,
  adoption_stage = excluded.adoption_stage,
  default_submission_mode = excluded.default_submission_mode,
  default_response_mode = excluded.default_response_mode,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Add channels for all new counterparties
-- ════════════════════════════════════════════════════════════════════════════

-- Inbox channels for all government/public institution counterparties
insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge)
select id, 'inbox', 'bidirectional', 'NepalRepublic department inbox', true, false
from service_counterparties
where key in (
  'cdo-office-general', 'local-govt-general', 'land-revenue-offices', 'survey-offices',
  'tuth-hospital', 'patan-hospital', 'civil-hospital-kathmandu', 'kanti-childrens',
  'maternity-hospital-thapathali', 'bharatpur-cancer-hospital', 'vaccination-centers',
  'municipality-waste-mgmt', 'ngo-social-welfare',
  'supreme-court-nepal', 'ciaa-nepal', 'nhrc-nepal', 'consumer-protection-forum',
  'lokpal-ombudsman', 'legal-aid-council', 'rti-commission'
)
on conflict do nothing;

-- Portal channels for portal-assisted counterparties
insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, endpoint, supports_status_sync, requires_human_bridge)
select id, 'portal', 'bidirectional', 'Official portal',
  case key
    when 'passport-regional-offices' then 'https://nepalpassport.gov.np'
    when 'election-commission-nepal' then 'https://election.gov.np'
    when 'national-id-authority' then 'https://donidcr.gov.np'
    when 'dotm-zonal-offices' then 'https://dotm.gov.np'
    when 'ird-regional' then 'https://taxpayerportal.ird.gov.np'
    when 'office-company-registrar' then 'https://ocr.gov.np'
    when 'dept-of-industry' then 'https://doi.gov.np'
    when 'dept-of-commerce' then 'https://doc.gov.np'
    when 'tourism-board' then 'https://welcomenepal.com'
    when 'nrb-central-bank' then 'https://nrb.org.np'
    when 'esewa-fonepay' then 'https://esewa.com.np'
    when 'khalti-digital' then 'https://khalti.com'
    when 'health-insurance-board' then 'https://his.nhib.gov.np'
    when 'neb-exam-board' then 'https://neb.gov.np'
    when 'scholarship-board' then 'https://ugcnepal.edu.np'
    when 'loksewa-aayog' then 'https://psc.gov.np'
    when 'ssf-board' then 'https://ssf.gov.np'
    when 'ntc-nepal-telecom' then 'https://ntc.net.np'
    when 'ncell-pvt-ltd' then 'https://ncell.axiata.com'
    when 'worldlink-communications' then 'https://worldlink.com.np'
    when 'dept-foreign-employment' then 'https://dofe.gov.np'
    when 'nrn-association' then 'https://nrna.org'
    else null
  end,
  false, true
from service_counterparties
where key in (
  'passport-regional-offices', 'election-commission-nepal', 'national-id-authority',
  'dotm-zonal-offices', 'ird-regional', 'office-company-registrar', 'dept-of-industry',
  'dept-of-commerce', 'tourism-board', 'nrb-central-bank', 'esewa-fonepay', 'khalti-digital',
  'health-insurance-board', 'neb-exam-board', 'scholarship-board', 'loksewa-aayog', 'ssf-board',
  'ntc-nepal-telecom', 'ncell-pvt-ltd', 'worldlink-communications',
  'dept-foreign-employment', 'nrn-association'
)
on conflict do nothing;

-- Phone channels for phone-based services
insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge)
select id, 'phone', 'bidirectional', 'Office phone', false, true
from service_counterparties
where key in (
  'cdo-office-general', 'local-govt-general', 'land-revenue-offices', 'survey-offices',
  'ambulance-service-nepal', 'lpg-distributors', 'commercial-banks-general', 'remittance-operators'
)
on conflict do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Map ALL services to counterparty routes
-- ════════════════════════════════════════════════════════════════════════════

-- Helper: insert routes for all service-to-counterparty mappings
-- Format: (service_slug, department_key, counterparty_key, submission_mode, response_mode, sla_hours, warning_hours, escalation, auto_followup, followup_hours, strategy)

-- ── IDENTITY SERVICES ───────────────────────────────────────────────────────

-- citizenship-by-birth → CDO Office
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'citizenship-by-birth', 'district-administration', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 168, 120, 'notify_manager', true, 48, '{"strategy":"Citizenship by birth through DAO inbox. Citizen provides birth certificate + parents citizenship. 7-day target."}'::jsonb
from service_counterparties where key = 'cdo-office-general' on conflict do nothing;

-- citizenship-duplicate → CDO
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'citizenship-duplicate', 'district-administration', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 336, 240, 'notify_manager', true, 72, '{"strategy":"Duplicate citizenship requires police report + newspaper publication. 14-day SLA due to gazette notice period."}'::jsonb
from service_counterparties where key = 'cdo-office-general' on conflict do nothing;

-- migration-certificate → CDO
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'migration-certificate', 'district-administration', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 72, 48, 'notify_manager', true, 24, '{"strategy":"Migration certificate from DAO. Ward recommendation + citizenship required. 3-day target."}'::jsonb
from service_counterparties where key = 'cdo-office-general' on conflict do nothing;

-- police-report → CDO / police
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'police-report', 'district-administration', id, 150, true, 'department_inbox', 'department_inbox', true, true, true, false, 48, 24, 'escalate_department', true, 24, '{"strategy":"Police report filed at local police station. DAO issues verified copy if needed. 2-day target."}'::jsonb
from service_counterparties where key = 'cdo-office-general' on conflict do nothing;

-- birth-registration → local govt
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'birth-registration', 'local-govt', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 72, 48, 'notify_manager', true, 24, '{"strategy":"Birth registration at ward office. Ward secretary verifies and issues certificate. 3-day target."}'::jsonb
from service_counterparties where key = 'local-govt-general' on conflict do nothing;

-- marriage-registration → local govt
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'marriage-registration', 'local-govt', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 72, 48, 'notify_manager', true, 24, '{"strategy":"Marriage registration at ward/municipality. Both parties present with witnesses. 3-day target."}'::jsonb
from service_counterparties where key = 'local-govt-general' on conflict do nothing;

-- death-registration → local govt
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'death-registration', 'local-govt', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 72, 48, 'notify_manager', true, 24, '{"strategy":"Death registration at ward office. Medical certificate required. 3-day target."}'::jsonb
from service_counterparties where key = 'local-govt-general' on conflict do nothing;

-- divorce-registration → local govt
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'divorce-registration', 'local-govt', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 168, 120, 'notify_manager', true, 48, '{"strategy":"Divorce registration at municipality. Court order required. 7-day target after court decree."}'::jsonb
from service_counterparties where key = 'local-govt-general' on conflict do nothing;

-- voter-registration → Election Commission
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'voter-registration', 'local-govt', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, false, 720, 480, 'notify_manager', true, 168, '{"strategy":"Voter registration through Election Commission portal. Photo + citizenship required. 30-day target due to verification cycle."}'::jsonb
from service_counterparties where key = 'election-commission-nepal' on conflict do nothing;

-- national-id-nid → National ID Authority
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'national-id-nid', 'local-govt', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, false, 720, 480, 'notify_manager', true, 168, '{"strategy":"NID card through biometric enrollment at district center. Card issued centrally. 30-day target."}'::jsonb
from service_counterparties where key = 'national-id-authority' on conflict do nothing;

-- nrn-card → NRN Association
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'nrn-card', 'labor', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true, 720, 480, 'notify_manager', true, 168, '{"strategy":"NRN card through embassy or online portal. Document verification required. 30-day target."}'::jsonb
from service_counterparties where key = 'nrn-association' on conflict do nothing;

-- labor-permit → Dept Foreign Employment
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'labor-permit', 'labor', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true, 168, 120, 'notify_manager', true, 48, '{"strategy":"Labor permit through DoFE portal. Medical + insurance + contract required. 7-day target."}'::jsonb
from service_counterparties where key = 'dept-foreign-employment' on conflict do nothing;


-- ── TRANSPORT SERVICES ──────────────────────────────────────────────────────

insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'transport', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, false, true,
  case slug
    when 'drivers-license-trial' then 168
    when 'drivers-license-new' then 168
    when 'bike-bluebook-renewal' then 72
    when 'vehicle-registration' then 168
    when 'route-permit' then 72
    when 'bus-route-permit' then 168
    when 'vehicle-tax-payment' then 24
    when 'pollution-test' then 4
    when 'embossed-number-plate' then 336
    else 168
  end,
  case slug
    when 'vehicle-tax-payment' then 12
    when 'pollution-test' then 2
    when 'bike-bluebook-renewal' then 48
    when 'route-permit' then 48
    when 'embossed-number-plate' then 240
    else 120
  end,
  'notify_manager', true,
  case slug when 'pollution-test' then 4 when 'vehicle-tax-payment' then 12 else 48 end,
  jsonb_build_object('strategy', 'DoTM portal-assisted route. Booking, payment, biometrics/inspection at office. Status tracked through NepalRepublic.')
from service_counterparties, (values
  ('drivers-license-trial'), ('drivers-license-new'), ('bike-bluebook-renewal'),
  ('vehicle-registration'), ('route-permit'), ('bus-route-permit'),
  ('vehicle-tax-payment'), ('pollution-test'), ('embossed-number-plate')
) as slugs(slug)
where service_counterparties.key = 'dotm-zonal-offices'
on conflict do nothing;


-- ── TAX SERVICES ────────────────────────────────────────────────────────────

-- pan-business, vat-registration, income-tax-filing, customs-declaration, ird-taxpayer-portal → IRD
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'tax', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true,
  case slug when 'customs-declaration' then 48 else 72 end,
  case slug when 'customs-declaration' then 24 else 48 end,
  'notify_manager', true, 24,
  jsonb_build_object('strategy', 'IRD taxpayer portal. File online, pay at bank/eSewa, reference captured in case.')
from service_counterparties, (values
  ('pan-business'), ('vat-registration'), ('income-tax-filing'), ('customs-declaration'), ('ird-taxpayer-portal')
) as slugs(slug)
where service_counterparties.key = 'ird-regional'
on conflict do nothing;

-- house-land-tax → Municipality Revenue
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'house-land-tax', 'tax', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, true, 48, 24, 'notify_manager', true, 24, '{"strategy":"Property tax at municipality revenue counter. Land ownership proof + building details required. 2-day target."}'::jsonb
from service_counterparties where key = 'municipality-revenue' on conflict do nothing;


-- ── LAND SERVICES ───────────────────────────────────────────────────────────

-- land-registration, land-parcha, land-mutation, land-inheritance → Land Revenue Office
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'land', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, true,
  case slug
    when 'land-parcha' then 48
    when 'land-mutation' then 336
    when 'land-inheritance' then 720
    when 'land-registration' then 168
    else 168
  end,
  case slug when 'land-parcha' then 24 when 'land-mutation' then 240 when 'land-inheritance' then 480 else 120 end,
  'notify_manager', true,
  case slug when 'land-parcha' then 24 when 'land-inheritance' then 72 else 48 end,
  jsonb_build_object('strategy', 'Land Revenue Office process. Physical documents + revenue stamps required. Kitta references tracked in case.')
from service_counterparties, (values ('land-registration'), ('land-parcha'), ('land-mutation'), ('land-inheritance')) as slugs(slug)
where service_counterparties.key = 'land-revenue-offices'
on conflict do nothing;

-- land-measurement, land-valuation → Survey Office
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'land', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, true,
  case slug when 'land-measurement' then 336 else 168 end,
  case slug when 'land-measurement' then 240 else 120 end,
  'notify_manager', true, 72,
  jsonb_build_object('strategy', 'Survey Office process. Physical site visit by surveyor required. Queue + field visit scheduling.')
from service_counterparties, (values ('land-measurement'), ('land-valuation')) as slugs(slug)
where service_counterparties.key = 'survey-offices'
on conflict do nothing;


-- ── UTILITY SERVICES ────────────────────────────────────────────────────────

-- nea-new-connection → NEA
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'nea-new-connection', 'electricity', id, 200, true, 'human_bridge', 'department_inbox', true, true, true, true, 336, 240, 'escalate_department', true, 72, '{"strategy":"NEA new connection. Application at local NEA office, site inspection, meter installation. 14-day target."}'::jsonb
from service_counterparties where key = 'nea-service-operations' on conflict do nothing;

-- kukl-new-connection, kukl-water-bill → KUKL
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'water', id, 200, true, 'human_bridge', 'department_inbox', true, true, true, true,
  case slug when 'kukl-new-connection' then 720 else 48 end,
  case slug when 'kukl-new-connection' then 480 else 24 end,
  'escalate_department', true, case slug when 'kukl-new-connection' then 168 else 24 end,
  jsonb_build_object('strategy', 'KUKL service. Application at KUKL office, pipeline survey, connection/billing.')
from service_counterparties, (values ('kukl-new-connection'), ('kukl-water-bill')) as slugs(slug)
where service_counterparties.key = 'kukl-service-operations'
on conflict do nothing;

-- ntc-sim-new, internet-nt-adsl → NTC
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'utilities', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, true,
  case slug when 'ntc-sim-new' then 4 else 168 end,
  case slug when 'ntc-sim-new' then 2 else 120 end,
  'none', false, 48,
  jsonb_build_object('strategy', 'NTC service center. ID verification + form submission.')
from service_counterparties, (values ('ntc-sim-new'), ('internet-nt-adsl')) as slugs(slug)
where service_counterparties.key = 'ntc-nepal-telecom'
on conflict do nothing;

-- ncell-sim-new → Ncell
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'ncell-sim-new', 'utilities', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, true, 4, 2, 'none', false, 48, '{"strategy":"Ncell dealer or center. ID scan + biometric. Same-day activation."}'::jsonb
from service_counterparties where key = 'ncell-pvt-ltd' on conflict do nothing;

-- worldlink-internet → WorldLink
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'worldlink-internet', 'utilities', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, true, 72, 48, 'none', false, 24, '{"strategy":"WorldLink online application. Technician visit for installation within 3 days."}'::jsonb
from service_counterparties where key = 'worldlink-communications' on conflict do nothing;

-- lpg-booking → LPG distributors
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'lpg-booking', 'utilities', id, 200, true, 'human_bridge', 'human_bridge', false, false, false, true, 48, 24, 'none', false, 24, '{"strategy":"Phone booking with local LPG dealer. Cylinder delivery within 2 days."}'::jsonb
from service_counterparties where key = 'lpg-distributors' on conflict do nothing;

-- garbage-collection → Municipality waste
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'garbage-collection', 'utilities', id, 200, true, 'department_inbox', 'department_inbox', false, false, true, true, 72, 48, 'notify_manager', true, 48, '{"strategy":"Municipal waste service registration. Ward office handles schedule assignment."}'::jsonb
from service_counterparties where key = 'municipality-waste-mgmt' on conflict do nothing;


-- ── HEALTH SERVICES ─────────────────────────────────────────────────────────

-- tuth-opd → TUTH
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'tuth-opd', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, false, true, false, 4, 2, 'escalate_department', false, null, '{"strategy":"TUTH OPD token and queue. Same-day service, token-based system."}'::jsonb
from service_counterparties where key = 'tuth-hospital' on conflict do nothing;

-- patan-hospital-opd → Patan
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'patan-hospital-opd', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, false, true, false, 4, 2, 'escalate_department', false, null, '{"strategy":"Patan Hospital OPD. Token-based queue, same-day consultation target."}'::jsonb
from service_counterparties where key = 'patan-hospital' on conflict do nothing;

-- civil-hospital-opd → Civil Hospital
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'civil-hospital-opd', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, false, true, false, 4, 2, 'escalate_department', false, null, '{"strategy":"Civil Hospital OPD registration and queue. Same-day target."}'::jsonb
from service_counterparties where key = 'civil-hospital-kathmandu' on conflict do nothing;

-- vaccination-child → Vaccination Centers
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'vaccination-child', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 24, 12, 'notify_manager', true, 24, '{"strategy":"Child vaccination at ward health post. Schedule-based, card tracking. Next-day target."}'::jsonb
from service_counterparties where key = 'vaccination-centers' on conflict do nothing;

-- health-insurance-board → HIB
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'health-insurance-board', 'health', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true, 168, 120, 'notify_manager', true, 48, '{"strategy":"Health insurance enrollment through HIB portal. Family details + payment. 7-day activation target."}'::jsonb
from service_counterparties where key = 'health-insurance-board' on conflict do nothing;

-- kanti-childrens-hospital → Kanti
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'kanti-childrens-hospital', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, false, true, false, 4, 2, 'escalate_department', false, null, '{"strategy":"Kanti Children Hospital OPD. Pediatric token queue, same-day consultation."}'::jsonb
from service_counterparties where key = 'kanti-childrens' on conflict do nothing;

-- maternity-hospital → Maternity
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'maternity-hospital', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, false, true, false, 4, 2, 'escalate_department', false, null, '{"strategy":"Maternity Hospital Thapathali. Prenatal checkup queue, delivery admission."}'::jsonb
from service_counterparties where key = 'maternity-hospital-thapathali' on conflict do nothing;

-- bharatpur-cancer → Bharatpur
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'bharatpur-cancer', 'health', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 48, 24, 'escalate_department', true, 48, '{"strategy":"BP Koirala Cancer Hospital. Referral-based OPD, treatment queue. 2-day initial consultation target."}'::jsonb
from service_counterparties where key = 'bharatpur-cancer-hospital' on conflict do nothing;

-- ambulance-102 → Ambulance
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'ambulance-102', 'health', id, 200, true, 'human_bridge', 'human_bridge', false, false, false, false, 1, 0, 'escalate_admin', false, null, '{"strategy":"Emergency ambulance dispatch via 102. Immediate response target. Phone-based coordination."}'::jsonb
from service_counterparties where key = 'ambulance-service-nepal' on conflict do nothing;


-- ── BUSINESS SERVICES ───────────────────────────────────────────────────────

-- company-registration-ocr, sole-proprietorship → OCR
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'business', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true,
  case slug when 'company-registration-ocr' then 168 else 72 end,
  case slug when 'company-registration-ocr' then 120 else 48 end,
  'notify_manager', true, 48,
  jsonb_build_object('strategy', 'OCR portal registration. MOA/AOA upload, name search, registration number issued.')
from service_counterparties, (values ('company-registration-ocr'), ('sole-proprietorship')) as slugs(slug)
where service_counterparties.key = 'office-company-registrar'
on conflict do nothing;

-- trademark-registration → Dept Commerce
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'trademark-registration', 'business', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true, 2160, 1440, 'notify_manager', true, 168, '{"strategy":"Trademark registration at Dept of Commerce. Search + application + publication + opposition period. 90-day target."}'::jsonb
from service_counterparties where key = 'dept-of-commerce' on conflict do nothing;

-- fssai-food-license → Dept Commerce
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'fssai-food-license', 'business', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true, 336, 240, 'notify_manager', true, 72, '{"strategy":"DFTQC food license. Application + inspection + lab test + license issue. 14-day target."}'::jsonb
from service_counterparties where key = 'dept-of-commerce' on conflict do nothing;

-- industry-registration, cottage-industry → Dept Industry
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'business', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true, 168, 120, 'notify_manager', true, 48,
  jsonb_build_object('strategy', 'Department of Industry registration. Application + inspection + certificate.')
from service_counterparties, (values ('industry-registration'), ('cottage-industry')) as slugs(slug)
where service_counterparties.key = 'dept-of-industry'
on conflict do nothing;

-- ngo-registration → Social Welfare Council
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'ngo-registration', 'business', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, true, 720, 480, 'notify_manager', true, 168, '{"strategy":"NGO registration at SWC. Constitution + objectives + board details. 30-day target."}'::jsonb
from service_counterparties where key = 'ngo-social-welfare' on conflict do nothing;

-- tourism-trekking-permit → Tourism Board
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'tourism-trekking-permit', 'business', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true, 48, 24, 'none', false, 24, '{"strategy":"TIMS permit through NTB office or online. Passport + itinerary required. 2-day target."}'::jsonb
from service_counterparties where key = 'tourism-board' on conflict do nothing;


-- ── BANKING SERVICES ────────────────────────────────────────────────────────

-- bank-account-opening → Commercial Banks
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'bank-account-opening', 'banking', id, 200, true, 'human_bridge', 'department_inbox', true, true, true, false, 24, 12, 'none', false, 24, '{"strategy":"Bank branch visit. KYC documents + photo + initial deposit. Same-day or next-day activation."}'::jsonb
from service_counterparties where key = 'commercial-banks-general' on conflict do nothing;

-- forex-card-nrb → NRB
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'forex-card-nrb', 'banking', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true, 72, 48, 'notify_manager', true, 24, '{"strategy":"Forex card through bank + NRB approval. Travel documents + purpose verification. 3-day target."}'::jsonb
from service_counterparties where key = 'nrb-central-bank' on conflict do nothing;

-- esewa-wallet → eSewa
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'esewa-wallet', 'banking', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, false, 4, 2, 'none', false, null, '{"strategy":"eSewa digital wallet. App registration + KYC selfie + ID upload. Same-day activation."}'::jsonb
from service_counterparties where key = 'esewa-fonepay' on conflict do nothing;

-- khalti-wallet → Khalti
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'khalti-wallet', 'banking', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, false, 4, 2, 'none', false, null, '{"strategy":"Khalti wallet. App registration + KYC verification. Same-day activation."}'::jsonb
from service_counterparties where key = 'khalti-digital' on conflict do nothing;

-- remittance-inward → Remittance operators
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'remittance-inward', 'banking', id, 200, true, 'human_bridge', 'human_bridge', false, true, false, true, 4, 2, 'none', false, null, '{"strategy":"Remittance collection at agent counter. ID verification + MTCN/reference number. Same-day payout."}'::jsonb
from service_counterparties where key = 'remittance-operators' on conflict do nothing;


-- ── EDUCATION SERVICES ──────────────────────────────────────────────────────

-- see-results → NEB
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'see-results', 'education', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, false, 4, 2, 'none', false, null, '{"strategy":"SEE results on NEB portal. Symbol number lookup. Instant result after publication date."}'::jsonb
from service_counterparties where key = 'neb-exam-board' on conflict do nothing;

-- scholarship-application, scholarship-portal, noc-foreign-study → Scholarship Board
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select slug, 'education', id, 200, true, 'portal_assisted', 'department_inbox', true, true, true, true,
  case slug when 'noc-foreign-study' then 168 else 720 end,
  case slug when 'noc-foreign-study' then 120 else 480 end,
  'notify_manager', true, case slug when 'noc-foreign-study' then 48 else 168 end,
  jsonb_build_object('strategy', 'UGC/Scholarship Board portal. Application + document verification + selection/approval.')
from service_counterparties, (values ('scholarship-application'), ('scholarship-portal'), ('noc-foreign-study')) as slugs(slug)
where service_counterparties.key = 'scholarship-board'
on conflict do nothing;

-- loksewa-application → Loksewa Aayog
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'loksewa-application', 'education', id, 200, true, 'portal_assisted', 'portal_assisted', false, true, true, true, 4, 2, 'none', false, null, '{"strategy":"Loksewa online application. Portal registration + exam fee + admit card. Instant after payment."}'::jsonb
from service_counterparties where key = 'loksewa-aayog' on conflict do nothing;

-- ssf-registration → SSF Board
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'ssf-registration', 'education', id, 200, true, 'portal_assisted', 'portal_assisted', true, true, true, true, 72, 48, 'notify_manager', true, 24, '{"strategy":"SSF registration through employer portal. Employer registers, employees enrolled. 3-day target."}'::jsonb
from service_counterparties where key = 'ssf-board' on conflict do nothing;


-- ── LEGAL SERVICES ──────────────────────────────────────────────────────────

-- consumer-complaint → Consumer Protection
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'consumer-complaint', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 336, 240, 'escalate_department', true, 72, '{"strategy":"Consumer complaint to DCSP. Complaint filing + investigation + mediation/hearing. 14-day target."}'::jsonb
from service_counterparties where key = 'consumer-protection-forum' on conflict do nothing;

-- lokpal-complaint → Lokpal
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'lokpal-complaint', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 720, 480, 'escalate_admin', true, 168, '{"strategy":"Lokpal complaint against government body. Filing + acknowledgment + investigation. 30-day target."}'::jsonb
from service_counterparties where key = 'lokpal-ombudsman' on conflict do nothing;

-- court-case-lookup → Courts
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'court-case-lookup', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 48, 24, 'notify_manager', true, 48, '{"strategy":"Court case status lookup. Case number + party name search. 2-day response target for status update."}'::jsonb
from service_counterparties where key = 'supreme-court-nepal' on conflict do nothing;

-- legal-aid → Legal Aid Council
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'legal-aid', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 168, 120, 'escalate_department', true, 48, '{"strategy":"Legal Aid Council application. Income verification + case assessment + lawyer assignment. 7-day target."}'::jsonb
from service_counterparties where key = 'legal-aid-council' on conflict do nothing;

-- right-to-information → NIC
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'right-to-information', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 360, 240, 'escalate_admin', true, 72, '{"strategy":"RTI request to any public body. 15-day legal deadline for response. NIC handles appeals."}'::jsonb
from service_counterparties where key = 'rti-commission' on conflict do nothing;

-- ciaa-complaint → CIAA
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'ciaa-complaint', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 720, 480, 'escalate_admin', true, 168, '{"strategy":"CIAA anti-corruption complaint. Evidence submission + investigation. 30-day acknowledgment target."}'::jsonb
from service_counterparties where key = 'ciaa-nepal' on conflict do nothing;

-- human-rights-complaint → NHRC
insert into service_counterparty_routes (service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode, required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours, metadata)
select 'human-rights-complaint', 'legal', id, 200, true, 'department_inbox', 'department_inbox', true, true, true, false, 720, 480, 'escalate_admin', true, 168, '{"strategy":"NHRC human rights complaint. Filing + investigation + recommendation. 30-day target."}'::jsonb
from service_counterparties where key = 'nhrc-nepal' on conflict do nothing;
