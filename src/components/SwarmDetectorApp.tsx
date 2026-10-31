'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Menu,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  EnrichedIncident,
  OperatingMode,
  SEVERITY_META,
  SeverityLevel,
  Source,
  SWARM_CATEGORY_META,
  SwarmCategory,
  VerificationStatus,
} from '@/lib/types';
import {
  CategoryBadge,
  SeverityBadge,
  VerificationBadge,
} from './IntelligenceBadges';
import { GlobalIncidentMap } from './GlobalIncidentMap';
import { LiveIntelligenceFeed } from './LiveIntelligenceFeed';
import { IncidentInvestigationView } from './IncidentInvestigationView';
import { SwarmGlobeAtlas } from './SwarmGlobeAtlas';
import {
  OrganizationsAndActorsPanel,
  SettingsPanel,
  SourcesAndReliabilityPanel,
  SystemHealthPanel,
  ThreatAnalyticsPanel,
  WatchlistsPanel,
} from './OperationsPanels';

export type NavTab =
  | 'globe'
  | 'overview'
  | 'feed'
  | 'map'
  | 'explorer'
  | 'analytics'
  | 'entities'
  | 'sources'
  | 'watchlists'
  | 'health'
  | 'settings';

interface SwarmDetectorAppProps {
  initialAnalytics: Record<string, unknown>;
  initialIncidents: EnrichedIncident[];
  initialSources: Source[];
}

export function SwarmDetectorApp({
  initialAnalytics,
  initialIncidents,
  initialSources,
}: SwarmDetectorAppProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('globe');
  const [mode, setMode] = useState<OperatingMode>('live');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [analytics, setAnalytics] =
    useState<Record<string, unknown>>(initialAnalytics);
  const [incidents, setIncidents] =
    useState<EnrichedIncident[]>(initialIncidents);
  const [sources, setSources] = useState<Source[]>(initialSources);

  // Contextual Intelligence Dossier Drawer state
  const [dossierIncident, setDossierIncident] =
    useState<EnrichedIncident | null>(null);

  // Drill-down filter state when clicking metrics/charts/map
  const [drillCategory, setDrillCategory] = useState<SwarmCategory | ''>('');
  const [drillSeverity, setDrillSeverity] = useState<SeverityLevel | ''>('');
  const [drillVerification, setDrillVerification] = useState<
    VerificationStatus | ''
  >('');
  const [drillCountry, setDrillCountry] = useState<string>('');
  const [drillConfirmedSwarmOnly, setDrillConfirmedSwarmOnly] =
    useState<boolean>(false);

  const [pollIntervalSec, setPollIntervalSec] = useState<number>(30);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestBannerMsg, setIngestBannerMsg] = useState<string | null>(null);

  // Close dossier on ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dossierIncident) {
        setDossierIncident(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dossierIncident]);

  const refreshWorkspaceData = useCallback(async (targetMode: OperatingMode) => {
    try {
      const [anaRes, incRes, srcRes] = await Promise.all([
        fetch(`/api/analytics?mode=${targetMode}`, { cache: 'no-store' }),
        fetch(`/api/incidents?mode=${targetMode}&pageSize=80`, {
          cache: 'no-store',
        }),
        fetch(`/api/sources?mode=${targetMode}`, { cache: 'no-store' }),
      ]);
      if (anaRes.ok) {
        setAnalytics(await anaRes.json());
      }
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.items || []);
      }
      if (srcRes.ok) {
        const srcData = await srcRes.json();
        setSources(srcData.sources || []);
      }
    } catch {
      // Keep existing state on transient error
    }
  }, []);

  const handleModeChange = async (newMode: OperatingMode) => {
    setMode(newMode);
    setDossierIncident(null);
    await refreshWorkspaceData(newMode);
  };

  const handleTriggerLiveIngest = async (sourceSlug?: string) => {
    setIngesting(true);
    setIngestBannerMsg(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-soc-client': 'ai-swarm-detector-ui',
        },
        body: JSON.stringify({
          sourceSlug,
          force: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIngestBannerMsg(
          `Synced ${data.sourcesChecked} source(s): ${data.newIncidentsCreated} new incident(s), ${data.existingIncidentsCorroborated} corroborated.`
        );
        await refreshWorkspaceData(mode);
      } else {
        setIngestBannerMsg(data.error || 'Ingestion request failed.');
      }
    } catch {
      setIngestBannerMsg('Network error triggering ingestion.');
    } finally {
      setIngesting(false);
    }
  };

  const handleReseedDemo = async () => {
    setIngesting(true);
    try {
      await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-soc-client': 'ai-swarm-detector-ui',
        },
        body: JSON.stringify({ action: 'reseed_demo' }),
      });
      await refreshWorkspaceData(mode);
      setIngestBannerMsg('Synthetic Demo Database reset to baseline.');
    } finally {
      setIngesting(false);
    }
  };

  const openIncidentInvestigation = async (
    incOrSlug: EnrichedIncident | string
  ) => {
    const slugOrId =
      typeof incOrSlug === 'string' ? incOrSlug : incOrSlug.id;
    if (typeof incOrSlug !== 'string') {
      setDossierIncident(incOrSlug);
    }
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(slugOrId)}?mode=${mode}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.incident) {
          setDossierIncident(data.incident);
          return;
        }
      }
    } catch {
      // Keep inline incident
    }
  };

  const openFilteredExplorer = (filters: {
    category?: SwarmCategory | '';
    severity?: SeverityLevel | '';
    verification?: VerificationStatus | '';
    country?: string;
    confirmedSwarmOnly?: boolean;
  }) => {
    setDrillCategory(filters.category || '');
    setDrillSeverity(filters.severity || '');
    setDrillVerification(filters.verification || '');
    setDrillCountry(filters.country || '');
    setDrillConfirmedSwarmOnly(Boolean(filters.confirmedSwarmOnly));
    setActiveTab('explorer');
  };

  const systemStatus = (analytics.systemStatus || {}) as {
    operational: boolean;
    databaseEngine: string;
    aiProvider: string;
    aiKeyConfigured: boolean;
    lastSuccessfulIngestionAt: string | null;
    monitoredSourcesCount: number;
    healthySourcesCount: number;
    pendingQueueCount: number;
  };

  const metrics = (analytics.metrics || {}) as {
    totalUniqueIncidents: number;
    totalSourceReports: number;
    newLast24h: number;
    confirmedSwarmCount: number;
    suspectedOrUnverifiedCount: number;
    highOrCriticalCount: number;
    activeSourcesCount: number;
    primaryEvidencePct: number;
  };

  const categoryBreakdown = (analytics.categoryBreakdown || {}) as Record<
    SwarmCategory,
    number
  >;
  const severityBreakdown = (analytics.severityBreakdown || {}) as Record<
    SeverityLevel,
    number
  >;

  const navItems: Array<{
    id: NavTab;
    label: string;
  }> = [
    { id: 'globe', label: '3D Atlas' },
    { id: 'overview', label: 'Overview' },
    { id: 'feed', label: 'Intelligence Feed' },
    { id: 'explorer', label: 'Incident Explorer' },
    { id: 'analytics', label: 'Threat Analytics' },
    { id: 'entities', label: 'Actors & Organizations' },
    { id: 'sources', label: 'Sources & Reliability' },
    { id: 'watchlists', label: 'Watchlists' },
    { id: 'health', label: 'System Health' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="h-screen w-full bg-[#080a0f] text-[#f3f5f8] flex flex-col overflow-hidden">
      {/* ================================================================== */}
      {/* REFINED MINIMALIST TOP NAVIGATION BAR                              */}
      {/* ================================================================== */}
      <header className="shrink-0 z-30 h-14 bg-[#080a0f]/90 backdrop-blur-md border-b border-white/[0.08] px-6 flex items-center justify-between gap-4">
        {/* Left: Platform Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="xl:hidden p-1.5 text-[#8a94a6] hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setDossierIncident(null);
              setActiveTab('globe');
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <span className="w-2.5 h-2.5 rotate-45 bg-[#f5b82e] group-hover:scale-110 transition" />
            <span className="font-display text-xs font-semibold tracking-[0.22em] text-[#f3f5f8] uppercase">
              AI SWARM DETECTOR
            </span>
          </button>
        </div>

        {/* Center: Clean Horizontal Navigation Tabs (Inspired by Reference Image) */}
        <nav className="hidden xl:flex items-center gap-6 h-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id && !dossierIncident;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDossierIncident(null);
                  setActiveTab(item.id);
                }}
                className={`relative h-full flex items-center text-xs font-display tracking-[0.12em] uppercase transition cursor-pointer ${
                  isActive
                    ? 'text-[#f3f5f8] font-semibold'
                    : 'text-[#8a94a6] hover:text-[#cbd2dc]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#f5b82e]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Minimal Mode Switcher & Sync Control */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div
            title={`Storage: ${systemStatus.databaseEngine || 'Active'} • ${
              systemStatus.healthySourcesCount || 10
            }/${systemStatus.monitoredSourcesCount || 11} Sources Operational`}
            className="inline-flex border border-white/10 bg-[#0c1018]"
          >
            <button
              type="button"
              onClick={() => handleModeChange('live')}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase transition cursor-pointer ${
                mode === 'live'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-semibold'
                  : 'text-[#8a94a6] hover:text-[#f3f5f8]'
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('demo')}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase transition cursor-pointer ${
                mode === 'demo'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-semibold'
                  : 'text-[#8a94a6] hover:text-[#f3f5f8]'
              }`}
            >
              Demo
            </button>
          </div>

          {mode === 'live' && (
            <button
              type="button"
              disabled={ingesting}
              onClick={() => handleTriggerLiveIngest()}
              title="Poll enabled OSINT intelligence sources"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#cbd2dc] hover:text-[#f3f5f8] text-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  ingesting ? 'animate-spin text-[#f5b82e]' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {ingesting ? 'Syncing' : 'Sync'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile / Tablet Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0c1018] border-b border-white/10 px-6 py-3 grid grid-cols-2 sm:grid-cols-5 gap-2 z-30">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setDossierIncident(null);
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-left text-xs font-display uppercase tracking-wider ${
                activeTab === item.id
                  ? 'bg-[#f5b82e] text-[#080a0f] font-semibold'
                  : 'text-[#8a94a6] hover:text-white bg-white/[0.02]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Synthetic Demo Mode Notice */}
      {mode === 'demo' && (
        <div className="bg-[#f5b82e]/12 border-b border-[#f5b82e]/35 px-6 py-2 text-xs text-[#fde68a] flex items-center justify-between gap-2 shrink-0">
          <span>
            <strong>Synthetic Demo Mode Active:</strong> Displaying isolated
            synthetic test fixtures separated from Live Intelligence.
          </span>
          <button
            type="button"
            onClick={() => handleModeChange('live')}
            className="px-2.5 py-0.5 bg-[#f5b82e] text-[#080a0f] font-medium text-[11px] cursor-pointer"
          >
            Return to Live Mode
          </button>
        </div>
      )}

      {/* Ingestion Toast */}
      {ingestBannerMsg && (
        <div className="bg-[#0c1018] border-b border-[#f5b82e]/40 px-6 py-2 text-xs text-[#cbd2dc] flex items-center justify-between shrink-0">
          <span>{ingestBannerMsg}</span>
          <button
            type="button"
            onClick={() => setIngestBannerMsg(null)}
            className="text-[#8a94a6] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN WORKSPACE STAGE                                               */}
      {/* ================================================================== */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {activeTab === 'globe' ? (
          <div className="w-full h-full">
            <SwarmGlobeAtlas
              incidents={incidents}
              mode={mode}
              onOpenDossier={(inc) => openIncidentInvestigation(inc)}
              onOpenView={(tab) => {
                if (tab === 'feed') setActiveTab('feed');
                else if (tab === 'analytics') setActiveTab('analytics');
                else if (tab === 'entities') setActiveTab('entities');
                else if (tab === 'sources') setActiveTab('sources');
                else if (tab === 'health') setActiveTab('health');
                else if (tab === 'overview') setActiveTab('overview');
                else if (tab === 'map') setActiveTab('map');
                else setActiveTab('feed');
              }}
            />
          </div>
        ) : (
          <main className="h-full overflow-y-auto px-6 py-8">
            {/* ============================================================ */}
            {/* VIEW: OVERVIEW                                               */}
            {/* ============================================================ */}
            {activeTab === 'overview' && (
              <div className="max-w-6xl mx-auto space-y-8 pb-12">
                {/* Executive Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
                      <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
                      <span>COMMAND BRIEFING</span>
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
                      Intelligence Overview
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('globe')}
                    className="px-4 py-2 bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] font-display text-xs font-semibold tracking-[0.16em] uppercase inline-flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>LAUNCH 3D ATLAS</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary 4-Pillar Typographic Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => openFilteredExplorer({})}
                    className="p-5 bg-[#0c1018] hover:bg-[#111621] border-t border-white/15 cursor-pointer transition"
                  >
                    <span className="text-xs text-[#8a94a6] block">
                      Correlated Incidents
                    </span>
                    <div className="font-display text-3xl font-semibold text-[#f3f5f8] mt-1">
                      {metrics.totalUniqueIncidents ?? 0}
                    </div>
                    <span className="text-[11px] font-mono text-[#64748b] mt-1 block">
                      {metrics.newLast24h ?? 0} indexed in last 24h →
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openFilteredExplorer({ confirmedSwarmOnly: true })
                    }
                    className="p-5 bg-[#0c1018] hover:bg-[#111621] border-t border-[#ef4444]/60 cursor-pointer transition"
                  >
                    <span className="text-xs text-[#8a94a6] block">
                      Confirmed AI Swarms
                    </span>
                    <div className="font-display text-3xl font-semibold text-[#ef4444] mt-1">
                      {metrics.confirmedSwarmCount ?? 0}
                    </div>
                    <span className="text-[11px] font-mono text-[#fca5a5]/80 mt-1 block">
                      Multi-agent coordination verified →
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openFilteredExplorer({ severity: 'critical' })
                    }
                    className="p-5 bg-[#0c1018] hover:bg-[#111621] border-t border-[#f5b82e]/60 cursor-pointer transition"
                  >
                    <span className="text-xs text-[#8a94a6] block">
                      High & Critical Severity
                    </span>
                    <div className="font-display text-3xl font-semibold text-[#f5b82e] mt-1">
                      {metrics.highOrCriticalCount ?? 0}
                    </div>
                    <span className="text-[11px] font-mono text-[#8a94a6] mt-1 block">
                      Priority SEV-1 & SEV-2 cases →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('sources')}
                    className="p-5 bg-[#0c1018] hover:bg-[#111621] border-t border-white/15 cursor-pointer transition"
                  >
                    <span className="text-xs text-[#8a94a6] block">
                      Primary-Source Evidence
                    </span>
                    <div className="font-display text-3xl font-semibold text-[#f3f5f8] mt-1">
                      {metrics.primaryEvidencePct ?? 0}%
                    </div>
                    <span className="text-[11px] font-mono text-[#64748b] mt-1 block">
                      {systemStatus.healthySourcesCount}/
                      {systemStatus.monitoredSourcesCount} active feeds →
                    </span>
                  </div>
                </div>

                {/* 2D Geographic Overview */}
                <GlobalIncidentMap
                  incidents={incidents}
                  compact
                  onSelectIncident={(inc) => openIncidentInvestigation(inc)}
                  onFilterByCountry={(code) =>
                    openFilteredExplorer({ country: code })
                  }
                />

                {/* Two-Column Stream & Taxonomy Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Cols: Recent Intelligence Stream */}
                  <div className="lg:col-span-7 bg-[#0c1018] border border-white/[0.08] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                      <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
                        :: RECENT INTELLIGENCE DISCLOSURES
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('feed')}
                        className="text-xs text-[#f5b82e] hover:underline cursor-pointer"
                      >
                        Full Feed →
                      </button>
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      {incidents.slice(0, 7).map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => openIncidentInvestigation(inc)}
                          className="py-3.5 hover:bg-white/[0.02] cursor-pointer transition space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <SeverityBadge severity={inc.severity} />
                              <VerificationBadge
                                status={inc.verification_status}
                              />
                              <CategoryBadge
                                category={inc.primary_category}
                                short
                              />
                            </div>
                            <span className="font-mono text-[11px] text-[#8a94a6]">
                              {inc.first_published_at.slice(0, 10)}
                            </span>
                          </div>

                          <h3 className="text-sm font-medium text-[#f3f5f8] leading-snug">
                            {inc.title}
                          </h3>
                          <p className="text-xs text-[#8a94a6] line-clamp-2">
                            {inc.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right 5 Cols: Taxonomy & Severity Breakdown */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#0c1018] border border-white/[0.08] p-6 space-y-4">
                      <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
                        :: TAXONOMY BREAKDOWN
                      </h2>
                      <div className="space-y-3">
                        {(
                          Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]
                        ).map((cat) => {
                          const count = categoryBreakdown[cat] || 0;
                          const pct =
                            metrics.totalUniqueIncidents > 0
                              ? Math.round(
                                  (count / metrics.totalUniqueIncidents) * 100
                                )
                              : 0;
                          return (
                            <div
                              key={cat}
                              onClick={() =>
                                openFilteredExplorer({ category: cat })
                              }
                              className="cursor-pointer group space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#cbd2dc] group-hover:text-[#f5b82e] transition">
                                  {SWARM_CATEGORY_META[cat].shortLabel}
                                </span>
                                <span className="font-mono text-[#8a94a6]">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-white/[0.05]">
                                <div
                                  className="h-full bg-[#f5b82e]"
                                  style={{
                                    width: `${Math.max(
                                      pct,
                                      count > 0 ? 4 : 0
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[#0c1018] border border-white/[0.08] p-6 space-y-4">
                      <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8] border-b border-white/[0.07] pb-3">
                        :: SEVERITY DISTRIBUTION
                      </h2>
                      <div className="grid grid-cols-5 gap-2">
                        {(Object.keys(SEVERITY_META) as SeverityLevel[]).map(
                          (sev) => (
                            <div
                              key={sev}
                              onClick={() =>
                                openFilteredExplorer({ severity: sev })
                              }
                              className="p-2.5 bg-[#080a0f] hover:bg-white/[0.04] border border-white/[0.06] cursor-pointer text-center transition"
                            >
                              <span className="text-[10px] font-mono text-[#8a94a6] block">
                                {SEVERITY_META[sev].code}
                              </span>
                              <span className="font-display text-lg font-semibold text-[#f3f5f8] block my-0.5">
                                {severityBreakdown[sev] || 0}
                              </span>
                              <span className="text-[10px] text-[#8a94a6] block truncate">
                                {SEVERITY_META[sev].label}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW: INTELLIGENCE FEED & INCIDENT EXPLORER                  */}
            {/* ============================================================ */}
            {(activeTab === 'feed' || activeTab === 'explorer') && (
              <LiveIntelligenceFeed
                mode={mode}
                initialCategory={activeTab === 'explorer' ? drillCategory : ''}
                initialSeverity={activeTab === 'explorer' ? drillSeverity : ''}
                initialVerification={
                  activeTab === 'explorer' ? drillVerification : ''
                }
                initialCountry={activeTab === 'explorer' ? drillCountry : ''}
                initialConfirmedSwarmOnly={
                  activeTab === 'explorer' ? drillConfirmedSwarmOnly : false
                }
                pollIntervalSec={pollIntervalSec}
                sources={sources}
                onSelectIncident={(inc) => openIncidentInvestigation(inc)}
                onTriggerLiveIngest={() => handleTriggerLiveIngest()}
                ingesting={ingesting}
              />
            )}

            {/* ============================================================ */}
            {/* VIEW: 2D TACTICAL MAP                                        */}
            {/* ============================================================ */}
            {activeTab === 'map' && (
              <div className="max-w-6xl mx-auto space-y-6 pb-12">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-[#8a94a6] uppercase mb-1">
                      <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
                      <span>GEOSPATIAL TELEMETRY</span>
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8]">
                      2D Tactical Map
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('globe')}
                    className="px-4 py-2 bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] font-display text-xs font-semibold tracking-[0.16em] uppercase cursor-pointer"
                  >
                    Return to 3D Atlas
                  </button>
                </div>

                <GlobalIncidentMap
                  incidents={incidents}
                  compact={false}
                  onSelectIncident={(inc) => openIncidentInvestigation(inc)}
                  onFilterByCountry={(code) =>
                    openFilteredExplorer({ country: code })
                  }
                />
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW: THREAT ANALYTICS                                       */}
            {/* ============================================================ */}
            {activeTab === 'analytics' && (
              <ThreatAnalyticsPanel
                mode={mode}
                onSelectCategory={(cat) =>
                  openFilteredExplorer({ category: cat })
                }
                onSelectSeverity={(sev) =>
                  openFilteredExplorer({ severity: sev })
                }
                onSelectIncidentSlug={(slug) =>
                  openIncidentInvestigation(slug)
                }
              />
            )}

            {/* ============================================================ */}
            {/* VIEW: ACTORS & ORGANIZATIONS                                 */}
            {/* ============================================================ */}
            {activeTab === 'entities' && (
              <OrganizationsAndActorsPanel
                mode={mode}
                onSelectIncidentSlug={(slug) =>
                  openIncidentInvestigation(slug)
                }
              />
            )}

            {/* ============================================================ */}
            {/* VIEW: SOURCES & RELIABILITY                                  */}
            {/* ============================================================ */}
            {activeTab === 'sources' && (
              <SourcesAndReliabilityPanel
                mode={mode}
                onTriggerSourceIngest={(slug) => handleTriggerLiveIngest(slug)}
                ingesting={ingesting}
              />
            )}

            {/* ============================================================ */}
            {/* VIEW: WATCHLISTS                                             */}
            {/* ============================================================ */}
            {activeTab === 'watchlists' && (
              <WatchlistsPanel
                mode={mode}
                onSelectIncidentSlug={(slug) =>
                  openIncidentInvestigation(slug)
                }
              />
            )}

            {/* ============================================================ */}
            {/* VIEW: SYSTEM HEALTH                                          */}
            {/* ============================================================ */}
            {activeTab === 'health' && <SystemHealthPanel mode={mode} />}

            {/* ============================================================ */}
            {/* VIEW: SETTINGS                                               */}
            {/* ============================================================ */}
            {activeTab === 'settings' && (
              <SettingsPanel
                mode={mode}
                onChangeMode={handleModeChange}
                pollIntervalSec={pollIntervalSec}
                onChangePollInterval={setPollIntervalSec}
                onReseedDemo={handleReseedDemo}
              />
            )}
          </main>
        )}

        {/* ================================================================ */}
        {/* CONTEXTUAL INTELLIGENCE DOSSIER DRAWER                           */}
        {/* ================================================================ */}
        {dossierIncident && (
          <div className="fixed inset-0 top-14 z-40 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => setDossierIncident(null)}
              title="Click outside to close dossier"
            />
            <div className="w-full max-w-5xl h-full bg-[#080a0f] border-l border-white/12 overflow-y-auto px-6 sm:px-10 py-8 shadow-2xl">
              <IncidentInvestigationView
                incident={dossierIncident}
                mode={mode}
                onBack={() => setDossierIncident(null)}
                onSelectRelatedIncident={(slug) =>
                  openIncidentInvestigation(slug)
                }
                onIncidentUpdated={(updated) => {
                  setDossierIncident(updated);
                  refreshWorkspaceData(mode);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
