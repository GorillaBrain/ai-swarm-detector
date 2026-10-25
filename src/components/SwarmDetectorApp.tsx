'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  ExternalLink,
  FileSearch,
  Globe,
  LayoutDashboard,
  Menu,
  Radio,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  EnrichedIncident,
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
  LifecycleBadge,
  SeverityBadge,
  SwarmConfirmationBadge,
  VerificationBadge,
} from './IntelligenceBadges';
import { GlobalIncidentMap } from './GlobalIncidentMap';
import { LiveIntelligenceFeed } from './LiveIntelligenceFeed';
import { IncidentInvestigationView } from './IncidentInvestigationView';
import {
  OrganizationsAndActorsPanel,
  SettingsPanel,
  SourcesAndReliabilityPanel,
  SystemHealthPanel,
  ThreatAnalyticsPanel,
  WatchlistsPanel,
} from './OperationsPanels';

export type NavTab =
  | 'overview'
  | 'feed'
  | 'map'
  | 'explorer'
  | 'analytics'
  | 'entities'
  | 'sources'
  | 'watchlists'
  | 'health'
  | 'settings'
  | 'investigation';

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
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mode, setMode] = useState<OperatingMode>('live');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [analytics, setAnalytics] =
    useState<Record<string, unknown>>(initialAnalytics);
  const [incidents, setIncidents] =
    useState<EnrichedIncident[]>(initialIncidents);
  const [sources, setSources] = useState<Source[]>(initialSources);

  const [selectedIncident, setSelectedIncident] =
    useState<EnrichedIncident | null>(null);
  const [previousTab, setPreviousTab] = useState<NavTab>('overview');

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
  const [utcNow, setUtcNow] = useState<string>(
    new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  );

  // Live UTC Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcNow(
        new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Reload when operating mode changes
  const handleModeChange = async (newMode: OperatingMode) => {
    setMode(newMode);
    setSelectedIncident(null);
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
          `Ingestion completed: checked ${data.sourcesChecked} source(s), retrieved ${data.totalRetrieved} records, created ${data.newIncidentsCreated} new incident(s), correlated ${data.existingIncidentsCorroborated} corroboration(s), skipped ${data.totalDuplicates} duplicate(s).`
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
      setIngestBannerMsg('Synthetic Demo Database reset to clean baseline.');
    } finally {
      setIngesting(false);
    }
  };

  const openIncidentInvestigation = async (
    incOrSlug: EnrichedIncident | string
  ) => {
    const slugOrId =
      typeof incOrSlug === 'string' ? incOrSlug : incOrSlug.id;
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(slugOrId)}?mode=${mode}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.incident) {
          if (activeTab !== 'investigation') {
            setPreviousTab(activeTab);
          }
          setSelectedIncident(data.incident);
          setActiveTab('investigation');
          return;
        }
      }
    } catch {
      // Fallback to inline object if available
    }
    if (typeof incOrSlug !== 'string') {
      if (activeTab !== 'investigation') {
        setPreviousTab(activeTab);
      }
      setSelectedIncident(incOrSlug);
      setActiveTab('investigation');
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
  const timelineSeries = (analytics.timelineSeries || []) as Array<{
    period: string;
    incidents: number;
    confirmedSwarms: number;
    reports: number;
  }>;
  const recentRuns = (analytics.recentRuns || []) as SourceRun[];

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'feed',
      label: 'Live Intelligence Feed',
      icon: Radio,
      badge: metrics.totalUniqueIncidents,
    },
    { id: 'map', label: 'Global Incident Map', icon: Globe },
    { id: 'explorer', label: 'Incident Explorer', icon: FileSearch },
    { id: 'analytics', label: 'Threat Analytics', icon: BarChart3 },
    { id: 'entities', label: 'Organizations & Actors', icon: Building2 },
    {
      id: 'sources',
      label: 'Sources & Reliability',
      icon: Compass,
      badge: `${systemStatus.healthySourcesCount || 0}/${
        systemStatus.monitoredSourcesCount || 0
      }`,
    },
    { id: 'watchlists', label: 'Watchlists', icon: Bell },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const maxChartVal = Math.max(
    1,
    ...timelineSeries.map((t) => t.incidents)
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* TOP STATUS BAR (Section 5) */}
      <header className="sticky top-0 z-30 bg-[#090d14]/95 backdrop-blur border-b border-slate-800/90 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="lg:hidden p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
              aria-label="Toggle navigation sidebar"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

            <div
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded bg-cyan-950 border border-cyan-600/70 flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tracking-wider text-sm text-slate-50">
                    AI SWARM DETECTOR
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    SOC-INTEL v1.0
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 hidden md:block">
                  Global AI Agent Threat Intelligence & Public Incident Monitoring
                </p>
              </div>
            </div>
          </div>

          {/* Operational Telemetry Indicators */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-mono">
            {/* System Status */}
            <div
              title={`Database: ${systemStatus.databaseEngine}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus.operational
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">
                STATUS:{' '}
                <strong className="text-emerald-300">
                  {systemStatus.operational ? 'OPERATIONAL' : 'DEGRADED'}
                </strong>
              </span>
            </div>

            {/* Last Ingestion */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                LAST INGEST:{' '}
                {systemStatus.lastSuccessfulIngestionAt
                  ? systemStatus.lastSuccessfulIngestionAt
                      .replace('T', ' ')
                      .slice(11, 19) + ' UTC'
                  : 'READY'}
              </span>
            </div>

            {/* Monitored Sources & Queue */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                SOURCES: {systemStatus.healthySourcesCount}/
                {systemStatus.monitoredSourcesCount} • QUEUE:{' '}
                {systemStatus.pendingQueueCount ?? 0}
              </span>
            </div>

            {/* Live UTC Clock */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300">
              <Clock className="w-3.5 h-3.5" />
              <span>{utcNow}</span>
            </div>

            {/* Operating Mode Switcher */}
            <div className="inline-flex rounded border border-slate-800 bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() => handleModeChange('live')}
                className={`px-2 py-0.5 rounded transition ${
                  mode === 'live'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/70'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LIVE
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('demo')}
                className={`px-2 py-0.5 rounded transition ${
                  mode === 'demo'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/70'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DEMO
              </button>
            </div>

            {/* Manual Poll Trigger */}
            {mode === 'live' && (
              <button
                type="button"
                disabled={ingesting}
                onClick={() => handleTriggerLiveIngest()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`}
                />
                <span>{ingesting ? 'Ingesting...' : 'Ingest Now'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DEMO MODE SEPARATION BANNER (Section 17) */}
      {mode === 'demo' && (
        <div className="bg-amber-950/95 border-b border-amber-500/80 px-4 py-2 text-xs font-mono text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>SYNTHETIC DEMO MODE ACTIVE:</strong> Displaying isolated synthetic test fixtures (including benign multi-agent research and false-positive ordinary botnet fixtures). Synthetic records are strictly separated from Live Mode intelligence.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleModeChange('live')}
            className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-semibold"
          >
            Switch to Live Intelligence Mode
          </button>
        </div>
      )}

      {/* Ingestion Result Toast Banner */}
      {ingestBannerMsg && (
        <div className="bg-cyan-950/90 border-b border-cyan-700 px-4 py-2 text-xs font-mono text-cyan-200 flex items-center justify-between">
          <span>{ingestBannerMsg}</span>
          <button
            type="button"
            onClick={() => setIngestBannerMsg(null)}
            className="text-cyan-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* PERSISTENT SIDEBAR NAVIGATION (Section 4) */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-64 shrink-0 bg-[#090d14] border-r border-slate-800/90 flex flex-col justify-between p-3`}
        >
          <div className="space-y-1">
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Intelligence Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (activeTab === 'investigation' && previousTab === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition ${
                    isActive
                      ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Epistemic Principle Footer Card */}
          <div className="mt-6 p-3 rounded bg-slate-950 border border-slate-800/90 space-y-1.5 text-[11px]">
            <div className="font-mono uppercase text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>OSINT Verification Standard</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Monitors publicly reported AI agent and swarm incidents. Separates occurrence date, publication date, and discovery time.
            </p>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-[10px] text-slate-500">
              Classifier:{' '}
              {systemStatus.aiKeyConfigured
                ? 'Gemini 3.8 Flash'
                : 'Deterministic Rule Engine v1'}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ============================================================== */}
          {/* VIEW 1: OVERVIEW DASHBOARD (Section 5)                         */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 7 Calculated Intelligence Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
                <div
                  onClick={() => openFilteredExplorer({})}
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    1. Unique Incidents
                  </span>
                  <div className="text-2xl font-mono font-bold text-slate-50 mt-1">
                    {metrics.totalUniqueIncidents ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">
                    All stored records →
                  </span>
                </div>

                <div
                  onClick={() => openFilteredExplorer({})}
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    2. New / Ingested (24h)
                  </span>
                  <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
                    {metrics.newLast24h ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Rolling 24h window
                  </span>
                </div>

                <div
                  onClick={() =>
                    openFilteredExplorer({ confirmedSwarmOnly: true })
                  }
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    3. Confirmed AI Swarms
                  </span>
                  <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
                    {metrics.confirmedSwarmCount ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">
                    Multi-agent documented →
                  </span>
                </div>

                <div
                  onClick={() =>
                    openFilteredExplorer({ verification: 'suspected' })
                  }
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-amber-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    4. Suspected / Unverified
                  </span>
                  <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                    {metrics.suspectedOrUnverifiedCount ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Awaiting corroboration
                  </span>
                </div>

                <div
                  onClick={() => openFilteredExplorer({ severity: 'critical' })}
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-red-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    5. High / Critical Sev
                  </span>
                  <div className="text-2xl font-mono font-bold text-red-400 mt-1">
                    {metrics.highOrCriticalCount ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-red-300">
                    SEV-1 & SEV-2 cases →
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('sources')}
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    6. Active Sources
                  </span>
                  <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
                    {metrics.activeSourcesCount ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {systemStatus.healthySourcesCount} healthy connectors
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('analytics')}
                  className="bg-[#0b0f17] hover:bg-[#0f1521] border border-slate-800/90 hover:border-cyan-700/60 rounded-lg p-3.5 cursor-pointer transition"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    7. Primary Evidence
                  </span>
                  <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
                    {metrics.primaryEvidencePct ?? 0}%
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Direct vendor/CERT/lab
                  </span>
                </div>
              </div>

              {/* Panel 1: Global Incident Map */}
              <GlobalIncidentMap
                incidents={incidents}
                compact
                onSelectIncident={(inc) => openIncidentInvestigation(inc)}
                onFilterByCountry={(code) =>
                  openFilteredExplorer({ country: code })
                }
              />

              {/* Panels 2, 3, 4, 5: Chronological Feed + Analytics Breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Left 7 Cols: Chronological Intelligence Feed (Panel 2) */}
                <div className="xl:col-span-7 bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-100">
                        Latest Publicly Reported AI Swarm & Agent Incidents
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('feed')}
                      className="text-xs font-mono text-cyan-400 hover:underline"
                    >
                      Open Full Live Feed →
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                    {incidents.slice(0, 8).map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => openIncidentInvestigation(inc)}
                        className="p-3 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800/90 hover:border-cyan-700/50 cursor-pointer transition space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <SeverityBadge severity={inc.severity} />
                            <VerificationBadge
                              status={inc.verification_status}
                              independentSources={inc.independent_source_count}
                            />
                            <CategoryBadge
                              category={inc.primary_category}
                              short
                            />
                          </div>
                          <LifecycleBadge lifecycle={inc.record_lifecycle} />
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-slate-100">
                          {inc.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {inc.summary}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
                          <span>
                            Published:{' '}
                            {inc.first_published_at
                              .replace('T', ' ')
                              .slice(0, 16)}{' '}
                            UTC
                          </span>
                          <span className="text-cyan-400">
                            {inc.sources[0]?.source.name || 'Public Source'} →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 5 Cols: Panels 3, 4, 5 (Reports Over Time, Categories, Severity) */}
                <div className="xl:col-span-5 space-y-5">
                  {/* Panel 3: Reports Over Time */}
                  <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-semibold text-slate-100">
                        Incident Reports Over Time (By Publication Date)
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('analytics')}
                        className="text-[11px] font-mono text-cyan-400 hover:underline"
                      >
                        Full Analytics →
                      </button>
                    </div>
                    <div className="flex items-end gap-1.5 h-28 pt-2 px-1 border-b border-slate-800">
                      {timelineSeries.slice(-16).map((b) => {
                        const h = Math.max(
                          6,
                          Math.round((b.incidents / maxChartVal) * 90)
                        );
                        return (
                          <div
                            key={b.period}
                            onClick={() => setActiveTab('analytics')}
                            title={`${b.period}: ${b.incidents} unique incidents`}
                            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                          >
                            <div
                              className="w-full bg-cyan-500/80 hover:bg-cyan-400 rounded-t"
                              style={{ height: `${h}px` }}
                            />
                            <span className="text-[9px] font-mono text-slate-500 truncate max-w-[36px]">
                              {b.period.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Panel 4: Breakdown of Incident Categories */}
                  <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-2.5">
                    <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                      Taxonomy Category Breakdown
                    </h3>
                    {(Object.keys(SWARM_CATEGORY_META) as SwarmCategory[]).map(
                      (cat) => {
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
                            className="cursor-pointer group"
                          >
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-slate-300 group-hover:text-cyan-300">
                                {SWARM_CATEGORY_META[cat].shortLabel}
                              </span>
                              <span className="font-mono text-slate-400">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                              <div
                                className="h-full bg-cyan-500/80"
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

                  {/* Panel 5: Severity Distribution */}
                  <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                      Severity Distribution
                    </h3>
                    <div className="grid grid-cols-5 gap-2 pt-1">
                      {(Object.keys(SEVERITY_META) as SeverityLevel[]).map(
                        (sev) => (
                          <div
                            key={sev}
                            onClick={() =>
                              openFilteredExplorer({ severity: sev })
                            }
                            className="p-2 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 cursor-pointer text-center"
                          >
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {SEVERITY_META[sev].code}
                            </span>
                            <span className="text-base font-mono font-bold text-slate-100">
                              {severityBreakdown[sev] || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {SEVERITY_META[sev].label}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panels 6, 7, 8: Source Reliability Summary, Recently Updated/Merged Investigations, Ingestion Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Panel 6: Source Reliability Summary */}
                <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Source Reliability & Health Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sources')}
                      className="text-[11px] font-mono text-cyan-400 hover:underline"
                    >
                      Inspect All →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {sources.slice(0, 7).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveTab('sources')}
                        className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-slate-700"
                      >
                        <div className="truncate pr-2">
                          <span className="text-slate-200 font-medium">
                            {s.name}
                          </span>
                          <span className="block text-[10px] font-mono text-slate-400">
                            {s.source_type.toUpperCase()} • Status: {s.status}
                          </span>
                        </div>
                        <span className="font-mono text-cyan-300 shrink-0">
                          {s.reliability_score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 7: Recently Updated / Corroborated Investigations */}
                <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Corroborated & Recently Updated Dossiers
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {incidents
                      .filter(
                        (i) =>
                          i.record_lifecycle === 'merged' ||
                          i.record_lifecycle === 'updated' ||
                          i.independent_source_count > 1
                      )
                      .slice(0, 5)
                      .map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => openIncidentInvestigation(inc)}
                          className="p-2.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 cursor-pointer text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <LifecycleBadge lifecycle={inc.record_lifecycle} />
                            <span className="font-mono text-[10px] text-cyan-300">
                              {inc.independent_source_count}x Corroborating Sources
                            </span>
                          </div>
                          <p className="text-slate-100 font-medium line-clamp-2">
                            {inc.title}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Panel 8: Ingestion & Processing Status Panel */}
                <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Ingestion & Processing Pipeline Log
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('health')}
                      className="text-[11px] font-mono text-cyan-400 hover:underline"
                    >
                      System Health →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[11px]">
                    {recentRuns.slice(0, 6).map((run) => (
                      <div
                        key={run.id}
                        className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="text-slate-200">
                            {run.source_name || run.source_id}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            +{run.records_accepted} accepted / {run.duplicates_detected} dup /{' '}
                            {run.irrelevant_filtered} filtered
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 ${
                            run.status === 'succeeded'
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2 & 4: LIVE INTELLIGENCE FEED & INCIDENT EXPLORER         */}
          {/* ============================================================== */}
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

          {/* ============================================================== */}
          {/* VIEW 3: GLOBAL INCIDENT MAP                                    */}
          {/* ============================================================== */}
          {activeTab === 'map' && (
            <GlobalIncidentMap
              incidents={incidents}
              compact={false}
              onSelectIncident={(inc) => openIncidentInvestigation(inc)}
              onFilterByCountry={(code) =>
                openFilteredExplorer({ country: code })
              }
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 5: THREAT ANALYTICS                                       */}
          {/* ============================================================== */}
          {activeTab === 'analytics' && (
            <ThreatAnalyticsPanel
              mode={mode}
              onSelectCategory={(cat) =>
                openFilteredExplorer({ category: cat })
              }
              onSelectSeverity={(sev) =>
                openFilteredExplorer({ severity: sev })
              }
              onSelectIncidentSlug={(slug) => openIncidentInvestigation(slug)}
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 6: ORGANIZATIONS & ACTORS                                 */}
          {/* ============================================================== */}
          {activeTab === 'entities' && (
            <OrganizationsAndActorsPanel
              mode={mode}
              onSelectIncidentSlug={(slug) => openIncidentInvestigation(slug)}
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 7: SOURCES & RELIABILITY                                  */}
          {/* ============================================================== */}
          {activeTab === 'sources' && (
            <SourcesAndReliabilityPanel
              mode={mode}
              onTriggerSourceIngest={(slug) => handleTriggerLiveIngest(slug)}
              ingesting={ingesting}
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 8: WATCHLISTS                                             */}
          {/* ============================================================== */}
          {activeTab === 'watchlists' && (
            <WatchlistsPanel
              mode={mode}
              onSelectIncidentSlug={(slug) => openIncidentInvestigation(slug)}
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 9: SYSTEM HEALTH                                          */}
          {/* ============================================================== */}
          {activeTab === 'health' && <SystemHealthPanel mode={mode} />}

          {/* ============================================================== */}
          {/* VIEW 10: SETTINGS                                              */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <SettingsPanel
              mode={mode}
              onChangeMode={handleModeChange}
              pollIntervalSec={pollIntervalSec}
              onChangePollInterval={setPollIntervalSec}
              onReseedDemo={handleReseedDemo}
            />
          )}

          {/* ============================================================== */}
          {/* VIEW 11: INCIDENT INVESTIGATION DOSSIER                        */}
          {/* ============================================================== */}
          {activeTab === 'investigation' && selectedIncident && (
            <IncidentInvestigationView
              incident={selectedIncident}
              mode={mode}
              onBack={() => setActiveTab(previousTab)}
              onSelectRelatedIncident={(slug) =>
                openIncidentInvestigation(slug)
              }
              onIncidentUpdated={(updated) => {
                setSelectedIncident(updated);
                refreshWorkspaceData(mode);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
