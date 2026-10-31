'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  EnrichedIncident,
  OperatingMode,
  SEVERITY_META,
  SeverityLevel,
  Source,
  SWARM_CATEGORY_META,
  SwarmCategory,
  VERIFICATION_META,
  VerificationStatus,
} from '@/lib/types';
import {
  CategoryBadge,
  SeverityBadge,
  SwarmConfirmationBadge,
  VerificationBadge,
} from './IntelligenceBadges';

interface LiveIntelligenceFeedProps {
  mode: OperatingMode;
  initialCategory?: SwarmCategory | '';
  initialSeverity?: SeverityLevel | '';
  initialVerification?: VerificationStatus | '';
  initialCountry?: string;
  initialQuery?: string;
  initialConfirmedSwarmOnly?: boolean;
  pollIntervalSec: number;
  sources: Source[];
  onSelectIncident: (incident: EnrichedIncident) => void;
  onTriggerLiveIngest: () => Promise<void>;
  ingesting: boolean;
}

export function LiveIntelligenceFeed({
  mode,
  initialCategory = '',
  initialSeverity = '',
  initialVerification = '',
  initialCountry = '',
  initialQuery = '',
  initialConfirmedSwarmOnly = false,
  pollIntervalSec,
  sources,
  onSelectIncident,
  onTriggerLiveIngest,
  ingesting,
}: LiveIntelligenceFeedProps) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory);
  const [severity, setSeverity] = useState<string>(initialSeverity);
  const [verification, setVerification] = useState<string>(initialVerification);
  const [country, setCountry] = useState<string>(initialCountry);
  const [sourceId, setSourceId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [confirmedSwarmOnly, setConfirmedSwarmOnly] = useState<boolean>(
    initialConfirmedSwarmOnly
  );
  const [sortBy, setSortBy] = useState<
    'newest' | 'updated' | 'severity' | 'confidence'
  >('newest');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(
    Boolean(
      initialCategory ||
        initialSeverity ||
        initialVerification ||
        initialCountry
    )
  );

  const [items, setItems] = useState<EnrichedIncident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setCategory(initialCategory);
    setSeverity(initialSeverity);
    setVerification(initialVerification);
    setCountry(initialCountry);
    setQ(initialQuery);
    setConfirmedSwarmOnly(initialConfirmedSwarmOnly);
    setPage(1);
    if (
      initialCategory ||
      initialSeverity ||
      initialVerification ||
      initialCountry
    ) {
      setShowAdvancedFilters(true);
    }
  }, [
    initialCategory,
    initialSeverity,
    initialVerification,
    initialCountry,
    initialQuery,
    initialConfirmedSwarmOnly,
  ]);

  const fetchFeed = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          mode,
          page: String(page),
          pageSize: String(pageSize),
          sortBy,
        });
        if (q.trim()) params.set('q', q.trim());
        if (category) params.set('category', category);
        if (severity) params.set('severity', severity);
        if (verification) params.set('verification', verification);
        if (country.trim()) params.set('country', country.trim());
        if (sourceId) params.set('sourceId', sourceId);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (confirmedSwarmOnly) params.set('confirmedSwarmOnly', 'true');

        const res = await fetch(`/api/incidents?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (res.ok) {
          setItems(data.items || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      mode,
      page,
      pageSize,
      sortBy,
      q,
      category,
      severity,
      verification,
      country,
      sourceId,
      dateFrom,
      dateTo,
      confirmedSwarmOnly,
    ]
  );

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed(true);
    }, pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [pollIntervalSec, fetchFeed]);

  function handleResetFilters() {
    setQ('');
    setCategory('');
    setSeverity('');
    setVerification('');
    setCountry('');
    setSourceId('');
    setDateFrom('');
    setDateTo('');
    setConfirmedSwarmOnly(false);
    setSortBy('newest');
    setPage(1);
  }

  const activeFilterCount = [
    category,
    severity,
    verification,
    country,
    sourceId,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ================================================================== */}
      {/* EDITORIAL HEADER & PRIMARY FILTER BAR                              */}
      {/* ================================================================== */}
      <div className="space-y-5 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
              <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
              <span>INTELLIGENCE STREAM</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
              Incident Feed & Explorer
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-[#8a94a6]">
              {total} Correlated Incidents
            </span>
          </div>
        </div>

        {/* Clean Primary Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              aria-label="Search incidents by keyword"
              placeholder="Search incidents, actors, locations, or frameworks..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-[#0c1018] border border-white/10 focus:border-[#f5b82e] text-xs text-[#f3f5f8] placeholder:text-[#64748b] focus:outline-none transition"
            />
          </div>

          {/* Quick Filter Pills & Advanced Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setConfirmedSwarmOnly(false);
                setPage(1);
              }}
              className={`px-3.5 py-2 border transition cursor-pointer ${
                !confirmedSwarmOnly
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium border-[#f5b82e]'
                  : 'bg-[#0c1018] text-[#cbd2dc] border-white/10 hover:border-white/25'
              }`}
            >
              All Incidents
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedSwarmOnly(true);
                setPage(1);
              }}
              className={`px-3.5 py-2 border transition flex items-center gap-2 cursor-pointer ${
                confirmedSwarmOnly
                  ? 'bg-[#ef4444]/20 text-[#fca5a5] font-medium border-[#ef4444]/50'
                  : 'bg-[#0c1018] text-[#cbd2dc] border-white/10 hover:border-white/25'
              }`}
            >
              <span className="w-1.5 h-1.5 rotate-45 bg-[#ef4444]" />
              <span>Confirmed Swarms</span>
            </button>

            <select
              aria-label="Sort incidents"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-xs text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
            >
              <option value="newest">Newest Published</option>
              <option value="updated">Recently Updated</option>
              <option value="severity">Highest Severity</option>
              <option value="confidence">Highest Alignment</option>
            </select>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className={`px-3 py-2 border inline-flex items-center gap-1.5 transition cursor-pointer ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-white/[0.08] text-[#f5b82e] border-[#f5b82e]/40'
                  : 'bg-[#0c1018] text-[#8a94a6] hover:text-[#f3f5f8] border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </button>

            {(activeFilterCount > 0 || q || confirmedSwarmOnly) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-[#8a94a6] hover:text-[#f3f5f8] inline-flex items-center gap-1 transition cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filter Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
            >
              <option value="">All Taxonomy Categories</option>
              {Object.entries(SWARM_CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
            >
              <option value="">All Severity Levels</option>
              {Object.entries(SEVERITY_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.code} — {v.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by verification status"
              value={verification}
              onChange={(e) => {
                setVerification(e.target.value);
                setPage(1);
              }}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
            >
              <option value="">All Verification Statuses</option>
              {Object.entries(VERIFICATION_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by intelligence source"
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setPage(1);
              }}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
            >
              <option value="">All Monitored Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.reliability_score}/100)
                </option>
              ))}
            </select>

            <input
              type="text"
              aria-label="Filter by country code or name"
              placeholder="Country code or name (e.g. US, CN)..."
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
              className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] placeholder:text-[#64748b] focus:outline-none focus:border-[#f5b82e]"
            />

            <div className="flex items-center gap-2 bg-[#0c1018] border border-white/10 px-3 py-1.5">
              <span className="text-[#64748b] font-mono text-[10px]">FROM</span>
              <input
                type="date"
                aria-label="Filter start date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[#cbd2dc] text-xs w-full focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#0c1018] border border-white/10 px-3 py-1.5">
              <span className="text-[#64748b] font-mono text-[10px]">TO</span>
              <input
                type="date"
                aria-label="Filter end date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[#cbd2dc] text-xs w-full focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* INCIDENT LIST                                                      */}
      {/* ================================================================== */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#8a94a6]">
          Loading intelligence records...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#0c1018] border border-white/10 p-12 text-center space-y-4">
          <h3 className="font-display text-base font-medium text-[#f3f5f8]">
            No Matching Intelligence Records
          </h3>
          <p className="text-xs text-[#8a94a6] max-w-md mx-auto">
            Adjust or reset your active filters to view available incidents.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs bg-white/[0.06] hover:bg-white/10 text-[#f3f5f8] border border-white/10 cursor-pointer"
            >
              Reset Filters
            </button>
            {mode === 'live' && (
              <button
                type="button"
                disabled={ingesting}
                onClick={onTriggerLiveIngest}
                className="px-4 py-2 text-xs bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] font-medium cursor-pointer"
              >
                {ingesting ? 'Syncing...' : 'Sync Public Sources'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.07] border-t border-b border-white/[0.07]">
          {items.map((incident) => {
            const primarySource = incident.sources[0];
            return (
              <article
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className="group py-5 px-4 hover:bg-[#0c1018] transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-l-2 border-transparent hover:border-[#f5b82e]"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Top Metadata Strip */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <SeverityBadge severity={incident.severity} />
                    <VerificationBadge
                      status={incident.verification_status}
                      independentSources={incident.independent_source_count}
                    />
                    <CategoryBadge category={incident.primary_category} short />
                    {incident.is_confirmed_swarm && (
                      <SwarmConfirmationBadge
                        isConfirmedSwarm={incident.is_confirmed_swarm}
                        evidenceStrength={incident.evidence_strength}
                        confidence={incident.classification_confidence}
                      />
                    )}
                    <span className="text-[#8a94a6]">•</span>
                    <span className="text-[#cbd2dc] font-medium">
                      {incident.country_name ||
                        incident.region_name ||
                        'Global'}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="font-display text-base font-medium text-[#f3f5f8] group-hover:text-[#f5b82e] transition leading-snug">
                    {incident.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#8a94a6] line-clamp-2 leading-relaxed max-w-4xl">
                    {incident.summary}
                  </p>
                </div>

                {/* Right Attribution & Date Column */}
                <div className="lg:text-right shrink-0 flex lg:flex-col items-center lg:items-end justify-between gap-2 text-xs text-[#8a94a6]">
                  <div className="font-mono text-[11px] text-[#cbd2dc]">
                    {new Date(incident.first_published_at)
                      .toISOString()
                      .slice(0, 10)}
                  </div>
                  {primarySource && (
                    <div className="text-[11px] text-[#8a94a6]">
                      {primarySource.source.name}
                    </div>
                  )}
                  {primarySource && (
                    <a
                      href={primarySource.record.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#f5b82e] hover:underline"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* PAGINATION BAR                                                     */}
      {/* ================================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-[#8a94a6]">
          <span>
            Page <strong className="text-[#f3f5f8]">{page}</strong> of{' '}
            {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-[#0c1018] hover:bg-white/[0.06] text-[#f3f5f8] border border-white/10 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-[#0c1018] hover:bg-white/[0.06] text-[#f3f5f8] border border-white/10 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
