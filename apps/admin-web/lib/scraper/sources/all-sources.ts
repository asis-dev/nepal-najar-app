/**
 * ALL government and news sources for Nepal Republic.
 * Each source is mapped to specific promises it covers.
 * Uses generic scraper factories for consistency.
 */
import { createGovScraper } from './generic-gov';
import { createNewsScraper } from './generic-news';
import type { SourceScraper } from '../types';

// ═══════════════════════════════════════════════════
// GOVERNMENT SOURCES — Mapped to specific promises
// ═══════════════════════════════════════════════════

/** Office of the Prime Minister and Council of Ministers — Promises 1, 2, 6, 33 */
export const opmcmGovScraper = createGovScraper({
  name: 'OPMCM (Office of PM)',
  slug: 'opmcm-gov',
  url: 'https://www.opmcm.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/ne/news/', '/en/press-release/'],
});

/** Federal Parliament — Promises 1, 5, 29, 30 */
export const parliamentScraper = createGovScraper({
  name: 'Federal Parliament',
  slug: 'parliament-gov',
  url: 'https://www.parliament.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/'],
});

/** National Planning Commission — Promises 3, 14 */
export const npcGovScraper = createGovScraper({
  name: 'National Planning Commission',
  slug: 'npc-gov',
  url: 'https://npc.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/category/news/', '/en/category/notice/'],
});

/** CIAA (Commission for Investigation of Abuse of Authority) — Promises 4, 5 */
export const ciaaGovScraper = createGovScraper({
  name: 'CIAA Anti-Corruption',
  slug: 'ciaa-gov',
  url: 'https://ciaa.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** PPMO (Public Procurement Monitoring Office) — Promise 7 */
export const ppmoGovScraper = createGovScraper({
  name: 'PPMO Procurement',
  slug: 'ppmo-gov',
  url: 'https://www.ppmo.gov.np',
  language: 'ne',
  subPages: ['/news/', '/notice/'],
});

/** Nepal Rastra Bank (Central Bank) — Promises 8, 10, 21 */
export const nrbGovScraper = createGovScraper({
  name: 'Nepal Rastra Bank',
  slug: 'nrb-gov',
  url: 'https://www.nrb.org.np',
  language: 'en',
  subPages: ['/contents/news/', '/contents/notice/', '/contents/publication/'],
  articleUrlPatterns: ['/contents/', '/publication/', '/monetary-policy/', '/press-release/'],
});

/** Central Bureau of Statistics — Promises 8, 9, 26 */
export const cbsGovScraper = createGovScraper({
  name: 'Central Bureau of Statistics',
  slug: 'cbs-gov',
  url: 'https://cbs.gov.np',
  language: 'en',
  subPages: ['/publications/', '/news/'],
  articleUrlPatterns: ['/publication/', '/survey/', '/census/', '/statistics/'],
});

/** Trade and Export Promotion Centre — Promise 10 */
export const tepcGovScraper = createGovScraper({
  name: 'TEPC Trade/Exports',
  slug: 'tepc-gov',
  url: 'https://www.tepc.gov.np',
  language: 'en',
  subPages: ['/news/', '/notice/'],
});

/** Inland Revenue Department — Promise 11 */
export const irdGovScraper = createGovScraper({
  name: 'Inland Revenue Department',
  slug: 'ird-gov',
  url: 'https://ird.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Nepal Electricity Authority — Promise 12 */
export const neaGovScraper = createGovScraper({
  name: 'Nepal Electricity Authority',
  slug: 'nea-gov',
  url: 'https://www.nea.org.np',
  language: 'en',
  subPages: ['/news/', '/notice/', '/publication/'],
  articleUrlPatterns: ['/news/', '/notice/', '/planning/', '/generation/'],
});

/** Department of Electricity Development — Promise 12 */
export const doedGovScraper = createGovScraper({
  name: 'Dept of Electricity Development',
  slug: 'doed-gov',
  url: 'https://www.doed.gov.np',
  language: 'en',
  subPages: ['/news/', '/notice/', '/project/'],
});

/** Kathmandu Upatyaka Khanepani Limited — Promise 13 */
export const kuklGovScraper = createGovScraper({
  name: 'KUKL (Kathmandu Water)',
  slug: 'kukl-gov',
  url: 'https://www.kukl.org.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Department of Roads — Promise 15 */
export const dorGovScraper = createGovScraper({
  name: 'Department of Roads',
  slug: 'dor-gov',
  url: 'https://www.dor.gov.np',
  language: 'en',
  subPages: ['/news/', '/notice/', '/project/'],
  articleUrlPatterns: ['/news/', '/project/', '/highway/', '/road/'],
});

/** Civil Aviation Authority — Promise 17 */
export const caanGovScraper = createGovScraper({
  name: 'Civil Aviation Authority',
  slug: 'caan-gov',
  url: 'https://caanepal.gov.np',
  language: 'en',
  subPages: ['/news/', '/notice/', '/press-release/'],
  articleUrlPatterns: ['/news/', '/airport/', '/notice/'],
});

/** Ministry of Communications & IT — Promises 18, 19, 20 */
export const mocitGovScraper = createGovScraper({
  name: 'Ministry of Communications & IT',
  slug: 'mocit-gov',
  url: 'https://mocit.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Health Insurance Board — Promise 22 */
export const hibGovScraper = createGovScraper({
  name: 'Health Insurance Board',
  slug: 'hib-gov',
  url: 'https://hib.gov.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Ministry of Health — Promises 22, 23 */
export const mohpGovScraper = createGovScraper({
  name: 'Ministry of Health',
  slug: 'mohp-gov',
  url: 'https://mohp.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Ministry of Education — Promises 24, 25, 26 */
export const moeGovScraper = createGovScraper({
  name: 'Ministry of Education',
  slug: 'moe-gov',
  url: 'https://moe.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** CTEVT (Vocational Training) — Promise 25 */
export const ctevtGovScraper = createGovScraper({
  name: 'CTEVT Vocational Training',
  slug: 'ctevt-gov',
  url: 'https://ctevt.org.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Ministry of Land Management — Promise 29 */
export const molmacGovScraper = createGovScraper({
  name: 'Ministry of Land Management',
  slug: 'molmac-gov',
  url: 'https://molcpa.gov.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Election Commission — Promise 30 */
export const electionGovScraper = createGovScraper({
  name: 'Election Commission',
  slug: 'election-gov',
  url: 'https://election.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Nepal Tourism Board — Promise 32 */
export const ntbGovScraper = createGovScraper({
  name: 'Nepal Tourism Board',
  slug: 'ntb-gov',
  url: 'https://www.welcomenepal.com',
  language: 'en',
  subPages: ['/news/', '/media/'],
});

/** Social Security Fund — Promise 34 */
export const ssfGovScraper = createGovScraper({
  name: 'Social Security Fund',
  slug: 'ssf-gov',
  url: 'https://ssf.gov.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Department of Passports — Promise 35 */
export const passportGovScraper = createGovScraper({
  name: 'Department of Passports',
  slug: 'passport-gov',
  url: 'https://nepalpassport.gov.np',
  language: 'ne',
  subPages: ['/en/', '/news/', '/notice/'],
});

/** Ministry of Labour — Promises 9, 34 */
export const molessGovScraper = createGovScraper({
  name: 'Ministry of Labour',
  slug: 'moless-gov',
  url: 'https://moless.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Department of Cooperatives — Promise 31 */
export const docGovScraper = createGovScraper({
  name: 'Department of Cooperatives',
  slug: 'doc-gov',
  url: 'https://deoc.gov.np',
  language: 'ne',
  subPages: ['/news/', '/notice/'],
});

/** Ministry of Federal Affairs — Promise 16 (Local governance) */
export const mofagaGovScraper = createGovScraper({
  name: 'Ministry of Federal Affairs',
  slug: 'mofaga-gov',
  url: 'https://mofaga.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Ministry of Law, Justice — Promise 1, 2, 5 */
export const moljpaGovScraper = createGovScraper({
  name: 'Ministry of Law, Justice',
  slug: 'moljpa-gov',
  url: 'https://moljpa.gov.np',
  language: 'ne',
  subPages: ['/en/', '/en/news/', '/en/notice/'],
});

/** Department of Immigration — Promise 35 */
export const immigrationGovScraper = createGovScraper({
  name: 'Department of Immigration',
  slug: 'immigration-gov',
  url: 'https://immigration.gov.np',
  language: 'en',
  subPages: ['/news/', '/notice/'],
});

// ═══════════════════════════════════════════════════
// NEPALI NEWS SOURCES — Broader coverage
// ═══════════════════════════════════════════════════

/** Ekantipur (Kantipur Daily) — Largest Nepali news site */
export const ekantipurScraper = createNewsScraper({
  name: 'Ekantipur',
  slug: 'ekantipur',
  url: 'https://ekantipur.com',
  language: 'ne',
  categoryPages: ['/news/', '/national/', '/economy/'],
  articleUrlPatterns: ['/news/', '/national/', '/economy/', '/opinion/'],
});

/** Ratopati — Popular Nepali news portal */
export const ratopatiScraper = createNewsScraper({
  name: 'Ratopati',
  slug: 'ratopati',
  url: 'https://www.ratopati.com',
  language: 'ne',
  categoryPages: ['/category/politics/', '/category/economy/', '/category/national/'],
  articleUrlPatterns: ['/story/', '/news/'],
});

/** Setopati — Leading Nepali digital news */
export const setopatiScraper = createNewsScraper({
  name: 'Setopati',
  slug: 'setopati',
  url: 'https://www.setopati.com',
  language: 'ne',
  categoryPages: ['/politics/', '/social/', '/economy/'],
  articleUrlPatterns: ['/news/', '/politics/', '/social/', '/economy/'],
});

/** Nagarik News — Nepali news from Nagarik Network */
export const nagarikNewsScraper = createNewsScraper({
  name: 'Nagarik News',
  slug: 'nagarik-news',
  url: 'https://nagariknews.nagariknetwork.com',
  language: 'ne',
  categoryPages: ['/category/politics/', '/category/economy/'],
  articleUrlPatterns: ['/news/', '/category/'],
});

/** The Record Nepal — English investigative journalism */
export const recordNepalScraper = createNewsScraper({
  name: 'The Record Nepal',
  slug: 'record-nepal',
  url: 'https://www.recordnepal.com',
  language: 'en',
  categoryPages: ['/category/politics/', '/category/wire/'],
  articleUrlPatterns: ['/wire/', '/perspective/', '/podcast/'],
});

/** RSS News (Rastriya Samachar Samiti) — Nepal's national news agency */
export const rssNewsScraper = createNewsScraper({
  name: 'RSS (National News Agency)',
  slug: 'rss-news',
  url: 'https://en.rssnepal.com',
  language: 'en',
  categoryPages: ['/category/national/', '/category/economy/', '/category/politics/'],
  articleUrlPatterns: ['/category/', '/post/'],
});

/** Gorkhapatra — Nepal's oldest national daily (government-owned) */
export const gorkhpatraScraper = createNewsScraper({
  name: 'Gorkhapatra',
  slug: 'gorkhapatra',
  url: 'https://gorkhapatraonline.com',
  language: 'ne',
  categoryPages: ['/news/', '/economy/', '/national/'],
  articleUrlPatterns: ['/news/', '/detail/'],
});

// ═══════════════════════════════════════════════════
// EXPORT ALL NEW SOURCES as a flat record
// ═══════════════════════════════════════════════════

export const allNewSources: Record<string, SourceScraper> = {
  // Government
  'opmcm-gov': opmcmGovScraper,
  'parliament-gov': parliamentScraper,
  'npc-gov': npcGovScraper,
  'ciaa-gov': ciaaGovScraper,
  'ppmo-gov': ppmoGovScraper,
  'nrb-gov': nrbGovScraper,
  'cbs-gov': cbsGovScraper,
  'tepc-gov': tepcGovScraper,
  'ird-gov': irdGovScraper,
  'nea-gov': neaGovScraper,
  'doed-gov': doedGovScraper,
  'kukl-gov': kuklGovScraper,
  'dor-gov': dorGovScraper,
  'caan-gov': caanGovScraper,
  'mocit-gov': mocitGovScraper,
  'hib-gov': hibGovScraper,
  'mohp-gov': mohpGovScraper,
  'moe-gov': moeGovScraper,
  'ctevt-gov': ctevtGovScraper,
  'molmac-gov': molmacGovScraper,
  'election-gov': electionGovScraper,
  'ntb-gov': ntbGovScraper,
  'ssf-gov': ssfGovScraper,
  'passport-gov': passportGovScraper,
  'moless-gov': molessGovScraper,
  'doc-gov': docGovScraper,
  'mofaga-gov': mofagaGovScraper,
  'moljpa-gov': moljpaGovScraper,
  'immigration-gov': immigrationGovScraper,
  // News
  'ekantipur': ekantipurScraper,
  'ratopati': ratopatiScraper,
  'setopati': setopatiScraper,
  'nagarik-news': nagarikNewsScraper,
  'record-nepal': recordNepalScraper,
  'rss-news': rssNewsScraper,
  'gorkhapatra': gorkhpatraScraper,
};
