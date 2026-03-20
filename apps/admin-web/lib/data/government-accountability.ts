import type { PromiseCategory } from './promises';

export type PublicGovUnitType =
  | 'country'
  | 'ministry'
  | 'department'
  | 'division'
  | 'office';

export interface PublicGovAchievement {
  title: string;
  titleNe: string;
  status: 'delivered' | 'in_progress' | 'planned';
  detail: string;
  detailNe: string;
}

export interface PublicGovUnit {
  id: string;
  parentId?: string;
  name: string;
  nameNe: string;
  type: PublicGovUnitType;
  leadTitle: string;
  leadTitleNe: string;
  leadName: string;
  leadNameNe: string;
  responsibility: string;
  responsibilityNe: string;
  scope: string;
  scopeNe: string;
  sourceUrl: string;
  sourcePaths?: string[];
  promiseCategories: PromiseCategory[];
  trackedProjects: string[];
  achievements: PublicGovAchievement[];
}

export const publicGovUnits: PublicGovUnit[] = [
  {
    id: 'country-nepal',
    name: 'Government of Nepal',
    nameNe: 'नेपाल सरकार',
    type: 'country',
    leadTitle: 'Prime Minister',
    leadTitleNe: 'प्रधानमन्त्री',
    leadName: 'Balendra Shah',
    leadNameNe: 'बालेन्द्र शाह',
    responsibility: 'Sets national priorities, coordinates ministries, and owns cross-government delivery targets.',
    responsibilityNe: 'राष्ट्रिय प्राथमिकता तय गर्ने, मन्त्रालयहरू समन्वय गर्ने र सरकारव्यापी डेलिभरी लक्ष्यको स्वामित्व लिने।',
    scope: 'National',
    scopeNe: 'राष्ट्रिय',
    sourceUrl: 'https://www.opmcm.gov.np/',
    sourcePaths: ['/en/', '/en/prime-minister/', '/'],
    promiseCategories: ['Governance', 'Anti-Corruption', 'Infrastructure', 'Transport', 'Energy', 'Health', 'Education', 'Economy', 'Social'],
    trackedProjects: ['National delivery scorecard', '100-day commitments', 'Cross-ministry review meetings'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'mopit',
    parentId: 'country-nepal',
    name: 'Ministry of Physical Infrastructure and Transport',
    nameNe: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    type: 'ministry',
    leadTitle: 'Minister',
    leadTitleNe: 'मन्त्री',
    leadName: 'Infrastructure Lead',
    leadNameNe: 'पूर्वाधार नेतृत्व',
    responsibility: 'Owns roads, bridges, rail, major transport corridors, and delivery coordination for capital works.',
    responsibilityNe: 'सडक, पुल, रेल, प्रमुख यातायात करिडोर र पुँजीगत पूर्वाधार डेलिभरी समन्वयको जिम्मेवारी।',
    scope: 'National transport and public works',
    scopeNe: 'राष्ट्रिय यातायात र सार्वजनिक पूर्वाधार',
    sourceUrl: 'https://mopit.gov.np/',
    sourcePaths: ['/about-us', '/department', '/'],
    promiseCategories: ['Infrastructure', 'Transport'],
    trackedProjects: ['Ring Road expansion', 'East-West corridor upgrades', 'Bridge strengthening'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'dor',
    parentId: 'mopit',
    name: 'Department of Roads',
    nameNe: 'सडक विभाग',
    type: 'department',
    leadTitle: 'Director General',
    leadTitleNe: 'महानिर्देशक',
    leadName: 'Road Delivery Office',
    leadNameNe: 'सडक डेलिभरी कार्यालय',
    responsibility: 'Executes national highway, ring road, and strategic road works and reports project progress.',
    responsibilityNe: 'राष्ट्रिय राजमार्ग, रिङरोड र रणनीतिक सडक काम कार्यान्वयन गर्ने तथा प्रगति प्रतिवेदन दिने।',
    scope: 'Road network execution',
    scopeNe: 'सडक सञ्जाल कार्यान्वयन',
    sourceUrl: 'https://dor.gov.np/home',
    sourcePaths: ['/home/publication', '/home', '/'],
    promiseCategories: ['Infrastructure', 'Transport'],
    trackedProjects: ['Kathmandu Ring Road', 'East-West Highway packages'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'transport-division',
    parentId: 'mopit',
    name: 'Transport Management Division',
    nameNe: 'यातायात व्यवस्थापन महाशाखा',
    type: 'division',
    leadTitle: 'Division Chief',
    leadTitleNe: 'महाशाखा प्रमुख',
    leadName: 'Transport Operations Lead',
    leadNameNe: 'यातायात सञ्चालन नेतृत्व',
    responsibility: 'Oversees licensing, route systems, and public transport service coordination.',
    responsibilityNe: 'लाइसेन्स, रुट प्रणाली र सार्वजनिक यातायात सेवा समन्वयको जिम्मा।',
    scope: 'Transport operations',
    scopeNe: 'यातायात सञ्चालन',
    sourceUrl: 'https://mopit.gov.np/',
    promiseCategories: ['Transport', 'Technology'],
    trackedProjects: ['Digital permit systems', 'Fleet regulation updates'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'moewri',
    parentId: 'country-nepal',
    name: 'Ministry of Energy, Water Resources and Irrigation',
    nameNe: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    type: 'ministry',
    leadTitle: 'Minister',
    leadTitleNe: 'मन्त्री',
    leadName: 'Energy Lead',
    leadNameNe: 'ऊर्जा नेतृत्व',
    responsibility: 'Owns generation, grid expansion, irrigation upgrades, and energy reliability commitments.',
    responsibilityNe: 'उत्पादन, प्रसारण विस्तार, सिँचाइ सुधार र ऊर्जा विश्वसनीयतासम्बन्धी प्रतिबद्धताको स्वामित्व।',
    scope: 'Energy and irrigation',
    scopeNe: 'ऊर्जा र सिँचाइ',
    sourceUrl: 'https://moewri.gov.np/',
    sourcePaths: ['/category/notice/', '/'],
    promiseCategories: ['Energy', 'Infrastructure', 'Environment'],
    trackedProjects: ['Transmission line upgrades', 'Hydro coordination', 'Irrigation modernization'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'nea-office',
    parentId: 'moewri',
    name: 'Power Delivery Office',
    nameNe: 'विद्युत् डेलिभरी कार्यालय',
    type: 'office',
    leadTitle: 'Executive Director',
    leadTitleNe: 'कार्यकारी निर्देशक',
    leadName: 'Grid Operations Lead',
    leadNameNe: 'ग्रिड सञ्चालन नेतृत्व',
    responsibility: 'Handles distribution reliability, outage response, and power delivery reporting.',
    responsibilityNe: 'वितरण विश्वसनीयता, आउटेज प्रतिक्रिया र विद्युत् डेलिभरी प्रतिवेदनको जिम्मा।',
    scope: 'Power delivery',
    scopeNe: 'विद्युत् डेलिभरी',
    sourceUrl: 'https://www.nea.org.np/',
    sourcePaths: ['/about', '/'],
    promiseCategories: ['Energy', 'Technology'],
    trackedProjects: ['Service reliability improvements', 'Outage monitoring'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'mohp',
    parentId: 'country-nepal',
    name: 'Ministry of Health and Population',
    nameNe: 'स्वास्थ्य तथा जनसङ्ख्या मन्त्रालय',
    type: 'ministry',
    leadTitle: 'Minister',
    leadTitleNe: 'मन्त्री',
    leadName: 'Health Lead',
    leadNameNe: 'स्वास्थ्य नेतृत्व',
    responsibility: 'Owns hospital upgrades, service access, health staffing, and public health commitments.',
    responsibilityNe: 'अस्पताल सुधार, सेवा पहुँच, स्वास्थ्य जनशक्ति र सार्वजनिक स्वास्थ्य प्रतिबद्धताको स्वामित्व।',
    scope: 'National health services',
    scopeNe: 'राष्ट्रिय स्वास्थ्य सेवा',
    sourceUrl: 'https://mohp.gov.np/',
    sourcePaths: ['/about-us', '/'],
    promiseCategories: ['Health', 'Social', 'Technology'],
    trackedProjects: ['Hospital service upgrades', 'Primary care modernization'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'education-ministry',
    parentId: 'country-nepal',
    name: 'Ministry of Education, Science and Technology',
    nameNe: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    type: 'ministry',
    leadTitle: 'Minister',
    leadTitleNe: 'मन्त्री',
    leadName: 'Education Lead',
    leadNameNe: 'शिक्षा नेतृत्व',
    responsibility: 'Owns school reform, digital learning, teacher systems, and higher education commitments.',
    responsibilityNe: 'विद्यालय सुधार, डिजिटल शिक्षा, शिक्षक प्रणाली र उच्च शिक्षासम्बन्धी प्रतिबद्धताको स्वामित्व।',
    scope: 'Education policy and delivery',
    scopeNe: 'शिक्षा नीति र डेलिभरी',
    sourceUrl: 'https://moest.gov.np/',
    sourcePaths: ['/about-us', '/'],
    promiseCategories: ['Education', 'Technology', 'Social'],
    trackedProjects: ['School infrastructure', 'Digital classroom programs'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
  {
    id: 'finance-ministry',
    parentId: 'country-nepal',
    name: 'Ministry of Finance',
    nameNe: 'अर्थ मन्त्रालय',
    type: 'ministry',
    leadTitle: 'Minister',
    leadTitleNe: 'मन्त्री',
    leadName: 'Finance Lead',
    leadNameNe: 'अर्थ नेतृत्व',
    responsibility: 'Controls budget release, public expenditure priorities, and fiscal delivery constraints.',
    responsibilityNe: 'बजेट निकासा, सार्वजनिक खर्च प्राथमिकता र वित्तीय डेलिभरी अवरोधको नियन्त्रण।',
    scope: 'Budget and expenditure',
    scopeNe: 'बजेट र खर्च',
    sourceUrl: 'https://mof.gov.np/',
    sourcePaths: ['/about-us', '/'],
    promiseCategories: ['Economy', 'Governance', 'Anti-Corruption'],
    trackedProjects: ['Budget release monitoring', 'Capital expenditure discipline'],
    achievements: [], // Real achievements come from Supabase government_org_units.achievements
  },
];
