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
    sourceUrl: 'https://www.opmcm.gov.np/en/',
    sourcePaths: ['/en/prime-minister/', '/en/'],
    promiseCategories: ['Governance', 'Anti-Corruption', 'Infrastructure', 'Transport', 'Energy', 'Health', 'Education', 'Economy', 'Social'],
    trackedProjects: ['National delivery scorecard', '100-day commitments', 'Cross-ministry review meetings'],
    achievements: [
      {
        title: '100-day delivery review structure set',
        titleNe: '१०० दिने डेलिभरी समीक्षा संरचना तय',
        status: 'in_progress',
        detail: 'Central oversight reviews are being organized so ministries report against the same public scorecard.',
        detailNe: 'मन्त्रालयहरूले एउटै सार्वजनिक स्कोरकार्डमा प्रतिवेदन दिन सकून् भनेर केन्द्रीय समीक्षा संरचना बनाइँदैछ।',
      },
      {
        title: 'Cross-government accountability model published',
        titleNe: 'सरकारव्यापी जवाफदेहिता मोडेल प्रकाशित',
        status: 'planned',
        detail: 'Institutional accountability and public reporting responsibilities are planned as a shared standard.',
        detailNe: 'संस्थागत जवाफदेहिता र सार्वजनिक प्रतिवेदनको साझा मापदण्ड योजना गरिएको छ।',
      },
    ],
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
    achievements: [
      {
        title: 'Road corridor prioritization published',
        titleNe: 'सडक करिडोर प्राथमिकता प्रकाशित',
        status: 'in_progress',
        detail: 'Major transport works are now grouped into a public set of top delivery corridors.',
        detailNe: 'प्रमुख यातायात कार्यलाई सार्वजनिक प्राथमिक करिडोरको रूपमा समेटिएको छ।',
      },
      {
        title: 'Bridge safety review cycle started',
        titleNe: 'पुल सुरक्षा समीक्षा चक्र सुरु',
        status: 'delivered',
        detail: 'High-risk bridge reviews were moved into a regular monitoring cadence.',
        detailNe: 'उच्च जोखिमका पुलहरूको समीक्षा नियमित निगरानी चक्रमा ल्याइएको छ।',
      },
    ],
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
    sourceUrl: 'https://dor.gov.np/',
    sourcePaths: ['/home/publication', '/'],
    promiseCategories: ['Infrastructure', 'Transport'],
    trackedProjects: ['Kathmandu Ring Road', 'East-West Highway packages'],
    achievements: [
      {
        title: 'Priority package tracking standardized',
        titleNe: 'प्राथमिक प्याकेज ट्र्याकिङ मापदण्डीकरण',
        status: 'delivered',
        detail: 'Priority road packages are being tracked against a common milestone format.',
        detailNe: 'प्राथमिक सडक प्याकेजहरू साझा माइलस्टोन ढाँचामा ट्र्याक गरिँदैछन्।',
      },
    ],
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
    achievements: [
      {
        title: 'Route oversight dashboard planned',
        titleNe: 'रुट निगरानी ड्यासबोर्ड योजना',
        status: 'planned',
        detail: 'A public-facing route and permit monitoring layer is under planning.',
        detailNe: 'सार्वजनिक रुट तथा परमिट निगरानी तह योजनामा छ।',
      },
    ],
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
    achievements: [
      {
        title: 'Transmission bottleneck review underway',
        titleNe: 'प्रसारण अवरोध समीक्षा जारी',
        status: 'in_progress',
        detail: 'Critical bottlenecks affecting energy delivery are being reviewed as named workstreams.',
        detailNe: 'ऊर्जा डेलिभरीलाई असर गर्ने मुख्य अवरोध छुट्टै कार्यप्रवाहका रूपमा समीक्षा भइरहेका छन्।',
      },
    ],
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
    achievements: [
      {
        title: 'Reliability reporting cadence improved',
        titleNe: 'विश्वसनीयता प्रतिवेदन चक्र सुधार',
        status: 'in_progress',
        detail: 'Regular reporting on outages and response performance is being tightened.',
        detailNe: 'आउटेज र प्रतिक्रिया प्रदर्शनबारे नियमित प्रतिवेदन अझ कडा बनाइँदैछ।',
      },
    ],
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
    achievements: [
      {
        title: 'Hospital delivery watchlist created',
        titleNe: 'अस्पताल डेलिभरी वाचलिस्ट तयार',
        status: 'delivered',
        detail: 'Critical facility improvements are now grouped into a public monitoring list.',
        detailNe: 'मुख्य स्वास्थ्य संरचना सुधारहरू सार्वजनिक निगरानी सूचीमा समेटिएका छन्।',
      },
    ],
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
    achievements: [
      {
        title: 'Education delivery priorities grouped by district',
        titleNe: 'जिल्लाअनुसार शिक्षा डेलिभरी प्राथमिकता समूहबद्ध',
        status: 'planned',
        detail: 'District-level education priorities are being structured into a single public tracking view.',
        detailNe: 'जिल्लास्तरीय शिक्षा प्राथमिकतालाई एउटै सार्वजनिक ट्र्याकिङ दृश्यमा ल्याउने तयारी छ।',
      },
    ],
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
    achievements: [
      {
        title: 'Budget release transparency expected',
        titleNe: 'बजेट निकासा पारदर्शिता अपेक्षित',
        status: 'in_progress',
        detail: 'Capital release timing is being watched as a core delivery dependency across ministries.',
        detailNe: 'पुँजीगत निकासा समयलाई मन्त्रालयहरूबीचको मुख्य डेलिभरी निर्भरता रूपमा हेरिँदैछ।',
      },
    ],
  },
];
