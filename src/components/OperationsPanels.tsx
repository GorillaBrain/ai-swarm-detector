'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  Info,
  Layers,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
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
// 1. THREAT ANALYTICS PANEL (Section 13)
// ============================================================================
export function ThreatAnalyticsPanel({
  mode,
  onSelectCategory,
  onSelectSeverity,
  onSelectIncidentSlug,
}: {
  mode: OperatingMode;
  onSelectCategory: (cat: SwarmCategory) => void;
  onSelectSeverity: (sev: SeverityLevel) => void;
  onSelectIncidentSlug: (slug: string) => void;
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
      <div className="p-8 text-center text-xs font-mono text-slate-400">
        Computing threat intelligence aggregations from persistent database...
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
  const lifecycleBreakdown = data.lifecycleBreakdown as {
    new: number;
    updated: number;
    merged: number;
  };
  const timelineSeries = (data.timelineSeries || []) as Array<{
    period: string;
    incidents: number;
    confirmedSwarms: number;
    reports: number;
  }>;
  const topOrganizations = (data.topOrganizations || []) as Array<{
    entity: { id: string; name: string; entity_type: string };
    incidentCount: number;
    confirmedCount: number;
  }>;
  const topFrameworks = (data.topFrameworks || []) as Array<{
    entity: { id: string; name: string; entity_type: string };
    incidentCount: number;
    confirmedCount: number;
  }>;
  const sourceContributions = (data.sourceContributions || []) as Array<{
    id: string;
    name: string;
    reliability_score: number;
    record_count: number;
    incident_count: number;
    status: string;
  }>;

  const maxTimelineVal = Math.max(
    1,
    ...timelineSeries.map((t) => Math.max(t.incidents, t.reports))
  );

  return (
    <div className="space-y-5">
      {/* Header & Epistemic Notice */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Threat Intelligence Analytics & Corpus Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived dynamically from {metrics.totalUniqueIncidents} unique incidents and{' '}
            {metrics.totalSourceReports} ingested source records ({mode.toUpperCase()} store).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Time Horizon:</span>
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
              className={`px-2.5 py-1 rounded border transition ${
                days === opt.val
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/70'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Section 13 Interpretation Guardrail */}
      <div className="p-3 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          <strong>Analytical Measurement Notice:</strong> Charts below distinguish between{' '}
          <span className="text-cyan-300 font-mono">Unique Correlated Incidents</span> and{' '}
          <span className="text-purple-300 font-mono">Raw Source Reports</span>. An increase in reporting volume reflects heightened publication or research disclosure and does not necessarily indicate an increase in underlying real-world attacks.
        </span>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Unique Incidents (Selected Window)
          </span>
          <div className="text-2xl font-mono font-bold text-slate-50 mt-1">
            {metrics.totalUniqueIncidents}
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            From {metrics.totalSourceReports} total ingested reports
          </span>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Confirmed Swarm Architecture
          </span>
          <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
            {metrics.confirmedSwarmCount}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Multi-agent coordination documented
          </span>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Primary-Source Evidence Rate
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
            {metrics.primaryEvidencePct}%
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Direct CERT / vendor / research disclosures
          </span>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            7-Day Reporting Volume Delta
          </span>
          <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
            {metrics.current7dCount} vs {metrics.previous7dCount}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            New: {lifecycleBreakdown.new} • Merged: {lifecycleBreakdown.merged} • Updated:{' '}
            {lifecycleBreakdown.updated}
          </span>
        </div>
      </div>

      {/* Chronological Reporting Volume Chart */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Chronological Incident & Report Volume by Publication Date
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Cyan = Unique Incidents • Emerald = Confirmed Swarms • Slate = Total Source Reports
            </p>
          </div>
        </div>

        {timelineSeries.length > 0 ? (
          <div className="pt-2 overflow-x-auto">
            <div className="flex items-end gap-2 h-44 min-w-[520px] px-2 pb-1 border-b border-slate-800">
              {timelineSeries.slice(-24).map((bucket) => {
                const incHeight = Math.max(
                  8,
                  Math.round((bucket.incidents / maxTimelineVal) * 140)
                );
                const repHeight = Math.max(
                  8,
                  Math.round((bucket.reports / maxTimelineVal) * 140)
                );
                return (
                  <div
                    key={bucket.period}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={`${bucket.period}: ${bucket.incidents} unique incidents (${bucket.confirmedSwarms} confirmed swarms), ${bucket.reports} total source reports`}
                  >
                    <div className="text-[10px] font-mono text-cyan-300 opacity-80">
                      {bucket.incidents}
                    </div>
                    <div className="w-full flex items-end justify-center gap-0.5 h-36">
                      <div
                        className="w-2.5 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                        style={{ height: `${incHeight}px` }}
                      />
                      <div
                        className="w-2 bg-slate-600/70 rounded-t"
                        style={{ height: `${repHeight}px` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 rotate-0 truncate max-w-[56px]">
                      {bucket.period.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No timeline buckets in selected range.
          </div>
        )}
      </div>

      {/* Category, Severity & Verification Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Distribution */}
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Distribution by Swarm Taxonomy (Unique Incidents)
          </h3>
          <div className="space-y-2.5">
            {(Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]).map((cat) => {
              const count = categoryBreakdown[cat] || 0;
              const pct =
                metrics.totalUniqueIncidents > 0
                  ? Math.round((count / metrics.totalUniqueIncidents) * 100)
                  : 0;
              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-200 group-hover:text-cyan-300 transition">
                      {SWARM_CATEGORY_META[cat].label}
                    </span>
                    <span className="font-mono text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/80 group-hover:bg-cyan-400"
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Distribution by Severity Level
          </h3>
          <div className="space-y-3">
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
                  className="cursor-pointer p-2 rounded bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <SeverityBadge severity={sev} />
                    <span className="text-xs font-mono text-slate-300">
                      {count} incidents ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
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

        {/* Verification Status Distribution */}
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Distribution by Verification Status
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
                    className="p-2 rounded bg-slate-950/70 border border-slate-800/80"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <VerificationBadge status={ver} />
                      <span className="text-xs font-mono text-slate-300">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {VERIFICATION_META[ver].rule}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Top Organizations, Frameworks & Source Contributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Frequently Referenced Organizations & Actors
          </h3>
          <div className="space-y-2">
            {topOrganizations.map((item) => (
              <div
                key={item.entity.id}
                className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-slate-200">
                    {item.entity.name}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    {item.entity.entity_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-mono text-cyan-300">
                  {item.incidentCount} incident(s)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Frequently Referenced Agent Frameworks & AI Systems
          </h3>
          <div className="space-y-2">
            {topFrameworks.map((item) => (
              <div
                key={item.entity.id}
                className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-slate-200">
                    {item.entity.name}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    {item.entity.entity_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-mono text-emerald-300">
                  {item.incidentCount} incident(s)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Source Intelligence Contribution Breakdown
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sourceContributions.map((src) => (
              <div
                key={src.id}
                className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-medium text-slate-200">
                    {src.name}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400">
                    Reliability: {src.reliability_score}/100 • Status: {src.status}
                  </span>
                </div>
                <span className="font-mono text-cyan-300 shrink-0">
                  {src.record_count} recs
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
// 2. ORGANIZATIONS & ACTORS DIRECTORY PANEL (Section 14)
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
    <div className="space-y-4">
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Organizations, Threat Actors & Agent Frameworks Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Appearance in an incident report does NOT imply maliciousness; inspect specific entity roles (Affected Organization, Reporting Vendor, Agent Framework, or Attributed Actor).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search entities or aliases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100"
            />
          </div>

          <select
            aria-label="Filter entities by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
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
        <div className="p-8 text-center text-xs font-mono text-slate-400">
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
            const sources = (ent.supporting_sources || []) as Array<{
              id: string;
              name: string;
              reliability_score: number;
            }>;

            return (
              <div
                key={String(ent.id)}
                className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-slate-100">
                        {String(ent.name)}
                      </h3>
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-slate-900 border border-slate-700 text-cyan-300">
                      {String(ent.entity_type).replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-slate-200 font-bold">
                      {Number(ent.incident_count)} Incident(s)
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Match Confidence:{' '}
                      {Math.round(Number(ent.match_confidence || 0.9) * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{String(ent.description)}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  <div>
                    First Seen:{' '}
                    <span className="text-slate-200">
                      {String(ent.first_seen_at).slice(0, 10)}
                    </span>
                  </div>
                  <div>
                    Latest Seen:{' '}
                    <span className="text-slate-200">
                      {String(ent.last_seen_at).slice(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Linked Incidents & Relationship Certainty
                  </span>
                  {related.slice(0, 3).map((rel) => (
                    <div
                      key={`${rel.id}-${rel.role}`}
                      onClick={() => onSelectIncidentSlug(rel.slug)}
                      className="p-2 rounded bg-slate-900/60 hover:bg-slate-900 border border-slate-800 cursor-pointer flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <span className="text-slate-200 font-medium">
                          {rel.title}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          Role: {rel.role.replace(/_/g, ' ')} ({rel.relationship_certainty})
                        </span>
                      </div>
                      <SeverityBadge severity={rel.severity} showCode={false} />
                    </div>
                  ))}
                </div>

                {sources.length > 0 && (
                  <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    Supporting Sources:{' '}
                    {sources.map((s) => s.name).join(', ')}
                  </div>
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
// 3. SOURCES & RELIABILITY PANEL (Section 7)
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
  const [sources, setSources] = useState<Array<Source & { records_in_db: number; incidents_linked: number }>>([]);
  const [loading, setLoading] = useState(true);

  const loadSources = () => {
    setLoading(true);
    fetch(`/api/sources?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => {
        setSources(data.sources || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSources();
  }, [mode, ingesting]);

  return (
    <div className="space-y-4">
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Monitored Public Intelligence Sources & Connector Status</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Each connector runs independently with timeout protection, rate-limit backoff, and deterministic URL/GUID deduplication.
          </p>
        </div>

        <button
          type="button"
          disabled={ingesting || mode === 'demo'}
          onClick={() => onTriggerSourceIngest()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-700 rounded disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
          <span>{ingesting ? 'Polling Connectors...' : 'Poll All Enabled Sources'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-slate-400">
          Loading source connectors...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const statusColor =
              src.status === 'healthy' || src.status === 'no_new_reports'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : src.status === 'rate_limited'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  : 'bg-red-950/80 text-red-300 border-red-700/60';

            return (
              <div
                key={src.id}
                className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {src.name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        Connector: {src.source_type.toUpperCase()} • Tier:{' '}
                        {src.reliability_tier.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${statusColor}`}
                    >
                      {src.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{src.notes}</p>

                  {src.last_error && (
                    <div className="p-2 rounded bg-red-950/40 border border-red-900/60 text-[11px] font-mono text-red-300">
                      Diagnostic: {src.last_error}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Reliability</span>
                      <span className="text-cyan-300 font-bold">
                        {src.reliability_score}/100
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Stored Recs</span>
                      <span className="text-slate-100 font-bold">
                        {src.records_in_db}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Linked Incs</span>
                      <span className="text-emerald-300 font-bold">
                        {src.incidents_linked}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Last Success:{' '}
                      {src.last_successful_run_at
                        ? new Date(src.last_successful_run_at)
                            .toISOString()
                            .replace('T', ' ')
                            .slice(0, 19) + ' UTC'
                        : 'Never / Unavailable'}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={src.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Source Site</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {src.enabled && mode === 'live' && (
                        <button
                          type="button"
                          disabled={ingesting}
                          onClick={() => onTriggerSourceIngest(src.slug)}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700"
                        >
                          Poll Connector
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
// 4. WATCHLISTS PANEL (Section 14)
// ============================================================================
export function WatchlistsPanel({
  mode,
  onSelectIncidentSlug,
}: {
  mode: OperatingMode;
  onSelectIncidentSlug: (slug: string) => void;
}) {
  const [watchlists, setWatchlists] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minSeverity, setMinSeverity] = useState<SeverityLevel>('medium');
  const [itemType, setItemType] = useState<'category' | 'keyword' | 'entity' | 'country'>('keyword');
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
          description.trim() || `Custom SOC Watchlist monitoring ${itemValue}`,
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
    <div className="space-y-5">
      {/* Create Watchlist Form */}
      <form
        onSubmit={handleCreate}
        className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3"
      >
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Create Threat Monitoring Watchlist & Alert Rule
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <input
            type="text"
            placeholder="Watchlist Name (e.g. MCP Infrastructure Alerts)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
            required
          />
          <input
            type="text"
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
          />
          <select
            aria-label="Minimum severity threshold"
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as SeverityLevel)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
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
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
          >
            <option value="keyword">Match Keyword</option>
            <option value="category">Match Category Slug</option>
            <option value="entity">Match Entity Name/Slug</option>
            <option value="country">Match Country ISO Code (e.g. US, CN)</option>
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rule value (e.g. Storm-0940, MCP)"
              value={itemValue}
              onChange={(e) => setItemValue(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              required
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-semibold rounded inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {/* Active Watchlists */}
      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-slate-400">
          Evaluating watchlists against incident store...
        </div>
      ) : (
        <div className="space-y-4">
          {watchlists.map((wl) => {
            const items = (wl.items || []) as Array<{ id: string; label: string }>;
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
                className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">
                        {String(wl.name)}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                        {Number(wl.matching_count)} Active Matches
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {String(wl.description)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(String(wl.id))}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded border border-slate-800"
                    title="Delete Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <span
                      key={it.id}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-900 border border-slate-700 text-slate-200"
                    >
                      {it.label}
                    </span>
                  ))}
                </div>

                {matches.length > 0 ? (
                  <div className="space-y-1.5">
                    {matches.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectIncidentSlug(m.slug)}
                        className="p-2.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 cursor-pointer flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={m.severity} />
                          <span className="text-slate-100 font-medium">
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                          <VerificationBadge status={m.verification_status} />
                          <span>{m.first_published_at.slice(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">
                    No incidents currently match this watchlist threshold.
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
// 5. SYSTEM HEALTH & AUDIT LOGS PANEL (Sections 5, 7, 16)
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
      <div className="p-8 text-center text-xs font-mono text-slate-400">
        Querying system telemetry and pipeline diagnostics...
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Database className="w-4 h-4" />
            <span>PERSISTENT STORAGE LAYER</span>
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {sys.databaseEngine}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Strict relational separation between Live Mode and Demo Mode stores.
          </p>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <Activity className="w-4 h-4" />
            <span>CLASSIFICATION PIPELINE</span>
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {sys.aiProvider}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Prompt-injection sanitized with Zod schema enforcement.
          </p>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
            <Lock className="w-4 h-4" />
            <span>SCHEDULED WORKER & SECURITY</span>
          </div>
          <p className="text-sm font-semibold text-slate-100">
            Vercel Cron (`/api/cron/ingest`) Configured
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Healthy Connectors: {sys.healthySourcesCount}/{sys.monitoredSourcesCount} active
          </p>
        </div>
      </div>

      {/* Recent Connector Execution Runs */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3 overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-100">
          Recent Source Ingestion Run History
        </h3>
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
              <th className="py-2 px-2.5">Timestamp (UTC)</th>
              <th className="py-2 px-2.5">Source</th>
              <th className="py-2 px-2.5">Trigger</th>
              <th className="py-2 px-2.5">Status</th>
              <th className="py-2 px-2.5">Retrieved</th>
              <th className="py-2 px-2.5">Accepted</th>
              <th className="py-2 px-2.5">Duplicates</th>
              <th className="py-2 px-2.5">Filtered</th>
              <th className="py-2 px-2.5">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {recentRuns.map((run) => (
              <tr key={run.id} className="hover:bg-slate-900/50">
                <td className="py-2 px-2.5 text-slate-400">
                  {run.started_at.replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-2 px-2.5 text-slate-200">
                  {run.source_name || run.source_id}
                </td>
                <td className="py-2 px-2.5 uppercase text-cyan-300">
                  {run.trigger_type}
                </td>
                <td className="py-2 px-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      run.status === 'succeeded'
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-amber-950 text-amber-300'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="py-2 px-2.5">{run.records_retrieved}</td>
                <td className="py-2 px-2.5 text-emerald-300">
                  {run.records_accepted}
                </td>
                <td className="py-2 px-2.5 text-slate-400">
                  {run.duplicates_detected}
                </td>
                <td className="py-2 px-2.5 text-slate-400">
                  {run.irrelevant_filtered}
                </td>
                <td className="py-2 px-2.5 text-slate-400">
                  {run.duration_ms ?? 0}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Audit Log */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">
          Administrative & Ingestion Security Audit Log
        </h3>
        <div className="space-y-1.5 max-h-60 overflow-y-auto font-mono text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="text-cyan-300">{log.action}</span> • Actor:{' '}
                <span className="text-slate-300">{log.actor}</span> • Target:{' '}
                <span className="text-slate-400">{log.target_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    log.status === 'allowed'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-red-950 text-red-300'
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-slate-500">
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
// 6. SETTINGS & TAXONOMY DOCUMENTATION PANEL (Sections 2, 8, 9, 17)
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
    <div className="space-y-5">
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Settings className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Operating Mode, Live-Feed Polling & Data Integrity Controls
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-mono uppercase text-slate-400 block">
              Data Store Operating Mode
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChangeMode('live')}
                className={`px-3 py-1.5 rounded font-mono border ${
                  mode === 'live'
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                LIVE INTELLIGENCE MODE (Default)
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('demo')}
                className={`px-3 py-1.5 rounded font-mono border ${
                  mode === 'demo'
                    ? 'bg-amber-950 text-amber-200 border-amber-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                SYNTHETIC DEMO MODE
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Live Mode queries real public intelligence connectors. Demo Mode loads isolated synthetic fixtures (including false-positive ordinary botnet fixtures) for QA testing.
            </p>
            <button
              type="button"
              onClick={onReseedDemo}
              className="mt-1 px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded"
            >
              Reset / Reseed Synthetic Demo Database
            </button>
          </div>

          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-mono uppercase text-slate-400 block">
              Live Intelligence Feed Auto-Refresh Interval
            </span>
            <div className="flex gap-2">
              {[15, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChangePollInterval(sec)}
                  className={`px-3 py-1.5 rounded font-mono border ${
                    pollIntervalSec === sec
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Every {sec}s
                </button>
              ))}
            </div>
            <p className="text-slate-400 text-[11px]">
              Controls how frequently the Live Intelligence Feed polls `/api/incidents` for newly ingested or corroborated reports without reloading the page.
            </p>
          </div>
        </div>
      </div>

      {/* Taxonomy & Verification Reference Documentation */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
          AI Swarm Taxonomy & Inclusion Criteria Reference (Section 2)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {(Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]).map((cat) => (
            <div
              key={cat}
              className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1"
            >
              <CategoryBadge category={cat} />
              <p className="text-slate-200 mt-1">
                {SWARM_CATEGORY_META[cat].description}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Inclusion Rule: {SWARM_CATEGORY_META[cat].inclusionCriteria}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
