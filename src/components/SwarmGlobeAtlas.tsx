'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
  geoInterpolate,
} from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import {
  EnrichedIncident,
  OperatingMode,
  SEVERITY_META,
  SWARM_CATEGORY_META,
} from '@/lib/types';
import { buildGlobeSignals, GlobeSignal } from '@/lib/globe-signals';
import {
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Star,
  Volume2,
  X,
} from 'lucide-react';

interface SwarmGlobeAtlasProps {
  incidents: EnrichedIncident[];
  mode: OperatingMode;
  onOpenDossier: (incident: EnrichedIncident) => void;
  onOpenView: (tab: string) => void;
  onToggleWatchlist?: (incidentId: string) => void;
}

// Convert topojson world data into GeoJSON features
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countriesGeoJson = feature(worldData as any, (worldData as any).objects.countries) as any;
const graticule = geoGraticule();

export function SwarmGlobeAtlas({
  incidents,
  mode,
  onOpenDossier,
  onOpenView,
}: SwarmGlobeAtlasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation state [yaw, pitch, roll]
  const [rotation, setRotation] = useState<[number, number, number]>([-40, -25, 0]);
  const rotationRef = useRef<[number, number, number]>([-40, -25, 0]);
  rotationRef.current = rotation;

  const [scale, setScale] = useState<number>(250);
  const scaleRef = useRef<number>(250);
  scaleRef.current = scale;

  // Orbit & Swarm animation controls
  const [isOrbiting, setIsOrbiting] = useState<boolean>(true);
  const isOrbitingRef = useRef<boolean>(true);
  isOrbitingRef.current = isOrbiting;

  const [swarmSpeed, setSwarmSpeed] = useState<number>(100);
  const swarmSpeedRef = useRef<number>(100);
  swarmSpeedRef.current = swarmSpeed;

  // Selected incident & country
  const [selectedSignalId, setSelectedSignalId] = useState<string>('');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('Greenland');
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'world' | 'swarms' | 'watchlist' | 'recent'>('world');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Mouse drag & interaction tracking
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const particlePhaseRef = useRef<number>(0);

  // Smooth fly-to target rotation
  const targetRotationRef = useRef<[number, number, number] | null>(null);

  // Signals derived from incidents
  const signals = React.useMemo(() => buildGlobeSignals(incidents), [incidents]);

  // Set initial selected signal
  useEffect(() => {
    if (signals.length > 0 && !selectedSignalId) {
      setSelectedSignalId(signals[0].id);
      setSelectedCountryName(signals[0].countryName);
    }
  }, [signals, selectedSignalId]);

  const activeSignal = signals.find((s) => s.id === selectedSignalId) || signals[0] || null;
  const activeIncident = incidents.find((i) => i.id === activeSignal?.incidentId) || incidents[0] || null;

  // Filter signals for right sidebar list
  const filteredSignals = React.useMemo(() => {
    return signals.filter((s) => {
      if (activeTab === 'swarms' && !s.isConfirmedSwarm) return false;
      if (activeTab === 'watchlist' && !starredIds.has(s.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.countryName.toLowerCase().includes(q) ||
          s.countryCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [signals, activeTab, starredIds, searchQuery]);

  // Toggle star
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fly to target coordinate on globe
  const flyTo = useCallback((lat: number, lon: number) => {
    targetRotationRef.current = [-lon, -Math.max(-75, Math.min(75, lat)), 0];
  }, []);

  // Jump to next / prev signal
  const handleNextSignal = useCallback(() => {
    const list = filteredSignals.length > 0 ? filteredSignals : signals;
    const currentIndex = list.findIndex((s) => s.id === selectedSignalId);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextSignal = list[nextIndex];
    if (nextSignal) {
      setSelectedSignalId(nextSignal.id);
      setSelectedCountryName(nextSignal.countryName);
      flyTo(nextSignal.lat, nextSignal.lon);
    }
  }, [filteredSignals, signals, selectedSignalId, flyTo]);

  const handlePrevSignal = useCallback(() => {
    const list = filteredSignals.length > 0 ? filteredSignals : signals;
    const currentIndex = list.findIndex((s) => s.id === selectedSignalId);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    const prevSignal = list[prevIndex];
    if (prevSignal) {
      setSelectedSignalId(prevSignal.id);
      setSelectedCountryName(prevSignal.countryName);
      flyTo(prevSignal.lat, prevSignal.lon);
    }
  }, [filteredSignals, signals, selectedSignalId, flyTo]);

  const handleShuffle = () => {
    if (signals.length === 0) return;
    const randomIndex = Math.floor(Math.random() * signals.length);
    const sig = signals[randomIndex];
    setSelectedSignalId(sig.id);
    setSelectedCountryName(sig.countryName);
    flyTo(sig.lat, sig.lon);
  };

  // --------------------------------------------------------------------------
  // Main Canvas Rendering Loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Interpolate fly-to rotation smoothly
      if (targetRotationRef.current) {
        const cur = rotationRef.current;
        const tgt = targetRotationRef.current;
        const diffYaw = tgt[0] - cur[0];
        const diffPitch = tgt[1] - cur[1];

        // Shortest yaw path
        let dy = ((diffYaw + 180) % 360) - 180;
        if (dy < -180) dy += 360;

        const nextYaw = cur[0] + dy * 0.08;
        const nextPitch = cur[1] + diffPitch * 0.08;

        if (Math.abs(dy) < 0.2 && Math.abs(diffPitch) < 0.2) {
          rotationRef.current = tgt;
          targetRotationRef.current = null;
        } else {
          rotationRef.current = [nextYaw, nextPitch, 0];
        }
        setRotation(rotationRef.current);
      } else if (isOrbitingRef.current && !isDraggingRef.current) {
        // Continuous gentle auto-orbit
        const speedFactor = swarmSpeedRef.current / 100;
        const nextYaw = (rotationRef.current[0] + 0.12 * speedFactor) % 360;
        rotationRef.current = [nextYaw, rotationRef.current[1], 0];
      }

      // Advance particle animation phase
      particlePhaseRef.current = (particlePhaseRef.current + 0.012 * (swarmSpeedRef.current / 100)) % 1;

      const cx = width / 2;
      const cy = height / 2;
      const currentScale = scaleRef.current;

      const projection = geoOrthographic()
        .scale(currentScale)
        .translate([cx, cy])
        .rotate(rotationRef.current)
        .clipAngle(90);

      const path = geoPath(projection, ctx);

      // 1. Ocean Globe Disk with subtle radial gradient
      ctx.beginPath();
      ctx.arc(cx, cy, currentScale, 0, Math.PI * 2);
      const oceanGrad = ctx.createRadialGradient(
        cx - currentScale * 0.25,
        cy - currentScale * 0.25,
        currentScale * 0.1,
        cx,
        cy,
        currentScale
      );
      oceanGrad.addColorStop(0, '#0e1526');
      oceanGrad.addColorStop(0.7, '#080d1a');
      oceanGrad.addColorStop(1, '#040711');
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Atmospheric outer rim glow
      ctx.beginPath();
      ctx.arc(cx, cy, currentScale + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(70, 95, 145, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 2. Graticule Lines (Latitude & Longitude grid)
      ctx.beginPath();
      path(graticule());
      ctx.strokeStyle = 'rgba(38, 52, 78, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 3. Country Polygons
      const features = countriesGeoJson.features || [];
      const currentSelectedCountry = selectedCountryName;

      for (const feat of features) {
        const countryName = feat.properties?.name || '';
        const isHighlighted =
          countryName === currentSelectedCountry ||
          countryName === hoveredCountryName;

        ctx.beginPath();
        path(feat);

        if (isHighlighted) {
          // Vivid violet-lavender highlight matching Radio Atlas Greenland
          ctx.fillStyle = 'rgba(88, 76, 168, 0.48)';
          ctx.fill();
          ctx.strokeStyle = '#9d8df8';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#182133';
          ctx.fill();
          ctx.strokeStyle = '#2b374e';
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // 4. Swarm Attack Trajectories & Swarm Particle Streams
      // Render arcs for active signal or prominent attack vectors
      for (const sig of signals) {
        const isCurrent = sig.id === selectedSignalId;
        if (!isCurrent && !sig.targetLat) continue;

        const originLat = sig.lat;
        const originLon = sig.lon;
        const targetLat = sig.targetLat ?? sig.lat;
        const targetLon = sig.targetLon ?? (sig.lon + 45);

        // Compute great-circle interpolation
        const interpolator = geoInterpolate([originLon, originLat], [targetLon, targetLat]);

        // Draw great-circle trajectory arc
        ctx.beginPath();
        const numSteps = 40;
        let arcVisible = false;

        for (let i = 0; i <= numSteps; i++) {
          const t = i / numSteps;
          const [lon, lat] = interpolator(t);
          const pt = projection([lon, lat]);
          if (pt) {
            if (!arcVisible) {
              ctx.moveTo(pt[0], pt[1]);
              arcVisible = true;
            } else {
              ctx.lineTo(pt[0], pt[1]);
            }
          }
        }

        if (arcVisible) {
          ctx.strokeStyle = isCurrent
            ? 'rgba(239, 68, 68, 0.75)'
            : 'rgba(34, 211, 238, 0.4)';
          ctx.lineWidth = isCurrent ? 2 : 1.2;
          ctx.setLineDash(isCurrent ? [4, 3] : [2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated swarm agent particles streaming along the attack arc
          const numParticles = isCurrent ? 4 : 2;
          for (let p = 0; p < numParticles; p++) {
            const particleT = (particlePhaseRef.current + p / numParticles) % 1;
            const [pLon, pLat] = interpolator(particleT);
            const pt = projection([pLon, pLat]);
            if (pt) {
              ctx.beginPath();
              ctx.arc(pt[0], pt[1], isCurrent ? 3.5 : 2, 0, Math.PI * 2);
              ctx.fillStyle = isCurrent ? '#fca5a5' : '#a5f3fc';
              ctx.shadowColor = isCurrent ? '#ef4444' : '#22d3ee';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }

        // Concentric target impact rings on the area being attacked ("like the swarm is attacking certain area")
        if (isCurrent && sig.targetLat) {
          const targetPt = projection([targetLon, targetLat]);
          if (targetPt) {
            const pulse = (Date.now() % 1600) / 1600;
            const pulseRadius = 8 + pulse * 28;

            ctx.beginPath();
            ctx.arc(targetPt[0], targetPt[1], pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${1 - pulse})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(targetPt[0], targetPt[1], 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();

            // Target area crosshairs
            ctx.beginPath();
            ctx.moveTo(targetPt[0] - 10, targetPt[1]);
            ctx.lineTo(targetPt[0] + 10, targetPt[1]);
            ctx.moveTo(targetPt[0], targetPt[1] - 10);
            ctx.lineTo(targetPt[0], targetPt[1] + 10);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // 5. Signal Constellation Nodes (All incident locations as glowing dots)
      for (const sig of signals) {
        const pt = projection([sig.lon, sig.lat]);
        if (!pt) continue; // Behind the globe horizon

        const isSelected = sig.id === selectedSignalId;

        if (isSelected) {
          // Selected signal: pulsing concentric outer ring + central dot
          const pulse = (Date.now() % 1400) / 1400;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 6 + pulse * 14, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(167, 139, 250, ${1 - pulse})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#c4b5fd';
          ctx.shadowColor = '#8b5cf6';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Standard signal dot (crisp white/luminous as in Radio Atlas)
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2.2, 0, Math.PI * 2);
          ctx.fillStyle = sig.isConfirmedSwarm
            ? '#22d3ee'
            : sig.severity === 'critical'
              ? '#fca5a5'
              : '#f8fafc';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
          ctx.shadowBlur = 3;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [signals, selectedSignalId, selectedCountryName, hoveredCountryName]);

  // --------------------------------------------------------------------------
  // Mouse Drag / Touch Controls for Rotating Globe
  // --------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    targetRotationRef.current = null; // Cancel any active fly-to
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.35;
    const cur = rotationRef.current;
    const nextYaw = (cur[0] + dx * sensitivity) % 360;
    const nextPitch = Math.max(-85, Math.min(85, cur[1] - dy * sensitivity));

    rotationRef.current = [nextYaw, nextPitch, 0];
    setRotation(rotationRef.current);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.2;
    const nextScale = Math.max(160, Math.min(480, scaleRef.current + zoomDelta));
    scaleRef.current = nextScale;
    setScale(nextScale);
  };

  // Click on globe to pick nearest signal or country
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const projection = geoOrthographic()
      .scale(scaleRef.current)
      .translate([cx, cy])
      .rotate(rotationRef.current)
      .clipAngle(90);

    // Find nearest signal within 20px
    let nearestSig: GlobeSignal | null = null;
    let minDist = 20;

    for (const sig of signals) {
      const pt = projection([sig.lon, sig.lat]);
      if (!pt) continue;
      const dist = Math.hypot(pt[0] - mouseX, pt[1] - mouseY);
      if (dist < minDist) {
        minDist = dist;
        nearestSig = sig;
      }
    }

    if (nearestSig) {
      setSelectedSignalId(nearestSig.id);
      setSelectedCountryName(nearestSig.countryName);
      flyTo(nearestSig.lat, nearestSig.lon);
      return;
    }

    // Otherwise check inverted lat/lon to identify clicked country
    const coords = projection.invert?.([mouseX, mouseY]);
    if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
      // Find country containing coords
      // Rotate towards clicked position
      flyTo(coords[1], coords[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#05060b] text-slate-100 select-none overflow-hidden font-sans">
      {/* ==================================================================== */}
      {/* TOP HEADER (Matching Radio Atlas header aesthetic)                  */}
      {/* ==================================================================== */}
      <header className="h-12 border-b border-[#1b2030] px-4 flex items-center justify-between bg-[#070911] shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono tracking-[0.25em] text-xs font-bold text-slate-200 uppercase">
            AI SWARM ATLAS
          </span>

          <span
            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${
              mode === 'live'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60'
                : 'bg-amber-950/70 text-amber-300 border-amber-600/60'
            }`}
          >
            {mode === 'live' ? 'LIVE OSINT TELEMETRY' : 'SYNTHETIC DEMO SIM'}
          </span>

          {/* Quick Platform View Links */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <button
              type="button"
              onClick={() => onOpenView('feed')}
              className="px-2 py-0.5 rounded hover:bg-[#151a28] hover:text-slate-200 transition"
            >
              Feed
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenView('analytics')}
              className="px-2 py-0.5 rounded hover:bg-[#151a28] hover:text-slate-200 transition"
            >
              Analytics
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenView('entities')}
              className="px-2 py-0.5 rounded hover:bg-[#151a28] hover:text-slate-200 transition"
            >
              Actors & Frameworks
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenView('sources')}
              className="px-2 py-0.5 rounded hover:bg-[#151a28] hover:text-slate-200 transition"
            >
              Sources
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenView('health')}
              className="px-2 py-0.5 rounded hover:bg-[#151a28] hover:text-slate-200 transition"
            >
              Health
            </button>
          </div>
        </div>

        {/* Top-Right Search & Jump Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={selectedCountryName || 'Search country or swarm...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 bg-[#0a0e18] border border-[#21283d] rounded px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
            )}
          </div>

          {/* Shuffle / Random Swarm Jump Button */}
          <button
            type="button"
            title="Jump to Random Swarm Location"
            onClick={handleShuffle}
            className="p-1.5 rounded bg-[#0a0e18] hover:bg-[#151b2a] border border-[#21283d] text-slate-400 hover:text-slate-200 transition"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN TWO-COLUMN STAGE (Globe on Left, List on Right)                 */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER: 3D ROTATABLE GLOBE */}
        <div className="flex-1 relative flex flex-col justify-between overflow-hidden bg-[#05060b]">
          {/* Canvas Viewport */}
          <div className="flex-1 relative cursor-grab active:cursor-grabbing w-full h-full">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
              className="w-full h-full block"
            />

            {/* Tactical Swarm Origin -> Target HUD Overlay */}
            {activeSignal && (
              <div className="absolute top-4 left-4 p-3 rounded bg-[#080c16]/85 backdrop-blur border border-[#1e2538] max-w-sm pointer-events-none space-y-1.5 shadow-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-semibold">
                    SWARM INCURSION VECTOR
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100">
                  {activeSignal.originName || activeSignal.countryName}
                  {activeSignal.targetName && (
                    <span className="text-red-400 font-mono"> → {activeSignal.targetName}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {activeSignal.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span className="uppercase text-cyan-300">
                    {activeSignal.category.replace(/_/g, ' ')}
                  </span>
                  <span>•</span>
                  <span>
                    {activeSignal.agentCount
                      ? `${activeSignal.agentCount} Agents Documented`
                      : 'Multi-Agent Swarm'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Globe Status Line (Matches "Greenland · click another country to browse  996 signals") */}
          <div className="h-9 px-4 border-t border-[#191e2e] bg-[#070912] flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-200 font-semibold">
                {selectedCountryName}
              </span>
              <span>•</span>
              <span className="text-slate-400 truncate">
                drag globe to rotate in 3D • click any signal or country to inspect
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-cyan-300 font-semibold">
                {signals.length} signals
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {incidents.length} incidents tracked
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT SIDEBAR: INCIDENT SIGNAL LIST & TELEMETRY PLAYER             */}
        {/* ================================================================== */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#1b2030] bg-[#070911] flex flex-col justify-between shrink-0 h-80 lg:h-full">
          {/* Tabs Header (World / Swarms / Watchlist / Recent) */}
          <div className="h-10 border-b border-[#1b2030] px-4 flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0 bg-[#090c16]">
            {[
              { id: 'world', label: 'World' },
              { id: 'swarms', label: 'Swarms' },
              { id: 'watchlist', label: `Watchlist (${starredIds.size})` },
              { id: 'recent', label: 'Recent' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`transition pb-0.5 ${
                  activeTab === tab.id
                    ? 'text-slate-100 font-bold border-b-2 border-indigo-500'
                    : 'hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Incident Signals List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#151a28]">
            {filteredSignals.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No signals match the current tab filter.
              </div>
            ) : (
              filteredSignals.map((sig) => {
                const isSelected = sig.id === selectedSignalId;
                const isStarred = starredIds.has(sig.id);

                return (
                  <div
                    key={sig.id}
                    onClick={() => {
                      setSelectedSignalId(sig.id);
                      setSelectedCountryName(sig.countryName);
                      flyTo(sig.lat, sig.lon);
                    }}
                    className={`px-4 py-3 cursor-pointer transition flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-[#1b2133] border-l-2 border-indigo-400'
                        : 'hover:bg-[#0d121f]'
                    }`}
                  >
                    <div className="truncate flex-1 space-y-1">
                      <h4
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-slate-50 font-bold' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {sig.title}
                      </h4>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {sig.countryCode} •{' '}
                        <span className="uppercase text-slate-300">
                          {SEVERITY_META[sig.severity as keyof typeof SEVERITY_META]?.code || 'SEV'}
                        </span>{' '}
                        •{' '}
                        <span>
                          {sig.isConfirmedSwarm ? 'SWARM CONFIRMED' : 'REPORTED'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      onClick={(e) => toggleStar(sig.id, e)}
                      className="p-1 text-slate-500 hover:text-amber-400 transition shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isStarred ? 'text-amber-400 fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ================================================================== */}
          {/* BOTTOM ACTIVE TELEMETRY DECK (Matching Radio Atlas Player Bar)    */}
          {/* ================================================================== */}
          <div className="p-4 border-t border-[#1b2030] bg-[#070911] space-y-3 shrink-0">
            {/* Active Signal Title & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="truncate flex-1">
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {activeSignal?.title || 'No signal active'}
                </h4>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Live Ingestion • {activeSignal?.countryName || 'Global'}
                  </span>
                </div>
              </div>

              {activeIncident && (
                <button
                  type="button"
                  onClick={() => onOpenDossier(activeIncident)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded flex items-center gap-1 shrink-0 transition"
                >
                  <span>Dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Transport & Playback Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Previous Incident"
                  onClick={handlePrevSignal}
                  className="p-1.5 rounded hover:bg-[#151b2a] text-slate-300 transition"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title={isOrbiting ? 'Pause Globe Orbit' : 'Resume Globe Orbit'}
                  onClick={() => setIsOrbiting((o) => !o)}
                  className="p-1.5 rounded hover:bg-[#151b2a] text-slate-100 transition"
                >
                  {isOrbiting ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
                <button
                  type="button"
                  title="Next Incident"
                  onClick={handleNextSignal}
                  className="p-1.5 rounded hover:bg-[#151b2a] text-slate-300 transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Reset Globe View"
                  onClick={() => {
                    targetRotationRef.current = [-40, -25, 0];
                    scaleRef.current = 250;
                    setScale(250);
                  }}
                  className="p-1.5 rounded hover:bg-[#151b2a] text-slate-400 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Swarm Speed / Vector Intensity Slider */}
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={swarmSpeed}
                  onChange={(e) => setSwarmSpeed(Number(e.target.value))}
                  className="w-16 h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
                  title={`Swarm Simulation Speed: ${swarmSpeed}%`}
                />
                <span className="text-[10px] font-mono text-slate-500 w-7">
                  {swarmSpeed}%
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
