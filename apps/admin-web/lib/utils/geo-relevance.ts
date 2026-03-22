import type { GovernmentPromise } from '@/lib/data/promises';

export type GeoRelevance = 'direct' | 'indirect' | 'other';

export interface RelevanceResult {
  relevance: GeoRelevance;
  reason: string;
  /** For sorting: direct=3, indirect=2, other=1 */
  score: number;
}

// Province adjacency map for Nepal
const ADJACENT_PROVINCES: Record<string, string[]> = {
  'Koshi': ['Madhesh', 'Bagmati'],
  'Madhesh': ['Koshi', 'Bagmati', 'Gandaki', 'Lumbini'],
  'Bagmati': ['Koshi', 'Madhesh', 'Gandaki'],
  'Gandaki': ['Bagmati', 'Madhesh', 'Lumbini'],
  'Lumbini': ['Madhesh', 'Gandaki', 'Karnali'],
  'Karnali': ['Lumbini', 'Sudurpashchim'],
  'Sudurpashchim': ['Karnali'],
};

export function getPromiseRelevance(
  promise: GovernmentPromise,
  userProvince: string | null,
  userDistrict?: string | null,
): RelevanceResult {
  if (!userProvince) {
    return { relevance: 'indirect', reason: 'Set your location to see relevance', score: 2 };
  }

  const scope = promise.geoScope || 'national';
  const radius = promise.impactRadius || 'national';
  const provinces = promise.affectedProvinces || [];
  const districts = promise.affectedDistricts || [];
  const locations = promise.primaryLocations || [];

  // National scope projects
  if (scope === 'national') {
    // Check if physical work happens in user's area
    const localWork = locations.find(l => {
      if (userDistrict && l.district === userDistrict) return true;
      return l.province === userProvince;
    });
    if (localWork) {
      return {
        relevance: 'direct',
        reason: localWork.description
          ? `Work site: ${localWork.description} in your area`
          : 'Construction/work happening in your area',
        score: 3,
      };
    }
    return { relevance: 'indirect', reason: 'National policy benefiting all citizens', score: 2 };
  }

  // District scope
  if (scope === 'district' || scope === 'municipal') {
    if (userDistrict && districts.includes(userDistrict)) {
      return { relevance: 'direct', reason: `Targets ${userDistrict} district`, score: 3 };
    }
    if (provinces.includes(userProvince)) {
      return { relevance: 'direct', reason: `In your province (${userProvince})`, score: 3 };
    }
    // Check adjacent for regional impact
    if (radius === 'regional') {
      const adjacent = ADJACENT_PROVINCES[userProvince] || [];
      if (provinces.some(p => adjacent.includes(p))) {
        return { relevance: 'indirect', reason: 'Benefits neighboring province', score: 2 };
      }
    }
    return { relevance: 'other', reason: `Focused on ${provinces.join(', ') || 'another area'}`, score: 1 };
  }

  // Provincial scope
  if (provinces.includes(userProvince)) {
    return { relevance: 'direct', reason: `Targets ${userProvince} province`, score: 3 };
  }
  if (radius === 'regional' || radius === 'national') {
    const adjacent = ADJACENT_PROVINCES[userProvince] || [];
    if (provinces.some(p => adjacent.includes(p))) {
      return { relevance: 'indirect', reason: 'Benefits neighboring province', score: 2 };
    }
  }
  if (provinces.length === 0) {
    return { relevance: 'indirect', reason: 'All provinces benefit', score: 2 };
  }

  return { relevance: 'other', reason: `Focused on ${provinces.join(', ')}`, score: 1 };
}

/**
 * Categorize all promises by relevance to user's location
 */
export function categorizePromises(
  promises: GovernmentPromise[],
  userProvince: string | null,
  userDistrict?: string | null,
): {
  direct: Array<GovernmentPromise & { relevanceReason: string }>;
  indirect: Array<GovernmentPromise & { relevanceReason: string }>;
  other: Array<GovernmentPromise & { relevanceReason: string }>;
} {
  const direct: Array<GovernmentPromise & { relevanceReason: string }> = [];
  const indirect: Array<GovernmentPromise & { relevanceReason: string }> = [];
  const other: Array<GovernmentPromise & { relevanceReason: string }> = [];

  for (const promise of promises) {
    const result = getPromiseRelevance(promise, userProvince, userDistrict);
    const item = { ...promise, relevanceReason: result.reason };
    if (result.relevance === 'direct') direct.push(item);
    else if (result.relevance === 'indirect') indirect.push(item);
    else other.push(item);
  }

  return { direct, indirect, other };
}
