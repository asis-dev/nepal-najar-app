/**
 * Nepal Republic — Services AI layer.
 *
 * Uses Gemini 2.0 Flash (free tier: 1,500 req/day, 1M tokens/min) for Q&A.
 * Embeddings via Gemini text-embedding-004 (free tier).
 * Falls back to keyword search if no API key or if Gemini is unavailable.
 *
 * Hard spend cap is enforced via `SERVICES_AI_DAILY_CAP` env var (default 1000).
 * Kill switch: set `SERVICES_AI_ENABLED=false` to disable AI entirely.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Service } from './types';
import { getAllServices, rankServices, searchServices } from './catalog';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEN_MODEL = process.env.SERVICES_AI_MODEL || 'gemini-2.0-flash';
const EMBED_MODEL = 'text-embedding-004';
const AI_ENABLED = process.env.SERVICES_AI_ENABLED !== 'false';
const DAILY_CAP = parseInt(process.env.SERVICES_AI_DAILY_CAP || '1000', 10);
const CACHE_VERSION = 'routing-v3';
const AI_COOLDOWN_MS = Math.max(
  60_000,
  Number.parseInt(process.env.SERVICES_AI_COOLDOWN_MS || '', 10) || 15 * 60 * 1000,
);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let aiCooldownUntil = 0;

export interface UserContext {
  district?: string | null;
  municipality?: string | null;
  ward?: string | null;
  province?: string | null;
}

export interface AskResult {
  answer: string;
  cited: Service[];
  cached: boolean;
  model: string | null;
  topService: Service | null;
  topServiceConfidence: number;
  routeMode: 'direct' | 'ambiguous' | 'none';
  routeReason: string | null;
  followUpPrompt: string | null;
  followUpOptions: string[];
  intakeState: IntakeState | null;
  intakeSlots: IntakeSlots | null;
}

export interface IntakeState {
  domain: 'health' | 'utilities' | 'license' | 'citizenship' | 'passport' | 'general';
  subject: 'self' | 'parent' | 'child' | 'family' | 'unknown';
  urgency: 'today' | 'soon' | 'routine' | 'unknown';
  careNeed: 'same_day' | 'specialist' | 'admission' | 'booking' | 'general' | 'unknown';
}

export interface IntakeSlots {
  health: {
    hospitalHint: 'bir' | 'tuth' | 'patan' | 'civil' | 'kanti' | 'maternity' | 'unknown';
    specialtyHint: 'general' | 'pediatric' | 'maternity' | 'specialist' | 'unknown';
    visitGoal: 'same_day' | 'specialist' | 'admission' | 'booking' | 'unknown';
  };
  utilities: {
    provider: 'nea' | 'kukl' | 'unknown';
    amountKnown: boolean;
    accountKnown: boolean;
  };
  license: {
    intent: 'renewal' | 'new' | 'trial' | 'unknown';
  };
  citizenship: {
    intent: 'descent' | 'birth' | 'duplicate' | 'unknown';
  };
  passport: {
    intent: 'new' | 'renewal' | 'tracking' | 'unknown';
  };
}

interface IntakeSessionState {
  intakeState: IntakeState;
  intakeSlots: IntakeSlots;
  lastQuestion: string;
  updatedAt: number;
}

const INTAKE_SESSION_TTL_MS = 20 * 60 * 1000;
const intakeSessions = new Map<string, IntakeSessionState>();

function normalizeIntentText(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function emptyIntakeSlots(): IntakeSlots {
  return {
    health: {
      hospitalHint: 'unknown',
      specialtyHint: 'unknown',
      visitGoal: 'unknown',
    },
    utilities: {
      provider: 'unknown',
      amountKnown: false,
      accountKnown: false,
    },
    license: {
      intent: 'unknown',
    },
    citizenship: {
      intent: 'unknown',
    },
    passport: {
      intent: 'unknown',
    },
  };
}

function getActiveIntakeSession(sessionId?: string | null) {
  if (!sessionId) return null;
  const session = intakeSessions.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.updatedAt > INTAKE_SESSION_TTL_MS) {
    intakeSessions.delete(sessionId);
    return null;
  }
  return session;
}

function saveIntakeSession(
  sessionId: string | null | undefined,
  intakeState: IntakeState,
  intakeSlots: IntakeSlots,
  lastQuestion: string,
) {
  if (!sessionId) return;
  intakeSessions.set(sessionId, {
    intakeState,
    intakeSlots,
    lastQuestion,
    updatedAt: Date.now(),
  });
}

function mergeIntakeState(previous: IntakeState | null, next: IntakeState): IntakeState {
  if (!previous) return next;

  return {
    domain: next.domain !== 'general' ? next.domain : previous.domain,
    subject: next.subject !== 'unknown' ? next.subject : previous.subject,
    urgency: next.urgency !== 'unknown' ? next.urgency : previous.urgency,
    careNeed: next.careNeed !== 'unknown' ? next.careNeed : previous.careNeed,
  };
}

function inferIntakeSlots(question: string, intakeState: IntakeState): IntakeSlots {
  const normalized = normalizeIntentText(question);
  const slots = emptyIntakeSlots();

  if (intakeState.domain === 'health') {
    if (/\bbir\b/.test(normalized)) slots.health.hospitalHint = 'bir';
    else if (/\btuth\b|teaching/.test(normalized)) slots.health.hospitalHint = 'tuth';
    else if (/\bpatan\b/.test(normalized)) slots.health.hospitalHint = 'patan';
    else if (/\bcivil\b/.test(normalized)) slots.health.hospitalHint = 'civil';
    else if (/\bkanti\b|childrens hospital/.test(normalized)) slots.health.hospitalHint = 'kanti';
    else if (isMaternityNeed(normalized) || /maternity|prasuti/.test(normalized)) slots.health.hospitalHint = 'maternity';

    if (intakeState.subject === 'child' || /pediatric|paediatric|child|kid|baby|infant|बाल|बच्चा/.test(normalized)) {
      slots.health.specialtyHint = 'pediatric';
    } else if (isMaternityNeed(normalized)) {
      slots.health.specialtyHint = 'maternity';
    } else if (intakeState.careNeed === 'specialist' || /specialist|विशेषज्ञ/.test(normalized)) {
      slots.health.specialtyHint = 'specialist';
    } else if (intakeState.careNeed !== 'unknown') {
      slots.health.specialtyHint = 'general';
    }

    if (intakeState.careNeed === 'same_day') slots.health.visitGoal = 'same_day';
    else if (intakeState.careNeed === 'specialist') slots.health.visitGoal = 'specialist';
    else if (intakeState.careNeed === 'admission') slots.health.visitGoal = 'admission';
    else if (intakeState.careNeed === 'booking' || isHospitalNeed(normalized)) slots.health.visitGoal = 'booking';
  }

  if (intakeState.domain === 'utilities') {
    if (/nea|electricity|power/.test(normalized)) slots.utilities.provider = 'nea';
    else if (/kukl|water|khanepani/.test(normalized)) slots.utilities.provider = 'kukl';
    slots.utilities.accountKnown = /\b\d{5,}\b|customer id|sc number|account number|ग्राहक/.test(normalized);
    slots.utilities.amountKnown = /\brs\b|npr|amount|due|bill amount|तिर्ने रकम|रकम/.test(normalized);
  }

  if (intakeState.domain === 'license') {
    if (/renew|renewal|नवीकरण/.test(normalized)) slots.license.intent = 'renewal';
    else if (/trial|ट्रायल/.test(normalized)) slots.license.intent = 'trial';
    else if (/new license|fresh license|नयाँ/.test(normalized)) slots.license.intent = 'new';
  }

  if (intakeState.domain === 'citizenship') {
    if (/descent|वंशज/.test(normalized)) slots.citizenship.intent = 'descent';
    else if (/birth|जन्म/.test(normalized)) slots.citizenship.intent = 'birth';
    else if (/duplicate|प्रतिलिपि|copy/.test(normalized)) slots.citizenship.intent = 'duplicate';
  }

  if (intakeState.domain === 'passport') {
    if (/renew|renewal/.test(normalized)) slots.passport.intent = 'renewal';
    else if (/track|status/.test(normalized)) slots.passport.intent = 'tracking';
    else if (/new|apply|application/.test(normalized)) slots.passport.intent = 'new';
  }

  return slots;
}

function mergeIntakeSlots(previous: IntakeSlots | null, next: IntakeSlots): IntakeSlots {
  if (!previous) return next;
  return {
    health: {
      hospitalHint: next.health.hospitalHint !== 'unknown' ? next.health.hospitalHint : previous.health.hospitalHint,
      specialtyHint: next.health.specialtyHint !== 'unknown' ? next.health.specialtyHint : previous.health.specialtyHint,
      visitGoal: next.health.visitGoal !== 'unknown' ? next.health.visitGoal : previous.health.visitGoal,
    },
    utilities: {
      provider: next.utilities.provider !== 'unknown' ? next.utilities.provider : previous.utilities.provider,
      amountKnown: next.utilities.amountKnown || previous.utilities.amountKnown,
      accountKnown: next.utilities.accountKnown || previous.utilities.accountKnown,
    },
    license: {
      intent: next.license.intent !== 'unknown' ? next.license.intent : previous.license.intent,
    },
    citizenship: {
      intent: next.citizenship.intent !== 'unknown' ? next.citizenship.intent : previous.citizenship.intent,
    },
    passport: {
      intent: next.passport.intent !== 'unknown' ? next.passport.intent : previous.passport.intent,
    },
  };
}

function buildSessionContextFragment(intakeState: IntakeState) {
  const parts: string[] = [];
  if (intakeState.domain !== 'general') parts.push(intakeState.domain);
  if (intakeState.subject !== 'unknown') parts.push(intakeState.subject);
  if (intakeState.urgency !== 'unknown') parts.push(intakeState.urgency);
  if (intakeState.careNeed !== 'unknown') parts.push(intakeState.careNeed);
  return parts.join(' ');
}

function applySessionContext(question: string, session: IntakeSessionState | null) {
  if (!session) return question;

  const normalized = normalizeIntentText(question);
  const inferred = inferIntakeState(question);
  const shortFollowUp = normalized.split(' ').length <= 8;
  const explicitDomain = inferred.domain !== 'general';

  if (!shortFollowUp || explicitDomain) return question;

  const context = buildSessionContextFragment(session.intakeState);
  if (!context) return question;

  return `${question}. context ${context}`;
}

function isHealthSymptomNeed(normalized: string) {
  return /(\bnot feeling well\b|\bunwell\b|\bsick\b|\bill\b|\bfever\b|\bpain\b|\bhurts?\b|\binjury\b|\bcough\b|\bvomit(?:ing)?\b|\bdiarrhea\b|\binfection\b|\bstomach\b|\bheadache\b|\bchest\b|\bbreathing\b|\bbleeding\b|\bbroken\s+(?:arm|leg|bone)\b|\bbimari\b|\bbirami\b|\bbiraami\b|बिरामी|ठिक छैन|ज्वरो|दुखाइ|दुख्छ|पेट|टाउको|घाउ|खोकी|श्वास|रगत)/.test(normalized);
}

function isHospitalNeed(normalized: string) {
  return /(hospital|opd|doctor|clinic|appointment|health|admission|checkup|specialist|अस्पताल|डाक्टर|समय|टिकट)/.test(normalized);
}

function isMaternityNeed(normalized: string) {
  return /\b(pregnan|pregnancy|delivery|antenatal|postnatal|maternal|gynae|gyne)\b|प्रसूति|गर्भ/.test(normalized);
}

function inferIntakeState(question: string): IntakeState {
  const normalized = normalizeIntentText(question);

  let domain: IntakeState['domain'] = 'general';
  if (isHospitalNeed(normalized) || isHealthSymptomNeed(normalized)) domain = 'health';
  else if (/(nea|electricity|power|kukl|water|bill|payment|pay)/.test(normalized)) domain = 'utilities';
  else if (/(license|licence|driving|renewal|dotm|trial|smart license)/.test(normalized)) domain = 'license';
  else if (/(citizenship|nagarikta)/.test(normalized)) domain = 'citizenship';
  else if (/(passport|rahadani|e passport|epassport)/.test(normalized)) domain = 'passport';

  let subject: IntakeState['subject'] = 'unknown';
  if (/\b(my child|my kid|my baby|my son|my daughter|for my child|for my kid|for my baby)\b|बच्चाको लागि|छोराको लागि|छोरीको लागि/.test(normalized)) {
    subject = 'child';
  } else if (/\b(my father|my mother|my dad|my mom|for my parent|for my parents)\b|बुबाको लागि|आमाको लागि|बाबु आमाको लागि|अभिभावकको लागि/.test(normalized)) {
    subject = 'parent';
  } else if (/\b(my family|for family|for my family|for my wife|for my husband)\b|परिवारको लागि|श्रीमतीको लागि|श्रीमानको लागि/.test(normalized)) {
    subject = 'family';
  } else if (/\b(i |my |me\b|for me\b)|मेरो|मलाई/.test(normalized)) {
    subject = 'self';
  }

  let urgency: IntakeState['urgency'] = 'unknown';
  if (/\b(today|now|immediately|urgent|asap|right now)\b|आजै|अहिले|तुरुन्त/.test(normalized)) urgency = 'today';
  else if (/\b(this week|soon|tomorrow|next week)\b|चाँडै|भोलि|यो हप्ता|अर्को हप्ता/.test(normalized)) urgency = 'soon';
  else if (/\b(checkup|routine|regular|follow up)\b|नियमित|फलो अप|चेकअप/.test(normalized)) urgency = 'routine';

  let careNeed: IntakeState['careNeed'] = 'unknown';
  if (/\b(admission|admit|emergency|er)\b|भर्ना|इमर्जेन्सी/.test(normalized)) careNeed = 'admission';
  else if (/\b(specialist|consultant|dermatologist|cardiologist|orthopedic|gynae|gyne|oncology)\b|विशेषज्ञ/.test(normalized)) careNeed = 'specialist';
  else if (/\b(doctor today|same day|today|urgent checkup)\b|आजै डाक्टर|आजै जाँच/.test(normalized)) careNeed = 'same_day';
  else if (/\b(appointment|booking|book|opd)\b|समय|बुक/.test(normalized)) careNeed = 'booking';
  else if (domain === 'health') careNeed = 'general';

  return { domain, subject, urgency, careNeed };
}

function isAiCoolingDown() {
  return Date.now() < aiCooldownUntil;
}

function beginAiCooldown(reason: string) {
  aiCooldownUntil = Date.now() + AI_COOLDOWN_MS;
  console.warn(`[services/ai] Cooling down provider usage for ${Math.round(AI_COOLDOWN_MS / 1000)}s: ${reason}`);
}

// ── Location helpers ──────────────────────────────────────────────
// Approximate centroids for major Nepal districts (Kathmandu valley + common ones)
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  kathmandu:    { lat: 27.7172, lng: 85.3240 },
  lalitpur:     { lat: 27.6588, lng: 85.3247 },
  bhaktapur:    { lat: 27.6710, lng: 85.4298 },
  kavrepalanchok: { lat: 27.5500, lng: 85.5500 },
  chitwan:      { lat: 27.5291, lng: 84.3542 },
  kaski:        { lat: 28.2096, lng: 83.9856 },
  morang:       { lat: 26.6650, lng: 87.2800 },
  sunsari:      { lat: 26.6800, lng: 87.1700 },
  jhapa:        { lat: 26.5500, lng: 87.8900 },
  rupandehi:    { lat: 27.5000, lng: 83.4500 },
  makwanpur:    { lat: 27.4200, lng: 85.0200 },
  nuwakot:      { lat: 27.9100, lng: 85.1600 },
  dhading:      { lat: 27.8700, lng: 84.9300 },
  sindhupalchok:{ lat: 27.9500, lng: 85.7000 },
  dolakha:      { lat: 27.7800, lng: 86.0700 },
  rasuwa:       { lat: 28.0600, lng: 85.3100 },
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  // Haversine — good enough for ranking
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getUserCoords(userCtx?: UserContext | null): { lat: number; lng: number } | null {
  if (!userCtx) return null;
  const district = (userCtx.district || '').toLowerCase().replace(/\s+/g, '');
  if (DISTRICT_COORDS[district]) return DISTRICT_COORDS[district];
  // Try partial match
  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (district.includes(key) || key.includes(district)) return coords;
  }
  return null;
}

function getServiceCoords(service: Service): { lat: number; lng: number } | null {
  for (const office of service.offices || []) {
    if (office.lat && office.lng) return { lat: office.lat, lng: office.lng };
  }
  return null;
}

function reprioritizeRankedServices(
  ranked: Array<{ service: Service; score: number }>,
  intakeState: IntakeState,
  originalQuestion: string,
  userCtx?: UserContext | null,
) {
  if (ranked.length === 0) return ranked;
  const normalized = normalizeIntentText(originalQuestion);

  if (intakeState.domain !== 'health') return ranked;

  const userCoords = getUserCoords(userCtx);

  return ranked
    .map((entry) => {
      let boost = 0;
      const slug = entry.service.slug;
      const title = normalizeIntentText(`${entry.service.title.en} ${entry.service.title.ne} ${entry.service.providerName}`);

      if (intakeState.subject === 'child') {
        if (slug === 'kanti-childrens-hospital' || title.includes('kanti')) boost += 180;
        if (title.includes('child') || title.includes('pediatric') || title.includes('children')) boost += 90;
      }

      if (isMaternityNeed(normalized)) {
        if (slug === 'maternity-hospital' || title.includes('maternity') || title.includes('prasuti')) boost += 180;
      }

      if (intakeState.careNeed === 'same_day') {
        if (title.includes('opd') || title.includes('hospital')) boost += 25;
      }

      if (intakeState.careNeed === 'specialist') {
        if (title.includes('teaching') || title.includes('tuth')) boost += 35;
      }

      // Location-based proximity boost for hospitals
      if (userCoords && entry.service.providerType === 'hospital') {
        const serviceCoords = getServiceCoords(entry.service);
        if (serviceCoords) {
          const km = distanceKm(userCoords.lat, userCoords.lng, serviceCoords.lat, serviceCoords.lng);
          // Boost nearby hospitals: <5km = +60, <10km = +40, <20km = +20
          if (km < 5) boost += 60;
          else if (km < 10) boost += 40;
          else if (km < 20) boost += 20;
        }
      }

      return { ...entry, score: entry.score + boost };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildRoutingQuery(question: string) {
  const normalized = normalizeIntentText(question);
  if (!normalized) return question.trim();
  const intake = inferIntakeState(question);

  const signals = new Set<string>();

  if (intake.domain === 'health') {
    signals.add('hospital');
    signals.add('appointment');
  }
  if (/(bir|birendra)/.test(normalized)) signals.add('bir');
  if (/(tuth|teaching|tribhuvan university teaching)/.test(normalized)) signals.add('tuth');
  if (/\bpatan\b/.test(normalized)) signals.add('patan');
  if (/\bcivil\b/.test(normalized)) signals.add('civil');
  if (/\bkanti\b/.test(normalized)) signals.add('kanti');
  if (intake.subject === 'child' || /\b(child|kid|baby|infant|pediatric|paediatric)\b|बच्चा|बाल/.test(normalized)) {
    signals.add('child');
    signals.add('kanti');
  }
  if (isMaternityNeed(normalized)) {
    signals.add('maternity');
    signals.add('hospital');
    signals.add('appointment');
  }
  if (/(maternity|prasuti)/.test(normalized)) signals.add('maternity');
  if (/(oncology|b p koirala|bp koirala)/.test(normalized)) signals.add('oncology');
  if (intake.careNeed === 'same_day') signals.add('doctor');
  if (intake.careNeed === 'specialist') signals.add('specialist');
  if (intake.careNeed === 'admission') signals.add('admission');
  if (intake.subject === 'parent') signals.add('adult');

  if (/(license|licence|driving|renewal|renew|dotm|trial|smart license)/.test(normalized)) {
    signals.add('driving');
    signals.add('license');
  }
  if (/(renewal|renew|expire|expired)/.test(normalized)) signals.add('renewal');
  if (/trial/.test(normalized)) signals.add('trial');
  if (/(new license|fresh license|new driving)/.test(normalized)) signals.add('new');

  if (/(nea|electricity|power)/.test(normalized)) {
    signals.add('nea');
    signals.add('electricity');
    signals.add('bill');
  }
  if (/(kukl|water|khanepani)/.test(normalized)) {
    signals.add('kukl');
    signals.add('water');
    signals.add('bill');
  }
  if (/(passport|e passport|epassport|rahadani)/.test(normalized)) {
    signals.add('passport');
  }
  if (/(citizenship|nagarikta)/.test(normalized)) {
    signals.add('citizenship');
  }
  if (/\b(pan|tax)\b/.test(normalized) && !/\btaxi\b/.test(normalized)) {
    signals.add('pan');
    signals.add('tax');
  }

  // Civic infrastructure complaints
  if (/(road|pothole|footpath|sidewalk|drain|sewage|streetlight|street light|garbage|construction|सडक|खाल्डा|खाल्डो|बाटो|ढल|नाली|बत्ती|फोहोर|निर्माण|पूर्वाधार)/.test(normalized)) {
    signals.add('road');
    signals.add('infrastructure');
    signals.add('complaint');
    signals.add('ward');
    signals.add('municipality');
  }
  // General civic complaint signals
  if (/(report|complaint|complain|problem|broken|damaged|गुनासो|उजुरी|समस्या|बिग्रिएको|भत्किएको|टुटेको)/.test(normalized)) {
    signals.add('complaint');
    signals.add('report');
    signals.add('infrastructure');
  }

  if (signals.size === 0) {
    return question.trim();
  }

  return [...signals].join(' ');
}

export function shouldAutoRoute(question: string, ranked: Array<{ service: Service; score: number }>) {
  const topRanked = ranked[0];
  const secondRanked = ranked[1];
  const topScore = topRanked?.score ?? 0;
  const secondScore = secondRanked?.score ?? 0;

  if (!topRanked || topScore < 65) return false;

  const normalized = normalizeIntentText(question);
  const intake = inferIntakeState(question);
  const broadHospitalIntent =
    (isHospitalNeed(normalized) || isHealthSymptomNeed(normalized)) &&
    !/(bir|teaching|tuth|patan|civil|kanti|maternity|bharatpur|oncology)/.test(normalized);

  const broadBillIntent =
    /(bill|payment|pay)/.test(normalized) &&
    !/(nea|electricity|kukl|water)/.test(normalized);

  const explicitUtilityProvider = /(nea|electricity|kukl|water)/.test(normalized);
  const explicitHospitalProvider = /(bir|teaching|tuth|patan|civil|kanti|maternity|prasuti)/.test(normalized);

  if (intake.domain === 'health' && isHealthSymptomNeed(normalized) && !explicitHospitalProvider) {
    return false;
  }

  if (intake.domain === 'health' && (intake.subject === 'child' || isMaternityNeed(normalized)) && !explicitHospitalProvider) {
    return false;
  }

  if (broadHospitalIntent) {
    if (
      topRanked.service.providerType === 'hospital' &&
      secondRanked?.service.providerType === 'hospital' &&
      secondScore >= topScore * 0.7
    ) {
      return false;
    }
  }

  if (broadBillIntent) {
    if (
      topRanked.service.category === 'utilities' &&
      secondRanked?.service.category === 'utilities' &&
      secondScore >= topScore * 0.75
    ) {
      return false;
    }
  }

  if (explicitUtilityProvider) {
    if (
      /(nea|electricity)/.test(normalized) &&
      /nea|electricity/.test(normalizeIntentText(`${topRanked.service.slug} ${topRanked.service.providerName} ${topRanked.service.title.en}`))
    ) {
      return topScore >= 90;
    }

    if (
      /(kukl|water)/.test(normalized) &&
      /kukl|water/.test(normalizeIntentText(`${topRanked.service.slug} ${topRanked.service.providerName} ${topRanked.service.title.en}`))
    ) {
      return topScore >= 90;
    }
  }

  return secondScore === 0 || (topScore - secondScore >= 18 && topScore >= secondScore * 1.15);
}

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────
function hashQuestion(q: string, locale: string) {
  return crypto
    .createHash('sha256')
    .update(`${CACHE_VERSION}::${locale}::${q.trim().toLowerCase().replace(/\s+/g, ' ')}`)
    .digest('hex');
}

function supa() {
  if (!SUPA_URL || !SUPA_KEY) return null;
  return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
}

export async function getCachedAnswer(question: string, locale: 'en' | 'ne'): Promise<AskResult | null> {
  const c = supa();
  if (!c) return null;
  const h = hashQuestion(question, locale);
  const { data } = await c
    .from('service_chat_cache')
    .select('answer, cited_service_ids, model')
    .eq('question_hash', h)
    .eq('locale', locale)
    .maybeSingle();
  if (!data) return null;

  // bump hit counter fire-and-forget
  c.from('service_chat_cache')
    .update({ hits: undefined, last_hit_at: new Date().toISOString() })
    .eq('question_hash', h)
    .eq('locale', locale)
    .then(() => {});

  const all = await getAllServices();
  const cited = (data.cited_service_ids || [])
    .map((id: string) => all.find((s) => s.id === id))
    .filter(Boolean) as Service[];

  const topService = cited[0] || null;
  return {
    answer: data.answer,
    cited,
    cached: true,
    model: data.model,
    topService,
    topServiceConfidence: topService ? 0.5 : 0,
    routeMode: topService ? 'direct' : cited.length > 0 ? 'ambiguous' : 'none',
    routeReason: topService ? 'Cached confident route.' : null,
    followUpPrompt: null,
    followUpOptions: [],
    intakeState: inferIntakeState(question),
    intakeSlots: inferIntakeSlots(question, inferIntakeState(question)),
  };
}

export async function saveAnswer(
  question: string,
  locale: 'en' | 'ne',
  answer: string,
  cited: Service[],
  model: string,
) {
  const c = supa();
  if (!c) return;
  const h = hashQuestion(question, locale);
  await c
    .from('service_chat_cache')
    .upsert(
      {
        question_hash: h,
        locale,
        question,
        answer,
        cited_service_ids: cited.map((s) => s.id).filter(Boolean),
        model,
      },
      { onConflict: 'question_hash,locale' },
    );
}

// ─────────────────────────────────────────────────────────────
// Daily cap
// ─────────────────────────────────────────────────────────────
export async function checkDailyCap(): Promise<boolean> {
  const c = supa();
  if (!c) return true; // no DB, no cap
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await c
    .from('service_chat_cache')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since.toISOString());
  return (count ?? 0) < DAILY_CAP;
}

// ─────────────────────────────────────────────────────────────
// Retrieval — pgvector if we have embeddings, else keyword
// ─────────────────────────────────────────────────────────────
export async function retrieveServices(question: string, locale: 'en' | 'ne', topK = 5): Promise<Service[]> {
  // Tier 1: pgvector semantic search (best quality, requires embeddings seeded)
  if (GEMINI_API_KEY && AI_ENABLED && !isAiCoolingDown()) {
    try {
      const qEmbed = await embed(question);
      if (qEmbed) {
        const c = supa();
        if (c) {
          const { data } = await c.rpc('match_services', {
            query_embedding: qEmbed,
            match_count: topK,
          });
          if (data && data.length > 0) {
            const all = await getAllServices();
            return data.map((d: any) => all.find((s) => s.id === d.id)).filter(Boolean) as Service[];
          }
        }
      }
    } catch (err) {
      console.warn('[services/ai] vector search failed, falling back:', err);
    }
  }

  // Tier 2: keyword fallback — always works
  const hits = await searchServices(question, locale);
  if (hits.length > 0) return hits.slice(0, topK);

  return [];
}

// ─────────────────────────────────────────────────────────────
// Gemini embed + generate
// ─────────────────────────────────────────────────────────────
export async function embed(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY || isAiCoolingDown()) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_QUERY',
        }),
      },
    );
    if (!r.ok) {
      if (r.status === 429) beginAiCooldown('embedding quota exhausted');
      return null;
    }
    const j = await r.json();
    return j.embedding?.values || null;
  } catch {
    return null;
  }
}

function buildPrompt(question: string, services: Service[], locale: 'en' | 'ne'): string {
  const context = services
    .map((s, i) => {
      const docs = s.documents.map((d) => `- ${d.title.en} / ${d.title.ne}${d.required ? ' (required)' : ''}`).join('\n');
      const steps = s.steps.map((st) => `${st.order}. ${st.title.en} — ${st.detail.en}`).join('\n');
      const offices = s.offices
        .map((o) => `${o.name.en} — ${o.address.en}${o.phone ? ' · ' + o.phone : ''}`)
        .join('\n');
      return `
[SERVICE ${i + 1}]
Title: ${s.title.en} / ${s.title.ne}
Provider: ${s.providerName}
Summary: ${s.summary.en}
Time: ${s.estimatedTime?.en || 'unknown'}
Fee: ${s.feeRange?.en || 'unknown'}
Documents:
${docs || '(none listed)'}
Steps:
${steps || '(none listed)'}
Offices:
${offices || '(none listed)'}
Official URL: ${s.officialUrl || 'n/a'}
`;
    })
    .join('\n---\n');

  const instructions = locale === 'ne'
    ? `तिमी Nepal Republic को AI सहायक हौ — नेपालमा बस्ने मानिसहरूको लागि बुद्धिमान जीवन सहायक।

तिमीले गर्नुपर्ने:
1. प्रयोगकर्ताको वास्तविक आवश्यकता बुझ — तिनीहरूले के भनिरहेका छन् त्यो मात्र नभई के चाहिन्छ त्यो बुझ।
2. यदि तलको SERVICE CONTEXT मा उत्तर छ भने — त्यो प्रयोग गर, शुल्क/समय/कागजात बारे अनुमान नगर।
3. यदि SERVICE CONTEXT मा उत्तर छैन तर तिमीलाई नेपालको बारेमा सामान्य ज्ञान छ भने — व्यावहारिक सल्लाह दिन सक्छौ (जस्तै खाना, यातायात, मौसम, दैनिक जीवन)।
4. यदि तिमीलाई पक्का थाहा छैन भने — स्पष्ट भन "मलाई यसबारे पक्का जानकारी छैन" र सम्भव भए कहाँ सोध्ने सुझाव दिन।
5. छोटो, स्पष्ट, मैत्रीपूर्ण जवाफ देऊ। bullet points प्रयोग गर।
6. प्रयोगकर्तालाई अझ राम्रोसँग मद्दत गर्न follow-up प्रश्नहरू सोध।`
    : `You are the Nepal Republic AI assistant — a wise, practical life assistant for people living in Nepal.

Your job:
1. UNDERSTAND what the user actually needs — not just what they literally said, but what they're trying to accomplish.
2. If the SERVICE CONTEXT below has the answer — use it. Never invent fees, timelines, or documents for government services.
3. If the SERVICE CONTEXT doesn't cover it but you have general knowledge about Nepal — give practical advice (food, transport, daily life, weather, culture, recommendations, etc.).
4. If you genuinely don't know — say "I'm not sure about this" and suggest where they could find out.
5. Be concise, warm, and helpful. Use bullets. Short paragraphs.
6. When the user's need is vague, ask smart follow-up questions to narrow it down.
7. Think about the user's REAL situation. "I am hungry" means they want food options. "I am bored" means they want things to do. "I need money" means they need financial help. Be human about it.
8. CRITICAL for health/medical symptoms: NEVER give medical advice or suggest home remedies. If someone says they're in pain, sick, or hurt — your job is to help them GET TO A HOSPITAL or doctor, not treat themselves. Ask which hospital they want, suggest nearby ones, give emergency numbers (102 ambulance). This is an ACTION app, not a medical advice app.`;

  return `${instructions}

=== SERVICE CONTEXT (Government & Essential Services) ===
${context}
=== END CONTEXT ===

User question (${locale}): ${question}

Answer:`;
}

function buildUserLocationFragment(userCtx?: UserContext | null): string {
  if (!userCtx) return '';
  const parts: string[] = [];
  if (userCtx.ward) parts.push(`Ward ${userCtx.ward}`);
  if (userCtx.municipality) parts.push(userCtx.municipality);
  if (userCtx.district) parts.push(userCtx.district);
  if (userCtx.province) parts.push(`Province ${userCtx.province}`);
  if (parts.length === 0) return '';
  return `\n\nUser's location: ${parts.join(', ')}. Prefer services and offices nearest to this location when suggesting options.`;
}

/**
 * General-purpose AI prompt for when no services match at all.
 * This makes the assistant helpful even for non-government-service questions.
 */
function buildGeneralPrompt(question: string, locale: 'en' | 'ne'): string {
  const instructions = locale === 'ne'
    ? `तिमी Nepal Republic को AI सहायक हौ — नेपालमा बस्ने मानिसहरूको लागि बुद्धिमान जीवन सहायक।

तिमीले मानिसहरूलाई नेपालमा दैनिक जीवनसँग सम्बन्धित कुनै पनि कुरामा मद्दत गर्छौ:
• खाना र रेस्टुरेन्ट — Foodmandu, Pathao Food, Bhojdeals, स्थानीय खानाका ठाउँहरू
• यातायात — Pathao, InDrive, बस रुटहरू, उडान जानकारी
• स्वास्थ्य — अस्पताल, फार्मेसी, आपतकालीन नम्बरहरू (102 एम्बुलेन्स, 100 प्रहरी)
• शिक्षा — विद्यालय, कलेज, परीक्षा, छात्रवृत्ति
• बैंकिङ — eSewa, Khalti, बैंक सेवा, QR भुक्तानी
• खरिद — Daraz, SastoDeal, स्थानीय बजारहरू
• मनोरञ्जन — ठाउँहरू, कार्यक्रमहरू, यात्रा गन्तव्य
• आपतकालीन — प्रहरी 100, एम्बुलेन्स 102, दमकल 101, Hello Sarkar 1111
• सरकारी सेवा — कागजात, कर, कानुनी प्रक्रिया
• दैनिक जीवन — मौसम, चाडपर्व, संस्कृति, सल्लाह

नियमहरू:
1. प्रयोगकर्ताको वास्तविक आवश्यकता बुझ।
2. व्यावहारिक, कार्ययोग्य सल्लाह दिन — सामान्य कुरा मात्र नभन।
3. सम्भव भए विशिष्ट नाम, फोन नम्बर, एप, वेबसाइट सुझाव दिन।
4. यदि पक्का थाहा छैन भने भन — अनुमान नगर।
5. छोटो, मैत्रीपूर्ण, र स्पष्ट जवाफ देऊ।`
    : `You are the Nepal Republic AI assistant — a wise, practical life assistant for people living in Nepal.

You help people with ANYTHING related to daily life in Nepal:
• Food & restaurants — Foodmandu, Pathao Food, Bhojdeals, local eateries, food recommendations
• Transport — Pathao, InDrive, bus routes, domestic flights (Buddha Air, Yeti Airlines)
• Health — hospitals, pharmacies, emergency numbers (102 ambulance, 100 police)
• Education — schools, colleges, exams, scholarships
• Banking & payments — eSewa, Khalti, bank services, QR payments, IME remittance
• Shopping — Daraz, SastoDeal, local markets (Ason, New Road, Durbar Marg)
• Entertainment — places to visit, events, travel destinations, movies
• Emergency — Police 100, Ambulance 102, Fire 101, Hello Sarkar 1111
• Government services — documents, taxes, legal processes
• Daily life — weather, festivals, culture, practical advice, tips

Rules:
1. UNDERSTAND the user's real need — read between the lines.
2. Give PRACTICAL, actionable advice — not generic fluff.
3. When possible, suggest specific names, phone numbers, apps, websites.
4. If you're not sure — say so honestly. Don't make things up.
5. Be concise, warm, and helpful. Use bullets.
6. Ask follow-up questions if the need is vague — help narrow it down.
7. CRITICAL for health/medical symptoms: NEVER give medical advice or home remedies. If someone says they hurt, are sick, or in pain — help them GET TO A HOSPITAL. Suggest nearby hospitals, give emergency numbers (102 ambulance). This is an ACTION app.`;

  return `${instructions}

User question (${locale}): ${question}

Answer:`;
}

async function callGemini(prompt: string, maxTokens = 1000): Promise<{ text: string; model: string } | null> {
  if (!GEMINI_API_KEY || !AI_ENABLED || isAiCoolingDown()) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.92,
            maxOutputTokens: maxTokens,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          ],
        }),
      },
    );
    if (!r.ok) {
      const body = await r.text();
      if (r.status === 429) {
        beginAiCooldown('generation quota exhausted');
      } else {
        console.warn('[services/ai] Gemini error:', r.status, body);
      }
      return null;
    }
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    if (!text.trim()) return null;
    return { text: text.trim(), model: GEN_MODEL };
  } catch (err) {
    console.warn('[services/ai] generate failed:', err);
    return null;
  }
}

/** Context about the user's active task — lets AI give step-specific guidance */
export interface ActiveTaskContext {
  serviceSlug: string;
  currentStep: number;
  progress: number;
  status: string;
  /** AI workflow context from WorkflowDefinition.aiWorkflowContext */
  aiWorkflowContext?: string;
  /** AI guidance prompt for the current action from WorkflowAction.aiGuidancePrompt */
  currentActionGuidance?: string;
  /** Which actions are already completed */
  completedActions?: string[];
}

function buildTaskContextFragment(taskCtx?: ActiveTaskContext | null): string {
  if (!taskCtx) return '';
  const parts: string[] = [
    `\n\n=== ACTIVE TASK CONTEXT ===`,
    `Service: ${taskCtx.serviceSlug}`,
    `Status: ${taskCtx.status} · Step ${taskCtx.currentStep} · ${taskCtx.progress}% complete`,
  ];
  if (taskCtx.completedActions?.length) {
    parts.push(`Completed: ${taskCtx.completedActions.join(', ')}`);
  }
  if (taskCtx.aiWorkflowContext) {
    parts.push(`\nWorkflow knowledge:\n${taskCtx.aiWorkflowContext}`);
  }
  if (taskCtx.currentActionGuidance) {
    parts.push(`\nCurrent step guidance:\n${taskCtx.currentActionGuidance}`);
  }
  parts.push(`\nUse this context to give SPECIFIC, actionable advice for the user's current step. Don't repeat generic steps they've already completed.`);
  parts.push(`=== END TASK CONTEXT ===`);
  return parts.join('\n');
}

export async function generateAnswer(
  question: string,
  services: Service[],
  locale: 'en' | 'ne',
  userCtx?: UserContext | null,
  taskCtx?: ActiveTaskContext | null,
): Promise<{ text: string; model: string } | null> {
  const prompt = buildPrompt(question, services, locale)
    + buildUserLocationFragment(userCtx)
    + buildTaskContextFragment(taskCtx);
  return callGemini(prompt, 1000);
}

/**
 * General-purpose answer when no services match.
 * Uses broad Nepal life knowledge instead of service context.
 * Falls back to smart static answers if Gemini is unavailable.
 */
export async function generateGeneralAnswer(
  question: string,
  locale: 'en' | 'ne',
): Promise<{ text: string; model: string } | null> {
  // Try AI first
  const prompt = buildGeneralPrompt(question, locale);
  const aiResult = await callGemini(prompt, 1000);
  if (aiResult) return aiResult;

  // Fall back to smart static answer based on keywords
  const staticAnswer = buildGeneralStaticAnswer(question, locale);
  if (staticAnswer) return { text: staticAnswer, model: 'static' };

  return null;
}

/** Smart static answers for common life queries when Gemini is unavailable */
function buildGeneralStaticAnswer(question: string, locale: 'en' | 'ne'): string | null {
  const q = normalizeIntentText(question);
  const isNe = locale === 'ne';

  // Food / hungry
  if (/(hungry|food|eat|restaurant|khana|bhok|pizza|momo|order food|delivery)/i.test(q)) {
    return isNe
      ? '🍽️ खाना अर्डर गर्न:\n\n• **Foodmandu** — foodmandu.com वा एपबाट अर्डर गर्नुहोस्\n• **Pathao Food** — Pathao एपमा Food खण्ड हेर्नुहोस्\n• **Bhojdeals** — bhojdeals.com मा विशेष छुटहरू\n• **eSewa** मा पनि खाना अर्डर गर्न सकिन्छ\n\nनजिकको रेस्टुरेन्ट खोज्न Google Maps प्रयोग गर्नुहोस्।'
      : '🍽️ Here are your options for food:\n\n• **Foodmandu** — Order at foodmandu.com or their app\n• **Pathao Food** — Open the Pathao app, go to Food section\n• **Bhojdeals** — Check bhojdeals.com for deals\n• **eSewa** — Also has food ordering built in\n\nFor nearby restaurants, search on Google Maps. Popular spots in Kathmandu: Thamel for variety, Jhamsikhel for cafes, New Road for local food.';
  }

  // Transport / taxi / ride
  if (/(taxi|cab|ride|travel|bus|yatayat|gadi|pathao|indrive|flight|airport)/i.test(q)) {
    return isNe
      ? '🚗 यातायात विकल्पहरू:\n\n• **Pathao** — बाइक/कार राइड बुक गर्नुहोस् (एप डाउनलोड गर्नुहोस्)\n• **InDrive** — मूल्य सम्झौता गर्न सक्ने राइड\n• **Tootle** — बाइक राइड\n• **Sajha Yatayat** — सस्तो सार्वजनिक बस\n• उडानको लागि: Buddha Air, Yeti Airlines\n• हवाई अड्डा: 014113001'
      : '🚗 Transport options:\n\n• **Pathao** — Book bike/car rides (download the app)\n• **InDrive** — Negotiate your fare\n• **Tootle** — Bike rides\n• **Sajha Yatayat** — Affordable public buses\n• Domestic flights: Buddha Air, Yeti Airlines\n• Airport info: 014113001';
  }

  // Money / payment / remittance
  if (/(money|pay|payment|esewa|khalti|send money|remittance|ime|bank|atm|paisa)/i.test(q)) {
    return isNe
      ? '💰 भुक्तानी र पैसा:\n\n• **eSewa** — QR भुक्तानी, बिल भुक्तानी, पैसा पठाउनुहोस्\n• **Khalti** — डिजिटल वालेट\n• **IME Pay** — रेमिट्यान्स र भुक्तानी\n• **ConnectIPS** — बैंक ट्रान्सफर\n• नजिकको ATM खोज्न Google Maps प्रयोग गर्नुहोस्'
      : '💰 Payments & money:\n\n• **eSewa** — QR payments, bill pay, send money\n• **Khalti** — Digital wallet\n• **IME Pay** — Remittance and payments\n• **ConnectIPS** — Bank-to-bank transfers\n• For ATMs, search Google Maps for your nearest one';
  }

  // Civic infrastructure complaints
  if (/(road|pothole|footpath|drain|sewage|streetlight|garbage|construction|broken|damaged|सडक|खाल्डा|ढल|बत्ती|फोहोर|निर्माण|भत्किएको|बिग्रिएको|टुटेको)/i.test(q) && /(report|complaint|problem|issue|fix|repair|complain|गुनासो|उजुरी|समस्या|रिपोर्ट)/i.test(q)) {
    return isNe
      ? '🏗️ स्थानीय पूर्वाधार समस्या रिपोर्ट गर्ने:\n\n• **वडा कार्यालय** — लिखित उजुरी दिनुहोस् (फोटो सहित)\n• **1111** — Hello Sarkar (सरकारी गुनासो हटलाइन)\n• **नागरिक एप** — nagarikapp.gov.np बाट पनि उजुरी दिन सकिन्छ\n\nवडा सचिवले १५ दिनभित्र जवाफ दिनुपर्छ। फोटो प्रमाण राख्नुहोस्।'
      : '🏗️ Report local infrastructure issues:\n\n• **Ward Office** — File a written complaint with photos\n• **1111** — Hello Sarkar (government grievance hotline)\n• **Nagarik App** — nagarikapp.gov.np for online filing\n\nYour ward must respond within 15 days. Keep photo evidence. For urgent issues (e.g., dangerous road damage), also call your municipality office.';
  }

  // Emergency
  if (/(emergency|help|accident|fire|theft|stolen|police|ambulance|aapatkal)/i.test(q)) {
    return isNe
      ? '🚨 आपतकालीन नम्बरहरू:\n\n• **100** — प्रहरी\n• **101** — दमकल\n• **102** — एम्बुलेन्स\n• **1111** — Hello Sarkar (सरकारी गुनासो)\n• **103** — बाल हेल्पलाइन\n• **1098** — महिला हेल्पलाइन\n• **107** — भ्रष्टाचार रिपोर्ट (CIAA)'
      : '🚨 Emergency numbers:\n\n• **100** — Nepal Police\n• **101** — Fire Brigade\n• **102** — Ambulance\n• **1111** — Hello Sarkar (Government grievances)\n• **103** — Child Helpline\n• **1098** — Women Helpline\n• **107** — Anti-corruption (CIAA)';
  }

  // Shopping
  if (/(shop|buy|purchase|daraz|online|kinna|market|bazaar)/i.test(q)) {
    return isNe
      ? '🛒 किनमेल:\n\n• **Daraz** — daraz.com.np (सबैभन्दा ठूलो अनलाइन स्टोर)\n• **SastoDeal** — sastodeal.com\n• **HamroBazar** — hamrobazaar.com (दोस्रो हात सामान)\n• स्थानीय बजार: आसन, न्यु रोड, माहाबौद्ध\n• मल: City Center, Civil Mall, Labim Mall'
      : '🛒 Shopping options:\n\n• **Daraz** — daraz.com.np (largest online store)\n• **SastoDeal** — sastodeal.com\n• **HamroBazar** — hamrobazaar.com (second-hand goods)\n• Local markets: Ason, New Road, Maharajgunj\n• Malls: City Center, Civil Mall, Labim Mall';
  }

  // Bored / entertainment / fun
  if (/(bored|fun|entertainment|movie|cinema|place|visit|ghumna|manoranjan)/i.test(q)) {
    return isNe
      ? '🎯 मनोरञ्जन र घुम्ने ठाउँहरू:\n\n• **सिनेमा** — QFX Cinemas, Big Movies\n• **घुम्ने** — स्वयम्भू, बौद्ध, पशुपति, नागार्जुन, शिवपुरी\n• **खेलकुद** — Fun Park (भक्तपुर), Rock Climbing\n• **क्याफे** — Jhamsikhel, Lazimpat, Thamel\n• यात्रा: पोखरा, लुम्बिनी, चितवन, नागरकोट'
      : '🎯 Things to do:\n\n• **Movies** — QFX Cinemas, Big Movies\n• **Visit** — Swayambhu, Boudha, Pashupatinath, Nagarjun, Shivapuri\n• **Activities** — Fun Park (Bhaktapur), Rock Climbing\n• **Cafes** — Jhamsikhel, Lazimpat, Thamel\n• Travel: Pokhara, Lumbini, Chitwan, Nagarkot';
  }

  // Weather
  if (/(weather|mausam|rain|hot|cold|temperature)/i.test(q)) {
    return isNe
      ? '🌤️ मौसम जानकारी:\n\n• **mfd.gov.np** — नेपाल मौसम विज्ञान विभाग\n• **weather.com** मा "Kathmandu" खोज्नुहोस्\n• एप: AccuWeather, Weather Channel\n\nनेपालमा अहिले (अप्रिल): दिनमा तातो (~28°C), बिहान चिसो। मनसुन जुनदेखि सुरु हुन्छ।'
      : '🌤️ Weather info:\n\n• **mfd.gov.np** — Nepal Meteorological Department\n• Search "Kathmandu" on weather.com\n• Apps: AccuWeather, Weather Channel\n\nNepal in April: Warm days (~28°C), cool mornings. Monsoon starts in June.';
  }

  // Internet / phone / recharge
  if (/(internet|wifi|recharge|data|ntc|ncell|phone|sim|mobile)/i.test(q)) {
    return isNe
      ? '📱 मोबाइल र इन्टरनेट:\n\n• **NTC** — *400# डायल गरेर रिचार्ज\n• **Ncell** — *902# डायल गरेर प्याकेज\n• रिचार्ज: eSewa, Khalti, IME Pay बाट\n• WiFi: Vianet, WorldLink, Subisu, Classic Tech\n• SIM कार्ड: NTC/Ncell दुवैमा नागरिकता चाहिन्छ'
      : '📱 Mobile & internet:\n\n• **NTC** — Dial *400# for recharge\n• **Ncell** — Dial *902# for packages\n• Recharge via: eSewa, Khalti, IME Pay\n• WiFi providers: Vianet, WorldLink, Subisu, Classic Tech\n• SIM card: Need citizenship/passport at NTC/Ncell store';
  }

  // Health / medicine / pharmacy
  if (/(medicine|pharmacy|drug|aushadhi|pharma|tablet)/i.test(q)) {
    return isNe
      ? '💊 औषधि र फार्मेसी:\n\n• नजिकको फार्मेसी Google Maps मा खोज्नुहोस्\n• **१०२** — एम्बुलेन्स\n• सरकारी अस्पताल: बिर, TUTH, पाटन\n• HealthAt Home (एप) — घरमै डाक्टर\n• आपतकालीन: Norvic, Grande, Mediciti (निजी)'
      : '💊 Pharmacy & medicine:\n\n• Search Google Maps for nearest pharmacy\n• **102** — Ambulance\n• Government hospitals: Bir, TUTH, Patan\n• HealthAt Home (app) — Doctor at home\n• Emergency: Norvic, Grande, Mediciti (private)';
  }

  // Job / work
  if (/(job|work|kaam|rojgar|vacancy|hire|career|intern)/i.test(q)) {
    return isNe
      ? '💼 रोजगार:\n\n• **MeroJob** — merojob.com (सबैभन्दा ठूलो)\n• **JobsNepal** — jobsnepal.com\n• **KumarijOb** — kumarijob.com\n• **Lok Sewa** — psc.gov.np (सरकारी जागिर)\n• **LinkedIn** — अन्तर्राष्ट्रिय र कर्पोरेट\n• **Freelancing** — Upwork, Fiverr'
      : '💼 Job search:\n\n• **MeroJob** — merojob.com (largest job portal)\n• **JobsNepal** — jobsnepal.com\n• **KumarijOb** — kumarijob.com\n• **Lok Sewa** — psc.gov.np (government jobs)\n• **LinkedIn** — International & corporate\n• **Freelancing** — Upwork, Fiverr';
  }

  // Education / study
  if (/(study|school|college|university|exam|padhai|bidhyalaya|scholarship)/i.test(q)) {
    return isNe
      ? '📚 शिक्षा:\n\n• **TU** — tribhuvan-university.edu.np (त्रिभुवन विश्वविद्यालय)\n• **KU** — ku.edu.np (काठमाडौं विश्वविद्यालय)\n• **NEB** — neb.gov.np (बोर्ड परीक्षा)\n• **Lok Sewa** — psc.gov.np (प्रतियोगिता परीक्षा)\n• छात्रवृत्ति: moest.gov.np\n• विदेश पढ्न: EducateNepal.com'
      : '📚 Education:\n\n• **TU** — tribhuvan-university.edu.np\n• **KU** — ku.edu.np (Kathmandu University)\n• **NEB** — neb.gov.np (Board exams)\n• **Lok Sewa** — psc.gov.np (Civil service exams)\n• Scholarships: moest.gov.np\n• Study abroad: EducateNepal.com';
  }

  // Rent / house
  if (/(rent|house|flat|room|apartment|ghar|kotha|bhadha)/i.test(q)) {
    return isNe
      ? '🏠 घर/कोठा खोज्न:\n\n• **HamroBazar** — hamrobazaar.com (कोठा/फ्ल्याट)\n• **RentNepal** — Facebook group\n• **Nepal Flat** — nepalflat.com\n• **OLX Nepal** — olx.com.np\n• Facebook मा "Room for rent Kathmandu" खोज्नुहोस्'
      : '🏠 Finding a place to live:\n\n• **HamroBazar** — hamrobazaar.com (rooms/flats)\n• **RentNepal** — Facebook group\n• **Nepal Flat** — nepalflat.com\n• **OLX Nepal** — olx.com.np\n• Search Facebook for "Room for rent Kathmandu"';
  }

  // Generic greeting or unclear
  if (/(hello|hi|namaste|kasto|how are you|sup)/i.test(q)) {
    return isNe
      ? 'नमस्ते! 🙏 म Nepal Republic को AI सहायक हुँ। म तपाईंलाई सरकारी सेवा, खाना, यातायात, स्वास्थ्य, किनमेल, र दैनिक जीवनमा मद्दत गर्न सक्छु। के चाहिन्छ?'
      : 'Namaste! 🙏 I\'m the Nepal Republic AI assistant. I can help you with government services, food, transport, health, shopping, and daily life in Nepal. What do you need?';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Top-level ask
// ─────────────────────────────────────────────────────────────
function getMissingSlots(intakeState: IntakeState, intakeSlots: IntakeSlots) {
  if (intakeState.domain === 'health') {
    const missing: string[] = [];
    if (intakeSlots.health.visitGoal === 'unknown') missing.push('visit_goal');
    if (intakeState.subject === 'unknown') missing.push('subject');
    if (intakeSlots.health.hospitalHint === 'unknown' && intakeSlots.health.specialtyHint === 'unknown') {
      missing.push('facility_preference');
    }
    return missing;
  }

  if (intakeState.domain === 'utilities') {
    const missing: string[] = [];
    if (intakeSlots.utilities.provider === 'unknown') missing.push('provider');
    if (!intakeSlots.utilities.accountKnown) missing.push('account');
    if (!intakeSlots.utilities.amountKnown) missing.push('amount');
    return missing;
  }

  if (intakeState.domain === 'license') {
    return intakeSlots.license.intent === 'unknown' ? ['license_intent'] : [];
  }

  if (intakeState.domain === 'citizenship') {
    return intakeSlots.citizenship.intent === 'unknown' ? ['citizenship_intent'] : [];
  }

  if (intakeState.domain === 'passport') {
    return intakeSlots.passport.intent === 'unknown' ? ['passport_intent'] : [];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// AI-first intent classification
// Uses Gemini to understand what the user wants BEFORE trying
// keyword-based service matching. The AI decides the intent category,
// and we route to the right service directly.
// Deterministic patterns serve as FALLBACK when AI is unavailable.
// ─────────────────────────────────────────────────────────────

const INTENT_CATEGORIES: Record<string, string> = {
  civic_complaint: 'local-infrastructure-complaint',
  corruption_complaint: 'ciaa-complaint',
  consumer_complaint: 'consumer-complaint',
  human_rights_complaint: 'human-rights-complaint',
  government_grievance: 'lokpal-complaint',
};

/**
 * AI-powered smart router — single Gemini call that understands user intent,
 * picks the right service from the full catalog, and generates a helpful response.
 * This replaces both intent classification AND answer generation for complaint/action intents.
 */
async function smartRouteWithAI(
  question: string,
  locale: 'en' | 'ne',
): Promise<{ slug: string; category: string; confidence: number; response: string; followUp: string | null; options: string[] } | null> {
  if (!GEMINI_API_KEY || !AI_ENABLED || isAiCoolingDown()) return null;

  const all = await getAllServices();
  // Build compact service index — slug + English title + Nepali title + summary
  const serviceIndex = all.map(s =>
    `${s.slug}: ${s.title.en} (${s.title.ne}) — ${s.summary.en.slice(0, 100)}`
  ).join('\n');

  const prompt = `You are the AI brain of Nepal Republic (नेपाल रिपब्लिक) — a civic super-app that helps every Nepali citizen navigate government services, report problems, and get things done. You think like the smartest, most helpful दिदी/दाजु in the neighborhood who knows exactly which office to go to, which number to call, and what documents to bring.

USER SAID: "${question}"

YOUR MISSION: Understand their REAL need (even if poorly worded, in Romanized Nepali, mixed Hindi-Nepali, or broken English) and route them to the exact right service. Be brilliant at reading between the lines.

═══ HOW TO THINK (30+ examples) ═══

INFRASTRUCTURE & CIVIC COMPLAINTS → local-infrastructure-complaint:
- "the road near my house is broken" → infrastructure complaint
- "mero ghar agadi ko bato bigrieko cha" → road complaint
- "pani aaudaina 3 din bhayo" → water supply complaint
- "street light baleko chhaina" → streetlight complaint
- "fohor uthako chhaina" → garbage not collected
- "nali/drain blocked" → drainage complaint
- "construction le dhulo airacha" → construction dust complaint
- "pothole", "खाल्डो", "सडक", "बाटो फुटेको" → road complaint
- "bijuli chhaina" → power issue → local-infrastructure-complaint
- "park ma batti chhaina" → park lighting → local-infrastructure-complaint

CORRUPTION → ciaa-complaint:
- "police asked me for money" → corruption
- "officer le ghus khayo" → bribery
- "CDO office ma paisa magyo" → corruption at govt office
- "I had to pay extra at the passport office" → corruption
- "bhrastachar", "ghus", "rishwat" → corruption

CONSUMER → consumer-complaint:
- "shop sold me fake product" → consumer fraud
- "overcharged at restaurant" → consumer complaint
- "online shopping scam" → consumer fraud
- "warranty honour garena" → consumer complaint
- "paisa firta dina maanena" → refund refused

HUMAN RIGHTS → human-rights-complaint:
- "discriminated because of my caste" → human rights
- "jaat ko karan service diyena" → caste discrimination
- "bonded labor", "child labor", "बाल श्रम" → human rights
- "mahila hinsa" → gender violence → human rights

GOVT GRIEVANCE → lokpal-complaint:
- "government office didn't help me" → Hello Sarkar
- "sarkaari kaam bhayena" → govt grievance
- "CDO office gaye kaam bhayena" → govt grievance
- "they keep sending me from one office to another" → govt grievance

HEALTH → category: "health_needs_triage" (NO slug, ask what they need):
- "my stomach hurts" → DO NOT give medical advice → ask hospital/doctor/pharmacy
- "biramii chu" → ask if they need hospital
- "baccha lai jworo aayo" → child has fever → ask hospital
- "blood pressure high" → ask if they need hospital
- NEVER say "try ginger tea" or "take rest" — ALWAYS route to medical care

PASSPORT:
- "I need a passport" → new-passport
- "passport renew" → passport-renewal
- "passport kina lagcha" → new-passport
- "bidesh jaanu cha passport chahiyo" → new-passport

CITIZENSHIP:
- "nagarikta/nagarikta banauney" → new-citizenship-application
- "citizenship by descent" → new-citizenship-application

DRIVING LICENSE:
- "license" / "sawari chalana" → driving-license-new
- "license renew" → driving-license-renewal

AMBIGUOUS — ask a smart question:
- "bidesh jaanu cha" → could be passport, labor permit, visa, NOC → ASK
- "job" → could be govt job (Lok Sewa) or private → ASK
- "paisa" → could be banking, remittance, tax → ASK
- "school" → could be admission, transfer, complaint → ASK

═══ SERVICE CATALOG ═══
${serviceIndex}

═══ COMPLAINT ROUTING CHEAT SHEET ═══
local-infrastructure-complaint → road, water, drain, light, garbage, construction, park, sidewalk, bridge, electricity
ciaa-complaint → bribery, corruption, ghus, nepotism, govt misconduct
consumer-complaint → fraud, scam, fake product, overcharge, warranty, refund
human-rights-complaint → discrimination, caste, gender violence, forced labor, child labor
lokpal-complaint → govt office not working, Hello Sarkar, bureaucratic runaround

═══ RESPONSE RULES ═══
1. CLEAR intent → pick exact slug, confidence 0.85-0.95, short warm response
2. AMBIGUOUS → confidence 0.4-0.6, ask ONE smart clarifying question, give 3-4 option buttons
3. HEALTH symptoms → category "health_needs_triage", NO slug, ask hospital/doctor/pharmacy — NEVER give medical advice or home remedies
4. GREETING (namaste, hi, hello, kasto) → category "greeting", slug null, respond warmly, suggest what the app can do
5. Response language: ${locale === 'ne' ? 'Nepali (use natural Nepali, not overly formal)' : 'English (warm, friendly)'}
6. Response length: 1-2 sentences MAX. Be concise. No lecturing.
7. Option buttons: 3-6 words each, actionable ("Report to ward office", "Find nearest hospital")
8. NEVER say "I cannot help" — always route SOMEWHERE useful
9. Understand Romanized Nepali (bato = road, pani = water, bijuli = electricity, fohor = garbage)
10. Understand code-switching: "mero passport expire bhayo" = passport renewal
11. If user mentions a specific location/ward, acknowledge it in your response

Respond with ONLY this JSON:
{"slug":"service-slug-or-null","category":"civic_complaint|corruption|consumer|human_rights|health_needs_triage|government_service|greeting|general","confidence":0.0,"response":"message","followUp":"question-or-null","options":["opt1","opt2"]}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        }),
      },
    );
    if (!r.ok) {
      if (r.status === 429) beginAiCooldown('smart-router quota');
      return null;
    }
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    // Clean up any markdown code fences the model might add
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.category && typeof parsed.confidence === 'number') {
      return {
        slug: parsed.slug || null,
        category: parsed.category,
        confidence: parsed.confidence,
        response: parsed.response || '',
        followUp: parsed.followUp || null,
        options: Array.isArray(parsed.options) ? parsed.options : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Deterministic fallback patterns — comprehensive, used when AI is unavailable */
const CIVIC_COMPLAINT_PATTERNS = [
  // English patterns — road/street/path
  /(?:road|street|path|highway|bridge|footpath|sidewalk|pavement).*(?:broken|damaged|bad|crack|hole|block|collapse|flood|destroy|repair|fix)/i,
  /(?:broken|damaged|bad|crack|destroy|collapse|flood).*(?:road|street|path|highway|bridge|footpath|sidewalk)/i,
  /pothole|manhole/i,
  // Romanized Nepali — bato, sadak, pul
  /(?:bato|sadak|road|sarak).*(?:bigr|bhatkk?|kharab|tut|fut|phut|broken|damage|fix)/i,
  /(?:bigr|bhatkk?|kharab|tut|fut|phut).*(?:bato|sadak|road|sarak)/i,
  // Devanagari — सडक, बाटो, पुल
  /खाल्ड[ाो]|सडक.*(?:भत्क|बिग्र|खराब|टुट|फुट)|(?:भत्क|बिग्र|खराब|टुट|फुट).*सडक/i,
  /बाटो.*(?:भत्क|बिग्र|खराब|टुट)|(?:भत्क|बिग्र|खराब|टुट).*बाटो/i,
  // Water supply
  /(?:water|pani|खानेपानी|पानी).*(?:not coming|no |cut|stop|problem|issue|dirty|broken|supply|aaudaina|aayena)/i,
  /पानी.*(?:आउँदैन|छैन|बन्द|समस्या)|(?:आउँदैन|छैन|बन्द).*पानी/i,
  /pani.*(?:aaudaina|chaina|banda|samasya|nai chaina)/i,
  // Drainage
  /(?:drain|sewer|sewage|ढल|नाली|nali).*(?:block|overflow|broken|smell|clog|problem|banda|bhari)/i,
  /ढल.*(?:बन्द|भत्क|बिग्र|गन्ध)|(?:बन्द|भत्क|बिग्र).*ढल/i,
  // Streetlight / electricity
  /(?:street\s*light|बत्ती|batti|light\s*post).*(?:not work|broken|off|out|dark|problem|balena|chhaina)/i,
  /बत्ती.*(?:बलेको छैन|छैन|बिग्र|खराब)/i,
  /(?:bijuli|बिजुली|electricity|power).*(?:chhaina|छैन|cut|gayo|gone|problem|outage)/i,
  // Garbage
  /(?:garbage|trash|waste|फोहोर|fohor).*(?:not collect|pile|dump|smell|problem|uthako chhaina|uthayena)/i,
  /फोहोर.*(?:उठाएको छैन|छैन|थुप्र|गन्ध)/i,
  // Construction nuisance
  /(?:construction|निर्माण|nirman).*(?:dust|noise|block|problem|धुलो|आवाज|dhulo)/i,
  // Generic report/complaint + infrastructure keyword
  /(?:report|complaint|complain|fix|repair|ujuri|गुनासो).*(?:road|water|drain|light|garbage|construction|infrastructure|pipe|bridge|footpath|bato|sadak|pani|bijuli|fohor)/i,
  /(?:road|bato|sadak|water|pani|light|batti|garbage|fohor|drain|nali).*(?:report|complaint|complain|ujuri|गुनासो)/i,
  // Park, public space
  /(?:park|garden|public\s*(?:space|area|toilet)).*(?:broken|dirty|damage|problem|not work|maintain)/i,
];

const CORRUPTION_PATTERNS = [
  /(?:bribe|corrupt|ghus|घुस|भ्रष्ट|अख्तियार|रिश्वत|rishwat)/i,
  /(?:official|officer|government|police|sarkar|neta).*(?:asking money|bribe|corrupt|demanded|paisa mag|ghus)/i,
  /(?:paisa|money|paise).*(?:mag|demand|ask|dinu par|pay extra|under the table)/i,
  /(?:nepotism|afno manchhe|chakari|source lagaunu|aphno manche)/i,
];

const CONSUMER_COMPLAINT_PATTERNS = [
  /(?:fraud|scam|cheat|overcharg|fake product|ठगी|नक्कली|thagi|nakkal)/i,
  /(?:shop|store|seller|vendor|business|pasal|dokan).*(?:cheat|fraud|scam|refuse|defective|thag|nakkal)/i,
  /(?:defective|broken|fake|expired|nakkal).*(?:product|item|goods|saman|सामान)/i,
  /(?:refund|paisa firta|warranty|guarantee).*(?:refuse|diyena|didn't|won't|garena|honour)/i,
  /(?:online.*(?:scam|fraud|thag)|(?:scam|fraud|thag).*online)/i,
];

const HUMAN_RIGHTS_PATTERNS = [
  /(?:human rights|मानव अधिकार|manav adhikar|discrimination|भेदभाव|bhedbhav|torture|यातना)/i,
  /(?:caste|jaat|जात|gender|लिङ्ग|linga|ethnic|dalit|दलित).*(?:discriminat|भेदभाव|bhedbhav|harass|violence|hinsa)/i,
  /(?:forced labor|bonded labor|child labor|बाल श्रम|बन्धुवा|bal shram|kamaiya)/i,
  /(?:mahila|women|girl|महिला).*(?:hinsa|violence|harass|abuse|beat|threat|dhamki)/i,
  /(?:domestic violence|gharelu hinsa|घरेलु हिंसा)/i,
];

const GOVT_GRIEVANCE_PATTERNS = [
  /(?:hello sarkar|हेलो सरकार|1111)/i,
  /(?:government|sarkar|सरकार|sarkari).*(?:not respond|slow|ignore|problem|kaam bhayena|help garena)/i,
  /(?:सरकारी.*(?:गुनासो|समस्या)|office.*(?:not help|refuse|delay|corrupt))/i,
  /(?:सरकारी कार्यालय|government office).*(?:गएको|went|visited).*(?:काम भएन|didn't work|no help|nothing happened)/i,
  /(?:CDO|DAO|ward|vada|वडा|नगरपालिका|municipality).*(?:kaam bhayena|didn't help|refused|ignored|bolayena)/i,
  /(?:ek office|one office).*(?:arko|another|paisa|send|pathau|पठाउ)/i,
];

function detectIntentDeterministic(question: string): string | null {
  const q = question.toLowerCase();
  if (CIVIC_COMPLAINT_PATTERNS.some(p => p.test(q))) return 'civic_complaint';
  if (CORRUPTION_PATTERNS.some(p => p.test(q))) return 'corruption_complaint';
  if (CONSUMER_COMPLAINT_PATTERNS.some(p => p.test(q))) return 'consumer_complaint';
  if (HUMAN_RIGHTS_PATTERNS.some(p => p.test(q))) return 'human_rights_complaint';
  if (GOVT_GRIEVANCE_PATTERNS.some(p => p.test(q))) return 'government_grievance';
  return null;
}

function buildIntentResult(svc: Service, locale: 'en' | 'ne', question: string, model: string): AskResult {
  const answers: Record<string, { en: string; ne: string }> = {
    'local-infrastructure-complaint': {
      en: 'I\'ll help you report this to your ward office or municipality.',
      ne: 'म तपाईंलाई वडा कार्यालय वा नगरपालिकामा रिपोर्ट गर्न मद्दत गर्छु।',
    },
    'ciaa-complaint': {
      en: 'You can report corruption to CIAA. Hotline: 107. I\'ll help you file a complaint.',
      ne: 'भ्रष्टाचार उजुरी CIAA मा दिन सकिन्छ। हटलाइन: 107।',
    },
    'consumer-complaint': {
      en: 'You can file a consumer complaint. Hotline: 1137. I\'ll guide you through it.',
      ne: 'उपभोक्ता उजुरी दिन सकिन्छ। हटलाइन: 1137।',
    },
    'human-rights-complaint': {
      en: 'You can file a human rights complaint with NHRC.',
      ne: 'मानव अधिकार उजुरी NHRC मा दिन सकिन्छ।',
    },
    'lokpal-complaint': {
      en: 'You can file a government grievance through Hello Sarkar (1111).',
      ne: 'Hello Sarkar (1111) मा सरकारी गुनासो दिन सकिन्छ।',
    },
  };
  const ans = answers[svc.slug] || { en: 'I\'ll help you with this.', ne: 'म मद्दत गर्छु।' };
  return {
    answer: locale === 'ne' ? ans.ne : ans.en,
    cited: [svc],
    cached: false,
    model,
    topService: svc,
    topServiceConfidence: 0.95,
    routeMode: 'direct',
    routeReason: null,
    followUpPrompt: null,
    followUpOptions: [],
    intakeState: inferIntakeState(question),
    intakeSlots: null,
  };
}

async function detectDirectIntent(question: string, locale: 'en' | 'ne'): Promise<AskResult | null> {
  const all = await getAllServices();

  // ── Try 1: Smart AI Router (primary) — single Gemini call understands intent + picks service + generates response ──
  const smart = await smartRouteWithAI(question, locale);
  if (smart && smart.confidence >= 0.6) {
    // Health triage — AI says user needs medical help, return with follow-up options
    if (smart.category === 'health_needs_triage') {
      return {
        answer: smart.response || (locale === 'ne' ? 'तपाईंलाई स्वास्थ्य सेवा चाहिन्छ जस्तो छ।' : 'It sounds like you need medical attention.'),
        cited: [],
        cached: false,
        model: 'gemini-smart-router',
        topService: null,
        topServiceConfidence: smart.confidence,
        routeMode: 'ambiguous',
        routeReason: smart.followUp || (locale === 'ne' ? 'के तपाईंलाई अस्पताल, डाक्टर वा औषधि चाहिन्छ?' : 'Do you need a hospital, doctor, or pharmacy?'),
        followUpPrompt: smart.followUp || (locale === 'ne' ? 'तल छान्नुहोस्:' : 'Pick one below:'),
        followUpOptions: smart.options.length > 0 ? smart.options : [
          locale === 'ne' ? 'हो, मलाई अस्पताल चाहिन्छ' : 'Yes, I need a hospital',
          locale === 'ne' ? 'नजिकको अस्पताल कुन हो?' : 'Which hospital is nearest?',
          locale === 'ne' ? 'आज डाक्टर चाहिन्छ' : 'I need a doctor today',
          locale === 'ne' ? 'फार्मेसी पुग्छ' : 'A pharmacy will do',
        ],
        intakeState: inferIntakeState(question),
        intakeSlots: null,
      };
    }

    // AI picked a specific service slug
    if (smart.slug) {
      const svc = all.find(s => s.slug === smart.slug);
      if (svc) {
        return {
          answer: smart.response || (locale === 'ne' ? 'म मद्दत गर्छु।' : 'I\'ll help you with this.'),
          cited: [svc],
          cached: false,
          model: 'gemini-smart-router',
          topService: svc,
          topServiceConfidence: smart.confidence,
          routeMode: smart.confidence >= 0.8 ? 'direct' : 'ambiguous',
          routeReason: smart.followUp || null,
          followUpPrompt: smart.followUp || null,
          followUpOptions: smart.options || [],
          intakeState: inferIntakeState(question),
          intakeSlots: null,
        };
      }
    }

    // AI understood intent but no specific slug — return the AI's response with options
    if (smart.response) {
      return {
        answer: smart.response,
        cited: [],
        cached: false,
        model: 'gemini-smart-router',
        topService: null,
        topServiceConfidence: smart.confidence,
        routeMode: smart.options.length > 0 ? 'ambiguous' : 'none',
        routeReason: null,
        followUpPrompt: smart.followUp || null,
        followUpOptions: smart.options,
        intakeState: inferIntakeState(question),
        intakeSlots: null,
      };
    }
  }

  // ── Try 2: Deterministic fallback (when AI is down or unavailable) ──
  const deterministicCategory = detectIntentDeterministic(question);
  if (deterministicCategory) {
    const slug = INTENT_CATEGORIES[deterministicCategory as keyof typeof INTENT_CATEGORIES];
    if (slug) {
      const svc = all.find(s => s.slug === slug);
      if (svc) return buildIntentResult(svc, locale, question, 'deterministic');
    }
  }

  return null;
}

export async function ask(
  question: string,
  locale: 'en' | 'ne' = 'en',
  sessionId?: string | null,
  userCtx?: UserContext | null,
  taskCtx?: ActiveTaskContext | null,
): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      answer: '',
      cited: [],
      cached: false,
      model: null,
      topService: null,
      topServiceConfidence: 0,
      routeMode: 'none',
      routeReason: null,
      followUpPrompt: null,
      followUpOptions: [],
      intakeState: null,
      intakeSlots: null,
    };
  }

  // ── Deterministic fast-path: catch clear intents before scoring ──
  const fastMatch = await detectDirectIntent(trimmed, locale);
  if (fastMatch) return fastMatch;

  const previousSession = getActiveIntakeSession(sessionId);
  const effectiveQuestion = applySessionContext(trimmed, previousSession);
  const routingQuestion = buildRoutingQuery(effectiveQuestion);
  const intakeState = mergeIntakeState(previousSession?.intakeState || null, inferIntakeState(effectiveQuestion));
  const intakeSlots = mergeIntakeSlots(
    previousSession?.intakeSlots || null,
    inferIntakeSlots(effectiveQuestion, intakeState),
  );

  // 1. cache
  const cached = previousSession ? null : await getCachedAnswer(trimmed, locale);
  if (cached) return cached;

  const ranked = reprioritizeRankedServices(await rankServices(routingQuestion, locale), intakeState, effectiveQuestion, userCtx);
  const topRanked = ranked[0];
  const topScore = topRanked?.score ?? 0;
  const confidentTopService = shouldAutoRoute(effectiveQuestion, ranked) && topRanked
    ? topRanked.service
    : null;
  const routeMode: AskResult['routeMode'] =
    confidentTopService ? 'direct' : ranked.length > 0 ? 'ambiguous' : 'none';
  const routeReason = buildRouteReason(effectiveQuestion, routingQuestion, ranked, confidentTopService, locale, intakeState);
  const missingSlots = getMissingSlots(intakeState, intakeSlots);
  // Always generate follow-ups — even for 'none' mode so the user gets suggestions
  const followUpPrompt = routeMode !== 'direct'
    ? buildFollowUpPrompt(effectiveQuestion, ranked, locale, intakeState, intakeSlots, missingSlots)
    : null;
  const followUpOptions = routeMode !== 'direct'
    ? buildFollowUpOptions(effectiveQuestion, ranked, locale, intakeState, intakeSlots, missingSlots)
    : [];

  // 2. retrieve
  const cited = ranked.length > 0
    ? ranked.slice(0, 5).map((entry) => entry.service)
    : await retrieveServices(routingQuestion, locale, 5);

  saveIntakeSession(sessionId, intakeState, intakeSlots, trimmed);

  // 3. daily cap check
  const under = await checkDailyCap();
  if (!under || !GEMINI_API_KEY || !AI_ENABLED || isAiCoolingDown()) {
    // Static fallback: return top matches as a structured answer.
    const answer = buildStaticAnswer(effectiveQuestion, cited, locale, intakeState);
    return {
      answer,
      cited,
      cached: false,
      model: null,
      topService: confidentTopService,
      topServiceConfidence: topScore,
      routeMode,
      routeReason,
      followUpPrompt,
      followUpOptions,
      intakeState,
      intakeSlots,
    };
  }

  // 4. generate
  const gen = await generateAnswer(effectiveQuestion, cited, locale, userCtx, taskCtx);
  if (!gen) {
    const answer = buildStaticAnswer(effectiveQuestion, cited, locale, intakeState);
    return {
      answer,
      cited,
      cached: false,
      model: null,
      topService: confidentTopService,
      topServiceConfidence: topScore,
      routeMode,
      routeReason,
      followUpPrompt,
      followUpOptions,
      intakeState,
      intakeSlots,
    };
  }

  // 5. persist
  await saveAnswer(trimmed, locale, gen.text, cited, gen.model);
  return {
    answer: gen.text,
    cited,
    cached: false,
    model: gen.model,
    topService: confidentTopService,
    topServiceConfidence: topScore,
    routeMode,
    routeReason,
    followUpPrompt,
    followUpOptions,
    intakeState,
    intakeSlots,
  };
}

function buildRouteReason(
  originalQuestion: string,
  routingQuestion: string,
  ranked: Array<{ service: Service; score: number }>,
  topService: Service | null,
  locale: 'en' | 'ne',
  intakeState: IntakeState,
) {
  if (topService) {
    return locale === 'ne'
      ? `${topService.title.ne} स्पष्ट रूपमा सबैभन्दा नजिकको सेवा देखियो।`
      : `${topService.title.en} is the clearest match for this request.`;
  }

  if (intakeState.domain === 'health' && isMaternityNeed(normalizeIntentText(originalQuestion))) {
    return locale === 'ne'
      ? 'यो गर्भावस्था वा प्रसूतिसम्बन्धी जस्तो देखिन्छ। तल छान्नुहोस् — म सही सेवा खोज्छु।'
      : 'This looks pregnancy or maternity related. Pick an option below so I can find the right care.';
  }

  if (intakeState.domain === 'health' && isHealthSymptomNeed(normalizeIntentText(originalQuestion))) {
    if (intakeState.subject === 'child') {
      return locale === 'ne'
        ? 'तपाईंको बच्चालाई डाक्टर देखाउनु पर्ला। तल छान्नुहोस् — म सही अस्पताल खोज्छु।'
        : 'Your child may need medical attention. Pick an option below and I\'ll find the right hospital for you.';
    }

    return locale === 'ne'
      ? 'तपाईंलाई डाक्टर वा अस्पताल चाहिन सक्छ। तल एउटा विकल्प छान्नुहोस्।'
      : 'You may need to see a doctor. Pick an option below so I can find the right care for you.';
  }

  if (ranked.length >= 2) {
    const [first, second] = ranked;
    const isHospitalPair =
      first.service.providerType === 'hospital' && second.service.providerType === 'hospital';
    const isUtilityPair =
      first.service.category === 'utilities' && second.service.category === 'utilities';

    if (isHospitalPair) {
      return locale === 'ne'
        ? 'यो अनुरोध अस्पतालतर्फ मिल्छ, तर कुन अस्पताल चाहिएको हो भन्ने अझै स्पष्ट छैन।'
        : 'This clearly looks like a hospital request, but the exact hospital is still ambiguous.';
    }

    if (isUtilityPair) {
      return locale === 'ne'
        ? 'यो बिल/भुक्तानी अनुरोध हो, तर कुन सेवा प्रदायक हो भन्ने अझै स्पष्ट छैन।'
        : 'This is a utility payment request, but the provider is still ambiguous.';
    }
  }

  if (!topService && ranked.length > 0 && routingQuestion !== normalizeIntentText(originalQuestion)) {
    return locale === 'ne'
      ? 'आवश्यक संकेत भेटियो, तर सुरक्षित रूपमा एउटा मात्र सेवा छान्न पर्याप्त थिएन।'
      : 'The assistant found useful intent signals, but not enough to safely choose a single service.';
  }

  return ranked.length === 0
    ? locale === 'ne'
      ? 'यो अनुरोधलाई उपलब्ध सेवा सूचीसँग आत्मविश्वासका साथ मिलाउन सकिएन।'
      : 'The assistant could not confidently match this request to the current service catalog.'
    : null;
}

function buildFollowUpPrompt(
  question: string,
  ranked: Array<{ service: Service; score: number }>,
  locale: 'en' | 'ne',
  intakeState: IntakeState,
  intakeSlots: IntakeSlots,
  missingSlots: string[],
) {
  const normalized = normalizeIntentText(question);

  if (ranked.length === 0) {
    return locale === 'ne'
      ? 'तपाईंलाई वास्तवमा के चाहिन्छ? म सरकारी सेवा, स्वास्थ्य, यातायात, खाना, र अरू धेरै कुरामा मद्दत गर्न सक्छु।'
      : 'What do you actually need? I can help with government services, health, transport, food, and much more.';
  }

  if (intakeState.domain === 'health' && isMaternityNeed(normalized)) {
    return locale === 'ne'
      ? 'यो गर्भ/प्रसूति सम्बन्धी सेवा हो? ANC, delivery, कि विशेषज्ञ भेट?'
      : 'Is this for ANC, delivery, or a maternity specialist appointment?';
  }

  if (intakeState.domain === 'health' && intakeState.subject === 'child') {
    return locale === 'ne'
      ? 'बच्चालाई अस्पताल लैजानुपर्छ? तल छान्नुहोस्:'
      : 'Does your child need to go to a hospital? Pick one:';
  }

  if (intakeState.domain === 'health' && intakeState.subject === 'parent') {
    return locale === 'ne'
      ? 'बुबा/आमालाई अस्पताल लैजानुपर्छ? तल छान्नुहोस्:'
      : 'Does your parent need to go to a hospital? Pick one:';
  }

  if (isHealthSymptomNeed(normalized)) {
    return locale === 'ne'
      ? 'के तपाईंलाई अस्पताल जानुपर्छ? तल छान्नुहोस्:'
      : 'Do you need to go to a hospital? Pick one:';
  }

  if (isHospitalNeed(normalized)) {
    return locale === 'ne'
      ? 'कुन अस्पताल चाहिएको हो? जस्तै: Bir, TUTH, Patan, Civil.'
      : 'Which hospital do you mean? For example: Bir, TUTH, Patan, or Civil.';
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'facility_preference') {
    return locale === 'ne'
      ? 'कुन अस्पताल वा care type नजिक छ: Bir, TUTH, Patan, Civil, Kanti, कि Maternity?'
      : 'Which hospital or care type sounds closest: Bir, TUTH, Patan, Civil, Kanti, or maternity care?';
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'visit_goal') {
    return locale === 'ne'
      ? 'अहिले तपाईंलाई के चाहिएको हो: आजै डाक्टर, विशेषज्ञ, कि अस्पताल समय?'
      : 'What do you need right now: same-day care, a specialist, or a hospital booking?';
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'subject') {
    return locale === 'ne'
      ? 'यो कसका लागि हो: तपाईं, बच्चा, कि बुबा/आमा?'
      : 'Who is this for: you, your child, or your parent?';
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'provider') {
    return locale === 'ne'
      ? 'कुन बिल हो: NEA बिजुली कि KUKL पानी?'
      : 'Which bill is this: NEA electricity or KUKL water?';
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'account') {
    return locale === 'ne'
      ? 'ग्राहक आईडी वा SC नम्बर छ? त्यो भए NepalRepublic ले बिल path तयार गर्न सक्छ।'
      : 'Do you have the customer ID or SC number? With that, NepalRepublic can prepare the bill flow.';
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'amount') {
    return locale === 'ne'
      ? 'तिर्ने रकम थाहा छ? थाहा भए सिधै payment तर्फ जान सक्छौं।'
      : 'Do you already know the amount due? If yes, we can continue straight to payment.';
  }

  if (intakeState.domain === 'license' && missingSlots[0] === 'license_intent') {
    return locale === 'ne'
      ? 'लाइसेन्समा के काम छ: नवीकरण, नयाँ आवेदन, कि ट्रायल?'
      : 'What do you need for the license: renewal, new application, or trial?';
  }

  if (intakeState.domain === 'citizenship' && missingSlots[0] === 'citizenship_intent') {
    return locale === 'ne'
      ? 'कुन प्रकारको नागरिकता सेवा हो: वंशज, जन्मसिद्ध, कि प्रतिलिपि?'
      : 'Which citizenship service is this: by descent, by birth, or duplicate?';
  }

  if (intakeState.domain === 'passport' && missingSlots[0] === 'passport_intent') {
    return locale === 'ne'
      ? 'राहदानीमा के चाहिएको हो: नयाँ आवेदन, नवीकरण, कि status tracking?'
      : 'What do you need for passport: new application, renewal, or status tracking?';
  }

  if (/(bill|payment|pay)/.test(normalized) && !/(nea|electricity|kukl|water)/.test(normalized)) {
    return locale === 'ne'
      ? 'कुन बिल तिर्नु छ? NEA कि KUKL?'
      : 'Which bill do you want to pay: NEA electricity or KUKL water?';
  }

  if (/(license|licence|driving)/.test(normalized) && !/(renew|renewal|trial|new)/.test(normalized)) {
    return locale === 'ne'
      ? 'लाइसेन्समा के गर्नुपर्छ? नयाँ, नवीकरण, कि ट्रायल?'
      : 'What do you need for the license: new application, renewal, or trial?';
  }

  if (/(citizenship|nagarikta)/.test(normalized) && !/(birth|descent|duplicate|minor)/.test(normalized)) {
    return locale === 'ne'
      ? 'कुन प्रकारको नागरिकता चाहिएको हो? वंशज, जन्मसिद्ध, कि प्रतिलिपि?'
      : 'Which citizenship service do you need: by descent, by birth, or duplicate?';
  }

  return null;
}

function buildFollowUpOptions(
  question: string,
  ranked: Array<{ service: Service; score: number }>,
  locale: 'en' | 'ne',
  intakeState: IntakeState,
  intakeSlots: IntakeSlots,
  missingSlots: string[],
) {
  const normalized = normalizeIntentText(question);

  // Even when no services match, provide helpful suggestions
  if (ranked.length === 0) {
    return locale === 'ne'
      ? ['पासपोर्ट बनाउन के गर्ने?', 'नजिकको अस्पताल कुन?', 'बिजुली बिल कसरी तिर्ने?', 'नागरिकता कसरी लिने?']
      : ['How do I get a passport?', 'Which hospital is nearby?', 'How to pay electricity bill?', 'How to get citizenship?'];
  }

  if (intakeState.domain === 'health' && isMaternityNeed(normalized)) {
    return locale === 'ne'
      ? [
          'ANC checkup चाहियो',
          'Delivery सम्बन्धी जानकारी चाहियो',
          'मातृ विशेषज्ञ appointment चाहियो',
          'प्रसूति अस्पताल ठीक होला',
        ]
      : [
          'I need an ANC checkup',
          'I need delivery-related help',
          'I need a maternity specialist appointment',
          'Maternity hospital sounds right',
        ];
  }

  if (intakeState.domain === 'health' && intakeState.subject === 'child') {
    return locale === 'ne'
      ? [
          'हो, अस्पताल लैजानुपर्छ',
          'कान्ति बाल अस्पताल',
          'नजिकको अस्पताल कुन?',
          'फार्मेसी मात्र पुग्छ',
        ]
      : [
          'Yes, take to hospital',
          'Kanti Children\'s Hospital',
          'Which hospital is nearest?',
          'A pharmacy will do',
        ];
  }

  if (intakeState.domain === 'health' && intakeState.subject === 'parent') {
    return locale === 'ne'
      ? [
          'हो, अस्पताल जानुपर्छ',
          'नजिकको अस्पताल कुन?',
          'विशेषज्ञ डाक्टर चाहियो',
          'फार्मेसी मात्र पुग्छ',
        ]
      : [
          'Yes, need a hospital',
          'Which hospital is nearest?',
          'Need a specialist doctor',
          'A pharmacy will do',
        ];
  }

  if (isHealthSymptomNeed(normalized)) {
    return locale === 'ne'
      ? [
          'हो, अस्पताल जानुपर्छ',
          'नजिकको अस्पताल कुन?',
          'आजै डाक्टर चाहियो',
          'फार्मेसी मात्र पुग्छ',
        ]
      : [
          'Yes, I need a hospital',
          'Which hospital is nearest?',
          'I need a doctor today',
          'A pharmacy will do',
        ];
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'facility_preference') {
    return locale === 'ne'
      ? ['Bir अस्पताल', 'TUTH', 'Patan अस्पताल', 'Civil अस्पताल', 'Kanti', 'Maternity care']
      : ['Bir Hospital', 'TUTH', 'Patan Hospital', 'Civil Hospital', 'Kanti', 'Maternity care'];
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'visit_goal') {
    return locale === 'ne'
      ? ['आजै डाक्टर चाहियो', 'विशेषज्ञ appointment चाहियो', 'अस्पताल/OPD booking चाहियो']
      : ['I need a doctor today', 'I need a specialist appointment', 'I need a hospital/OPD booking'];
  }

  if (intakeState.domain === 'health' && missingSlots[0] === 'subject') {
    return locale === 'ne'
      ? ['मेरो लागि', 'मेरो बच्चाका लागि', 'मेरो बुबा/आमाका लागि']
      : ['This is for me', 'This is for my child', 'This is for my parent'];
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'provider') {
    return locale === 'ne'
      ? ['NEA बिजुली बिल', 'KUKL पानी बिल']
      : ['NEA electricity bill', 'KUKL water bill'];
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'account') {
    return locale === 'ne'
      ? ['SC नम्बर छ', 'ग्राहक आईडी छ', 'पहिले बिल फोटो स्क्यान गर्छु']
      : ['I have the SC number', 'I have the customer ID', 'I will scan the bill photo first'];
  }

  if (intakeState.domain === 'utilities' && missingSlots[0] === 'amount') {
    return locale === 'ne'
      ? ['रकम थाहा छ', 'पहिले bill lookup गर्छु', 'बिल फोटो स्क्यान गर्छु']
      : ['I know the amount due', 'I will check the bill first', 'I will scan the bill photo'];
  }

  if (intakeState.domain === 'license' && missingSlots[0] === 'license_intent') {
    return locale === 'ne'
      ? ['नवीकरण', 'नयाँ लाइसेन्स', 'ट्रायल']
      : ['License renewal', 'New license', 'Trial booking'];
  }

  if (intakeState.domain === 'citizenship' && missingSlots[0] === 'citizenship_intent') {
    return locale === 'ne'
      ? ['वंशज नागरिकता', 'जन्मसिद्ध नागरिकता', 'प्रतिलिपि']
      : ['Citizenship by descent', 'Citizenship by birth', 'Duplicate citizenship'];
  }

  if (intakeState.domain === 'passport' && missingSlots[0] === 'passport_intent') {
    return locale === 'ne'
      ? ['नयाँ राहदानी', 'राहदानी नवीकरण', 'status track गर्न']
      : ['New passport', 'Passport renewal', 'Track passport status'];
  }

  if (/(bill|payment|pay)/.test(normalized) && !/(nea|electricity|kukl|water)/.test(normalized)) {
    return locale === 'ne'
      ? ['NEA बिल', 'KUKL पानी बिल']
      : ['NEA electricity bill', 'KUKL water bill'];
  }

  if (/(license|licence|driving)/.test(normalized) && !/(renew|renewal|trial|new)/.test(normalized)) {
    return locale === 'ne'
      ? ['नवीकरण', 'नयाँ लाइसेन्स', 'ट्रायल']
      : ['License renewal', 'New license', 'Trial booking'];
  }

  if (/(citizenship|nagarikta)/.test(normalized) && !/(birth|descent|duplicate|minor)/.test(normalized)) {
    return locale === 'ne'
      ? ['वंशज नागरिकता', 'प्रतिलिपि', 'जन्मसिद्ध']
      : ['Citizenship by descent', 'Duplicate citizenship', 'Citizenship by birth'];
  }

  return [];
}

function buildStaticAnswer(_q: string, services: Service[], locale: 'en' | 'ne', intakeState: IntakeState): string {
  const normalized = normalizeIntentText(_q);
  if (services.length === 0) {
    return locale === 'ne'
      ? 'मैले सम्बन्धित सरकारी सेवा भेट्टाउन सकिनँ — तर अरू कुरामा मद्दत गर्न सक्छु! तपाईंलाई वास्तवमा के चाहिन्छ?'
      : "I couldn't find a matching government service — but I can help with other things! What do you actually need?";
  }

  if (intakeState.domain === 'health' && isMaternityNeed(normalized)) {
    const top = services.slice(0, 3);
    const names = top.map((s) => (locale === 'ne' ? s.title.ne : s.title.en));
    return locale === 'ne'
      ? `यो गर्भ/प्रसूति सम्बन्धी आवश्यकता जस्तो देखिन्छ। अहिले सम्भावित बाटा:\n\n• ${names.join('\n• ')}\n\nअब NepalRepublic ले ANC, delivery, वा specialist appointment मध्ये कुन चाहिएको हो भनेर छोटो पुष्टि लिनुपर्छ।`
      : `This looks like a maternity or pregnancy-related need. The most likely paths right now are:\n\n• ${names.join('\n• ')}\n\nNepalRepublic should now confirm whether you need ANC, delivery support, or a maternity specialist appointment before choosing the path.`;
  }

  if (intakeState.domain === 'health' && intakeState.subject === 'child') {
    const top = services.slice(0, 3);
    const names = top.map((s) => (locale === 'ne' ? s.title.ne : s.title.en));
    return locale === 'ne'
      ? `यो बच्चाको स्वास्थ्यसम्बन्धी आवश्यकता जस्तो देखिन्छ। अहिले सम्भावित बाटा:\n\n• ${names.join('\n• ')}\n\nअब NepalRepublic ले बच्चालाई आजै डाक्टर चाहिएको हो, बाल विशेषज्ञ चाहिएको हो, वा खास अस्पताल बुक गर्नुपरेको हो भन्ने छोटो पुष्टि लिनुपर्छ।`
      : `This looks like a child health need. The most likely paths right now are:\n\n• ${names.join('\n• ')}\n\nNepalRepublic should now confirm whether your child needs same-day care, a pediatric specialist, or a specific hospital booking before choosing the path.`;
  }

  if (isHealthSymptomNeed(normalized)) {
    const top = services.slice(0, 3);
    const names = top.map((s) => (locale === 'ne' ? s.title.ne : s.title.en));
    return locale === 'ne'
      ? `यो स्वास्थ्यसम्बन्धी आवश्यकता जस्तो देखिन्छ। अहिलेको लागि सबैभन्दा सम्भावित बाटा:\n\n• ${names.join('\n• ')}\n\nNepalRepublic ले अर्को चरणमा तपाईंलाई आजै जाँच चाहिएको हो, विशेषज्ञ चाहिएको हो, वा यो कसका लागि हो भनेर सोधेर सही अस्पतालमा साँघुर्याउनुपर्छ।`
      : `This looks like a health need. The most likely paths right now are:\n\n• ${names.join('\n• ')}\n\nNepalRepublic should now narrow this by asking whether you need same-day care, a specialist, and who this is for before choosing a single hospital.`;
  }

  const lines = services.slice(0, 3).map((s) => {
    const title = locale === 'ne' ? s.title.ne : s.title.en;
    const summary = locale === 'ne' ? s.summary.ne : s.summary.en;
    return `• ${title} — ${summary}`;
  });
  const prefix = locale === 'ne' ? 'यी सेवाहरू हेर्नुहोस्:' : 'Here are relevant services:';
  return `${prefix}\n\n${lines.join('\n')}`;
}
