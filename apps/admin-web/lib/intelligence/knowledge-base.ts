/**
 * Promise Knowledge Base
 *
 * Deep context about each of the 35 promises so the AI can
 * understand INTENT, not just match keywords.
 */

export interface PromiseKnowledge {
  id: number;
  title: string;
  titleNe: string;
  category: string;
  description: string;
  keyAspects: string;
  progressIndicators: string;
  stallIndicators: string;
  keyOfficials: string[];
  keyMinistries: string[];
  budgetRelevance: string;
  currentStatus?: string;
}

export const PROMISES_KNOWLEDGE: PromiseKnowledge[] = [
  {
    id: 1,
    title: 'Directly Elected Executive System',
    titleNe: 'प्रत्यक्ष निर्वाचित कार्यकारी प्रणाली',
    category: 'Governance',
    description:
      'Prepare constitutional amendment discussion paper within 3 months for directly elected head of state',
    keyAspects:
      'Constitutional amendment, presidential system, direct election of PM/President, separation of powers',
    progressIndicators:
      'Discussion paper drafted, committee formed, parliamentary debate scheduled, amendment bill tabled, public consultation started',
    stallIndicators:
      'No committee formed after 3 months, opposition blocks discussion, deadline missed, no public consultation',
    keyOfficials: [
      'Prime Minister',
      'Law Minister',
      'Constitution Amendment Committee Chair',
    ],
    keyMinistries: [
      'Office of PM',
      'Ministry of Law & Justice',
      'Federal Parliament',
    ],
    budgetRelevance:
      'Minimal budget needed — primarily legislative/political process',
  },
  {
    id: 2,
    title: 'Westminster Parliamentary Reform',
    titleNe: 'वेस्टमिन्स्टर संसदीय सुधार',
    category: 'Governance',
    description:
      'Reform parliamentary system towards Westminster model with stronger PM accountability',
    keyAspects:
      'Parliamentary reform, PM question time, committee system strengthening, opposition rights',
    progressIndicators:
      'Reform committee formed, parliamentary rules amended, PM question time introduced, committee powers expanded',
    stallIndicators:
      'No reform committee, rules unchanged, PM avoids accountability sessions',
    keyOfficials: ['Speaker of Parliament', 'PM', 'Opposition Leader'],
    keyMinistries: ['Federal Parliament', 'Ministry of Law & Justice'],
    budgetRelevance: 'Minimal — procedural reform',
  },
  {
    id: 3,
    title: 'National Development Vision',
    titleNe: 'राष्ट्रिय विकास दूरदृष्टि',
    category: 'Economy',
    description:
      'Create 25-year national development vision and 5-year implementation plan',
    keyAspects:
      'Long-term planning, NPC role, economic vision 2050, development roadmap',
    progressIndicators:
      'Vision document drafted, NPC consultations held, plan approved by cabinet, targets set',
    stallIndicators:
      'No document produced, NPC inactive, no stakeholder consultation',
    keyOfficials: ['NPC Vice Chair', 'PM', 'Finance Minister'],
    keyMinistries: ['National Planning Commission', 'Ministry of Finance'],
    budgetRelevance: 'NPR 50-100M for planning process',
  },
  {
    id: 4,
    title: 'Anti-Corruption Bill',
    titleNe: 'भ्रष्टाचार विरोधी विधेयक',
    category: 'Anti-Corruption',
    description:
      'Table comprehensive anti-corruption bill within first parliamentary session',
    keyAspects:
      'CIAA strengthening, whistleblower protection, asset declaration, corruption courts',
    progressIndicators:
      'Bill drafted, tabled in parliament, committee review started, CIAA consulted, public feedback period',
    stallIndicators:
      'No bill drafted, parliamentary session passes without tabling, CIAA undermined',
    keyOfficials: ['Law Minister', 'CIAA Chief', 'Attorney General'],
    keyMinistries: [
      'Ministry of Law & Justice',
      'CIAA',
      'Attorney General Office',
    ],
    budgetRelevance: 'NPR 200-500M for CIAA capacity building',
  },
  {
    id: 5,
    title: 'Judicial Independence',
    titleNe: 'न्यायिक स्वतन्त्रता',
    category: 'Governance',
    description:
      'Ensure full judicial independence through constitutional and legal reforms',
    keyAspects:
      'Judge appointments, judicial council reform, court infrastructure, case backlog reduction',
    progressIndicators:
      'Judicial council reformed, judge appointment process transparent, court digitization started',
    stallIndicators:
      'Political interference in appointments, judicial council unchanged, case backlog growing',
    keyOfficials: [
      'Chief Justice',
      'Law Minister',
      'Judicial Council members',
    ],
    keyMinistries: [
      'Supreme Court',
      'Ministry of Law & Justice',
      'Judicial Council',
    ],
    budgetRelevance: 'NPR 1-2B for court infrastructure',
  },
  {
    id: 6,
    title: 'Merit-Based Bureaucracy',
    titleNe: 'योग्यतामा आधारित नोकरशाही',
    category: 'Governance',
    description:
      'Reform civil service for merit-based appointments and promotions, end political transfers',
    keyAspects:
      'PSC reform, merit promotion, political transfer ban, performance evaluation, digital HR',
    progressIndicators:
      'Transfer policy reformed, performance evaluation system implemented, PSC independence strengthened',
    stallIndicators:
      'Mass political transfers continue, PSC recommendations ignored, no performance system',
    keyOfficials: ['Chief Secretary', 'PM', 'PSC Chair'],
    keyMinistries: [
      'Office of PM',
      'Public Service Commission',
      'Ministry of General Administration',
    ],
    budgetRelevance: 'NPR 500M for HR systems',
  },
  {
    id: 7,
    title: 'E-Procurement System',
    titleNe: 'ई-खरिद प्रणाली',
    category: 'Anti-Corruption',
    description:
      'Implement fully digital e-procurement system for all government purchases',
    keyAspects:
      'PPMO reform, digital bidding, transparency, procurement data open, contractor ratings',
    progressIndicators:
      'E-procurement portal launched, ministries onboarded, procurement data published, bidding process digitized',
    stallIndicators:
      'Portal delayed, ministries resist adoption, manual processes continue',
    keyOfficials: ['PPMO Director General', 'Finance Minister'],
    keyMinistries: ['PPMO', 'Ministry of Finance'],
    budgetRelevance: 'NPR 300-500M for IT infrastructure',
  },
  {
    id: 8,
    title: 'GDP Growth Acceleration',
    titleNe: 'GDP वृद्धि त्वरण',
    category: 'Economy',
    description:
      'Achieve sustained GDP growth above 7% through economic reforms',
    keyAspects:
      'Investment climate, FDI attraction, industrial policy, economic liberalization',
    progressIndicators:
      'GDP growth trending up, FDI increasing, new industries established, investment law reformed',
    stallIndicators:
      'GDP growth below 5%, FDI declining, business confidence low, reforms stalled',
    keyOfficials: ['Finance Minister', 'NRB Governor', 'NPC Vice Chair'],
    keyMinistries: [
      'Ministry of Finance',
      'Nepal Rastra Bank',
      'NPC',
      'Ministry of Industry',
    ],
    budgetRelevance:
      'Macro-economic indicator — tracked via NRB/CBS data',
  },
  {
    id: 9,
    title: 'Youth Employment Program',
    titleNe: 'युवा रोजगार कार्यक्रम',
    category: 'Economy',
    description:
      'Create 500,000 jobs domestically and reform foreign employment to protect workers',
    keyAspects:
      'Job creation, skill development, foreign employment reform, returning workers, startup support',
    progressIndicators:
      'Employment programs launched, job data published, foreign employment regulations reformed, startup fund created',
    stallIndicators:
      'Youth unemployment rising, brain drain accelerating, no new programs, foreign worker exploitation continues',
    keyOfficials: ['Labour Minister', 'Industry Minister'],
    keyMinistries: [
      'Ministry of Labour',
      'Ministry of Industry',
      'CTEVT',
      'Foreign Employment Board',
    ],
    budgetRelevance: 'NPR 5-10B for employment programs',
  },
  {
    id: 10,
    title: 'Trade Deficit Reduction',
    titleNe: 'व्यापार घाटा कटौती',
    category: 'Economy',
    description:
      'Reduce trade deficit by promoting exports and import substitution',
    keyAspects:
      'Export promotion, import substitution, trade agreements, industrial zones, TEPC role',
    progressIndicators:
      'Trade deficit narrowing, export value increasing, new trade agreements, SEZs operational',
    stallIndicators:
      'Trade deficit widening, exports declining, no new trade agreements',
    keyOfficials: ['Commerce Minister', 'TEPC Chair', 'NRB Governor'],
    keyMinistries: ['Ministry of Commerce', 'TEPC', 'Nepal Rastra Bank'],
    budgetRelevance: 'NPR 2-5B for export infrastructure',
  },
  {
    id: 11,
    title: 'Tax System Modernization',
    titleNe: 'कर प्रणाली आधुनिकीकरण',
    category: 'Economy',
    description:
      'Digitize tax collection, broaden tax base, simplify compliance',
    keyAspects:
      'Digital tax filing, PAN system, VAT reform, tax base broadening, IRD modernization',
    progressIndicators:
      'Online tax filing launched, tax revenue increasing, compliance simplified, PAN coverage expanded',
    stallIndicators:
      'Manual tax processes continue, revenue targets missed, informal economy growing',
    keyOfficials: ['Finance Minister', 'IRD Director General'],
    keyMinistries: ['Ministry of Finance', 'Inland Revenue Department'],
    budgetRelevance:
      'NPR 1-2B for IT systems; revenue impact NPR 50B+',
  },
  {
    id: 12,
    title: '30,000 MW Hydropower',
    titleNe: '३०,००० मेगावाट जलविद्युत',
    category: 'Energy',
    description:
      'Develop 30,000 MW hydropower capacity for domestic use and export',
    keyAspects:
      'Hydropower construction, PPA agreements, cross-border power trade, NEA reform, IPP promotion',
    progressIndicators:
      'New dam construction started, PPA signed with India/Bangladesh, generation capacity increasing, NEA profitable',
    stallIndicators:
      'Projects delayed, no new PPAs, environmental opposition, NEA losses continue',
    keyOfficials: ['Energy Minister', 'NEA MD', 'DOED DG'],
    keyMinistries: ['Ministry of Energy', 'NEA', 'DOED', 'IBN'],
    budgetRelevance: 'NPR 50-100B+ (massive infrastructure)',
  },
  {
    id: 13,
    title: 'Clean Drinking Water',
    titleNe: 'स्वच्छ खानेपानी',
    category: 'Infrastructure',
    description:
      'Ensure clean drinking water access for all citizens, complete Melamchi',
    keyAspects:
      'Melamchi completion, rural water supply, KUKL reform, water quality testing',
    progressIndicators:
      'Melamchi phases completed, rural water projects delivered, water quality improving, KUKL restructured',
    stallIndicators:
      'Melamchi delays, rural areas without water, KUKL inefficient, water contamination',
    keyOfficials: ['Water Supply Minister', 'KUKL MD'],
    keyMinistries: ['Ministry of Water Supply', 'KUKL', 'DWSS'],
    budgetRelevance: 'NPR 20-30B for infrastructure',
  },
  {
    id: 14,
    title: 'Smart City Development',
    titleNe: 'स्मार्ट शहर विकास',
    category: 'Infrastructure',
    description:
      'Develop smart city infrastructure in major urban centers',
    keyAspects:
      'Urban planning, smart traffic, waste management, green buildings, digital infrastructure',
    progressIndicators:
      'Smart city master plan approved, pilot projects launched, IoT infrastructure deployed',
    stallIndicators:
      'No master plan, unplanned urbanization continues, no pilot projects',
    keyOfficials: ['Urban Development Minister', 'KMC Mayor'],
    keyMinistries: ['Ministry of Urban Development', 'NPC'],
    budgetRelevance: 'NPR 10-20B for urban infrastructure',
  },
  {
    id: 15,
    title: 'East-West Highway 4-Lane',
    titleNe: 'पूर्व-पश्चिम राजमार्ग ४ लेन',
    category: 'Infrastructure',
    description:
      'Upgrade East-West Highway to 4 lanes across entire length',
    keyAspects:
      'Highway widening, bridge construction, safety improvements, toll system',
    progressIndicators:
      'Construction contracts awarded, road widening started, km completed increasing, bridges built',
    stallIndicators:
      'Land acquisition delays, contracts disputed, construction paused, budget cuts',
    keyOfficials: ['Transport Minister', 'DOR DG'],
    keyMinistries: ['Ministry of Physical Infrastructure', 'DOR'],
    budgetRelevance: 'NPR 100B+ for highway construction',
  },
  {
    id: 16,
    title: 'Federal Governance Strengthening',
    titleNe: 'संघीय शासन सुदृढीकरण',
    category: 'Governance',
    description:
      'Strengthen federal governance with clear center-province-local coordination',
    keyAspects:
      'Fiscal federalism, inter-governmental coordination, local capacity building, revenue sharing',
    progressIndicators:
      'Revenue sharing formula implemented, coordination meetings regular, local capacity improved',
    stallIndicators:
      'Center-province disputes, revenue sharing delayed, local governments underfunded',
    keyOfficials: [
      'PM',
      'Federal Affairs Minister',
      'Province Chief Ministers',
    ],
    keyMinistries: [
      'Ministry of Federal Affairs',
      'Local Development Ministry',
    ],
    budgetRelevance: 'NPR 5-10B for capacity building',
  },
  {
    id: 17,
    title: 'International Airport Completion',
    titleNe: 'अन्तर्राष्ट्रिय विमानस्थल निर्माण',
    category: 'Infrastructure',
    description:
      'Complete Pokhara and Bhairahawa international airports, advance Nijgadh',
    keyAspects:
      'Pokhara airport operations, Bhairahawa expansion, Nijgadh EIA, CAAN reform',
    progressIndicators:
      'International flights started, airlines attracted, passenger numbers growing, Nijgadh EIA approved',
    stallIndicators:
      'No international flights, airports underutilized, Nijgadh blocked, CAAN mismanagement',
    keyOfficials: ['Culture/Tourism Minister', 'CAAN DG'],
    keyMinistries: ['Ministry of Culture & Tourism', 'CAAN'],
    budgetRelevance: 'NPR 30-50B for airport infrastructure',
  },
  {
    id: 18,
    title: 'Digital Nepal Framework',
    titleNe: 'डिजिटल नेपाल फ्रेमवर्क',
    category: 'Technology',
    description:
      'Implement comprehensive e-governance framework and digital public services',
    keyAspects:
      'E-governance portal, digital ID, online service delivery, government cloud, open data',
    progressIndicators:
      'E-governance portal launched, services online, digital ID rollout, data portal active',
    stallIndicators:
      'Services still paper-based, no digital ID, portal non-functional',
    keyOfficials: ['ICT Minister', 'NITC Chair'],
    keyMinistries: ['MOCIT', 'NITC'],
    budgetRelevance: 'NPR 5-10B for digital infrastructure',
  },
  {
    id: 19,
    title: 'Broadband Internet Connectivity',
    titleNe: 'ब्रोडब्यान्ड इन्टरनेट कनेक्टिभिटी',
    category: 'Technology',
    description:
      'Expand broadband internet access to all 753 local levels',
    keyAspects:
      'Fiber optic expansion, rural connectivity, NTC/Ncell infrastructure, community WiFi',
    progressIndicators:
      'Fiber reach expanding, local levels connected, internet penetration increasing, prices decreasing',
    stallIndicators:
      'Rural areas still disconnected, slow fiber rollout, ISP monopoly',
    keyOfficials: ['ICT Minister', 'NTA Chair', 'NTC MD'],
    keyMinistries: ['MOCIT', 'NTA', 'NTC'],
    budgetRelevance: 'NPR 10-20B for fiber infrastructure',
  },
  {
    id: 20,
    title: 'IT Park & Tech Economy',
    titleNe: 'आईटी पार्क र प्रविधि अर्थतन्त्र',
    category: 'Technology',
    description:
      'Establish IT parks and promote tech industry growth',
    keyAspects:
      'IT park construction, tech startup ecosystem, BPO promotion, software exports',
    progressIndicators:
      'IT park operational, tech companies established, software exports growing, startup ecosystem active',
    stallIndicators:
      'IT park delayed, no tech investment, brain drain to India/abroad',
    keyOfficials: ['ICT Minister', 'HITP Director'],
    keyMinistries: ['MOCIT', 'HITP'],
    budgetRelevance: 'NPR 5-10B for IT park infrastructure',
  },
  {
    id: 21,
    title: 'Financial Inclusion',
    titleNe: 'वित्तीय समावेशिता',
    category: 'Economy',
    description:
      'Expand financial access to unbanked population, promote digital payments',
    keyAspects:
      'Bank branch expansion, mobile banking, microfinance, insurance penetration, NRB initiatives',
    progressIndicators:
      'Bank accounts opened, mobile banking users increasing, insurance coverage expanding, digital payments growing',
    stallIndicators:
      'Rural areas unbanked, cash economy dominant, microfinance crisis',
    keyOfficials: ['NRB Governor', 'Finance Minister'],
    keyMinistries: ['Nepal Rastra Bank', 'Ministry of Finance'],
    budgetRelevance: 'NPR 2-5B for financial infrastructure',
  },
  {
    id: 22,
    title: 'Universal Health Insurance',
    titleNe: 'सार्वभौमिक स्वास्थ्य बीमा',
    category: 'Health',
    description:
      'Expand health insurance coverage to all citizens',
    keyAspects:
      'HIB expansion, premium subsidies, coverage quality, hospital network, claim processing',
    progressIndicators:
      'Enrollment numbers increasing, all districts covered, claim settlement improving, subsidies for poor',
    stallIndicators:
      'Low enrollment, hospitals refuse HIB, claims unpaid, quality poor',
    keyOfficials: ['Health Minister', 'HIB Executive Director'],
    keyMinistries: ['MOHP', 'Health Insurance Board'],
    budgetRelevance: 'NPR 10-20B for insurance subsidies',
  },
  {
    id: 23,
    title: 'Hospital in Every District',
    titleNe: 'प्रत्येक जिल्लामा अस्पताल',
    category: 'Health',
    description:
      'Ensure functional hospital with basic services in all 77 districts',
    keyAspects:
      'District hospital construction, doctor deployment, equipment, referral system, ambulance network',
    progressIndicators:
      'New hospitals built, doctors deployed, equipment installed, ambulance service started',
    stallIndicators:
      'Districts without hospital, doctor vacancies, equipment broken, referral system absent',
    keyOfficials: ['Health Minister', 'DHS Director'],
    keyMinistries: ['MOHP', 'Department of Health Services'],
    budgetRelevance: 'NPR 20-40B for hospital construction',
  },
  {
    id: 24,
    title: 'Education Quality Reform',
    titleNe: 'शिक्षा गुणस्तर सुधार',
    category: 'Education',
    description:
      'Reform curriculum, improve teacher quality, modernize schools',
    keyAspects:
      'New curriculum, teacher training, digital classrooms, STEM focus, assessment reform',
    progressIndicators:
      'New curriculum implemented, teacher training programs, digital classrooms in schools, learning outcomes improving',
    stallIndicators:
      'Old curriculum unchanged, no teacher training, schools deteriorating, dropout rates high',
    keyOfficials: ['Education Minister', 'CDC Director'],
    keyMinistries: ['Ministry of Education', 'CDC', 'ERO'],
    budgetRelevance: 'NPR 15-25B for education reform',
  },
  {
    id: 25,
    title: 'Technical/Vocational Training',
    titleNe: 'प्राविधिक/व्यावसायिक तालिम',
    category: 'Education',
    description:
      'Expand TVET programs aligned with labor market demands',
    keyAspects:
      'CTEVT expansion, industry linkages, certification, apprenticeships, skills mapping',
    progressIndicators:
      'New TVET centers opened, industry partnerships, employment rate of graduates high, curriculum updated',
    stallIndicators:
      'CTEVT stagnant, outdated courses, graduates unemployed, no industry linkage',
    keyOfficials: ['Education Minister', 'CTEVT Director'],
    keyMinistries: ['Ministry of Education', 'CTEVT'],
    budgetRelevance: 'NPR 5-10B for TVET infrastructure',
  },
  {
    id: 26,
    title: 'Research University',
    titleNe: 'अनुसन्धान विश्वविद्यालय',
    category: 'Education',
    description:
      'Establish world-class research university focused on Nepal priorities',
    keyAspects:
      'University establishment, research funding, international collaboration, PhD programs, innovation hub',
    progressIndicators:
      'University charter approved, land allocated, faculty hired, research funding established, international MoUs signed',
    stallIndicators:
      'No charter, no funding, no land, existing universities deteriorating',
    keyOfficials: ['Education Minister', 'UGC Chair'],
    keyMinistries: ['Ministry of Education', 'UGC'],
    budgetRelevance: 'NPR 10-20B for university establishment',
  },
  {
    id: 27,
    title: 'Agriculture Modernization',
    titleNe: 'कृषि आधुनिकीकरण',
    category: 'Economy',
    description:
      'Modernize agriculture through technology, irrigation, and market access',
    keyAspects:
      'Mechanization, irrigation expansion, cold storage, market infrastructure, crop insurance, agricultural research',
    progressIndicators:
      'Irrigation coverage expanding, mechanization subsidies distributed, cold storage built, farm income rising',
    stallIndicators:
      'Farmers abandoning land, food imports increasing, no irrigation expansion, no mechanization',
    keyOfficials: ['Agriculture Minister', 'DOA DG'],
    keyMinistries: ['Ministry of Agriculture', 'DOA', 'NARC'],
    budgetRelevance: 'NPR 15-30B for agriculture programs',
  },
  {
    id: 28,
    title: 'Climate & Environment Policy',
    titleNe: 'जलवायु र वातावरण नीति',
    category: 'Environment',
    description:
      'Implement climate action plan and move towards carbon neutrality',
    keyAspects:
      'NDC implementation, renewable energy, forest conservation, EV promotion, air quality, waste management',
    progressIndicators:
      'NDC targets met, renewable energy share increasing, forest cover stable, EV adoption growing, air quality improving',
    stallIndicators:
      'Emissions rising, deforestation, no EV policy, air quality deteriorating',
    keyOfficials: ['Environment Minister', 'Climate Change Council'],
    keyMinistries: ['Ministry of Forests & Environment', 'MOEWRI'],
    budgetRelevance:
      'NPR 5-10B for climate programs + international climate finance',
  },
  {
    id: 29,
    title: 'Land Reform',
    titleNe: 'भूमि सुधार',
    category: 'Social',
    description:
      'Implement comprehensive land reform and digital land management',
    keyAspects:
      'Land survey, digital land records, land ceiling, landless rehabilitation, MOLMAC reform',
    progressIndicators:
      'Digital land records available, land survey completed, landless families settled, disputes reduced',
    stallIndicators:
      'Land records still paper-based, survey incomplete, landless not addressed, feudal system continues',
    keyOfficials: ['Land Management Minister', 'Survey Department DG'],
    keyMinistries: ['MOLMAC', 'Survey Department'],
    budgetRelevance: 'NPR 5-10B for land survey and digitization',
  },
  {
    id: 30,
    title: 'Electoral Reform',
    titleNe: 'निर्वाचन सुधार',
    category: 'Governance',
    description:
      'Reform electoral system for better representation and reduced money politics',
    keyAspects:
      'PR system reform, election finance law, voter registration, EVM adoption, campaign spending limits',
    progressIndicators:
      'Election law amended, campaign spending limits enforced, EVM pilot conducted, voter turnout improving',
    stallIndicators:
      'No law change, money politics increasing, voter apathy, EC ineffective',
    keyOfficials: ['Law Minister', 'EC Chief Commissioner'],
    keyMinistries: ['Election Commission', 'Ministry of Law & Justice'],
    budgetRelevance: 'NPR 2-5B for electoral infrastructure',
  },
  {
    id: 31,
    title: 'Cooperative Sector Reform',
    titleNe: 'सहकारी क्षेत्र सुधार',
    category: 'Economy',
    description:
      'Reform and regulate cooperative sector to protect depositors',
    keyAspects:
      'Cooperative regulation, audit enforcement, depositor protection, NRB oversight, fraud prevention',
    progressIndicators:
      'New cooperative law passed, audits mandatory, fraud cases prosecuted, depositor insurance introduced',
    stallIndicators:
      'Cooperative frauds continue, no regulation, depositors losing money, political protection of fraudsters',
    keyOfficials: ['Cooperatives Registrar', 'Finance Minister'],
    keyMinistries: [
      'Department of Cooperatives',
      'Ministry of Finance',
      'NRB',
    ],
    budgetRelevance: 'NPR 1-2B for regulatory infrastructure',
  },
  {
    id: 32,
    title: 'Tourism Recovery & Growth',
    titleNe: 'पर्यटन पुनरुत्थान र वृद्धि',
    category: 'Economy',
    description:
      'Recover and grow tourism sector to pre-COVID levels and beyond',
    keyAspects:
      'Tourist arrivals target, marketing campaigns, infrastructure development, adventure tourism, heritage preservation',
    progressIndicators:
      'Tourist arrivals increasing, revenue growing, new routes opened, infrastructure improved, events held',
    stallIndicators:
      'Tourist numbers declining, infrastructure poor, marketing absent, visa hassles',
    keyOfficials: ['Tourism Minister', 'NTB CEO'],
    keyMinistries: ['Ministry of Culture & Tourism', 'NTB', 'CAAN'],
    budgetRelevance:
      'NPR 5-10B for tourism promotion and infrastructure',
  },
  {
    id: 33,
    title: 'Independent Foreign Policy',
    titleNe: 'स्वतन्त्र विदेश नीति',
    category: 'Governance',
    description:
      'Maintain balanced, independent foreign policy based on national interest',
    keyAspects:
      'India-China balance, multilateral engagement, trade diplomacy, diaspora engagement, border issues',
    progressIndicators:
      'Balanced diplomatic engagements, trade agreements with multiple countries, border issues addressed, diaspora policy',
    stallIndicators:
      'Leaning heavily to one neighbor, sovereignty compromised, border encroachment unaddressed',
    keyOfficials: ['PM', 'Foreign Minister'],
    keyMinistries: ['Ministry of Foreign Affairs', 'Office of PM'],
    budgetRelevance: 'NPR 2-5B for diplomatic operations',
  },
  {
    id: 34,
    title: 'Social Security Expansion',
    titleNe: 'सामाजिक सुरक्षा विस्तार',
    category: 'Social',
    description:
      'Expand social security coverage including pension, health, and disability support',
    keyAspects:
      'SSF coverage, pension reform, disability support, elderly care, maternity benefits',
    progressIndicators:
      'SSF enrollment expanding, pension payments regular, disability support increased, maternity benefits improved',
    stallIndicators:
      'SSF fund mismanaged, coverage stagnant, pension delays, benefits inadequate',
    keyOfficials: ['Labour Minister', 'SSF Executive Director'],
    keyMinistries: ['Ministry of Labour', 'Social Security Fund'],
    budgetRelevance: 'NPR 10-20B for social security programs',
  },
  {
    id: 35,
    title: 'Passport & Immigration Reform',
    titleNe: 'राहदानी र अध्यागमन सुधार',
    category: 'Governance',
    description:
      'Reform passport issuance and immigration services for efficiency and accessibility',
    keyAspects:
      'E-passport rollout, online appointment, regional passport offices, immigration digitization, queue management',
    progressIndicators:
      'E-passport production started, online booking working, new offices opened, wait times reduced',
    stallIndicators:
      'Passport backlog growing, system crashes, long queues, corruption in process',
    keyOfficials: [
      'Home Minister',
      'Immigration DG',
      'Passport Department DG',
    ],
    keyMinistries: [
      'Ministry of Home Affairs',
      'Department of Passports',
      'Department of Immigration',
    ],
    budgetRelevance: 'NPR 3-5B for passport infrastructure',
  },
];
