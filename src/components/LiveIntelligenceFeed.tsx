'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
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
  LifecycleBadge,
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

  const [items, setItems] = useState<EnrichedIncident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [livePaused, setLivePaused] = useState<boolean>(false);
  const [lastPolledUtc, setLastPolledUtc] = useState<string>(
    new Date().toISOString()
  );

  // Sync external drill-down props when clicked from Overview / Analytics / Map
  useEffect(() => {
    setCategory(initialCategory);
    setSeverity(initialSeverity);
    setVerification(initialVerification);
    setCountry(initialCountry);
    setQ(initialQuery);
    setConfirmedSwarmOnly(initialConfirmedSwarmOnly);
    setPage(1);
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
          setLastPolledUtc(data.serverTimeUtc || new Date().toISOString());
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

  // Live periodic polling when not paused
  useEffect(() => {
    if (livePaused) return;
    const interval = setInterval(() => {
      fetchFeed(true);
    }, pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [livePaused, pollIntervalSec, fetchFeed]);

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

  return (
    <div className="space-y-4">
      {/* Live Stream Status & Control Header */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-4 h-4 ${
                  livePaused
                    ? 'text-amber-400'
                    : 'text-emerald-400 animate-pulse'
                }`}
              />
              <h2 className="text-base font-bold text-slate-100">
                Live Threat Intelligence Feed & Incident Explorer
              </h2>
            </div>

            {livePaused ? (
              <span className="px-2 py-0.5 text-[11px] font-mono uppercase rounded bg-amber-950/90 text-amber-300 border border-amber-600/70">
                STREAM PAUSED (VIEW STATIC)
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-mono uppercase rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/70">
                AUTO-POLLING ACTIVE ({pollIntervalSec}s)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              Synced: {lastPolledUtc.replace('T', ' ').slice(11, 19)} UTC
            </span>

            <button
              type="button"
              onClick={() => setLivePaused((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
                livePaused
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-200 border-amber-700'
              }`}
            >
              {livePaused ? (
                <>
                  <Play className="w-3 h-3" />
                  <span>Resume Live Feed</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause Feed</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => fetchFeed(false)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh Query</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              aria-label="Search incidents by keyword"
              placeholder="Search title, summary, entity, actor..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Swarm Taxonomy Categories</option>
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
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
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
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Verification Statuses</option>
            {Object.entries(VERIFICATION_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.code}: {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <select
            aria-label="Filter by intelligence source"
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
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
            placeholder="Country filter (e.g. US, CN, GB)..."
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          />

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400 font-mono text-[10px]">FROM:</span>
            <input
              type="date"
              aria-label="Filter start date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 text-xs w-full focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400 font-mono text-[10px]">TO:</span>
            <input
              type="date"
              aria-label="Filter end date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 text-xs w-full focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-slate-300 font-mono text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedSwarmOnly}
                onChange={(e) => {
                  setConfirmedSwarmOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-700 bg-slate-950"
              />
              <span>Confirmed Swarms Only</span>
            </label>

            <select
              aria-label="Sort incidents"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as typeof sortBy)
              }
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
            >
              <option value="newest">Sort: Newest Published</option>
              <option value="updated">Sort: Recently Updated</option>
              <option value="severity">Sort: Highest Severity</option>
              <option value="confidence">Sort: Highest Alignment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono text-slate-400">
        <div>
          Showing{' '}
          <span className="text-slate-100 font-semibold">{items.length}</span> of{' '}
          <span className="text-cyan-300 font-semibold">{total}</span> matching
          incidents (Page {page} of {totalPages})
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 disabled:opacity-40 inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="px-2 text-slate-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 disabled:opacity-40 inline-flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feed Entries or Informative Empty State */}
      {items.length === 0 ? (
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-8 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-100">
            No Matching Intelligence Records Found
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Either your current filter combination returned zero records, or no reports have been ingested into this store yet.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded"
            >
              Reset All Active Filters
            </button>
            {mode === 'live' && (
              <button
                type="button"
                disabled={ingesting}
                onClick={onTriggerLiveIngest}
                className="px-3 py-1.5 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded"
              >
                {ingesting
                  ? 'Polling Public Sources...'
                  : 'Discover & Ingest Public Reports Now'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((incident) => {
            const primarySource = incident.sources[0];
            return (
              <article
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-4 transition cursor-pointer space-y-2.5"
              >
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={incident.severity} />
                    <VerificationBadge
                      status={incident.verification_status}
                      independentSources={incident.independent_source_count}
                    />
                    <CategoryBadge category={incident.primary_category} />
                    <SwarmConfirmationBadge
                      isConfirmedSwarm={incident.is_confirmed_swarm}
                      evidenceStrength={incident.evidence_strength}
                      confidence={incident.classification_confidence}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <LifecycleBadge lifecycle={incident.record_lifecycle} />
                    {incident.reported_agent_count !== null && (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/90 text-cyan-300 border border-cyan-700/60">
                        {incident.reported_agent_count} AGENTS DOCUMENTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Factual Summary */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-cyan-300">
                    {incident.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {incident.summary}
                  </p>
                </div>

                {/* Bottom Provenance & Timestamps Bar */}
                <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>
                        Published:{' '}
                        {new Date(incident.first_published_at)
                          .toISOString()
                          .replace('T', ' ')
                          .slice(0, 16)}{' '}
                        UTC
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>
                        Occurred:{' '}
                        {incident.occurred_at
                          ? new Date(incident.occurred_at)
                              .toISOString()
                              .slice(0, 10)
                          : 'Unstated'}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>
                        {incident.country_name
                          ? `${incident.country_name} (${incident.country_code})`
                          : incident.region_name || 'Global / Unspecified'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {primarySource && (
                      <span className="text-slate-300">
                        Source: <strong>{primarySource.source.name}</strong> (
                        {primarySource.source.reliability_score}/100)
                      </span>
                    )}

                    {primarySource && (
                      <a
                        href={primarySource.record.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                      >
                        <span>Original Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
