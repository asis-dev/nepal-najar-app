/**
 * Ward/Regional Score System — "Mero Ward Score"
 *
 * Computes governance scores per province and district.
 * Uses promise data + category→region affinity mapping.
 *
 * NOTE: District-level data is derived (hashed from province score)
 * since we don't have actual per-district project data yet.
 */

import { promises, computeStats } from './promises';
import { NEPAL_PROVINCES } from '../stores/preferences';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

/**
 * Score data for a province or district.
 *
 * Province scores are computed from promise data + category affinity weights.
 * District scores are derived from their parent province score with hash-based variance.
 */
export interface RegionScore {
  /** English province name (matches NEPAL_PROVINCES[].name) */
  province: string;
  /** Nepali province name */
  province_ne: string;
  /** District name — present only for district-level scores */
  district?: string;
  /** Composite governance score, 0-100 */
  score: number;
  /** Rank among peers (1 = best). Provinces ranked 1-7, districts within their province */
  rank: number;
  /** Number of government projects in this region */
  projectCount: number;
  /** Number of delayed projects */
  delayedCount: number;
  /** Estimated budget allocated in NPR */
  budgetAllocated: number;
  /** Actual budget spent in NPR */
  budgetSpent: number;
  /** IDs of the top 3 most relevant promises for this region */
  topPromiseIds: string[];
  /** Deterministic trend indicator derived from region name hash */
  trend: 'up' | 'down' | 'stable';
}

/* ═══════════════════════════════════════════════
   PROVINCE → CATEGORY AFFINITY
   Which promise categories matter most per province
   ═══════════════════════════════════════════════ */

const PROVINCE_AFFINITY: Record<string, Record<string, number>> = {
  Koshi: {
    Infrastructure: 0.9, Transport: 0.8, Energy: 0.7, Education: 0.6,
    Health: 0.5, Environment: 0.4, Technology: 0.3, Governance: 0.5,
    'Anti-Corruption': 0.5, Economy: 0.6, Social: 0.5,
  },
  Madhesh: {
    Infrastructure: 1.0, Transport: 0.9, Health: 0.8, Education: 0.7,
    Energy: 0.6, Social: 0.8, Governance: 0.5, 'Anti-Corruption': 0.5,
    Technology: 0.3, Environment: 0.4, Economy: 0.7,
  },
  Bagmati: {
    Technology: 1.0, Governance: 0.9, 'Anti-Corruption': 0.9, Environment: 0.8,
    Infrastructure: 0.7, Transport: 0.7, Economy: 0.8, Education: 0.6,
    Health: 0.6, Energy: 0.5, Social: 0.6,
  },
  Gandaki: {
    Environment: 0.9, Infrastructure: 0.7, Transport: 0.8, Energy: 0.6,
    Education: 0.6, Health: 0.5, Technology: 0.4, Governance: 0.5,
    'Anti-Corruption': 0.5, Economy: 0.7, Social: 0.5,
  },
  Lumbini: {
    Infrastructure: 0.8, Transport: 0.8, Education: 0.7, Health: 0.6,
    Energy: 0.6, Social: 0.7, Environment: 0.5, Governance: 0.5,
    'Anti-Corruption': 0.5, Technology: 0.3, Economy: 0.7,
  },
  Karnali: {
    Infrastructure: 1.0, Transport: 1.0, Health: 0.9, Education: 0.8,
    Energy: 0.8, Social: 0.7, Governance: 0.6, Environment: 0.5,
    'Anti-Corruption': 0.5, Technology: 0.2, Economy: 0.5,
  },
  Sudurpashchim: {
    Infrastructure: 1.0, Transport: 0.9, Health: 0.8, Education: 0.8,
    Energy: 0.7, Social: 0.7, Governance: 0.6, Environment: 0.5,
    'Anti-Corruption': 0.5, Technology: 0.2, Economy: 0.5,
  },
};

/** Mock project counts per province */
const PROVINCE_PROJECTS: Record<string, { projects: number; delayed: number }> = {
  Koshi: { projects: 47, delayed: 8 },
  Madhesh: { projects: 38, delayed: 12 },
  Bagmati: { projects: 89, delayed: 15 },
  Gandaki: { projects: 42, delayed: 6 },
  Lumbini: { projects: 51, delayed: 9 },
  Karnali: { projects: 23, delayed: 7 },
  Sudurpashchim: { projects: 28, delayed: 9 },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Compute the governance score for a single province.
 *
 * Formula: 0.4 × progressScore + 0.3 × (1 - delayRatio) × 100 + 0.2 × budgetUtil + 0.1 × deliveryRate
 *
 * progressScore uses the PROVINCE_AFFINITY matrix to weight promise categories
 * differently per province (e.g., Infrastructure matters more for Karnali than Bagmati).
 *
 * @param provinceName - English province name matching NEPAL_PROVINCES
 * @returns Score (0-100), budget figures, and top 3 promise IDs
 */
function computeProvinceScore(provinceName: string): {
  score: number;
  budgetAllocated: number;
  budgetSpent: number;
  topPromiseIds: string[];
} {
  const affinity = PROVINCE_AFFINITY[provinceName] ?? {};
  const projData = PROVINCE_PROJECTS[provinceName] ?? { projects: 30, delayed: 8 };

  let weightedProgress = 0;
  let totalWeight = 0;
  let budgetAllocated = 0;
  let budgetSpent = 0;
  const promiseScores: Array<{ id: string; weight: number; progress: number }> = [];

  for (const p of promises) {
    const weight = affinity[p.category] ?? 0.5;
    weightedProgress += p.progress * weight;
    totalWeight += weight * 100; // max possible

    // Budget proportional to affinity
    if (p.estimatedBudgetNPR) {
      budgetAllocated += p.estimatedBudgetNPR * weight * 0.15; // ~15% per province
      budgetSpent += (p.spentNPR ?? 0) * weight * 0.15;
    }

    promiseScores.push({ id: p.id, weight, progress: p.progress });
  }

  const progressScore = totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;
  const delayRatio = projData.projects > 0 ? projData.delayed / projData.projects : 0;
  const budgetUtil = budgetAllocated > 0 ? (budgetSpent / budgetAllocated) * 100 : 0;
  const stats = computeStats();

  const score = Math.round(
    0.4 * progressScore +
    0.3 * (1 - delayRatio) * 100 +
    0.2 * Math.min(100, budgetUtil) +
    0.1 * stats.deliveryRate,
  );

  // Top 3 most relevant promises for this province
  promiseScores.sort((a, b) => b.weight * b.progress - a.weight * a.progress);
  const topPromiseIds = promiseScores.slice(0, 3).map((ps) => ps.id);

  return {
    score: Math.min(100, Math.max(0, score)),
    budgetAllocated: Math.round(budgetAllocated),
    budgetSpent: Math.round(budgetSpent),
    topPromiseIds,
  };
}

/* ═══════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════ */

/** Get scores for all 7 provinces, sorted by rank */
export function getProvinceScores(): RegionScore[] {
  const scores = NEPAL_PROVINCES.map((prov) => {
    const computed = computeProvinceScore(prov.name);
    const projData = PROVINCE_PROJECTS[prov.name] ?? { projects: 30, delayed: 8 };

    // Deterministic trend from province name hash
    const hash = simpleHash(prov.name) % 3;
    const trend: 'up' | 'down' | 'stable' = hash === 0 ? 'up' : hash === 1 ? 'down' : 'stable';

    return {
      province: prov.name,
      province_ne: prov.name_ne,
      score: computed.score,
      rank: 0, // computed below
      projectCount: projData.projects,
      delayedCount: projData.delayed,
      budgetAllocated: computed.budgetAllocated,
      budgetSpent: computed.budgetSpent,
      topPromiseIds: computed.topPromiseIds,
      trend,
    };
  });

  // Sort by score descending, assign ranks
  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, i) => { s.rank = i + 1; });

  return scores;
}

/**
 * Get governance scores for all districts within a province.
 *
 * District scores are derived from the parent province score with
 * a hash-based variance of ±10 points. This creates realistic-looking
 * variation without actual per-district project data.
 *
 * @param provinceName - English province name
 * @returns Array of district scores sorted by rank (best first)
 */
export function getDistrictScores(provinceName: string): RegionScore[] {
  const province = NEPAL_PROVINCES.find((p) => p.name === provinceName);
  if (!province) return [];

  const provScore = computeProvinceScore(provinceName);

  const scores = province.districts.map((districtName) => {
    // Derive district score around province score using hash
    const hash = simpleHash(districtName);
    const variance = ((hash % 21) - 10); // -10 to +10
    const score = Math.min(100, Math.max(0, provScore.score + variance));

    const projCount = 3 + (hash % 12); // 3-14 projects
    const delayCount = Math.floor(projCount * (0.1 + (hash % 3) * 0.1));
    const trend: 'up' | 'down' | 'stable' = hash % 3 === 0 ? 'up' : hash % 3 === 1 ? 'down' : 'stable';

    return {
      province: provinceName,
      province_ne: province.name_ne,
      district: districtName,
      score,
      rank: 0, // computed below
      projectCount: projCount,
      delayedCount: delayCount,
      budgetAllocated: Math.round(provScore.budgetAllocated / province.districts.length * (0.7 + (hash % 6) * 0.1)),
      budgetSpent: Math.round(provScore.budgetSpent / province.districts.length * (0.5 + (hash % 8) * 0.1)),
      topPromiseIds: provScore.topPromiseIds,
      trend,
    };
  });

  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, i) => { s.rank = i + 1; });

  return scores;
}

/** Get score for a specific region */
export function getScoreForRegion(
  provinceName: string,
  districtName?: string,
): RegionScore | undefined {
  if (districtName) {
    const districts = getDistrictScores(provinceName);
    return districts.find((d) => d.district === districtName);
  }
  const provinces = getProvinceScores();
  return provinces.find((p) => p.province === provinceName);
}

/** Get the national average score (mean of all province scores) */
export function getNationalAverage(): number {
  const scores = getProvinceScores();
  const sum = scores.reduce((s, p) => s + p.score, 0);
  return scores.length > 0 ? Math.round(sum / scores.length) : 0;
}
