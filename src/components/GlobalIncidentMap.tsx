'use client';

import React, { useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  List,
  MapPin,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  EnrichedIncident,
  SEVERITY_META,
  SeverityLevel,
  SWARM_CATEGORY_META,
  SwarmCategory,
  VERIFICATION_META,
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
  const [zoom, setZoom] = useState<number>(1);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(
    null
  );

  const filteredIncidents = useMemo(() => {
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
      return true;
    });
  }, [incidents, categoryFilter, severityFilter, verificationFilter]);

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
    return (
      clusters.find((c) => c.key === selectedClusterKey) || clusters[0] || null
    );
  }, [clusters, selectedClusterKey]);

  return (
    <div className="bg-[#0c1018] border border-white/10">
      {/* Header & Controls */}
      <div className="px-5 py-3.5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
          <div>
            <h3 className="font-display text-xs font-semibold tracking-[0.16em] uppercase text-[#f3f5f8]">
              2D CARTOGRAPHIC PROJECTION
            </h3>
            <p className="text-xs text-[#8a94a6]">
              {clusters.reduce((acc, c) => acc + c.incidents.length, 0)}{' '}
              attributed incidents across {clusters.length} jurisdictions •{' '}
              {unmappedIncidents.length} unmapped/global
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!compact && (
            <>
              <select
                aria-label="Filter map by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#080a0f] border border-white/10 px-2.5 py-1.5 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
              >
                <option value="all">All Categories</option>
                {Object.entries(SWARM_CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.shortLabel}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter map by severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#080a0f] border border-white/10 px-2.5 py-1.5 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
              >
                <option value="all">All Severities</option>
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.code} — {v.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter map by verification"
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="bg-[#080a0f] border border-white/10 px-2.5 py-1.5 text-[#cbd2dc] focus:outline-none focus:border-[#f5b82e]"
              >
                <option value="all">All Verification</option>
                {Object.entries(VERIFICATION_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="inline-flex border border-white/10 bg-[#080a0f]">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium'
                  : 'text-[#8a94a6] hover:text-[#f3f5f8]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium'
                  : 'text-[#8a94a6] hover:text-[#f3f5f8]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Jurisdictions ({clusters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unmapped')}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'unmapped'
                  ? 'bg-[#f5b82e] text-[#080a0f] font-medium'
                  : 'text-[#8a94a6] hover:text-[#f3f5f8]'
              }`}
            >
              <span>Unmapped ({unmappedIncidents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map Body */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 relative bg-[#080a0f] border-b lg:border-b-0 lg:border-r border-white/[0.08] overflow-hidden">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0c1018]/90 border border-white/10 p-1">
              <button
                type="button"
                title="Zoom In"
                onClick={() =>
                  setZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(1))))
                }
                className="p-1 text-[#cbd2dc] hover:text-white cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-[#8a94a6]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                title="Reset Zoom"
                onClick={() => setZoom(1)}
                className="p-1 text-[#cbd2dc] hover:text-white cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <svg
              viewBox="0 0 960 440"
              className="w-full h-[320px] sm:h-[380px] select-none"
              role="img"
              aria-label="Global AI Swarm Incident Map"
            >
              <defs>
                <pattern
                  id="map-grid"
                  width="48"
                  height="48"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 48 0 L 0 0 0 48"
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width="960" height="440" fill="#080a0f" />
              <rect width="960" height="440" fill="url(#map-grid)" />

              <g
                transform={`translate(${480 * (1 - zoom)}, ${220 * (1 - zoom)}) scale(${zoom})`}
              >
                {/* Reference equator & meridian */}
                <line
                  x1="0"
                  y1="244"
                  x2="960"
                  y2="244"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <line
                  x1="480"
                  y1="0"
                  x2="480"
                  y2="440"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />

                {/* Stylized Continental Landmasses */}
                <g
                  fill="#121722"
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeWidth="1"
                >
                  <path d="M 75,55 L 235,50 L 295,115 L 255,195 L 210,225 L 155,195 L 115,135 Z" />
                  <path d="M 235,235 L 325,255 L 345,335 L 295,415 L 255,390 L 230,295 Z" />
                  <path d="M 435,65 L 555,55 L 575,135 L 515,155 L 445,145 L 430,105 Z" />
                  <path d="M 440,165 L 555,165 L 595,245 L 560,365 L 495,375 L 455,275 L 425,215 Z" />
                  <path d="M 565,55 L 845,65 L 875,175 L 795,245 L 685,235 L 585,185 Z" />
                  <path d="M 745,295 L 865,295 L 880,375 L 775,385 L 735,345 Z" />
                </g>

                {/* Country Cluster Diamond Markers */}
                {clusters.map((cluster) => {
                  const { x, y } = projectToSvg(
                    cluster.latitude,
                    cluster.longitude
                  );
                  const isSelected = activeCluster?.key === cluster.key;
                  const size = Math.min(
                    16,
                    8 + Math.sqrt(cluster.incidents.length) * 2.5
                  );

                  const hasConfirmedSwarm = cluster.confirmedSwarmsCount > 0;
                  const strokeColor = isSelected
                    ? '#f5b82e'
                    : hasConfirmedSwarm
                      ? '#ef4444'
                      : '#cbd2dc';

                  const fillColor = isSelected
                    ? 'rgba(245, 184, 46, 0.25)'
                    : hasConfirmedSwarm
                      ? 'rgba(239, 68, 68, 0.22)'
                      : 'rgba(203, 210, 220, 0.12)';

                  return (
                    <g
                      key={cluster.key}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => setSelectedClusterKey(cluster.key)}
                      className="cursor-pointer"
                    >
                      <polygon
                        points={`0,${-size} ${size},0 0,${size} ${-size},0`}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2 : 1.2}
                      />
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        fill="#f3f5f8"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {cluster.incidents.length}
                      </text>
                      <text
                        textAnchor="middle"
                        dy={size + 12}
                        fill="#8a94a6"
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
            <div className="px-4 py-2.5 bg-[#0c1018] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8a94a6]">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#f5b82e]" />
                  <span>Selected Jurisdiction</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#ef4444]" />
                  <span>Confirmed Swarm Activity</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 border border-[#cbd2dc]" />
                  <span>Reported Incidents</span>
                </span>
              </div>
              <span className="text-[11px]">
                Verified geographic attribution only
              </span>
            </div>
          </div>

          {/* Selected Cluster Inspector Panel */}
          <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#0c1018] max-h-[430px] overflow-y-auto">
            {activeCluster ? (
              <div>
                <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-display font-semibold text-[#f3f5f8]">
                      <MapPin className="w-4 h-4 text-[#f5b82e]" />
                      <span>
                        {activeCluster.countryName} ({activeCluster.countryCode})
                      </span>
                    </div>
                    <p className="text-xs text-[#8a94a6] mt-1">
                      {activeCluster.incidents.length} incident(s) •{' '}
                      {activeCluster.confirmedSwarmsCount} confirmed swarm(s)
                    </p>
                  </div>
                  {onFilterByCountry && (
                    <button
                      type="button"
                      onClick={() =>
                        onFilterByCountry(activeCluster.countryCode)
                      }
                      className="px-2.5 py-1 text-xs bg-white/[0.05] hover:bg-white/10 text-[#f5b82e] border border-white/10 cursor-pointer"
                    >
                      Explore All
                    </button>
                  )}
                </div>

                <div className="mt-3 divide-y divide-white/[0.06]">
                  {activeCluster.incidents.slice(0, 6).map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className="py-3 hover:bg-white/[0.02] cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <SeverityBadge severity={inc.severity} />
                        <span className="font-mono text-[11px] text-[#8a94a6]">
                          {new Date(inc.first_published_at)
                            .toISOString()
                            .slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#f3f5f8] line-clamp-2">
                        {inc.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#8a94a6] text-xs">
                No geographically attributed incidents match the current filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accessible Jurisdiction Table */}
      {viewMode === 'list' && (
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[#8a94a6] font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Jurisdiction</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Incidents</th>
                <th className="py-2.5 px-3">Confirmed Swarms</th>
                <th className="py-2.5 px-3">Highest Severity</th>
                <th className="py-2.5 px-3">Latest Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {clusters.map((c) => (
                <tr
                  key={c.key}
                  className="hover:bg-white/[0.03] cursor-pointer"
                  onClick={() => {
                    setSelectedClusterKey(c.key);
                    setViewMode('map');
                  }}
                >
                  <td className="py-3 px-3 font-medium text-[#f3f5f8]">
                    {c.countryName} ({c.countryCode})
                  </td>
                  <td className="py-3 px-3 text-[#8a94a6]">{c.regionName}</td>
                  <td className="py-3 px-3 font-mono text-[#f3f5f8]">
                    {c.incidents.length}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#ef4444]">
                    {c.confirmedSwarmsCount}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={c.highestSeverity} />
                  </td>
                  <td className="py-3 px-3 text-[#cbd2dc] max-w-md truncate">
                    {c.incidents[0]?.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unmapped / Global View */}
      {viewMode === 'unmapped' && (
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#8a94a6]">
            AI Swarm Detector never fabricates coordinates. The{' '}
            {unmappedIncidents.length} incident(s) below are global in scope or
            lack verified geographic attribution in public reporting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
            {unmappedIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className="p-4 border border-white/[0.07] bg-[#080a0f] hover:border-[#f5b82e]/40 cursor-pointer flex flex-col justify-between gap-2 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={inc.severity} />
                    <VerificationBadge status={inc.verification_status} />
                    <CategoryBadge category={inc.primary_category} short />
                  </div>
                  <p className="text-xs font-medium text-[#f3f5f8]">
                    {inc.title}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#8a94a6]">
                  <span>
                    {inc.location_precision === 'global'
                      ? 'Global / Multi-Region'
                      : 'Unspecified Location'}
                  </span>
                  <span className="text-[#f5b82e] inline-flex items-center gap-1">
                    Dossier <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
