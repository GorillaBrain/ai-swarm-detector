'use client';

import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import {
  EvidenceStrength,
  SEVERITY_META,
  SeverityLevel,
  SWARM_CATEGORY_META,
  SwarmCategory,
  VERIFICATION_META,
  VerificationStatus,
} from '@/lib/types';

export function SeverityBadge({
  severity,
  showCode = true,
}: {
  severity: SeverityLevel;
  showCode?: boolean;
}) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.low;
  const Icon =
    severity === 'critical'
      ? AlertOctagon
      : severity === 'high'
        ? ShieldAlert
        : severity === 'medium'
          ? AlertTriangle
          : severity === 'low'
            ? Info
            : Layers;

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider border rounded ${meta.badgeClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {showCode && <span className="opacity-75">{meta.code}</span>}
      <span>{meta.label}</span>
    </span>
  );
}

export function VerificationBadge({
  status,
  independentSources,
}: {
  status: VerificationStatus;
  independentSources?: number;
}) {
  const meta = VERIFICATION_META[status] || VERIFICATION_META.unverified;
  const Icon =
    status === 'confirmed' || status === 'corroborated'
      ? ShieldCheck
      : status === 'reported'
        ? CheckCircle2
        : status === 'suspected'
          ? ShieldQuestion
          : HelpCircle;

  return (
    <span
      title={meta.rule}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider border rounded ${meta.badgeClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{meta.code}: {meta.label}</span>
      {typeof independentSources === 'number' && independentSources > 1 && (
        <span className="ml-0.5 px-1 bg-black/40 rounded text-[10px]">
          {independentSources}x SRC
        </span>
      )}
    </span>
  );
}

export function CategoryBadge({
  category,
  short = false,
}: {
  category: SwarmCategory;
  short?: boolean;
}) {
  const meta =
    SWARM_CATEGORY_META[category] ||
    SWARM_CATEGORY_META.unverified_suspected_activity;

  return (
    <span
      title={`${meta.description} Criteria: ${meta.inclusionCriteria}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${meta.badgeClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{short ? meta.shortLabel : meta.label}</span>
    </span>
  );
}

export function SwarmConfirmationBadge({
  isConfirmedSwarm,
  evidenceStrength,
  confidence,
}: {
  isConfirmedSwarm: boolean;
  evidenceStrength: EvidenceStrength;
  confidence: number;
}) {
  const pct = Math.round(confidence * 100);
  if (isConfirmedSwarm) {
    return (
      <span
        title="Available primary or corroborated evidence supports multi-agent coordination or swarm architecture."
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono border rounded bg-cyan-950/90 text-cyan-200 border-cyan-500/70"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>SWARM ARCH: DOCUMENTED ({pct}% ALIGN)</span>
      </span>
    );
  }

  return (
    <span
      title="Multi-agent swarm architecture is not confirmed; may involve single-agent autonomy, research evaluation, or unverified automation."
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono border rounded bg-slate-900/90 text-slate-300 border-slate-700"
    >
      <span className="w-2 h-2 rounded-full bg-slate-500" />
      <span>
        SWARM ARCH: {evidenceStrength === 'weak' ? 'NOT ESTABLISHED' : 'PARTIAL / SINGLE-AGENT'} ({pct}% ALIGN)
      </span>
    </span>
  );
}

export function LifecycleBadge({
  lifecycle,
}: {
  lifecycle: 'new' | 'updated' | 'merged';
}) {
  if (lifecycle === 'merged') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-700/60 rounded">
        MERGED CORROBORATION
      </span>
    );
  }
  if (lifecycle === 'updated') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded">
        UPDATED RECORD
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded">
      NEW INGEST
    </span>
  );
}
