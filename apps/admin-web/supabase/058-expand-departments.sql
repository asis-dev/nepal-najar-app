-- Expand service_departments with new department keys used by service-routing.ts
-- Also adds Nepali names (name_ne) for all departments and default workflow policies.

insert into service_departments (key, name, name_ne, authority_level, default_queue_label, description)
values
  ('business',   'Office of the Company Registrar (OCR)',          'कम्पनी रजिस्ट्रार कार्यालय',         'federal',  'Business registration cases', 'Handles company registration, industry licensing, and business-related services.'),
  ('land',       'Land Revenue Office',                            'मालपोत कार्यालय',                    'district', 'Land & property cases',       'Handles land registration, valuation, parcha, and house-land tax services.'),
  ('education',  'University & Education Services',                'विश्वविद्यालय तथा शिक्षा सेवा',       'federal',  'Education cases',             'Handles transcript requests, NOCs for foreign study, and Loksewa applications.'),
  ('legal',      'Legal & Complaints Authority',                   'कानुनी तथा उजुरी निकाय',             'federal',  'Legal complaint cases',       'Handles CIAA complaints, consumer complaints, human rights, and lokpal cases.'),
  ('labor',      'Department of Foreign Employment',               'वैदेशिक रोजगार विभाग',               'federal',  'Labor permit cases',          'Handles labor permits and foreign employment services.'),
  ('banking',    'Nepal Rastra Bank / Commercial Banks',           'नेपाल राष्ट्र बैंक / वाणिज्य बैंक',    'provider', 'Banking service cases',       'Handles bank account opening, forex cards, and banking-related services.'),
  ('utilities',  'Utility Service Providers',                      'उपयोगिता सेवा प्रदायकहरू',            'provider', 'Utility cases',               'General utilities routing when specific NEA/KUKL match is not found.'),
  ('local-govt', 'Local Government (Ward/Municipality)',           'स्थानीय सरकार (वडा/नगरपालिका)',       'local',    'Local government cases',      'Handles ward-level services like birth/marriage registration, local taxes.')
on conflict (key) do update set
  name = excluded.name,
  name_ne = excluded.name_ne,
  authority_level = excluded.authority_level,
  default_queue_label = excluded.default_queue_label,
  description = excluded.description,
  is_active = true,
  updated_at = now();

-- Add Nepali names to the 7 original departments
update service_departments set name_ne = 'यातायात व्यवस्थापन विभाग'          where key = 'transport'              and name_ne is null;
update service_departments set name_ne = 'राहदानी विभाग'                      where key = 'passport'               and name_ne is null;
update service_departments set name_ne = 'जिल्ला प्रशासन कार्यालय'             where key = 'district-administration' and name_ne is null;
update service_departments set name_ne = 'आन्तरिक राजस्व विभाग'               where key = 'tax'                    and name_ne is null;
update service_departments set name_ne = 'नेपाल विद्युत प्राधिकरण'              where key = 'electricity'            and name_ne is null;
update service_departments set name_ne = 'काठमाडौं उपत्यका खानेपानी लिमिटेड'    where key = 'water'                  and name_ne is null;
update service_departments set name_ne = 'अस्पताल तथा ओपीडी सेवा'             where key = 'health'                 and name_ne is null;

-- Default workflow policies for new departments (one per department, no specific service_slug)
insert into service_workflow_policies (
  service_slug,
  department_key,
  queue_entry_state,
  first_response_hours,
  resolution_hours,
  escalation_hours,
  required_approval_role,
  priority,
  is_active
)
values
  -- Business: moderate SLA
  (null, 'business',   'new', 24, 168, 72, 'reviewer', 100, true),
  -- Land: slower due to field verification
  (null, 'land',       'new', 24, 240, 96, 'approver', 100, true),
  -- Education: moderate
  (null, 'education',  'new', 12, 120, 48, 'reviewer', 100, true),
  -- Legal: fast first response, longer resolution
  (null, 'legal',      'new', 8,  240, 48, 'approver', 100, true),
  -- Labor: federal process, slower
  (null, 'labor',      'new', 24, 240, 96, 'approver', 100, true),
  -- Banking: provider-driven, fast
  (null, 'banking',    'new', 4,  48,  24, 'reviewer', 100, true),
  -- Utilities: fast billing queries
  (null, 'utilities',  'new', 4,  24,  12, 'reviewer', 100, true),
  -- Local govt: moderate
  (null, 'local-govt', 'new', 12, 120, 48, 'reviewer', 100, true),
  -- Also add defaults for existing departments that only had service-specific policies
  (null, 'transport',            'new', 12, 120, 48, 'approver', 50, true),
  (null, 'passport',             'new', 24, 240, 96, 'approver', 50, true),
  (null, 'district-administration','new', 24, 240, 96, 'approver', 50, true),
  (null, 'tax',                  'new', 12, 96,  48, 'reviewer', 50, true),
  (null, 'electricity',          'new', 4,  24,  12, 'reviewer', 50, true),
  (null, 'water',                'new', 6,  36,  18, 'reviewer', 50, true),
  (null, 'health',               'new', 2,  24,  8,  'reviewer', 50, true)
on conflict do nothing;
