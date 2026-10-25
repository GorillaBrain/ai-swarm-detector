'use client';

import React, { useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Filter,
  Globe,
  List,
  MapPin,
  Maximize2,
  Minimize2,
  ShieldAlert,
} from 'lucide-react';
import {
  EnrichedIncident,
  SEVERITY_META,
  SeverityLevel,
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

interface GlobalIncidentMapProps {
  incidents: EnrichedIncident[];
  compact?: boolean;
  onSelectIncident: (incident: EnrichedIncident) => void;
  onFilterByCountry?: (countryCode: string) => void;
}

interface GeoCluster {
  key: string;
  countryCode: string;
  countryName: string;
  regionName: string;
  latitude: number;
  longitude: number;
  incidents: EnrichedIncident[];
  highestSeverity: SeverityLevel;
  confirmedSwarmsCount: number;
}

/**
 * Converts latitude (-60..75) and longitude (-180..180) to SVG viewport coordinates (960 x 440)
 */
function projectToSvg(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 960;
  const clampedLat = Math.max(-60, Math.min(75, lat));
  const y = ((75 - clampedLat) / 135) * 440;
  return { x, y };
}

export function GlobalIncidentMap({
  incidents,
  compact = false,
  onSelectIncident,
  onFilterByCountry,
}: GlobalIncidentMapProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'unmapped'>('map');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(
    null
  );

  const filteredIncidents = useMemo(() => {
    const nowMs = Date.now();
    return incidents.filter((inc) => {
      if (
        categoryFilter !== 'all' &&
        inc.primary_category !== categoryFilter &&
        !inc.categories.includes(categoryFilter as SwarmCategory)
      ) {
        return false;
      }
      if (severityFilter !== 'all' && inc.severity !== severityFilter) {
        return false;
      }
      if (
        verificationFilter !== 'all' &&
        inc.verification_status !== verificationFilter
      ) {
        return false;
      }
      if (daysFilter > 0) {
        const cutoff = nowMs - daysFilter * 24 * 60 * 60 * 1000;
        if (Date.parse(inc.first_published_at) < cutoff) return false;
      }
      return true;
    });
  }, [
    incidents,
    categoryFilter,
    severityFilter,
    verificationFilter,
    daysFilter,
  ]);

  const { clusters, unmappedIncidents } = useMemo(() => {
    const clusterMap = new Map<string, GeoCluster>();
    const unmapped: EnrichedIncident[] = [];

    for (const inc of filteredIncidents) {
      if (
        !inc.country_code ||
        inc.latitude === null ||
        inc.longitude === null ||
        inc.location_precision === 'unknown' ||
        inc.location_precision === 'global'
      ) {
        unmapped.push(inc);
        continue;
      }

      const key = inc.country_code;
      const existing = clusterMap.get(key);
      if (!existing) {
        clusterMap.set(key, {
          key,
          countryCode: inc.country_code,
          countryName: inc.country_name || inc.country_code,
          regionName: inc.region_name || 'Global',
          latitude: inc.latitude,
          longitude: inc.longitude,
          incidents: [inc],
          highestSeverity: inc.severity,
          confirmedSwarmsCount: inc.is_confirmed_swarm ? 1 : 0,
        });
      } else {
        existing.incidents.push(inc);
        if (inc.is_confirmed_swarm) existing.confirmedSwarmsCount += 1;
        if (
          SEVERITY_META[inc.severity].rank >
          SEVERITY_META[existing.highestSeverity].rank
        ) {
          existing.highestSeverity = inc.severity;
        }
      }
    }

    return {
      clusters: Array.from(clusterMap.values()).sort(
        (a, b) => b.incidents.length - a.incidents.length
      ),
      unmappedIncidents: unmapped,
    };
  }, [filteredIncidents]);

  const activeCluster = useMemo(() => {
    if (!selectedClusterKey) return clusters[0] || null;
    return clusters.find((c) => c.key === selectedClusterKey) || clusters[0] || null;
  }, [clusters, selectedClusterKey]);

  return (
    <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg overflow-hidden">
      {/* Header & Controls */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#090d14]">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
              Global Geolocation & Attribution Map
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {clusters.reduce((acc, c) => acc + c.incidents.length, 0)} mapped across{' '}
              {clusters.length} countries • {unmappedIncidents.length} global/unmapped (no coordinates invented)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!compact && (
            <>
              <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-xs">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  aria-label="Filter map by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                >
                  <option value="all" className="bg-slate-950">All Categories</option>
                  {Object.entries(SWARM_CATEGORY_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-slate-950">
                      {v.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              <select
                aria-label="Filter map by severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all" className="bg-slate-950">All Severities</option>
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <option key={k} value={k} className="bg-slate-950">
                    {v.code} {v.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter map by verification"
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all" className="bg-slate-950">All Verification</option>
                {Object.entries(VERIFICATION_META).map(([k, v]) => (
                  <option key={k} value={k} className="bg-slate-950">
                    {v.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter map by time window"
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
                className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value={0} className="bg-slate-950">All Time</option>
                <option value={7} className="bg-slate-950">Last 7 Days</option>
                <option value={30} className="bg-slate-950">Last 30 Days</option>
                <option value={90} className="bg-slate-950">Last 90 Days</option>
              </select>
            </>
          )}

          <div className="inline-flex rounded border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                viewMode === 'map'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                viewMode === 'list'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Accessible List ({clusters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unmapped')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                viewMode === 'unmapped'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Unmapped / Global ({unmappedIncidents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Interactive Tactical Vector Map */}
          <div className="lg:col-span-8 relative bg-[#06090f] border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded p-1">
              <button
                type="button"
                title="Zoom In"
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(1))))}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                title="Reset Zoom"
                onClick={() => setZoom(1)}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <svg
              viewBox="0 0 960 440"
              className="w-full h-[300px] sm:h-[360px] select-none"
              role="img"
              aria-label="Global AI Swarm Incident Map"
            >
              <defs>
                <pattern
                  id="soc-grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width="960" height="440" fill="#06090f" />
              <rect width="960" height="440" fill="url(#soc-grid)" />

              <g
                transform={`translate(${480 * (1 - zoom)}, ${220 * (1 - zoom)}) scale(${zoom})`}
              >
                {/* Equator & Tropics & Prime Meridian reference lines */}
                <line
                  x1="0"
                  y1="244"
                  x2="960"
                  y2="244"
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <line
                  x1="480"
                  y1="0"
                  x2="480"
                  y2="440"
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />

                {/* Stylized Continental Landmasses (Tactical SOC Wireframe) */}
                <g
                  fill="#0f172a"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                  opacity="0.95"
                >
                  {/* North America */}
                  <path d="M 75,55 L 235,50 L 295,115 L 255,195 L 210,225 L 155,195 L 115,135 Z" />
                  {/* South America */}
                  <path d="M 235,235 L 325,255 L 345,335 L 295,415 L 255,390 L 230,295 Z" />
                  {/* Europe */}
                  <path d="M 435,65 L 555,55 L 575,135 L 515,155 L 445,145 L 430,105 Z" />
                  {/* Africa */}
                  <path d="M 440,165 L 555,165 L 595,245 L 560,365 L 495,375 L 455,275 L 425,215 Z" />
                  {/* Asia */}
                  <path d="M 565,55 L 845,65 L 875,175 L 795,245 L 685,235 L 585,185 Z" />
                  {/* Oceania / Australia */}
                  <path d="M 745,295 L 865,295 L 880,375 L 775,385 L 735,345 Z" />
                </g>

                {/* Country Cluster Markers */}
                {clusters.map((cluster) => {
                  const { x, y } = projectToSvg(
                    cluster.latitude,
                    cluster.longitude
                  );
                  const isSelected = activeCluster?.key === cluster.key;
                  const radius = Math.min(
                    22,
                    9 + Math.sqrt(cluster.incidents.length) * 3.5
                  );

                  const strokeColor =
                    cluster.highestSeverity === 'critical'
                      ? '#ef4444'
                      : cluster.highestSeverity === 'high'
                        ? '#f97316'
                        : cluster.highestSeverity === 'medium'
                          ? '#f59e0b'
                          : '#22d3ee';

                  const fillColor =
                    cluster.highestSeverity === 'critical'
                      ? 'rgba(239, 68, 68, 0.28)'
                      : cluster.highestSeverity === 'high'
                        ? 'rgba(249, 115, 22, 0.28)'
                        : cluster.highestSeverity === 'medium'
                          ? 'rgba(245, 158, 11, 0.26)'
                          : 'rgba(34, 211, 238, 0.24)';

                  return (
                    <g
                      key={cluster.key}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => setSelectedClusterKey(cluster.key)}
                      className="cursor-pointer group"
                    >
                      {isSelected && (
                        <circle
                          r={radius + 7}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                      )}
                      <circle
                        r={radius}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2.4 : 1.5}
                      />
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        fill="#f8fafc"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {cluster.incidents.length}
                      </text>
                      <text
                        textAnchor="middle"
                        dy={radius + 12}
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {cluster.countryCode}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Legend Footer */}
            <div className="px-4 py-2 bg-[#080c13] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-400" />
                  SEV-1 Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500/80 border border-orange-400" />
                  SEV-2 High
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 border border-amber-300" />
                  SEV-3 Medium
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 border border-cyan-300" />
                  SEV-4/5 Low/Info
                </span>
              </div>
              <span>
                Country-centroid placement only when supported by source evidence
              </span>
            </div>
          </div>

          {/* Selected Cluster Inspector Panel */}
          <div className="lg:col-span-4 p-4 flex flex-col justify-between bg-[#0b0f17] max-h-[410px] overflow-y-auto">
            {activeCluster ? (
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {activeCluster.countryName} ({activeCluster.countryCode})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Region: {activeCluster.regionName} •{' '}
                      {activeCluster.incidents.length} reported incident(s) •{' '}
                      {activeCluster.confirmedSwarmsCount} confirmed swarm(s)
                    </p>
                  </div>
                  {onFilterByCountry && (
                    <button
                      type="button"
                      onClick={() => onFilterByCountry(activeCluster.countryCode)}
                      className="px-2 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded"
                    >
                      Filter Feed
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2.5">
                  {activeCluster.incidents.slice(0, 6).map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className="p-2.5 rounded border border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-cyan-700/50 cursor-pointer transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <SeverityBadge severity={inc.severity} />
                        <span className="text-[10px] font-mono text-slate-400">
                          {inc.location_basis === 'occurrence_location'
                            ? 'Occurrence / Origin'
                            : inc.location_basis === 'targeted_location'
                              ? 'Targeted Jurisdiction'
                              : 'Reporting Jurisdiction'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-100 line-clamp-2">
                        {inc.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>
                          {new Date(inc.first_published_at)
                            .toISOString()
                            .slice(0, 10)}
                        </span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No geographically attributed incidents match the current filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accessible List View */}
      {viewMode === 'list' && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-2 px-3">Country / ISO</th>
                <th className="py-2 px-3">Region</th>
                <th className="py-2 px-3">Incidents</th>
                <th className="py-2 px-3">Confirmed Swarms</th>
                <th className="py-2 px-3">Highest Severity</th>
                <th className="py-2 px-3">Latest Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {clusters.map((c) => (
                <tr
                  key={c.key}
                  className="hover:bg-slate-900/60 cursor-pointer"
                  onClick={() => {
                    setSelectedClusterKey(c.key);
                    setViewMode('map');
                  }}
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                    {c.countryName} ({c.countryCode})
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{c.regionName}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300">
                    {c.incidents.length}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-300">
                    {c.confirmedSwarmsCount}
                  </td>
                  <td className="py-2.5 px-3">
                    <SeverityBadge severity={c.highestSeverity} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">
                    {c.incidents[0]?.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unmapped / Global Scope View */}
      {viewMode === 'unmapped' && (
        <div className="p-4">
          <div className="mb-3 p-3 rounded bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Geolocation Integrity Policy:</strong> AI Swarm Detector never invents latitude or longitude. The {unmappedIncidents.length} incident(s) below are global in scope, theoretical/benchmark studies, or lack verified geographic attribution in public reporting.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto">
            {unmappedIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className="p-3 rounded border border-slate-800 bg-slate-900/40 hover:bg-slate-900 cursor-pointer flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <SeverityBadge severity={inc.severity} />
                    <VerificationBadge status={inc.verification_status} />
                    <CategoryBadge category={inc.primary_category} short />
                  </div>
                  <p className="text-xs font-medium text-slate-100">
                    {inc.title}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    Scope:{' '}
                    {inc.location_precision === 'global'
                      ? 'Global / Multi-Region'
                      : 'Location Unspecified'}
                  </span>
                  <span className="text-cyan-400">Open Dossier →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
