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
  VERIFICATION_META,
} from '@/lib/types';
import { buildGlobeSignals, GlobeSignal } from '@/lib/globe-signals';
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface SwarmGlobeAtlasProps {
  incidents: EnrichedIncident[];
  mode: OperatingMode;
  onOpenDossier: (incident: EnrichedIncident) => void;
  onOpenView: (tab: string) => void;
}

// Convert topojson world data into GeoJSON features
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countriesGeoJson = feature(worldData as any, (worldData as any).objects.countries) as any;
const graticule = geoGraticule().step([15, 15]);

function formatCoordinate(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
}

export function SwarmGlobeAtlas({
  incidents,
  onOpenDossier,
  onOpenView,
}: SwarmGlobeAtlasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation ref [yaw, pitch, roll] maintained across animation frames
  const rotationRef = useRef<[number, number, number]>([-35, -22, 0]);

  const [scale, setScale] = useState<number>(300);
  const scaleRef = useRef<number>(300);
  scaleRef.current = scale;

  // Orbit & layer controls
  const [isOrbiting, setIsOrbiting] = useState<boolean>(true);
  const isOrbitingRef = useRef<boolean>(true);
  isOrbitingRef.current = isOrbiting;

  const [swarmsOnlyLayer, setSwarmsOnlyLayer] = useState<boolean>(false);
  const swarmsOnlyLayerRef = useRef<boolean>(false);
  swarmsOnlyLayerRef.current = swarmsOnlyLayer;

  // Selected incident & country
  const [selectedSignalId, setSelectedSignalId] = useState<string>('');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('Global');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedFilter, setFeedFilter] = useState<'all' | 'swarms' | 'saved'>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Planet Focus & Zoom lock (scroll wheel zooms ONLY when planet is clicked/focused)
  const [isPlanetFocused, setIsPlanetFocused] = useState<boolean>(false);
  const isPlanetFocusedRef = useRef<boolean>(false);
  isPlanetFocusedRef.current = isPlanetFocused;

  // Mouse drag & animation refs
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const particlePhaseRef = useRef<number>(0);
  const targetRotationRef = useRef<[number, number, number] | null>(null);

  // Build signals from incidents
  const signals = React.useMemo(() => buildGlobeSignals(incidents), [incidents]);

  const confirmedMaliciousSignals = React.useMemo(
    () => signals.filter((s) => s.isConfirmedSwarm && s.isMaliciousSwarm),
    [signals]
  );

  const confirmedSwarmSignals = React.useMemo(
    () => signals.filter((s) => s.isConfirmedSwarm),
    [signals]
  );

  // Initialize default selection to a confirmed malicious swarm so the centerpiece showcases active intelligence immediately
  useEffect(() => {
    if (signals.length > 0 && !selectedSignalId) {
      const initial =
        confirmedMaliciousSignals[0] ||
        confirmedSwarmSignals[0] ||
        signals[0];
      setSelectedSignalId(initial.id);
      setSelectedCountryName(initial.countryName);
      rotationRef.current = [
        -initial.lon,
        -Math.max(-65, Math.min(65, initial.lat)),
        0,
      ];
    }
  }, [signals, confirmedMaliciousSignals, confirmedSwarmSignals, selectedSignalId]);

  const activeSignal =
    signals.find((s) => s.id === selectedSignalId) || signals[0] || null;
  const activeIncident =
    incidents.find((i) => i.id === activeSignal?.incidentId) ||
    incidents[0] ||
    null;

  // Filtered feed list on the right panel
  const filteredSignals = React.useMemo(() => {
    return signals.filter((s) => {
      if (feedFilter === 'swarms' && !s.isConfirmedSwarm) return false;
      if (feedFilter === 'saved' && !savedIds.has(s.id)) return false;
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
  }, [signals, feedFilter, savedIds, searchQuery]);

  const toggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Smoothly rotate globe to center a coordinate
  const flyTo = useCallback((lat: number, lon: number) => {
    let targetYaw = -lon;
    while (targetYaw > 180) targetYaw -= 360;
    while (targetYaw < -180) targetYaw += 360;
    targetRotationRef.current = [
      targetYaw,
      -Math.max(-72, Math.min(72, lat)),
      0,
    ];
  }, []);

  const handleSelectSignal = useCallback(
    (sig: GlobeSignal) => {
      setSelectedSignalId(sig.id);
      setSelectedCountryName(sig.countryName);
      flyTo(sig.lat, sig.lon);
    },
    [flyTo]
  );

  const handleStepSignal = useCallback(
    (direction: 1 | -1) => {
      const list = filteredSignals.length > 0 ? filteredSignals : signals;
      if (list.length === 0) return;
      const idx = list.findIndex((s) => s.id === selectedSignalId);
      const nextIdx = (idx + direction + list.length) % list.length;
      handleSelectSignal(list[nextIdx]);
    },
    [filteredSignals, signals, selectedSignalId, handleSelectSignal]
  );

  // Set responsive initial globe scale
  useEffect(() => {
    const updateResponsiveScale = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const computed = Math.max(
        210,
        Math.min(340, Math.round(Math.min(vw * 0.21, vh * 0.34)))
      );
      scaleRef.current = computed;
      setScale(computed);
    };
    updateResponsiveScale();
    window.addEventListener('resize', updateResponsiveScale);
    return () => window.removeEventListener('resize', updateResponsiveScale);
  }, []);

  // --------------------------------------------------------------------------
  // Main 3D Globe Canvas Rendering Loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const drawDiamond = (
      x: number,
      y: number,
      radius: number,
      fill: string,
      stroke?: string,
      lineWidth = 1.2
    ) => {
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y + radius);
      ctx.lineTo(x - radius, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

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

      // Smoothly interpolate camera fly-to
      if (targetRotationRef.current) {
        const cur = rotationRef.current;
        const tgt = targetRotationRef.current;
        const diffYaw = tgt[0] - cur[0];
        const diffPitch = tgt[1] - cur[1];

        let dy = ((diffYaw + 180) % 360) - 180;
        if (dy < -180) dy += 360;

        let nextYaw = cur[0] + dy * 0.08;
        if (nextYaw > 180) nextYaw -= 360;
        else if (nextYaw < -180) nextYaw += 360;

        const nextPitch = cur[1] + diffPitch * 0.08;

        if (Math.abs(dy) < 0.15 && Math.abs(diffPitch) < 0.15) {
          rotationRef.current = tgt;
          targetRotationRef.current = null;
        } else {
          rotationRef.current = [nextYaw, nextPitch, 0];
        }
      } else if (isOrbitingRef.current && !isDraggingRef.current) {
        let nextYaw = rotationRef.current[0] + 0.11;
        if (nextYaw > 180) nextYaw -= 360;
        else if (nextYaw < -180) nextYaw += 360;
        rotationRef.current = [nextYaw, rotationRef.current[1], 0];
      }

      particlePhaseRef.current = (particlePhaseRef.current + 0.008) % 1;

      const cx = width / 2;
      const cy = height / 2 + 10;
      const R = scaleRef.current;

      const projection = geoOrthographic()
        .scale(R)
        .translate([cx, cy])
        .rotate(rotationRef.current)
        .clipAngle(90);

      const path = geoPath(projection, ctx);

      // 0. Subtle Atmospheric Backlight Halo
      const haloGrad = ctx.createRadialGradient(
        cx - R * 0.2,
        cy - R * 0.2,
        R * 0.5,
        cx,
        cy,
        R * 1.48
      );
      haloGrad.addColorStop(0, 'rgba(245, 184, 46, 0.04)');
      haloGrad.addColorStop(0.55, 'rgba(239, 68, 68, 0.035)');
      haloGrad.addColorStop(1, 'rgba(8, 10, 15, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.48, 0, Math.PI * 2);
      ctx.fill();

      // 1. Background Orbital Ring (Back half of tilted orbital telemetry ring)
      const isActiveMalicious =
        activeSignal?.isConfirmedSwarm && activeSignal?.isMaliciousSwarm;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.58);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.24, R * 0.36, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = isActiveMalicious
        ? 'rgba(239, 68, 68, 0.25)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Secondary outer dashed orbital track (back half)
      ctx.rotate(0.18);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.34, R * 0.44, 0, Math.PI, Math.PI * 2);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Planetary Sphere Base (Directional Top-Left Illumination + Terminator Shadow)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      const sphereGrad = ctx.createRadialGradient(
        cx - R * 0.38,
        cy - R * 0.38,
        R * 0.05,
        cx + R * 0.15,
        cy + R * 0.15,
        R * 1.05
      );
      sphereGrad.addColorStop(0, '#182030');
      sphereGrad.addColorStop(0.45, '#0d121c');
      sphereGrad.addColorStop(0.82, '#070a10');
      sphereGrad.addColorStop(1, '#040508');
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // 3. Subtle Graticule Coordinate Mesh
      ctx.beginPath();
      path(graticule());
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // 4. Continental Landmasses
      const features = countriesGeoJson.features || [];
      for (const feat of features) {
        const countryName = feat.properties?.name || '';
        const isSelectedCountry = countryName === selectedCountryName;

        ctx.beginPath();
        path(feat);

        if (isSelectedCountry) {
          ctx.fillStyle = isActiveMalicious
            ? 'rgba(239, 68, 68, 0.16)'
            : 'rgba(245, 184, 46, 0.14)';
          ctx.fill();
          ctx.strokeStyle = isActiveMalicious
            ? 'rgba(239, 68, 68, 0.65)'
            : 'rgba(245, 184, 46, 0.65)';
          ctx.lineWidth = 1.25;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#141a26';
          ctx.fill();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      }

      // 5. Spherical Terminator Shadow Overlay & Specular Limb Rim
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      const terminatorGrad = ctx.createLinearGradient(
        cx - R * 0.7,
        cy - R * 0.7,
        cx + R * 0.85,
        cy + R * 0.85
      );
      terminatorGrad.addColorStop(0, 'rgba(245, 184, 46, 0.05)');
      terminatorGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      terminatorGrad.addColorStop(1, 'rgba(2, 3, 6, 0.68)');
      ctx.fillStyle = terminatorGrad;
      ctx.fill();

      // Crisp planetary rim stroke
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 6. Confirmed Malicious Swarm Attack Trajectories (STRICTLY Confirmed Malicious Swarms Only)
      for (const sig of signals) {
        if (
          !sig.isConfirmedSwarm ||
          !sig.isMaliciousSwarm ||
          sig.targetLat === undefined ||
          sig.targetLon === undefined
        ) {
          continue;
        }

        const isCurrent = sig.id === selectedSignalId;
        const interpolator = geoInterpolate(
          [sig.lon, sig.lat],
          [sig.targetLon, sig.targetLat]
        );

        ctx.beginPath();
        const steps = 44;
        let started = false;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const [lon, lat] = interpolator(t);
          const pt = projection([lon, lat]);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt[0], pt[1]);
              started = true;
            } else {
              ctx.lineTo(pt[0], pt[1]);
            }
          }
        }

        if (started) {
          ctx.strokeStyle = isCurrent
            ? 'rgba(239, 68, 68, 0.92)'
            : 'rgba(239, 68, 68, 0.42)';
          ctx.lineWidth = isCurrent ? 2.0 : 1.2;
          ctx.stroke();

          // Travelling swarm packets along the trajectory
          const packetCount = isCurrent ? 3 : 2;
          for (let p = 0; p < packetCount; p++) {
            const t = (particlePhaseRef.current + p / packetCount) % 1;
            const [pLon, pLat] = interpolator(t);
            const pt = projection([pLon, pLat]);
            if (pt) {
              drawDiamond(
                pt[0],
                pt[1],
                isCurrent ? 3.5 : 2.5,
                isCurrent ? '#fca5a5' : '#ef4444'
              );
            }
          }
        }

        // Target impact marker
        const targetPt = projection([sig.targetLon, sig.targetLat]);
        if (targetPt) {
          ctx.beginPath();
          ctx.arc(targetPt[0], targetPt[1], isCurrent ? 11 : 7, 0, Math.PI * 2);
          ctx.strokeStyle = isCurrent
            ? 'rgba(239, 68, 68, 0.65)'
            : 'rgba(239, 68, 68, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          drawDiamond(
            targetPt[0],
            targetPt[1],
            isCurrent ? 4 : 3,
            '#ef4444',
            '#fca5a5',
            1
          );
        }
      }

      // 7. Foreground Orbital Telemetry Ring (Front half crossing over the sphere, matching AETHERIA reference)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.58);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.24, R * 0.36, 0, 0, Math.PI);
      ctx.strokeStyle = isActiveMalicious
        ? 'rgba(239, 68, 68, 0.72)'
        : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isActiveMalicious ? 1.8 : 1.1;
      ctx.stroke();

      // Small orbital diamond markers on the ring
      const ringAngles = [0.35, 2.75];
      for (const ang of ringAngles) {
        const rx = Math.cos(ang) * R * 1.24;
        const ry = Math.sin(ang) * R * 0.36;
        drawDiamond(rx, ry, 3.2, '#f3f5f8');
      }

      // Secondary outer dashed orbital track (front half)
      ctx.rotate(0.18);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.34, R * 0.44, 0, 0, Math.PI);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = isActiveMalicious
        ? 'rgba(239, 68, 68, 0.32)'
        : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 8. Four Cardinal Directional Triangles Around the Sphere (Matching Reference Image)
      const cardinalDist = R + 28;
      const drawTriangle = (x: number, y: number, angleRad: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.lineTo(4, 3.5);
        ctx.lineTo(-4, 3.5);
        ctx.closePath();
        ctx.fillStyle = '#f5b82e';
        ctx.fill();
        ctx.restore();
      };
      drawTriangle(cx, cy - cardinalDist, 0); // North
      drawTriangle(cx, cy + cardinalDist, Math.PI); // South
      drawTriangle(cx - cardinalDist, cy, -Math.PI / 2); // West
      drawTriangle(cx + cardinalDist, cy, Math.PI / 2); // East

      // 9. Incident Diamond Markers & Coordinate Labels on the Globe
      const visibleSignals = swarmsOnlyLayerRef.current
        ? signals.filter((s) => s.isConfirmedSwarm)
        : signals;

      // Track label positions so coordinate callouts never overlap
      const placedLabels: Array<{ x: number; y: number }> = [];

      // Draw unselected signals first, then selected signal on top
      const sortedSignals = [...visibleSignals].sort((a, b) =>
        a.id === selectedSignalId ? 1 : b.id === selectedSignalId ? -1 : 0
      );

      for (const sig of sortedSignals) {
        const pt = projection([sig.lon, sig.lat]);
        if (!pt) continue;

        const [x, y] = pt;
        const isSelected = sig.id === selectedSignalId;

        if (isSelected) {
          // Prominent Gold Diamond Marker (matching primary selected point in reference)
          drawDiamond(x, y, 10, '#f5b82e', '#080a0f', 1.5);
          drawDiamond(x, y, 3.5, '#080a0f');

          // Coordinate label below selected diamond
          const coordText = formatCoordinate(sig.lat, sig.lon);
          ctx.font = '600 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(8, 10, 15, 0.85)';
          const textWidth = ctx.measureText(coordText).width;
          ctx.fillRect(x - textWidth / 2 - 5, y + 14, textWidth + 10, 16);
          ctx.fillStyle = '#f3f5f8';
          ctx.fillText(coordText, x, y + 25);
          placedLabels.push({ x, y: y + 20 });
        } else if (sig.isConfirmedSwarm && sig.isMaliciousSwarm) {
          // Confirmed Malicious Swarm: Crimson Diamond with inner core
          drawDiamond(x, y, 6.5, '#ef4444', 'rgba(255,255,255,0.7)', 1);
          drawDiamond(x, y, 2.2, '#080a0f');

          const tooClose = placedLabels.some(
            (l) => Math.hypot(l.x - x, l.y - (y + 16)) < 68
          );
          if (!tooClose) {
            const coordText = formatCoordinate(sig.lat, sig.lon);
            ctx.font = '500 9.5px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(243, 245, 248, 0.88)';
            ctx.fillText(coordText, x, y + 18);
            placedLabels.push({ x, y: y + 16 });
          }
        } else {
          // Standard Reported / Research Incident: Crisp White/Slate Diamond
          const radius = sig.isConfirmedSwarm ? 5.5 : 4.2;
          drawDiamond(
            x,
            y,
            radius,
            '#0d121c',
            sig.isConfirmedSwarm ? '#f5b82e' : 'rgba(203, 210, 220, 0.75)',
            1.4
          );
          drawDiamond(
            x,
            y,
            1.5,
            sig.isConfirmedSwarm ? '#f5b82e' : 'rgba(203, 210, 220, 0.85)'
          );

          // Show coordinate callout for well-spaced markers (up to 5 on hemisphere)
          if (placedLabels.length < 6) {
            const tooClose = placedLabels.some(
              (l) => Math.hypot(l.x - x, l.y - (y + 15)) < 85
            );
            if (!tooClose) {
              const coordText = formatCoordinate(sig.lat, sig.lon);
              ctx.font = '500 9px monospace';
              ctx.textAlign = 'center';
              ctx.fillStyle = 'rgba(203, 210, 220, 0.72)';
              ctx.fillText(coordText, x, y + 16);
              placedLabels.push({ x, y: y + 15 });
            }
          }
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
  }, [signals, selectedSignalId, selectedCountryName, activeSignal]);

  // --------------------------------------------------------------------------
  // Globe Interaction Handlers
  // --------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    targetRotationRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.32;
    const cur = rotationRef.current;
    let nextYaw = cur[0] + dx * sensitivity;
    if (nextYaw > 180) nextYaw -= 360;
    else if (nextYaw < -180) nextYaw += 360;
    const nextPitch = Math.max(-80, Math.min(80, cur[1] - dy * sensitivity));

    rotationRef.current = [nextYaw, nextPitch, 0];
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const zoomIn = () => {
    const nextScale = Math.min(520, scaleRef.current + 36);
    scaleRef.current = nextScale;
    setScale(nextScale);
  };

  const zoomOut = () => {
    const nextScale = Math.max(160, scaleRef.current - 36);
    scaleRef.current = nextScale;
    setScale(nextScale);
  };

  const resetCamera = () => {
    const defaultScale = 300;
    scaleRef.current = defaultScale;
    setScale(defaultScale);
    if (activeSignal) {
      flyTo(activeSignal.lat, activeSignal.lon);
    } else {
      targetRotationRef.current = [-35, -22, 0];
    }
  };

  // Unfocus planet when clicking outside canvas
  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
        setIsPlanetFocused(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlanetFocused(false);
      }
    };
    window.addEventListener('mousedown', handleWindowClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleWindowClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Scroll wheel zoom strictly when planet is clicked/focused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onCanvasWheel = (e: WheelEvent) => {
      if (!isPlanetFocusedRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const zoomDelta = -e.deltaY * 0.24;
      const nextScale = Math.max(
        160,
        Math.min(520, scaleRef.current + zoomDelta)
      );
      scaleRef.current = nextScale;
      setScale(nextScale);
    };

    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onCanvasWheel);
    };
  }, []);

  // Click on globe to select nearest diamond marker or fly to coordinate
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPlanetFocused(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2 + 10;
    const projection = geoOrthographic()
      .scale(scaleRef.current)
      .translate([cx, cy])
      .rotate(rotationRef.current)
      .clipAngle(90);

    const visibleSignals = swarmsOnlyLayerRef.current
      ? signals.filter((s) => s.isConfirmedSwarm)
      : signals;

    let nearestSig: GlobeSignal | null = null;
    let minDist = 22;

    for (const sig of visibleSignals) {
      const pt = projection([sig.lon, sig.lat]);
      if (!pt) continue;
      const dist = Math.hypot(pt[0] - mouseX, pt[1] - mouseY);
      if (dist < minDist) {
        minDist = dist;
        nearestSig = sig;
      }
    }

    if (nearestSig) {
      handleSelectSignal(nearestSig);
      return;
    }

    const coords = projection.invert?.([mouseX, mouseY]);
    if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
      flyTo(coords[1], coords[0]);
    }
  };

  const activeCoordStr = activeSignal
    ? formatCoordinate(activeSignal.lat, activeSignal.lon)
    : '0.0° N, 0.0° E';

  const confidencePct = activeIncident
    ? (activeIncident.classification_confidence * 100).toFixed(1)
    : '92.0';

  const severityMeta = activeIncident
    ? SEVERITY_META[activeIncident.severity]
    : SEVERITY_META.medium;

  const categoryMeta = activeIncident
    ? SWARM_CATEGORY_META[activeIncident.primary_category]
    : SWARM_CATEGORY_META.coordinated_ai_agents;

  const verificationMeta = activeIncident
    ? VERIFICATION_META[activeIncident.verification_status]
    : VERIFICATION_META.reported;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080a0f] select-none">
      {/* Subtle Atmospheric Vignette & Horizon Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 52%, rgba(22, 29, 45, 0.38) 0%, rgba(8, 10, 15, 0.92) 70%, #06080c 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
        style={{
          background:
            'linear-gradient(to top, rgba(16, 12, 18, 0.65) 0%, transparent 100%)',
        }}
      />

      {/* ================================================================== */}
      {/* FULL-BLEED 3D GLOBE CANVAS STAGE                                   */}
      {/* ================================================================== */}
      <div
        className={`absolute inset-0 w-full h-full ${
          isPlanetFocused
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-pointer'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />
      </div>

      {/* ================================================================== */}
      {/* TOP-CENTER PLANETARY HEADER (Modeled on AETHERIA Center Header)    */}
      {/* ================================================================== */}
      <div className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-center">
        {/* Segmented Telemetry Bar */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-5 h-[2px] bg-white/15" />
          <span className="w-5 h-[2px] bg-white/15" />
          <span className="w-5 h-[2px] bg-white/25" />
          <span className="w-7 h-[2.5px] bg-[#f3f5f8]" />
          <span className="mx-3 font-mono text-[10px] tracking-[0.28em] text-[#8a94a6] uppercase">
            ORBITAL THREAT TELEMETRY
          </span>
          <span className="w-7 h-[2.5px] bg-[#f3f5f8]" />
          <span className="w-5 h-[2px] bg-white/25" />
          <span className="w-5 h-[2px] bg-white/15" />
          <span className="w-5 h-[2px] bg-white/15" />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[0.16em] text-[#f3f5f8] uppercase">
          {selectedCountryName ? `${selectedCountryName}.` : 'EARTH.'}
        </h1>
        <p className="mt-1 text-xs text-[#8a94a6] tracking-wide">
          Sector: {activeIncident?.region_name || 'Global Theater'} •{' '}
          <span className="text-[#cbd2dc] font-mono">
            {confirmedMaliciousSignals.length} Active Hostile Swarms
          </span>{' '}
          • {signals.length} Tracked Signals
        </p>
      </div>

      {/* ================================================================== */}
      {/* LEFT PANEL: CONTEXTUAL INTELLIGENCE BRIEF (MISSION BRIEF LAYOUT)   */}
      {/* ================================================================== */}
      {activeIncident && activeSignal && (
        <aside className="hidden lg:flex flex-col justify-between absolute left-7 top-6 bottom-7 w-[360px] xl:w-[390px] z-20 pointer-events-auto">
          <div className="flex-1 overflow-y-auto pr-2 space-y-5">
            {/* Section Title with Architectural Leader Line */}
            <div className="flex items-center gap-3">
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-[#f3f5f8] uppercase">
                INTELLIGENCE BRIEF
              </span>
              <div className="h-[1px] w-8 bg-[#f3f5f8]" />
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>

            {/* Framed Visual Telemetry Card (Inspired by GJ 504B Card) */}
            <div className="relative rounded-sm overflow-hidden border border-white/12 bg-[#0c1018] shadow-2xl">
              <div
                className="h-36 w-full relative flex flex-col justify-between p-4"
                style={{
                  background:
                    activeSignal.isConfirmedSwarm && activeSignal.isMaliciousSwarm
                      ? 'radial-gradient(circle at 72% 28%, rgba(239, 68, 68, 0.34), rgba(15, 19, 29, 0.92) 68%, #090c12 100%)'
                      : 'radial-gradient(circle at 72% 28%, rgba(245, 184, 46, 0.22), rgba(15, 19, 29, 0.92) 68%, #090c12 100%)',
                }}
              >
                {/* Decorative topographic horizon SVG mesh */}
                <svg
                  viewBox="0 0 360 120"
                  className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 95 Q 90 65, 180 85 T 360 70 L 360 120 L 0 120 Z"
                    fill="none"
                    stroke={
                      activeSignal.isConfirmedSwarm && activeSignal.isMaliciousSwarm
                        ? '#ef4444'
                        : '#f5b82e'
                    }
                    strokeWidth="1"
                  />
                  <path
                    d="M0 108 Q 110 82, 210 98 T 360 88"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                  />
                </svg>

                {/* Top row inside visual card */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-black/55 border border-white/10 text-[#cbd2dc]">
                    {activeCoordStr}
                  </span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider border ${
                      activeSignal.isConfirmedSwarm && activeSignal.isMaliciousSwarm
                        ? 'bg-[#ef4444]/20 text-[#fca5a5] border-[#ef4444]/40'
                        : activeSignal.isConfirmedSwarm
                          ? 'bg-[#f5b82e]/15 text-[#f5b82e] border-[#f5b82e]/35'
                          : 'bg-white/5 text-[#cbd2dc] border-white/10'
                    }`}
                  >
                    {activeSignal.isConfirmedSwarm
                      ? 'Swarm Confirmed'
                      : 'Reported'}
                  </span>
                </div>

                {/* Bottom row inside visual card (Large Code like GJ 504B) */}
                <div className="relative z-10">
                  <div className="font-display text-2xl font-semibold tracking-wider text-[#f3f5f8] uppercase">
                    {activeSignal.countryCode} // {severityMeta.code}
                  </div>
                  <div className="text-xs text-[#8a94a6] truncate">
                    {activeSignal.isConfirmedSwarm &&
                    activeSignal.isMaliciousSwarm &&
                    activeSignal.targetName
                      ? `${activeSignal.originName || activeSignal.countryName} ➔ ${activeSignal.targetName}`
                      : `${activeSignal.countryName} • ${categoryMeta.shortLabel}`}
                  </div>
                </div>
              </div>
            </div>

            {/* BRIEF Section */}
            <div className="space-y-2 pb-4 border-b border-white/[0.08]">
              <div className="font-display text-xs font-semibold tracking-[0.18em] text-[#f3f5f8] uppercase">
                SUMMARY
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-[#8a94a6] select-none mt-0.5">
                  ::
                </span>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-medium text-[#f3f5f8] leading-snug">
                    {activeIncident.title}
                  </h2>
                  <p className="text-xs text-[#8a94a6] leading-relaxed line-clamp-3">
                    {activeIncident.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Diamond Sections (PRIMARY / SECONDARY / PROVENANCE) */}
            <div className="space-y-4">
              {/* 1. Threat Classification */}
              <div className="space-y-1.5 pb-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#f5b82e] inline-block shrink-0" />
                  <span className="font-display text-xs font-semibold tracking-[0.14em] text-[#f3f5f8] uppercase">
                    THREAT CLASSIFICATION:
                  </span>
                </div>
                <div className="pl-5 space-y-1 text-xs text-[#8a94a6] leading-relaxed">
                  <p className="text-[#cbd2dc]">
                    {categoryMeta.label} •{' '}
                    <span className="text-[#f3f5f8] font-medium">
                      {severityMeta.label} Severity
                    </span>
                  </p>
                  <p>
                    {activeIncident.reported_agent_count
                      ? `${activeIncident.reported_agent_count.toLocaleString()} coordinated agents documented`
                      : activeIncident.swarm_evidence}
                  </p>
                </div>
              </div>

              {/* 2. Associated Actors & Infrastructure */}
              <div className="space-y-1.5 pb-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rotate-45 border border-[#f5b82e] inline-block shrink-0" />
                  <span className="font-display text-xs font-semibold tracking-[0.14em] text-[#f3f5f8] uppercase">
                    ACTORS & INFRASTRUCTURE:
                  </span>
                </div>
                <div className="pl-5 text-xs text-[#8a94a6] leading-relaxed">
                  {activeIncident.entities && activeIncident.entities.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {activeIncident.entities.slice(0, 4).map(({ entity, link }) => (
                        <span
                          key={link.id}
                          className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[#cbd2dc] text-[11px]"
                        >
                          {entity.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>
                      {activeIncident.affected_systems?.length > 0
                        ? `Systems: ${activeIncident.affected_systems.join(', ')}`
                        : 'Attributed entities documented in source intelligence.'}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Source Attribution & Verification */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rotate-45 border border-[#8a94a6] inline-block shrink-0" />
                  <span className="font-display text-xs font-semibold tracking-[0.14em] text-[#cbd2dc] uppercase">
                    SOURCE ATTRIBUTION:
                  </span>
                </div>
                <div className="pl-5 text-xs text-[#8a94a6] space-y-1 leading-relaxed">
                  <p className="text-[#cbd2dc]">
                    {activeIncident.sources[0]?.source.name || 'OSINT Producer'}{' '}
                    • {verificationMeta.label} (
                    {activeIncident.source_reliability}/100 Reliability)
                  </p>
                  <p className="font-mono text-[11px] text-[#64748b]">
                    Published:{' '}
                    {activeIncident.first_published_at.slice(0, 10)} •{' '}
                    {activeIncident.independent_source_count} source(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Caution Stripe Accent */}
            <div className="h-3.5 w-full bg-caution-stripes" />
          </div>

          {/* Bottom Action CTA */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenDossier(activeIncident)}
              className="flex-1 py-2.5 px-5 bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] font-display font-semibold text-xs tracking-[0.18em] uppercase transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>OPEN INTELLIGENCE DOSSIER</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* ================================================================== */}
      {/* RIGHT PANEL: TELEMETRY & CLEAN INCIDENT FEED                       */}
      {/* ================================================================== */}
      <aside className="hidden lg:flex flex-col justify-between absolute right-7 top-6 bottom-7 w-[350px] xl:w-[380px] z-20 pointer-events-auto gap-3.5">
        {/* Module 1: :: VECTOR TELEMETRY (Modeled on :: DEPLOYMENT card) */}
        <div className="bg-[#0c1018]/90 backdrop-blur-md border-t border-white/15 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold tracking-[0.16em] text-[#f3f5f8] uppercase">
              :: VECTOR TELEMETRY
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 bg-[#f3f5f8] text-[#080a0f] font-semibold">
              {activeCoordStr}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rotate-45 ${
                  activeSignal?.isConfirmedSwarm && activeSignal?.isMaliciousSwarm
                    ? 'bg-[#ef4444]'
                    : 'bg-[#f5b82e]'
                }`}
              />
              <span className="text-[#cbd2dc] truncate max-w-[200px]">
                {activeSignal?.isConfirmedSwarm && activeSignal?.isMaliciousSwarm
                  ? activeSignal.targetName || 'Active Network Incursion'
                  : activeSignal?.countryName || 'Geolocation Signal'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#8a94a6]">
              {activeIncident?.location_precision || 'country'}
            </span>
          </div>
        </div>

        {/* Module 2: :: CONFIDENCE & CORROBORATION (Modeled on :: EXPLORATION PROGRESS) */}
        <div className="bg-[#0c1018]/90 backdrop-blur-md border-t border-white/15 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold tracking-[0.16em] text-[#f3f5f8] uppercase">
              :: EVIDENCE ALIGNMENT
            </span>
            <span className="font-mono text-xs text-[#f3f5f8] font-semibold">
              {confidencePct}%
            </span>
          </div>

          {/* Progress Bar with Gold Fill */}
          <div className="w-full h-2 bg-white/[0.06] p-0.5 flex items-center">
            <div
              className="h-full bg-[#f5b82e] transition-all duration-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8a94a6]">
            <span>
              Evidence Strength:{' '}
              <strong className="text-[#cbd2dc] font-normal capitalize">
                {activeIncident?.evidence_strength || 'moderate'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onOpenView('analytics')}
              className="text-[#f5b82e] hover:underline font-mono text-[10px]"
            >
              Analytics →
            </button>
          </div>
        </div>

        {/* Module 3: CLEAN INCIDENT FEED */}
        <div className="flex-1 min-h-0 bg-[#0c1018]/90 backdrop-blur-md border-t border-white/15 flex flex-col overflow-hidden">
          {/* Feed Header & Filter Tabs */}
          <div className="p-3.5 pb-2.5 border-b border-white/[0.07] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-semibold tracking-[0.16em] text-[#f3f5f8] uppercase">
                :: INTELLIGENCE FEED
              </span>
              <div className="flex items-center gap-3 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  {
                    id: 'swarms',
                    label: `Swarms (${confirmedSwarmSignals.length})`,
                  },
                  { id: 'saved', label: `Saved (${savedIds.size})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFeedFilter(tab.id as typeof feedFilter)}
                    className={`pb-0.5 transition cursor-pointer ${
                      feedFilter === tab.id
                        ? 'text-[#f5b82e] font-medium border-b border-[#f5b82e]'
                        : 'text-[#8a94a6] hover:text-[#f3f5f8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimal Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by title, country, or actor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-[#f5b82e]/50 rounded-xs pl-8 pr-7 py-1.5 text-xs text-[#f3f5f8] placeholder:text-[#64748b] focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-[#8a94a6] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Clean Incident List */}
          <div className="flex-1 overflow-y-auto py-1">
            {filteredSignals.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748b]">
                No incidents match the current filter.
              </div>
            ) : (
              filteredSignals.map((sig) => {
                const isSelected = sig.id === selectedSignalId;
                const isSaved = savedIds.has(sig.id);
                const sevLabel =
                  SEVERITY_META[sig.severity as keyof typeof SEVERITY_META]
                    ?.label || 'Medium';

                return (
                  <div
                    key={sig.id}
                    onClick={() => handleSelectSignal(sig)}
                    onDoubleClick={() => {
                      const inc = incidents.find((i) => i.id === sig.incidentId);
                      if (inc) onOpenDossier(inc);
                    }}
                    className={`group px-3.5 py-2.5 cursor-pointer transition flex items-start justify-between gap-2.5 border-l-2 ${
                      isSelected
                        ? 'border-[#f5b82e] bg-white/[0.05]'
                        : 'border-transparent hover:bg-white/[0.025]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4
                        className={`text-xs leading-snug line-clamp-1 transition ${
                          isSelected
                            ? 'text-[#f3f5f8] font-medium'
                            : 'text-[#cbd2dc] group-hover:text-[#f3f5f8]'
                        }`}
                      >
                        {sig.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-[#8a94a6]">
                        <span className="text-[#cbd2dc]">{sig.countryName}</span>
                        <span>•</span>
                        <span
                          className={
                            sig.severity === 'critical' || sig.severity === 'high'
                              ? 'text-[#fca5a5]'
                              : 'text-[#8a94a6]'
                          }
                        >
                          {sevLabel}
                        </span>
                        <span>•</span>
                        {sig.isConfirmedSwarm ? (
                          <span className="inline-flex items-center gap-1 text-[#ef4444] font-medium">
                            <span className="w-1.5 h-1.5 rotate-45 bg-[#ef4444]" />
                            Swarm Confirmed
                          </span>
                        ) : (
                          <span className="text-[#64748b]">Reported</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      title={isSaved ? 'Remove bookmark' : 'Bookmark incident'}
                      onClick={(e) => toggleSaved(sig.id, e)}
                      className="p-1 text-[#64748b] hover:text-[#f5b82e] transition shrink-0 opacity-60 group-hover:opacity-100"
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          isSaved ? 'text-[#f5b82e] fill-[#f5b82e]' : ''
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Module 4: HOSTILE SWARM POSTURE (Modeled on Bottom-Right Crimson Segmented Alert) */}
        <div
          onClick={() => {
            setFeedFilter((f) => (f === 'swarms' ? 'all' : 'swarms'));
            if (confirmedMaliciousSignals[0]) {
              handleSelectSignal(confirmedMaliciousSignals[0]);
            }
          }}
          className="bg-[#120b0e]/90 hover:bg-[#190e12] backdrop-blur-md border-t border-[#ef4444]/40 p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold tracking-[0.16em] text-[#ef4444] uppercase">
              HOSTILE SWARM VECTORS
            </span>
            <span className="font-mono text-[11px] text-[#fca5a5]">
              {confirmedMaliciousSignals.length} ACTIVE
            </span>
          </div>

          {/* Segmented Crimson Bars */}
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((idx) => {
              const active = idx < confirmedMaliciousSignals.length;
              return (
                <div
                  key={idx}
                  className={`h-1.5 transition ${
                    active ? 'bg-[#ef4444]' : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>

          <div className="text-[11px] text-[#fca5a5]/80 flex items-center justify-between">
            <span>Confirmed multi-agent offensive operations</span>
            <span className="font-mono text-[10px] underline">Filter</span>
          </div>
        </div>
      </aside>

      {/* ================================================================== */}
      {/* MINIMAL BOTTOM-CENTER CAMERA & LAYER BAR                           */}
      {/* ================================================================== */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-2 bg-[#0c1018]/90 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl">
        <button
          type="button"
          title="Previous Incident"
          onClick={() => handleStepSignal(-1)}
          className="p-1.5 text-[#8a94a6] hover:text-[#f3f5f8] transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          title={isOrbiting ? 'Pause Orbital Rotation' : 'Resume Orbital Rotation'}
          onClick={() => setIsOrbiting((o) => !o)}
          className="p-1.5 text-[#f3f5f8] hover:text-[#f5b82e] transition cursor-pointer"
        >
          {isOrbiting ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 text-[#f5b82e]" />
          )}
        </button>

        <button
          type="button"
          title="Next Incident"
          onClick={() => handleStepSignal(1)}
          className="p-1.5 text-[#8a94a6] hover:text-[#f3f5f8] transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button
          type="button"
          title="Zoom Out"
          onClick={zoomOut}
          className="p-1.5 text-[#8a94a6] hover:text-[#f3f5f8] transition cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Reset Camera"
          onClick={resetCamera}
          className="p-1.5 text-[#8a94a6] hover:text-[#f3f5f8] transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Zoom In"
          onClick={zoomIn}
          className="p-1.5 text-[#8a94a6] hover:text-[#f3f5f8] transition cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        {/* Toggle Layer: All Signals vs Confirmed Swarms Only */}
        <button
          type="button"
          onClick={() => setSwarmsOnlyLayer((v) => !v)}
          className={`px-2.5 py-1 text-xs font-medium rounded-xs transition cursor-pointer ${
            swarmsOnlyLayer
              ? 'bg-[#ef4444]/20 text-[#fca5a5] border border-[#ef4444]/40'
              : 'text-[#8a94a6] hover:text-[#f3f5f8]'
          }`}
        >
          {swarmsOnlyLayer ? 'Swarms Layer' : 'All Signals'}
        </button>

        <button
          type="button"
          title="Switch to 2D Tactical Map"
          onClick={() => onOpenView('map')}
          className="px-2.5 py-1 text-xs text-[#8a94a6] hover:text-[#f3f5f8] flex items-center gap-1.5 transition cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">2D Map</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* MOBILE / TABLET COMPACT BOTTOM BRIEFING BAR                        */}
      {/* ================================================================== */}
      {activeIncident && (
        <div className="lg:hidden absolute bottom-20 inset-x-4 z-20 p-3.5 bg-[#0c1018]/95 backdrop-blur-md border border-white/12 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-[#f5b82e]">
              {activeSignal?.countryName} • {activeCoordStr}
            </div>
            <h3 className="text-xs font-medium text-[#f3f5f8] truncate">
              {activeIncident.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenDossier(activeIncident)}
            className="px-3 py-1.5 bg-[#f5b82e] text-[#080a0f] font-display text-xs font-semibold uppercase tracking-wider shrink-0"
          >
            Dossier
          </button>
        </div>
      )}
    </div>
  );
}
