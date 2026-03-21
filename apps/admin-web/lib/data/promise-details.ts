/**
 * Promise Details — Ministry assignments, milestones, and progress methodology
 * for all 35 government promises from the RSP "Bacha Patra 2082" (Citizen Contract).
 *
 * Ministry assignments reflect Nepal's federal government structure.
 * The RSP government committed to reducing ministries to 18.
 *
 * NOTE: Minister names are placeholders based on typical RSP cabinet structure.
 * Update with actual appointees once the cabinet is officially formed.
 */

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface Milestone {
  id: string;
  title: string;
  title_ne: string;
  /** Whether this milestone has been completed */
  completed: boolean;
  /** Optional date when completed */
  completedDate?: string;
  /** Optional target date */
  targetDate?: string;
}

export type ProgressMethodology =
  | 'milestone_completion'       // percentage of milestones completed
  | 'budget_disbursement'        // budget spent / total budget
  | 'coverage_percentage'        // population or area coverage achieved
  | 'legislative_stages'         // bill drafting -> committee -> parliament -> enacted
  | 'infrastructure_completion'  // physical construction progress
  | 'composite_index';           // weighted combination of sub-indicators

export interface PromiseDetail {
  promiseId: string;
  responsible_ministry: string;
  responsible_ministry_ne: string;
  responsible_minister: string;
  responsible_minister_ne: string;
  /** Secondary ministries involved */
  supporting_ministries?: string[];
  milestones: Milestone[];
  progress_methodology: ProgressMethodology;
  progress_methodology_description: string;
}

/* ═══════════════════════════════════════════════
   PROMISE DETAILS — ALL 35
   ═══════════════════════════════════════════════ */

export const promiseDetails: PromiseDetail[] = [
  // ── 1: Directly Elected Executive System ──
  {
    promiseId: '1',
    responsible_ministry: 'Ministry of Law, Justice and Parliamentary Affairs',
    responsible_ministry_ne: 'कानून, न्याय तथा संसदीय मामिला मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Office of the Prime Minister and Council of Ministers'],
    milestones: [
      { id: '1-m1', title: 'Form constitutional amendment study committee', title_ne: 'संविधान संशोधन अध्ययन समिति गठन', completed: false, targetDate: '2026-04-15' },
      { id: '1-m2', title: 'Publish discussion paper on directly elected executive', title_ne: 'प्रत्यक्ष निर्वाचित कार्यकारीमा छलफल पत्र प्रकाशन', completed: false, targetDate: '2026-07-01' },
      { id: '1-m3', title: 'Conduct cross-party consultation workshops', title_ne: 'अन्तरपार्टी परामर्श कार्यशाला सञ्चालन', completed: false },
      { id: '1-m4', title: 'Table constitutional amendment bill in parliament', title_ne: 'संसदमा संविधान संशोधन विधेयक पेश', completed: false },
    ],
    progress_methodology: 'legislative_stages',
    progress_methodology_description: 'Tracked through legislative stages: study committee formation, discussion paper, consultations, bill tabling, and parliamentary vote.',
  },

  // ── 2: Limit Federal Ministries to 18 ──
  {
    promiseId: '2',
    responsible_ministry: 'Office of the Prime Minister and Council of Ministers',
    responsible_ministry_ne: 'प्रधानमन्त्री तथा मन्त्रिपरिषदको कार्यालय',
    responsible_minister: 'Balen Shah (Prime Minister)',
    responsible_minister_ne: 'बालेन शाह (प्रधानमन्त्री)',
    milestones: [
      { id: '2-m1', title: 'Complete ministry rationalization study', title_ne: 'मन्त्रालय युक्तिसंगतता अध्ययन सम्पन्न', completed: false },
      { id: '2-m2', title: 'Announce restructured ministry list (18 max)', title_ne: 'पुनर्संरचित मन्त्रालय सूची (अधिकतम १८) घोषणा', completed: false },
      { id: '2-m3', title: 'Complete staff redeployment plan', title_ne: 'कर्मचारी पुन: तैनाथी योजना सम्पन्न', completed: false },
      { id: '2-m4', title: 'Operationalize all 18 ministries with new mandates', title_ne: 'नयाँ जनादेशसहित सबै १८ मन्त्रालय सञ्चालन', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Percentage of restructuring milestones completed, from study to full operationalization.',
  },

  // ── 3: Allocate 60% Budget to Provincial & Local Governments ──
  {
    promiseId: '3',
    responsible_ministry: 'Ministry of Finance',
    responsible_ministry_ne: 'अर्थ मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['National Natural Resources and Fiscal Commission'],
    milestones: [
      { id: '3-m1', title: 'Publish fiscal decentralization roadmap', title_ne: 'राजस्व विकेन्द्रीकरण रोडम्याप प्रकाशन', completed: false },
      { id: '3-m2', title: 'Revise intergovernmental fiscal transfer formula', title_ne: 'अन्तर-सरकारी राजस्व हस्तान्तरण सूत्र संशोधन', completed: false },
      { id: '3-m3', title: 'Include increased allocation in FY 2083/84 budget', title_ne: 'आ.व. २०८३/८४ बजेटमा बढेको विनियोजन समावेश', completed: false, targetDate: '2026-05-29' },
      { id: '3-m4', title: 'Achieve 60% allocation target', title_ne: '६०% विनियोजन लक्ष्य हासिल', completed: false },
    ],
    progress_methodology: 'budget_disbursement',
    progress_methodology_description: 'Measured by actual budget allocation percentage to provincial and local governments vs the 60% target.',
  },

  // ── 4: Investigate Assets of Public Officials Since 1990 ──
  {
    promiseId: '4',
    responsible_ministry: 'Commission for the Investigation of Abuse of Authority (CIAA)',
    responsible_ministry_ne: 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Law, Justice and Parliamentary Affairs'],
    milestones: [
      { id: '4-m1', title: 'Enact strengthened asset investigation legislation', title_ne: 'सशक्त सम्पत्ति अनुसन्धान कानून लागू', completed: false },
      { id: '4-m2', title: 'Establish special investigation task force', title_ne: 'विशेष अनुसन्धान कार्यदल गठन', completed: false },
      { id: '4-m3', title: 'Complete first phase investigations (top 100 officials)', title_ne: 'पहिलो चरण अनुसन्धान सम्पन्न (शीर्ष १०० पदाधिकारी)', completed: false },
      { id: '4-m4', title: 'Begin nationalization proceedings for illegally acquired assets', title_ne: 'अवैध रूपमा अर्जित सम्पत्तिको राष्ट्रियकरण कारबाही सुरु', completed: false },
    ],
    progress_methodology: 'legislative_stages',
    progress_methodology_description: 'Tracked through legislation, task force formation, investigation phases, and asset recovery proceedings.',
  },

  // ── 5: Mandatory Public Asset Disclosure ──
  {
    promiseId: '5',
    responsible_ministry: 'Commission for the Investigation of Abuse of Authority (CIAA)',
    responsible_ministry_ne: 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '5-m1', title: 'Draft mandatory asset disclosure bill', title_ne: 'अनिवार्य सम्पत्ति विवरण विधेयक मस्यौदा', completed: false },
      { id: '5-m2', title: 'Pass bill through parliament', title_ne: 'संसदबाट विधेयक पारित', completed: false },
      { id: '5-m3', title: 'Launch public asset disclosure portal', title_ne: 'सार्वजनिक सम्पत्ति विवरण पोर्टल सुरु', completed: false },
      { id: '5-m4', title: 'Achieve 100% compliance among current officials', title_ne: 'हालका पदाधिकारीमा १००% अनुपालन हासिल', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Measured by percentage of public officials who have publicly disclosed assets through the portal.',
  },

  // ── 6: 100 Days, 100 Works Plan ──
  {
    promiseId: '6',
    responsible_ministry: 'Office of the Prime Minister and Council of Ministers',
    responsible_ministry_ne: 'प्रधानमन्त्री तथा मन्त्रिपरिषदको कार्यालय',
    responsible_minister: 'Balen Shah (Prime Minister)',
    responsible_minister_ne: 'बालेन शाह (प्रधानमन्त्री)',
    milestones: [
      { id: '6-m1', title: 'Publish the detailed 100 works list publicly', title_ne: '१०० कामको विस्तृत सूची सार्वजनिक प्रकाशन', completed: false },
      { id: '6-m2', title: 'Complete 25% of listed tasks (25 works)', title_ne: 'सूचीबद्ध कार्यको २५% सम्पन्न (२५ काम)', completed: false },
      { id: '6-m3', title: 'Complete 50% of listed tasks (50 works)', title_ne: 'सूचीबद्ध कार्यको ५०% सम्पन्न (५० काम)', completed: false },
      { id: '6-m4', title: 'Complete 75% of listed tasks (75 works)', title_ne: 'सूचीबद्ध कार्यको ७५% सम्पन्न (७५ काम)', completed: false },
      { id: '6-m5', title: 'Complete all 100 works by day 100', title_ne: 'दिन १०० सम्ममा सबै १०० काम सम्पन्न', completed: false, targetDate: '2026-07-09' },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Number of completed works out of 100 listed tasks, tracked as percentage.',
  },

  // ── 7: Public Procurement Transparency Portal ──
  {
    promiseId: '7',
    responsible_ministry: 'Public Procurement Monitoring Office',
    responsible_ministry_ne: 'सार्वजनिक खरिद अनुगमन कार्यालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Finance', 'Ministry of Communication and Information Technology'],
    milestones: [
      { id: '7-m1', title: 'Design procurement transparency platform', title_ne: 'खरिद पारदर्शिता प्लाटफर्म डिजाइन', completed: false },
      { id: '7-m2', title: 'Digitize existing procurement records', title_ne: 'विद्यमान खरिद अभिलेख डिजिटाइज', completed: false },
      { id: '7-m3', title: 'Launch public portal with real-time contract data', title_ne: 'वास्तविक समय सम्झौता डाटासहित सार्वजनिक पोर्टल सुरु', completed: false },
      { id: '7-m4', title: 'Mandate all government bodies to publish on portal', title_ne: 'सबै सरकारी निकायलाई पोर्टलमा प्रकाशन अनिवार्य', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked by platform development, data migration, launch, and adoption milestones.',
  },

  // ── 8: 7% Annual GDP Growth Target ──
  {
    promiseId: '8',
    responsible_ministry: 'Ministry of Finance',
    responsible_ministry_ne: 'अर्थ मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['National Planning Commission'],
    milestones: [
      { id: '8-m1', title: 'Publish economic acceleration strategy document', title_ne: 'आर्थिक गति बृद्धि रणनीति कागजात प्रकाशन', completed: false },
      { id: '8-m2', title: 'Enact investment-friendly policy reforms', title_ne: 'लगानी मैत्री नीति सुधार लागू', completed: false },
      { id: '8-m3', title: 'Achieve 5% GDP growth in first full fiscal year', title_ne: 'पहिलो पूर्ण आर्थिक वर्षमा ५% जीडीपी वृद्धि हासिल', completed: false },
      { id: '8-m4', title: 'Achieve 7% GDP growth target', title_ne: '७% जीडीपी वृद्धि लक्ष्य हासिल', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of actual GDP growth rate vs 7% target, investment inflows, and policy reform completion.',
  },

  // ── 9: Create 500,000 Jobs ──
  {
    promiseId: '9',
    responsible_ministry: 'Ministry of Labour, Employment and Social Security',
    responsible_ministry_ne: 'श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Industry, Commerce and Supplies'],
    milestones: [
      { id: '9-m1', title: 'Launch national employment creation program', title_ne: 'राष्ट्रिय रोजगारी सिर्जना कार्यक्रम सुरु', completed: false },
      { id: '9-m2', title: 'Create 100,000 new registered jobs', title_ne: '१ लाख नयाँ दर्ता रोजगारी सिर्जना', completed: false },
      { id: '9-m3', title: 'Establish startup incubation hubs in all provinces', title_ne: 'सबै प्रदेशमा स्टार्टअप इन्क्युबेसन हब स्थापना', completed: false },
      { id: '9-m4', title: 'Reach 500,000 new jobs milestone', title_ne: '५ लाख नयाँ रोजगारी माइलस्टोन पुग्ने', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Number of new formally registered jobs created divided by 500,000 target.',
  },

  // ── 10: Raise Exports to $30 Billion ──
  {
    promiseId: '10',
    responsible_ministry: 'Ministry of Industry, Commerce and Supplies',
    responsible_ministry_ne: 'उद्योग, वाणिज्य तथा आपूर्ति मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Communication and Information Technology'],
    milestones: [
      { id: '10-m1', title: 'Publish national export promotion strategy', title_ne: 'राष्ट्रिय निर्यात प्रवर्धन रणनीति प्रकाशन', completed: false },
      { id: '10-m2', title: 'Establish IT services export facilitation office', title_ne: 'सूचना प्रविधि सेवा निर्यात सहजीकरण कार्यालय स्थापना', completed: false },
      { id: '10-m3', title: 'Sign bilateral trade agreements with 5 new partners', title_ne: '५ नयाँ साझेदारसँग द्विपक्षीय व्यापार सम्झौतामा हस्ताक्षर', completed: false },
      { id: '10-m4', title: 'Achieve $5 billion annual export milestone', title_ne: 'वार्षिक $५ अर्ब निर्यात माइलस्टोन हासिल', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of actual export value vs $30B target trajectory, plus trade agreement and facilitation milestones.',
  },

  // ── 11: Tax Reform — Reduce Citizen Burden ──
  {
    promiseId: '11',
    responsible_ministry: 'Ministry of Finance',
    responsible_ministry_ne: 'अर्थ मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '11-m1', title: 'Complete tax burden analysis for middle class', title_ne: 'मध्यम वर्गको कर भार विश्लेषण सम्पन्न', completed: false },
      { id: '11-m2', title: 'Draft tax reform bill with family expense deductions', title_ne: 'पारिवारिक खर्च कटौती सहित कर सुधार विधेयक मस्यौदा', completed: false },
      { id: '11-m3', title: 'Pass tax reform through parliament', title_ne: 'संसदबाट कर सुधार पारित', completed: false, targetDate: '2026-05-29' },
      { id: '11-m4', title: 'Implement new tax brackets in next fiscal year', title_ne: 'अर्को आर्थिक वर्षमा नयाँ कर ब्र्याकेट लागू', completed: false },
    ],
    progress_methodology: 'legislative_stages',
    progress_methodology_description: 'Tracked through legislative stages: analysis, bill drafting, parliamentary passage, and implementation.',
  },

  // ── 12: Generate 30,000 MW Electricity in 10 Years ──
  {
    promiseId: '12',
    responsible_ministry: 'Ministry of Energy, Water Resources and Irrigation',
    responsible_ministry_ne: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Nepal Electricity Authority'],
    milestones: [
      { id: '12-m1', title: 'Publish 10-year energy generation master plan', title_ne: '१०-वर्षे ऊर्जा उत्पादन मास्टर प्लान प्रकाशन', completed: false },
      { id: '12-m2', title: 'Fast-track approvals for 5,000 MW of new projects', title_ne: '५,००० मेगावाट नयाँ आयोजनाको फास्ट-ट्र्याक स्वीकृति', completed: false },
      { id: '12-m3', title: 'Sign cross-border energy export agreements', title_ne: 'सीमापारि ऊर्जा निर्यात सम्झौतामा हस्ताक्षर', completed: false },
      { id: '12-m4', title: 'Achieve 5,000 MW new capacity online', title_ne: '५,००० मेगावाट नयाँ क्षमता अनलाइन', completed: false },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'New MW capacity brought online vs 30,000 MW target, plus project pipeline and export agreement progress.',
  },

  // ── 13: Complete Melamchi Water Supply ──
  {
    promiseId: '13',
    responsible_ministry: 'Ministry of Water Supply',
    responsible_ministry_ne: 'खानेपानी मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Melamchi Water Supply Development Board'],
    milestones: [
      { id: '13-m1', title: 'Complete tunnel repairs and resume water flow', title_ne: 'सुरुङ मर्मत सम्पन्न र पानी प्रवाह पुन: सुरु', completed: false },
      { id: '13-m2', title: 'Complete bulk distribution network in Kathmandu', title_ne: 'काठमाडौंमा थोक वितरण नेटवर्क सम्पन्न', completed: false },
      { id: '13-m3', title: 'Connect 50% of valley households', title_ne: 'उपत्यकाका ५०% घरधुरी जोड्ने', completed: false },
      { id: '13-m4', title: 'Achieve full 170 MLD supply to valley', title_ne: 'उपत्यकामा पूर्ण १७० एमएलडी आपूर्ति हासिल', completed: false },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'Measured by MLD of water actually delivered to Kathmandu Valley vs 170 MLD design capacity.',
  },

  // ── 14: Complete All National Pride Projects in 2 Years ──
  {
    promiseId: '14',
    responsible_ministry: 'Ministry of Physical Infrastructure and Transport',
    responsible_ministry_ne: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['National Planning Commission'],
    milestones: [
      { id: '14-m1', title: 'Audit all national pride projects for current status', title_ne: 'सबै राष्ट्रिय गौरवका आयोजनाको हालको अवस्था लेखापरीक्षण', completed: false },
      { id: '14-m2', title: 'Resolve contractor disputes and restart stalled projects', title_ne: 'ठेकेदार विवाद समाधान र रोकिएका आयोजना पुन: सुरु', completed: false },
      { id: '14-m3', title: 'Complete 50% of remaining national pride works', title_ne: 'बाँकी राष्ट्रिय गौरवका कामको ५०% सम्पन्न', completed: false },
      { id: '14-m4', title: 'Complete all national pride projects', title_ne: 'सबै राष्ट्रिय गौरवका आयोजना सम्पन्न', completed: false, targetDate: '2028-04-01' },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'Number of completed national pride projects out of total designated projects.',
  },

  // ── 15: East-West Highway 4-Lane Expansion ──
  {
    promiseId: '15',
    responsible_ministry: 'Ministry of Physical Infrastructure and Transport',
    responsible_ministry_ne: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '15-m1', title: 'Complete updated detailed project report (DPR)', title_ne: 'अद्यावधिक विस्तृत परियोजना प्रतिवेदन (डीपीआर) सम्पन्न', completed: false },
      { id: '15-m2', title: 'Award construction contracts for priority segments', title_ne: 'प्राथमिकता खण्डका लागि निर्माण ठेक्का प्रदान', completed: false },
      { id: '15-m3', title: 'Complete land acquisition for full corridor', title_ne: 'पूर्ण गलियाराका लागि जग्गा अधिग्रहण सम्पन्न', completed: false },
      { id: '15-m4', title: 'Complete 25% of 4-lane construction', title_ne: '४ लेन निर्माणको २५% सम्पन्न', completed: false },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'Kilometers of 4-lane highway completed out of total East-West Highway length.',
  },

  // ── 16: East-West Electric Railway ──
  {
    promiseId: '16',
    responsible_ministry: 'Ministry of Physical Infrastructure and Transport',
    responsible_ministry_ne: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Department of Railways'],
    milestones: [
      { id: '16-m1', title: 'Complete feasibility study and route alignment', title_ne: 'सम्भाव्यता अध्ययन र मार्ग पंक्तिबद्धता सम्पन्न', completed: false },
      { id: '16-m2', title: 'Secure international financing and partnerships', title_ne: 'अन्तर्राष्ट्रिय वित्तीय र साझेदारी सुरक्षित', completed: false },
      { id: '16-m3', title: 'Begin construction on first pilot segment', title_ne: 'पहिलो पाइलट खण्डमा निर्माण सुरु', completed: false },
      { id: '16-m4', title: 'Complete first operational segment', title_ne: 'पहिलो सञ्चालन खण्ड सम्पन्न', completed: false },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'Tracked through feasibility, financing, construction start, and first operational segment.',
  },

  // ── 17: Operationalize Bhairahawa & Pokhara Airports ──
  {
    promiseId: '17',
    responsible_ministry: 'Ministry of Culture, Tourism and Civil Aviation',
    responsible_ministry_ne: 'संस्कृति, पर्यटन तथा नागरिक उड्डयन मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '17-m1', title: 'Complete pending infrastructure at both airports', title_ne: 'दुवै विमानस्थलमा बाँकी पूर्वाधार सम्पन्न', completed: false },
      { id: '17-m2', title: 'Sign agreements with international airlines for regular service', title_ne: 'नियमित सेवाका लागि अन्तर्राष्ट्रिय एयरलाइन्ससँग सम्झौता', completed: false },
      { id: '17-m3', title: 'Launch regular international flights from Bhairahawa', title_ne: 'भैरहवाबाट नियमित अन्तर्राष्ट्रिय उडान सुरु', completed: false },
      { id: '17-m4', title: 'Launch regular international flights from Pokhara', title_ne: 'पोखराबाट नियमित अन्तर्राष्ट्रिय उडान सुरु', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked by infrastructure completion and number of regular international flights operating.',
  },

  // ── 18: "Online, Not Queue" — Digital Government Services ──
  {
    promiseId: '18',
    responsible_ministry: 'Ministry of Communication and Information Technology',
    responsible_ministry_ne: 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '18-m1', title: 'Audit all government services requiring in-person visits', title_ne: 'व्यक्तिगत भ्रमण चाहिने सबै सरकारी सेवाको लेखापरीक्षण', completed: false },
      { id: '18-m2', title: 'Digitize top 20 most-used citizen services', title_ne: 'सबैभन्दा बढी प्रयोग हुने शीर्ष २० नागरिक सेवा डिजिटाइज', completed: false },
      { id: '18-m3', title: 'Launch unified government service portal', title_ne: 'एकीकृत सरकारी सेवा पोर्टल सुरु', completed: false },
      { id: '18-m4', title: 'Achieve 80% of services available online', title_ne: '८०% सेवा अनलाइन उपलब्ध हासिल', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Percentage of government services available fully online out of total services identified.',
  },

  // ── 19: Digital Parks in All 7 Provinces ──
  {
    promiseId: '19',
    responsible_ministry: 'Ministry of Communication and Information Technology',
    responsible_ministry_ne: 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '19-m1', title: 'Identify land and complete DPR for all 7 digital parks', title_ne: 'सातवटै डिजिटल पार्कको जग्गा पहिचान र डीपीआर सम्पन्न', completed: false },
      { id: '19-m2', title: 'Begin construction on first 3 digital parks', title_ne: 'पहिलो ३ डिजिटल पार्कमा निर्माण सुरु', completed: false },
      { id: '19-m3', title: 'Operationalize first digital park', title_ne: 'पहिलो डिजिटल पार्क सञ्चालन', completed: false },
      { id: '19-m4', title: 'All 7 digital parks operational', title_ne: 'सातवटै डिजिटल पार्क सञ्चालनमा', completed: false },
    ],
    progress_methodology: 'infrastructure_completion',
    progress_methodology_description: 'Number of operational digital parks out of 7 target, tracked through construction phases.',
  },

  // ── 20: Declare IT as National Strategic Industry ──
  {
    promiseId: '20',
    responsible_ministry: 'Ministry of Communication and Information Technology',
    responsible_ministry_ne: 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Industry, Commerce and Supplies'],
    milestones: [
      { id: '20-m1', title: 'Pass cabinet resolution declaring IT strategic industry', title_ne: 'सूचना प्रविधिलाई रणनीतिक उद्योग घोषणा गर्ने मन्त्रिपरिषद प्रस्ताव पारित', completed: false },
      { id: '20-m2', title: 'Establish IT Promotion Board', title_ne: 'सूचना प्रविधि प्रवर्धन बोर्ड स्थापना', completed: false },
      { id: '20-m3', title: 'Enable IP-backed loans for tech companies', title_ne: 'प्रविधि कम्पनीका लागि बौद्धिक सम्पत्तिमा ऋण सक्षम', completed: false },
      { id: '20-m4', title: 'Create 100,000 tech jobs', title_ne: '१ लाख प्रविधि रोजगारी सिर्जना', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked through policy declaration, board formation, financing mechanisms, and job creation.',
  },

  // ── 21: Cryptocurrency Regulation & Pilot ──
  {
    promiseId: '21',
    responsible_ministry: 'Nepal Rastra Bank (Central Bank)',
    responsible_ministry_ne: 'नेपाल राष्ट्र बैंक',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Finance', 'Ministry of Communication and Information Technology'],
    milestones: [
      { id: '21-m1', title: 'Complete global crypto regulation study', title_ne: 'विश्वव्यापी क्रिप्टो नियमन अध्ययन सम्पन्न', completed: false },
      { id: '21-m2', title: 'Draft national cryptocurrency policy', title_ne: 'राष्ट्रिय क्रिप्टोकरेन्सी नीति मस्यौदा', completed: false },
      { id: '21-m3', title: 'Launch pilot crypto mining project using surplus hydro', title_ne: 'अतिरिक्त जलविद्युत प्रयोग गरी पाइलट क्रिप्टो माइनिङ आयोजना सुरु', completed: false },
      { id: '21-m4', title: 'Enact comprehensive crypto regulation framework', title_ne: 'व्यापक क्रिप्टो नियमन ढाँचा लागू', completed: false, targetDate: '2027-04-01' },
    ],
    progress_methodology: 'legislative_stages',
    progress_methodology_description: 'Tracked through study completion, policy drafting, pilot project launch, and regulation enactment.',
  },

  // ── 22: Universal Health Insurance — 100% Coverage ──
  {
    promiseId: '22',
    responsible_ministry: 'Ministry of Health and Population',
    responsible_ministry_ne: 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Health Insurance Board'],
    milestones: [
      { id: '22-m1', title: 'Reform health insurance premium and coverage structure', title_ne: 'स्वास्थ्य बीमा प्रीमियम र कभरेज संरचना सुधार', completed: false },
      { id: '22-m2', title: 'Expand enrollment to 50% of population', title_ne: 'जनसंख्याको ५०% मा भर्ना विस्तार', completed: false },
      { id: '22-m3', title: 'Establish insurance desks in all health facilities', title_ne: 'सबै स्वास्थ्य संस्थामा बीमा डेस्क स्थापना', completed: false },
      { id: '22-m4', title: 'Achieve 100% population coverage', title_ne: '१००% जनसंख्या कभरेज हासिल', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Percentage of total population enrolled in national health insurance scheme.',
  },

  // ── 23: Centralized National Ambulance Service ──
  {
    promiseId: '23',
    responsible_ministry: 'Ministry of Health and Population',
    responsible_ministry_ne: 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '23-m1', title: 'Design national ambulance dispatch system', title_ne: 'राष्ट्रिय एम्बुलेन्स डिस्प्याच प्रणाली डिजाइन', completed: false },
      { id: '23-m2', title: 'Launch single emergency hotline number', title_ne: 'एकल आपतकालीन हटलाइन नम्बर सुरु', completed: false },
      { id: '23-m3', title: 'Deploy ambulances in all 77 districts', title_ne: 'सबै ७७ जिल्लामा एम्बुलेन्स तैनाथी', completed: false },
      { id: '23-m4', title: 'Achieve average response time under 15 minutes in urban areas', title_ne: 'सहरी क्षेत्रमा औसत प्रतिक्रिया समय १५ मिनेटभन्दा कम हासिल', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Number of districts with operational ambulance service out of 77 total, plus response time metrics.',
  },

  // ── 24: Free Education for Up to 3 Children ──
  {
    promiseId: '24',
    responsible_ministry: 'Ministry of Education, Science and Technology',
    responsible_ministry_ne: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '24-m1', title: 'Draft free education policy with eligibility criteria', title_ne: 'पात्रता मापदण्डसहित निःशुल्क शिक्षा नीति मस्यौदा', completed: false },
      { id: '24-m2', title: 'Allocate budget for universal free education', title_ne: 'विश्वव्यापी निःशुल्क शिक्षाका लागि बजेट विनियोजन', completed: false },
      { id: '24-m3', title: 'Implement free education in all public schools', title_ne: 'सबै सार्वजनिक विद्यालयमा निःशुल्क शिक्षा लागू', completed: false },
      { id: '24-m4', title: 'Verify zero-fee enrollment for eligible families', title_ne: 'पात्र परिवारका लागि शून्य-शुल्क भर्ना प्रमाणित', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Percentage of eligible families (up to 3 children) receiving fully free education through high school.',
  },

  // ── 25: "Skill in Education" National Expansion ──
  {
    promiseId: '25',
    responsible_ministry: 'Ministry of Education, Science and Technology',
    responsible_ministry_ne: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '25-m1', title: 'Document and package the Kathmandu program model', title_ne: 'काठमाडौं कार्यक्रम मोडेलको अभिलेखन र प्याकेजिङ', completed: false },
      { id: '25-m2', title: 'Train teachers in 20 districts', title_ne: '२० जिल्लामा शिक्षक तालिम', completed: false },
      { id: '25-m3', title: 'Launch program in all 77 districts', title_ne: 'सबै ७७ जिल्लामा कार्यक्रम सुरु', completed: false },
      { id: '25-m4', title: 'Achieve 50% student enrollment in skill tracks', title_ne: 'सीप ट्र्याकमा ५०% विद्यार्थी भर्ना हासिल', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Number of districts with active program out of 77 total districts.',
  },

  // ── 26: Zero Dropout Rate — School Retention Program ──
  {
    promiseId: '26',
    responsible_ministry: 'Ministry of Education, Science and Technology',
    responsible_ministry_ne: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '26-m1', title: 'Conduct national dropout baseline survey', title_ne: 'राष्ट्रिय छुट दर आधारभूत सर्वेक्षण सञ्चालन', completed: false },
      { id: '26-m2', title: 'Deploy smart classrooms in 500 schools', title_ne: '५०० विद्यालयमा स्मार्ट कक्षाकोठा तैनाथ', completed: false },
      { id: '26-m3', title: 'Reduce dropout rate to under 5%', title_ne: 'छुट दर ५% भन्दा कम', completed: false },
      { id: '26-m4', title: 'Achieve near-zero dropout in targeted districts', title_ne: 'लक्षित जिल्लामा शून्य-नजिक छुट दर हासिल', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of dropout rate reduction, smart classroom deployment, and retention program coverage.',
  },

  // ── 27: Clean Kathmandu Valley Campaign ──
  {
    promiseId: '27',
    responsible_ministry: 'Ministry of Urban Development',
    responsible_ministry_ne: 'सहरी विकास मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Forests and Environment'],
    milestones: [
      { id: '27-m1', title: 'Launch valley-wide waste segregation at source program', title_ne: 'उपत्यकाव्यापी स्रोतमा फोहोर छुट्ट्याउने कार्यक्रम सुरु', completed: false },
      { id: '27-m2', title: 'Establish 3 modern waste processing facilities', title_ne: '३ आधुनिक फोहोर प्रशोधन सुविधा स्थापना', completed: false },
      { id: '27-m3', title: 'Reduce PM2.5 levels to WHO guidelines', title_ne: 'पीएम२.५ स्तर डब्ल्यूएचओ दिशानिर्देशमा कम', completed: false },
      { id: '27-m4', title: 'Achieve clean valley certification benchmarks', title_ne: 'स्वच्छ उपत्यका प्रमाणीकरण बेन्चमार्क हासिल', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of waste management coverage, air quality index, and river water quality measurements.',
  },

  // ── 28: Bagmati & Major River Restoration ──
  {
    promiseId: '28',
    responsible_ministry: 'Ministry of Forests and Environment',
    responsible_ministry_ne: 'वन तथा वातावरण मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['High Powered Committee for Integrated Development of the Bagmati Civilization'],
    milestones: [
      { id: '28-m1', title: 'Complete river pollution baseline assessment', title_ne: 'नदी प्रदूषण आधारभूत मूल्याङ्कन सम्पन्न', completed: false },
      { id: '28-m2', title: 'Build 5 sewage treatment plants along Bagmati', title_ne: 'बागमती किनारमा ५ ढल शोधन प्लान्ट निर्माण', completed: false },
      { id: '28-m3', title: 'Remove 80% of river corridor encroachments', title_ne: 'नदी गलियारा अतिक्रमणको ८०% हटाउने', completed: false },
      { id: '28-m4', title: 'Achieve swimmable water quality in Bagmati within Kathmandu', title_ne: 'काठमाडौंभित्र बागमतीमा पौडी खेल्न योग्य पानीको गुणस्तर हासिल', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of sewage treatment capacity, encroachment removal, and water quality BOD/COD measurements.',
  },

  // ── 29: Land Reform — Commission in 100 Days ──
  {
    promiseId: '29',
    responsible_ministry: 'Ministry of Land Management, Cooperatives and Poverty Alleviation',
    responsible_ministry_ne: 'भूमि व्यवस्थापन, सहकारी तथा गरिबी निवारण मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '29-m1', title: 'Establish land reform commission', title_ne: 'भूमि सुधार आयोग स्थापना', completed: false, targetDate: '2026-07-09' },
      { id: '29-m2', title: 'Complete landless/squatter census', title_ne: 'भूमिहीन/सुकुम्बासी जनगणना सम्पन्न', completed: false },
      { id: '29-m3', title: 'Establish national Land Bank', title_ne: 'राष्ट्रिय भूमि बैंक स्थापना', completed: false },
      { id: '29-m4', title: 'Issue ownership certificates to 50% of landless families', title_ne: '५०% भूमिहीन परिवारलाई स्वामित्व प्रमाणपत्र जारी', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked through commission formation, census, land bank setup, and ownership certificate distribution.',
  },

  // ── 30: Overseas Voting for Diaspora Nepalis ──
  {
    promiseId: '30',
    responsible_ministry: 'Election Commission of Nepal',
    responsible_ministry_ne: 'निर्वाचन आयोग नेपाल',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Ministry of Foreign Affairs'],
    milestones: [
      { id: '30-m1', title: 'Draft overseas voting legislation', title_ne: 'विदेशबाट मतदान कानून मस्यौदा', completed: false },
      { id: '30-m2', title: 'Pass overseas voting bill through parliament', title_ne: 'संसदबाट विदेशबाट मतदान विधेयक पारित', completed: false },
      { id: '30-m3', title: 'Establish online voter registration for overseas Nepalis', title_ne: 'प्रवासी नेपालीका लागि अनलाइन मतदाता दर्ता स्थापना', completed: false },
      { id: '30-m4', title: 'Conduct pilot overseas voting in select embassies', title_ne: 'चयन गरिएका दूतावासमा पाइलट विदेशबाट मतदान सञ्चालन', completed: false },
    ],
    progress_methodology: 'legislative_stages',
    progress_methodology_description: 'Tracked through bill drafting, parliamentary passage, voter registration system, and pilot implementation.',
  },

  // ── 31: Cooperatives Crisis Resolution ──
  {
    promiseId: '31',
    responsible_ministry: 'Ministry of Land Management, Cooperatives and Poverty Alleviation',
    responsible_ministry_ne: 'भूमि व्यवस्थापन, सहकारी तथा गरिबी निवारण मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Nepal Rastra Bank (Central Bank)'],
    milestones: [
      { id: '31-m1', title: 'Complete audit of all distressed cooperatives', title_ne: 'सबै संकटग्रस्त सहकारीको लेखापरीक्षण सम्पन्न', completed: false },
      { id: '31-m2', title: 'Establish depositor recovery fund', title_ne: 'निक्षेपकर्ता वसुली कोष स्थापना', completed: false },
      { id: '31-m3', title: 'Begin systematic depositor repayments', title_ne: 'व्यवस्थित निक्षेपकर्ता भुक्तानी सुरु', completed: false },
      { id: '31-m4', title: 'Return 80% of depositor funds', title_ne: 'निक्षेपकर्ताको ८०% कोष फिर्ता', completed: false },
    ],
    progress_methodology: 'budget_disbursement',
    progress_methodology_description: 'Percentage of total depositor funds returned out of total owed amount.',
  },

  // ── 32: Double Tourist Numbers & Spending ──
  {
    promiseId: '32',
    responsible_ministry: 'Ministry of Culture, Tourism and Civil Aviation',
    responsible_ministry_ne: 'संस्कृति, पर्यटन तथा नागरिक उड्डयन मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Nepal Tourism Board'],
    milestones: [
      { id: '32-m1', title: 'Launch international tourism marketing campaign', title_ne: 'अन्तर्राष्ट्रिय पर्यटन मार्केटिङ अभियान सुरु', completed: false },
      { id: '32-m2', title: 'Simplify visa-on-arrival for 50 new countries', title_ne: '५० नयाँ देशका लागि आगमनमा भिसा सरलीकरण', completed: false },
      { id: '32-m3', title: 'Achieve 1.5 million annual tourist arrivals', title_ne: 'वार्षिक १५ लाख पर्यटक आगमन हासिल', completed: false },
      { id: '32-m4', title: 'Double per-tourist spending to $1,000 average', title_ne: 'प्रति-पर्यटक खर्च $१,००० औसतमा दोब्बर', completed: false },
    ],
    progress_methodology: 'composite_index',
    progress_methodology_description: 'Composite of tourist arrival numbers and average per-tourist spending vs baseline.',
  },

  // ── 33: Official State Apology to Dalit Community ──
  {
    promiseId: '33',
    responsible_ministry: 'Office of the Prime Minister and Council of Ministers',
    responsible_ministry_ne: 'प्रधानमन्त्री तथा मन्त्रिपरिषदको कार्यालय',
    responsible_minister: 'Balen Shah (Prime Minister)',
    responsible_minister_ne: 'बालेन शाह (प्रधानमन्त्री)',
    supporting_ministries: ['National Dalit Commission'],
    milestones: [
      { id: '33-m1', title: 'Consult with Dalit community leaders on apology framework', title_ne: 'माफी ढाँचामा दलित समुदायका नेतासँग परामर्श', completed: false },
      { id: '33-m2', title: 'Draft and approve official state apology text', title_ne: 'आधिकारिक राज्य माफी पाठ मस्यौदा र स्वीकृत', completed: false },
      { id: '33-m3', title: 'Deliver public apology in parliament', title_ne: 'संसदमा सार्वजनिक माफी प्रदान', completed: false },
      { id: '33-m4', title: 'Establish Dalit empowerment and reparations fund', title_ne: 'दलित सशक्तिकरण र क्षतिपूर्ति कोष स्थापना', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked through consultation, formal apology delivery, and establishment of empowerment measures.',
  },

  // ── 34: Social Security Expansion — Pension & Insurance ──
  {
    promiseId: '34',
    responsible_ministry: 'Ministry of Labour, Employment and Social Security',
    responsible_ministry_ne: 'श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    milestones: [
      { id: '34-m1', title: 'Expand social security fund coverage to informal workers', title_ne: 'अनौपचारिक श्रमिकमा सामाजिक सुरक्षा कोष कभरेज विस्तार', completed: false },
      { id: '34-m2', title: 'Establish athlete pension fund', title_ne: 'खेलाडी पेन्सन कोष स्थापना', completed: false },
      { id: '34-m3', title: 'Launch subsidized first-home loan program', title_ne: 'सहुलियत पहिलो घर ऋण कार्यक्रम सुरु', completed: false },
      { id: '34-m4', title: 'Establish elder care centers in all provinces', title_ne: 'सबै प्रदेशमा जेष्ठ नागरिक हेरचाह केन्द्र स्थापना', completed: false },
    ],
    progress_methodology: 'coverage_percentage',
    progress_methodology_description: 'Percentage of target population enrolled in expanded social security programs.',
  },

  // ── 35: Fast-Track Citizenship & Passport Processing ──
  {
    promiseId: '35',
    responsible_ministry: 'Ministry of Home Affairs',
    responsible_ministry_ne: 'गृह मन्त्रालय',
    responsible_minister: 'To be appointed',
    responsible_minister_ne: 'नियुक्त हुन बाँकी',
    supporting_ministries: ['Department of Passports'],
    milestones: [
      { id: '35-m1', title: 'Digitize citizenship application process end-to-end', title_ne: 'नागरिकता आवेदन प्रक्रिया शुरुदेखि अन्तसम्म डिजिटाइज', completed: false },
      { id: '35-m2', title: 'Eliminate passport backlog (current ~500,000)', title_ne: 'राहदानी ब्याकलग (हालको ~५ लाख) हटाउने', completed: false },
      { id: '35-m3', title: 'Achieve 7-day passport processing guarantee', title_ne: '७ दिने राहदानी प्रशोधन ग्यारेन्टी हासिल', completed: false },
      { id: '35-m4', title: 'Enable online citizenship verification and renewal', title_ne: 'अनलाइन नागरिकता प्रमाणीकरण र नवीकरण सक्षम', completed: false },
    ],
    progress_methodology: 'milestone_completion',
    progress_methodology_description: 'Tracked through digitization, backlog clearance, processing time, and online service availability.',
  },
];

/* ═══════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════ */

/** Get promise detail by promise ID */
export function getPromiseDetail(promiseId: string): PromiseDetail | undefined {
  return promiseDetails.find((d) => d.promiseId === promiseId);
}

/** Get all promise details as a map keyed by promiseId */
export function getPromiseDetailsMap(): Record<string, PromiseDetail> {
  const map: Record<string, PromiseDetail> = {};
  for (const detail of promiseDetails) {
    map[detail.promiseId] = detail;
  }
  return map;
}

/** Calculate progress percentage for a promise based on its milestones */
export function calculateMilestoneProgress(detail: PromiseDetail): number {
  if (detail.milestones.length === 0) return 0;
  const completed = detail.milestones.filter((m) => m.completed).length;
  return Math.round((completed / detail.milestones.length) * 100);
}

/** Get all unique ministries involved across all promises */
export function getAllMinistries(): string[] {
  const ministries = new Set<string>();
  for (const detail of promiseDetails) {
    ministries.add(detail.responsible_ministry);
    if (detail.supporting_ministries) {
      for (const m of detail.supporting_ministries) {
        ministries.add(m);
      }
    }
  }
  return Array.from(ministries).sort();
}

/** Get promise details grouped by responsible ministry */
export function getPromisesByMinistry(): Record<string, PromiseDetail[]> {
  const result: Record<string, PromiseDetail[]> = {};
  for (const detail of promiseDetails) {
    const ministry = detail.responsible_ministry;
    if (!result[ministry]) {
      result[ministry] = [];
    }
    result[ministry].push(detail);
  }
  return result;
}
