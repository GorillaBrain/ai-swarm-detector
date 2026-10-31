'use client';

import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  OperatingMode,
  SEVERITY_META,
  SeverityLevel,
  Source,
  SourceRun,
  SWARM_CATEGORY_META,
  SwarmCategory,
  VERIFICATION_META,
  VerificationStatus,
} from '@/lib/types';
import {
  CategoryBadge,
  SeverityBadge,
  VerificationBadge,
} from './IntelligenceBadges';

// ============================================================================
// 1. THREAT ANALYTICS PANEL
// ============================================================================
export function ThreatAnalyticsPanel({
  mode,
  onSelectCategory,
  onSelectSeverity,
}: {
  mode: OperatingMode;
  onSelectCategory: (cat: SwarmCategory) => void;
  onSelectSeverity: (sev: SeverityLevel) => void;
  onSelectIncidentSlug?: (slug: string) => void;
}) {
  const [days, setDays] = useState<number>(0);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/analytics?mode=${mode}&days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        if (active) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, days]);

  if (loading || !data) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-xs font-mono text-[#8a94a6]">
        Computing threat intelligence aggregations...
      </div>
    );
  }

  const metrics = data.metrics as {
    totalUniqueIncidents: number;
    totalSourceReports: number;
    confirmedSwarmCount: number;
    primaryEvidencePct: number;
    current7dCount: number;
    previous7dCount: number;
  };
  const categoryBreakdown = data.categoryBreakdown as Record<
    SwarmCategory,
    number
  >;
  const severityBreakdown = data.severityBreakdown as Record<
    SeverityLevel,
    number
  >;
  const verificationBreakdown = data.verificationBreakdown as Record<
    VerificationStatus,
    number
  >;
  const timelineSeries = (data.timelineSeries || []) as Array<{
    period: string;
    incidents: number;
    confirmedSwarms: number;
    reports: number;
  }>;
  const topOrganizations = (data.topOrganizations || []) as Array<{
    entity: { id: string; name: string; entity_type: string };
    incidentCount: number;
  }>;
  const topFrameworks = (data.topFrameworks || []) as Array<{
    entity: { id: string; name: string; entity_type: string };
    incidentCount: number;
  }>;

  const maxTimelineVal = Math.max(
    1,
    ...timelineSeries.map((t) => Math.max(t.incidents, t.reports))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header & Horizon Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
            <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
            <span>QUANTITATIVE ASSESSMENT</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
            Threat Analytics
          </h1>
          <p className="text-xs text-[#8a94a6] mt-1">
            Aggregated across {metrics.totalUniqueIncidents} correlated incidents
            and {metrics.totalSourceReports} source disclosures.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {[
            { label: 'All Time', val: 0 },
            { label: '90 Days', val: 90 },
            { label: '30 Days', val: 30 },
            { label: '7 Days', val: 7 },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setDays(opt.val)}
              className={`px-3 py-1.5 border transition cursor-pointer ${
                days === opt.val
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium border-[#f5b82e]'
                  : 'bg-[#0c1018] text-[#8a94a6] border-white/10 hover:text-[#f3f5f8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[#0c1018] border-t border-white/15">
          <span className="text-xs text-[#8a94a6] block">
            Correlated Incidents
          </span>
          <div className="font-display text-3xl font-semibold text-[#f3f5f8] mt-1">
            {metrics.totalUniqueIncidents}
          </div>
          <span className="text-[11px] font-mono text-[#64748b] mt-1 block">
            From {metrics.totalSourceReports} raw reports
          </span>
        </div>

        <div className="p-5 bg-[#0c1018] border-t border-[#ef4444]/50">
          <span className="text-xs text-[#8a94a6] block">
            Confirmed AI Swarms
          </span>
          <div className="font-display text-3xl font-semibold text-[#ef4444] mt-1">
            {metrics.confirmedSwarmCount}
          </div>
          <span className="text-[11px] font-mono text-[#8a94a6] mt-1 block">
            Multi-agent architecture verified
          </span>
        </div>

        <div className="p-5 bg-[#0c1018] border-t border-[#f5b82e]/50">
          <span className="text-xs text-[#8a94a6] block">
            Primary-Source Evidence
          </span>
          <div className="font-display text-3xl font-semibold text-[#f5b82e] mt-1">
            {metrics.primaryEvidencePct}%
          </div>
          <span className="text-[11px] font-mono text-[#64748b] mt-1 block">
            Direct CERT, vendor, or lab report
          </span>
        </div>

        <div className="p-5 bg-[#0c1018] border-t border-white/15">
          <span className="text-xs text-[#8a94a6] block">
            7-Day Reporting Volume
          </span>
          <div className="font-display text-3xl font-semibold text-[#f3f5f8] mt-1">
            {metrics.current7dCount}{' '}
            <span className="text-base font-normal text-[#64748b]">
              / {metrics.previous7dCount} prev
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#64748b] mt-1 block">
            Rolling weekly comparison
          </span>
        </div>
      </div>

      {/* Publication Volume Over Time */}
      <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
          <div>
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
              :: CHRONOLOGICAL DISCLOSURE VOLUME
            </h3>
            <p className="text-xs text-[#8a94a6] mt-0.5">
              Gold = Unique Correlated Incidents • Slate = Raw Source Reports
            </p>
          </div>
        </div>

        {timelineSeries.length > 0 ? (
          <div className="pt-2 overflow-x-auto">
            <div className="flex items-end gap-2.5 h-44 min-w-[520px] px-2 pb-2 border-b border-white/10">
              {timelineSeries.slice(-24).map((bucket) => {
                const incHeight = Math.max(
                  6,
                  Math.round((bucket.incidents / maxTimelineVal) * 140)
                );
                const repHeight = Math.max(
                  6,
                  Math.round((bucket.reports / maxTimelineVal) * 140)
                );
                return (
                  <div
                    key={bucket.period}
                    className="flex-1 flex flex-col items-center gap-1.5"
                    title={`${bucket.period}: ${bucket.incidents} unique incidents, ${bucket.reports} total source reports`}
                  >
                    <div className="text-[10px] font-mono text-[#cbd2dc]">
                      {bucket.incidents}
                    </div>
                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      <div
                        className="w-2.5 bg-[#f5b82e] transition-all"
                        style={{ height: `${incHeight}px` }}
                      />
                      <div
                        className="w-2 bg-white/15"
                        style={{ height: `${repHeight}px` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[#64748b] truncate max-w-[56px]">
                      {bucket.period.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-[#8a94a6]">
            No timeline buckets in selected range.
          </div>
        )}
      </div>

      {/* Category, Severity & Verification Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Taxonomy Distribution */}
        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
            :: TAXONOMY DISTRIBUTION
          </h3>
          <div className="space-y-3.5">
            {(Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]).map(
              (cat) => {
                const count = categoryBreakdown[cat] || 0;
                const pct =
                  metrics.totalUniqueIncidents > 0
                    ? Math.round((count / metrics.totalUniqueIncidents) * 100)
                    : 0;
                return (
                  <div
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className="cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#cbd2dc] group-hover:text-[#f5b82e] transition">
                        {SWARM_CATEGORY_META[cat].label}
                      </span>
                      <span className="font-mono text-[#8a94a6]">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.05]">
                      <div
                        className="h-full bg-[#f5b82e] transition-all"
                        style={{
                          width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
            :: SEVERITY BREAKDOWN
          </h3>
          <div className="space-y-3.5">
            {(Object.keys(SEVERITY_META) as SeverityLevel[]).map((sev) => {
              const count = severityBreakdown[sev] || 0;
              const pct =
                metrics.totalUniqueIncidents > 0
                  ? Math.round((count / metrics.totalUniqueIncidents) * 100)
                  : 0;
              return (
                <div
                  key={sev}
                  onClick={() => onSelectSeverity(sev)}
                  className="cursor-pointer p-3 bg-[#080a0f] hover:bg-white/[0.03] border border-white/[0.06] transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={sev} showCode />
                    <span className="text-xs font-mono text-[#cbd2dc]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.05]">
                    <div
                      className={`h-full ${SEVERITY_META[sev].dotClass}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification Distribution */}
        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
            :: VERIFICATION STATUS
          </h3>
          <div className="space-y-3">
            {(Object.keys(VERIFICATION_META) as VerificationStatus[]).map(
              (ver) => {
                const count = verificationBreakdown[ver] || 0;
                const pct =
                  metrics.totalUniqueIncidents > 0
                    ? Math.round((count / metrics.totalUniqueIncidents) * 100)
                    : 0;
                return (
                  <div
                    key={ver}
                    className="p-3 bg-[#080a0f] border border-white/[0.06] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <VerificationBadge status={ver} />
                      <span className="text-xs font-mono text-[#cbd2dc]">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8a94a6] leading-relaxed">
                      {VERIFICATION_META[ver].rule}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Top Entities & Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
            :: REFERENCED ORGANIZATIONS & ACTORS
          </h3>
          <div className="divide-y divide-white/[0.06]">
            {topOrganizations.map((item) => (
              <div
                key={item.entity.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-[#f3f5f8]">
                    {item.entity.name}
                  </span>
                  <span className="block text-[11px] text-[#8a94a6] capitalize">
                    {item.entity.entity_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-mono text-[#f5b82e]">
                  {item.incidentCount} incident(s)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
            :: REFERENCED AGENT FRAMEWORKS & AI SYSTEMS
          </h3>
          <div className="divide-y divide-white/[0.06]">
            {topFrameworks.map((item) => (
              <div
                key={item.entity.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-[#f3f5f8]">
                    {item.entity.name}
                  </span>
                  <span className="block text-[11px] text-[#8a94a6] capitalize">
                    {item.entity.entity_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-mono text-[#cbd2dc]">
                  {item.incidentCount} incident(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. ACTORS & ORGANIZATIONS DIRECTORY PANEL
// ============================================================================
export function OrganizationsAndActorsPanel({
  mode,
  onSelectIncidentSlug,
}: {
  mode: OperatingMode;
  onSelectIncidentSlug: (slug: string) => void;
}) {
  const [entities, setEntities] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ mode });
    if (search) params.set('q', search);
    if (typeFilter) params.set('type', typeFilter);
    fetch(`/api/entities?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setEntities(data.entities || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, search, typeFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
            <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
            <span>ENTITY DIRECTORY</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
            Actors & Organizations
          </h1>
          <p className="text-xs text-[#8a94a6] mt-1 max-w-2xl">
            Indexed threat actors, affected organizations, reporting vendors,
            and AI agent frameworks. Inspect specific entity roles within each
            incident dossier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search entities or aliases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#0c1018] border border-white/10 focus:border-[#f5b82e] text-[#f3f5f8] placeholder:text-[#64748b] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter entities by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0c1018] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
          >
            <option value="">All Entity Types</option>
            <option value="organization">Organizations</option>
            <option value="agent_framework">Agent Frameworks</option>
            <option value="ai_system">AI Systems</option>
            <option value="threat_actor">Threat Actors</option>
            <option value="research_group">Research Groups</option>
            <option value="government_agency">Government / CERT</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#8a94a6]">
          Loading entity directory...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map((ent) => {
            const related = (ent.related_incidents || []) as Array<{
              id: string;
              slug: string;
              title: string;
              role: string;
              relationship_certainty: string;
              severity: SeverityLevel;
            }>;

            return (
              <div
                key={String(ent.id)}
                className="bg-[#0c1018] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#f3f5f8]">
                        {String(ent.name)}
                      </h3>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-white/[0.04] border border-white/10 text-[#f5b82e]">
                        {String(ent.entity_type).replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-[#f3f5f8] font-semibold">
                        {Number(ent.incident_count)} Incident(s)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#8a94a6] leading-relaxed">
                    {String(ent.description)}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/[0.07]">
                  <span className="text-[11px] font-mono uppercase text-[#64748b] block">
                    Linked Dossiers
                  </span>
                  {related.slice(0, 3).map((rel) => (
                    <div
                      key={`${rel.id}-${rel.role}`}
                      onClick={() => onSelectIncidentSlug(rel.slug)}
                      className="p-2.5 bg-[#080a0f] hover:bg-white/[0.03] border border-white/[0.06] cursor-pointer flex items-center justify-between gap-2 text-xs transition"
                    >
                      <div className="truncate">
                        <span className="text-[#f3f5f8] font-medium">
                          {rel.title}
                        </span>
                        <span className="block text-[11px] text-[#8a94a6] capitalize">
                          Role: {rel.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <SeverityBadge severity={rel.severity} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. SOURCES & RELIABILITY PANEL
// ============================================================================
export function SourcesAndReliabilityPanel({
  mode,
  onTriggerSourceIngest,
  ingesting,
}: {
  mode: OperatingMode;
  onTriggerSourceIngest: (sourceSlug?: string) => Promise<void>;
  ingesting: boolean;
}) {
  const [sources, setSources] = useState<
    Array<Source & { records_in_db: number; incidents_linked: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sources?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => {
        setSources(data.sources || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mode, ingesting]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
            <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
            <span>OSINT TELEMETRY FEEDS</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
            Sources & Reliability
          </h1>
          <p className="text-xs text-[#8a94a6] mt-1">
            Independent public connectors with deterministic deduplication and
            source reliability scoring.
          </p>
        </div>

        <button
          type="button"
          disabled={ingesting || mode === 'demo'}
          onClick={() => onTriggerSourceIngest()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold tracking-wider uppercase bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] disabled:opacity-50 transition cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`}
          />
          <span>{ingesting ? 'Syncing Feeds...' : 'Sync All Feeds'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#8a94a6]">
          Loading source connectors...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const isHealthy =
              src.status === 'healthy' || src.status === 'no_new_reports';

            return (
              <div
                key={src.id}
                className="bg-[#0c1018] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#f3f5f8]">
                        {src.name}
                      </h3>
                      <span className="text-xs text-[#8a94a6]">
                        {src.source_type.toUpperCase()} •{' '}
                        {src.reliability_tier.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
                        isHealthy
                          ? 'bg-white/[0.04] text-[#f3f5f8] border-white/15'
                          : 'bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/30'
                      }`}
                    >
                      {src.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#8a94a6] leading-relaxed">
                    {src.notes}
                  </p>

                  {src.last_error && (
                    <div className="p-2.5 bg-[#ef4444]/10 border-l-2 border-[#ef4444] text-xs font-mono text-[#fca5a5]">
                      {src.last_error}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-white/[0.07] text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#080a0f] p-2.5 border border-white/[0.06]">
                      <span className="text-[#8a94a6] text-[11px] block">
                        Reliability
                      </span>
                      <span className="font-mono text-[#f5b82e] font-semibold">
                        {src.reliability_score}/100
                      </span>
                    </div>
                    <div className="bg-[#080a0f] p-2.5 border border-white/[0.06]">
                      <span className="text-[#8a94a6] text-[11px] block">
                        Records
                      </span>
                      <span className="font-mono text-[#f3f5f8] font-semibold">
                        {src.records_in_db}
                      </span>
                    </div>
                    <div className="bg-[#080a0f] p-2.5 border border-white/[0.06]">
                      <span className="text-[#8a94a6] text-[11px] block">
                        Incidents
                      </span>
                      <span className="font-mono text-[#cbd2dc] font-semibold">
                        {src.incidents_linked}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8a94a6]">
                    <span className="font-mono">
                      Last Sync:{' '}
                      {src.last_successful_run_at
                        ? new Date(src.last_successful_run_at)
                            .toISOString()
                            .slice(0, 16)
                            .replace('T', ' ') + ' UTC'
                        : 'Unavailable'}
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={src.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#cbd2dc] hover:text-[#f5b82e] inline-flex items-center gap-1"
                      >
                        <span>Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {src.enabled && mode === 'live' && (
                        <button
                          type="button"
                          disabled={ingesting}
                          onClick={() => onTriggerSourceIngest(src.slug)}
                          className="text-[#f5b82e] hover:underline font-medium cursor-pointer"
                        >
                          Poll Feed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. WATCHLISTS PANEL
// ============================================================================
export function WatchlistsPanel({
  mode,
  onSelectIncidentSlug,
}: {
  mode: OperatingMode;
  onSelectIncidentSlug: (slug: string) => void;
}) {
  const [watchlists, setWatchlists] = useState<Array<Record<string, unknown>>>(
    []
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minSeverity, setMinSeverity] = useState<SeverityLevel>('medium');
  const [itemType, setItemType] = useState<
    'category' | 'keyword' | 'entity' | 'country'
  >('keyword');
  const [itemValue, setItemValue] = useState('');
  const [loading, setLoading] = useState(true);

  const loadWatchlists = () => {
    setLoading(true);
    fetch(`/api/watchlists?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => {
        setWatchlists(data.watchlists || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadWatchlists();
  }, [mode]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !itemValue.trim()) return;
    await fetch('/api/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        name: name.trim(),
        description:
          description.trim() || `Monitoring rule for ${itemValue.trim()}`,
        notify_in_app: true,
        min_severity: minSeverity,
        items: [
          {
            item_type: itemType,
            item_value: itemValue.trim(),
            label: `${itemType.toUpperCase()}: ${itemValue.trim()}`,
          },
        ],
      }),
    });
    setName('');
    setDescription('');
    setItemValue('');
    loadWatchlists();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/watchlists?id=${id}&mode=${mode}`, { method: 'DELETE' });
    loadWatchlists();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
          <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
          <span>CONTINUOUS MONITORING</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
          Watchlists
        </h1>
        <p className="text-xs text-[#8a94a6] mt-1">
          Define custom keyword, actor, category, or jurisdiction alert rules.
        </p>
      </div>

      {/* Create Watchlist Form */}
      <form
        onSubmit={handleCreate}
        className="bg-[#0c1018] border border-white/[0.08] p-5 space-y-4"
      >
        <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
          :: NEW WATCHLIST RULE
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <input
            type="text"
            placeholder="Watchlist Name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#080a0f] border border-white/10 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-[#080a0f] border border-white/10 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
          />
          <select
            aria-label="Minimum severity threshold"
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as SeverityLevel)}
            className="bg-[#080a0f] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
          >
            <option value="informational">Min Severity: Informational</option>
            <option value="low">Min Severity: Low</option>
            <option value="medium">Min Severity: Medium</option>
            <option value="high">Min Severity: High</option>
            <option value="critical">Min Severity: Critical</option>
          </select>
          <select
            aria-label="Rule match type"
            value={itemType}
            onChange={(e) => setItemType(e.target.value as typeof itemType)}
            className="bg-[#080a0f] border border-white/10 px-3 py-2 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
          >
            <option value="keyword">Match Keyword</option>
            <option value="category">Match Category</option>
            <option value="entity">Match Entity</option>
            <option value="country">Match Country Code</option>
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Value (e.g. Storm-0940)"
              value={itemValue}
              onChange={(e) => setItemValue(e.target.value)}
              className="flex-1 bg-[#080a0f] border border-white/10 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] font-display font-semibold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#8a94a6]">
          Evaluating watchlists...
        </div>
      ) : (
        <div className="space-y-4">
          {watchlists.map((wl) => {
            const items = (wl.items || []) as Array<{
              id: string;
              label: string;
            }>;
            const matches = (wl.matching_incidents || []) as Array<{
              id: string;
              slug: string;
              title: string;
              severity: SeverityLevel;
              verification_status: VerificationStatus;
              first_published_at: string;
            }>;

            return (
              <div
                key={String(wl.id)}
                className="bg-[#0c1018] border border-white/[0.08] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-base font-semibold text-[#f3f5f8]">
                        {String(wl.name)}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-[#f5b82e]/15 text-[#f5b82e] border border-[#f5b82e]/30">
                        {Number(wl.matching_count)} Matches
                      </span>
                    </div>
                    <p className="text-xs text-[#8a94a6] mt-0.5">
                      {String(wl.description)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(String(wl.id))}
                    className="p-2 text-[#8a94a6] hover:text-[#ef4444] border border-white/10 transition cursor-pointer"
                    title="Delete Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <span
                      key={it.id}
                      className="px-2.5 py-0.5 text-xs font-mono bg-[#080a0f] border border-white/10 text-[#cbd2dc]"
                    >
                      {it.label}
                    </span>
                  ))}
                </div>

                {matches.length > 0 ? (
                  <div className="divide-y divide-white/[0.06]">
                    {matches.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectIncidentSlug(m.slug)}
                        className="py-3 hover:bg-white/[0.02] cursor-pointer flex flex-wrap items-center justify-between gap-2 text-xs transition"
                      >
                        <div className="flex items-center gap-3">
                          <SeverityBadge severity={m.severity} />
                          <span className="text-[#f3f5f8] font-medium">
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-[#8a94a6]">
                          <VerificationBadge status={m.verification_status} />
                          <span>{m.first_published_at.slice(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748b]">
                    No incidents currently match this rule.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. SYSTEM HEALTH & AUDIT LOGS PANEL
// ============================================================================
export function SystemHealthPanel({ mode }: { mode: OperatingMode }) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/health?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch(() => null);
  }, [mode]);

  if (!health) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-xs font-mono text-[#8a94a6]">
        Querying system telemetry...
      </div>
    );
  }

  const sys = health.systemStatus as {
    databaseEngine: string;
    aiProvider: string;
    lastSuccessfulIngestionAt: string | null;
    monitoredSourcesCount: number;
    healthySourcesCount: number;
  };
  const recentRuns = (health.recentRuns || []) as SourceRun[];
  const auditLogs = (health.auditLogs || []) as Array<{
    id: string;
    action: string;
    actor: string;
    target_type: string;
    status: string;
    created_at: string;
  }>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
          <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
          <span>PLATFORM DIAGNOSTICS</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
          System Health
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0c1018] border-t border-white/15 p-5 space-y-1.5">
          <span className="text-xs font-mono uppercase text-[#8a94a6]">
            Storage Engine
          </span>
          <p className="font-display text-base font-semibold text-[#f3f5f8]">
            {sys.databaseEngine}
          </p>
          <p className="text-xs text-[#8a94a6]">
            Isolated Live and Synthetic Demo stores.
          </p>
        </div>

        <div className="bg-[#0c1018] border-t border-[#f5b82e]/50 p-5 space-y-1.5">
          <span className="text-xs font-mono uppercase text-[#8a94a6]">
            Classification Engine
          </span>
          <p className="font-display text-base font-semibold text-[#f3f5f8]">
            {sys.aiProvider}
          </p>
          <p className="text-xs text-[#8a94a6]">
            Zod schema validation and prompt-injection sanitization.
          </p>
        </div>

        <div className="bg-[#0c1018] border-t border-white/15 p-5 space-y-1.5">
          <span className="text-xs font-mono uppercase text-[#8a94a6]">
            Connector Health
          </span>
          <p className="font-display text-base font-semibold text-[#f3f5f8]">
            {sys.healthySourcesCount} / {sys.monitoredSourcesCount} Active
          </p>
          <p className="text-xs text-[#8a94a6]">
            Scheduled Cron (`/api/cron/ingest`) enabled.
          </p>
        </div>
      </div>

      {/* Recent Connector Execution Runs */}
      <div className="bg-[#0c1018] border border-white/[0.08] p-6 space-y-4 overflow-x-auto">
        <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
          :: INGESTION PIPELINE RUN HISTORY
        </h3>
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 text-[#8a94a6] text-[11px] uppercase">
              <th className="py-2.5 px-3">Timestamp (UTC)</th>
              <th className="py-2.5 px-3">Source</th>
              <th className="py-2.5 px-3">Trigger</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Retrieved</th>
              <th className="py-2.5 px-3">Accepted</th>
              <th className="py-2.5 px-3">Duplicates</th>
              <th className="py-2.5 px-3">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {recentRuns.map((run) => (
              <tr key={run.id} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-3 text-[#8a94a6]">
                  {run.started_at.replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-2.5 px-3 text-[#f3f5f8]">
                  {run.source_name || run.source_id}
                </td>
                <td className="py-2.5 px-3 uppercase text-[#cbd2dc]">
                  {run.trigger_type}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase ${
                      run.status === 'succeeded'
                        ? 'bg-white/[0.05] text-[#f3f5f8]'
                        : 'bg-[#f5b82e]/15 text-[#f5b82e]'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#cbd2dc]">
                  {run.records_retrieved}
                </td>
                <td className="py-2.5 px-3 text-[#f5b82e]">
                  {run.records_accepted}
                </td>
                <td className="py-2.5 px-3 text-[#8a94a6]">
                  {run.duplicates_detected}
                </td>
                <td className="py-2.5 px-3 text-[#8a94a6]">
                  {run.duration_ms ?? 0}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Audit Log */}
      <div className="bg-[#0c1018] border border-white/[0.08] p-6 space-y-4">
        <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
          :: ADMINISTRATIVE & SECURITY AUDIT LOG
        </h3>
        <div className="divide-y divide-white/[0.06] max-h-64 overflow-y-auto font-mono text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="py-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="text-[#f5b82e]">{log.action}</span> • Actor:{' '}
                <span className="text-[#f3f5f8]">{log.actor}</span> • Target:{' '}
                <span className="text-[#8a94a6]">{log.target_type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase text-[#cbd2dc]">
                  {log.status}
                </span>
                <span className="text-[#64748b]">
                  {log.created_at.replace('T', ' ').slice(0, 19)} UTC
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. SETTINGS & TAXONOMY DOCUMENTATION PANEL
// ============================================================================
export function SettingsPanel({
  mode,
  onChangeMode,
  pollIntervalSec,
  onChangePollInterval,
  onReseedDemo,
}: {
  mode: OperatingMode;
  onChangeMode: (m: OperatingMode) => void;
  pollIntervalSec: number;
  onChangePollInterval: (sec: number) => void;
  onReseedDemo: () => Promise<void>;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
          <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
          <span>CONFIGURATION</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
          Platform Settings & Taxonomy
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
            :: OPERATING ENVIRONMENT
          </h2>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onChangeMode('live')}
              className={`px-4 py-2 border transition cursor-pointer ${
                mode === 'live'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium border-[#f5b82e]'
                  : 'bg-[#080a0f] text-[#8a94a6] border-white/10 hover:text-white'
              }`}
            >
              Live Intelligence Mode
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('demo')}
              className={`px-4 py-2 border transition cursor-pointer ${
                mode === 'demo'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium border-[#f5b82e]'
                  : 'bg-[#080a0f] text-[#8a94a6] border-white/10 hover:text-white'
              }`}
            >
              Synthetic Demo Mode
            </button>
          </div>
          <p className="text-[#8a94a6] leading-relaxed">
            Live Mode queries verified public intelligence records. Demo Mode
            loads isolated synthetic fixtures for testing classification edge
            cases.
          </p>
          <button
            type="button"
            onClick={onReseedDemo}
            className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#cbd2dc] border border-white/10 transition cursor-pointer"
          >
            Reset Synthetic Demo Database
          </button>
        </div>

        <div className="p-6 bg-[#0c1018] border border-white/[0.08] space-y-4">
          <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
            :: FEED POLLING INTERVAL
          </h2>
          <div className="flex gap-2">
            {[15, 30, 60, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onChangePollInterval(sec)}
                className={`px-3.5 py-2 border transition cursor-pointer ${
                  pollIntervalSec === sec
                    ? 'bg-[#f5b82e] text-[#080a0f] font-medium border-[#f5b82e]'
                    : 'bg-[#080a0f] text-[#8a94a6] border-white/10 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
          <p className="text-[#8a94a6] leading-relaxed">
            Controls how frequently the Intelligence Feed polls for newly
            ingested or corroborated reports.
          </p>
        </div>
      </div>

      {/* Taxonomy Documentation */}
      <div className="bg-[#0c1018] border border-white/[0.08] p-6 space-y-5">
        <h3 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
          :: AI SWARM TAXONOMY & INCLUSION STANDARDS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {(Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]).map((cat) => (
            <div
              key={cat}
              className="p-4 bg-[#080a0f] border border-white/[0.06] space-y-2"
            >
              <CategoryBadge category={cat} />
              <p className="text-[#f3f5f8] leading-relaxed">
                {SWARM_CATEGORY_META[cat].description}
              </p>
              <p className="text-[11px] text-[#8a94a6]">
                Criteria: {SWARM_CATEGORY_META[cat].inclusionCriteria}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
