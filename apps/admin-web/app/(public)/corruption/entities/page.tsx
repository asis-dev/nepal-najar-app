'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  FileText,
  Shield,
} from 'lucide-react';
import { PublicPageHero } from '@/components/public/page-hero';
import { useCorruptionEntities } from '@/lib/hooks/use-corruption';
import {
  ENTITY_TYPE_LABELS,
  formatAmountNpr,
  formatNprWithUsd,
  type EntityType,
  type CorruptionEntity,
} from '@/lib/data/corruption-types';

/* ═══════════════════════════════════════════════
   CORRUPTION ENTITIES LIST
   ═══════════════════════════════════════════════ */

export default function EntitiesPage() {
  const [typeFilter, setTypeFilter] = useState<EntityType | ''>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCorruptionEntities({
    entity_type: typeFilter || undefined,
    search: search || undefined,
    pageSize: 100,
  });

  const entities = data?.entities ?? [];

  return (
    <>
      <PublicPageHero
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Persons &amp; Organizations of Interest
          </span>
        }
        title="Corruption Entities"
        description="People, organizations, and institutions involved in corruption cases"
      />

      <section className="public-section">
        <div className="public-shell">
          <Link
            href="/corruption"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Corruption Tracker
          </Link>

          {/* ── Filters ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EntityType | '')}
              className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
            >
              <option value="">All Entity Types</option>
              {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((t) => (
                <option key={t} value={t}>
                  {ENTITY_TYPE_LABELS[t].en}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entities..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/[0.12]"
              />
            </div>
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-white/[0.04] rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/[0.04] rounded w-3/4 mb-1" />
                      <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* ── Entity Cards ── */}
          {!isLoading && entities.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No entities match your filters.
            </div>
          )}

          {!isLoading && entities.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entities.map((entity) => (
                <EntityCard key={entity.slug} entity={entity} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ── Entity Card ── */

function EntityCard({ entity }: { entity: CorruptionEntity }) {
  const typeLabel = ENTITY_TYPE_LABELS[entity.entity_type]?.en || entity.entity_type;

  return (
    <Link
      href={`/corruption/entities/${entity.slug}`}
      className="glass-card p-4 transition-colors hover:bg-white/[0.04] block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500">
          {entity.photo_url ? (
            <img src={entity.photo_url} alt={entity.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <Users className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{entity.name}</h3>
          {entity.name_ne && (
            <p className="text-xs text-gray-500 truncate">{entity.name_ne}</p>
          )}
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">{typeLabel}</span>
        </div>
      </div>

      {entity.title && (
        <p className="text-xs text-gray-400 mb-2 truncate">{entity.title}</p>
      )}

      {entity.party_affiliation && (
        <p className="text-[10px] text-gray-500 mb-2">
          <Shield className="inline h-3 w-3 mr-1" />
          {entity.party_affiliation}
        </p>
      )}

      <div className="flex items-center gap-4 text-[10px] text-gray-500 border-t border-white/[0.06] pt-2">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {entity.total_cases} {entity.total_cases === 1 ? 'case' : 'cases'}
        </span>
        {entity.total_amount_npr > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            रू {formatAmountNpr(entity.total_amount_npr)} <span className="text-gray-500">(≈ {formatNprWithUsd(entity.total_amount_npr).usd})</span>
          </span>
        )}
      </div>
    </Link>
  );
}
