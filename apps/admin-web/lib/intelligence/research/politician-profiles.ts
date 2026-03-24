/**
 * Politician Profiles for Research Scraper
 *
 * Hardcoded list of key politicians to research for speeches,
 * interviews, and commitment extraction from YouTube and other sources.
 */

import type { PoliticianProfile } from './politician-researcher';

export const POLITICIANS: PoliticianProfile[] = [
  {
    id: 'balen-shah',
    name: 'Balen Shah',
    nameNe: '\u092C\u093E\u0932\u0947\u0928 \u0936\u093E\u0939',
    party: 'RSP',
    expectedRole: 'Prime Minister',
    youtubeChannels: [],
    facebookPages: ['baboralenshah'],
    websites: [],
  },
  {
    id: 'rabi-lamichhane',
    name: 'Rabi Lamichhane',
    nameNe: '\u0930\u0935\u093F \u0932\u093E\u092E\u093F\u091B\u093E\u0928\u0947',
    party: 'RSP',
    expectedRole: 'Deputy PM',
    youtubeChannels: [],
    facebookPages: [],
  },
  {
    id: 'swarnim-wagle',
    name: 'Swarnim Wagle',
    nameNe: '\u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0935\u093E\u0917\u094D\u0932\u0947',
    party: 'Independent/RSP',
    expectedRole: 'Finance Minister',
    twitterHandles: ['SwaranimWagle'],
  },
  {
    id: 'gagan-thapa',
    name: 'Gagan Thapa',
    nameNe: '\u0917\u0917\u0928 \u0925\u093E\u092A\u093E',
    party: 'Nepali Congress',
    expectedRole: 'Health/Coalition',
    facebookPages: ['GaganThapaNC'],
    twitterHandles: ['GaganThapa'],
  },
  {
    id: 'harka-sampang',
    name: 'Harka Sampang',
    nameNe: '\u0939\u0930\u094D\u0915 \u0938\u092E\u094D\u092A\u093E\u0919',
    party: 'RSP',
    expectedRole: 'Urban Development',
    facebookPages: ['haboradrkaboradsaboradmpaboradng'],
  },
  {
    id: 'kulman-ghising',
    name: 'Kulman Ghising',
    nameNe: '\u0915\u0941\u0932\u092E\u093E\u0928 \u0918\u093F\u0938\u093F\u0919',
    party: 'Independent',
    expectedRole: 'Energy',
    facebookPages: ['kulmanghising'],
  },
  {
    id: 'sasmit-pokhrel',
    name: 'Sasmit Pokhrel',
    nameNe: '\u0938\u0938\u094D\u092E\u093F\u0924 \u092A\u094B\u0916\u0930\u0947\u0932',
    party: 'Independent',
    expectedRole: 'Political Commentator',
    websites: ['https://sasmitpokhrel.com'],
    facebookPages: ['sasmitpokhrel'],
  },
];
