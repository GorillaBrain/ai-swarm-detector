'use client';

import React from 'react';
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
  showCode = false,
}: {
  severity: SeverityLevel;
  showCode?: boolean;
}) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.low;

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-sm ${meta.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rotate-45 ${meta.dotClass}`} />
      {showCode && (
        <span className="font-mono text-[11px] opacity-75">{meta.code}</span>
      )}
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

  return (
    <span
      title={meta.rule}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-sm ${meta.badgeClass}`}
    >
      <span>{meta.label}</span>
      {typeof independentSources === 'number' && independentSources > 1 && (
        <span className="ml-0.5 px-1.5 py-0.2 bg-white/10 rounded-xs font-mono text-[10px]">
          {independentSources} sources
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-sm ${meta.badgeClass}`}
    >
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
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-sm bg-[#ef4444]/15 text-[#fca5a5] border-[#ef4444]/35"
      >
        <span className="w-1.5 h-1.5 rotate-45 bg-[#ef4444]" />
        <span>Swarm Confirmed ({pct}%)</span>
      </span>
    );
  }

  return (
    <span
      title="Multi-agent swarm architecture is not confirmed; may involve single-agent autonomy, research evaluation, or unverified automation."
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-sm bg-white/[0.03] text-[#8a94a6] border-white/[0.08]"
    >
      <span className="w-1.5 h-1.5 rotate-45 border border-[#8a94a6]" />
      <span>
        {evidenceStrength === 'weak' ? 'Unestablished' : 'Single-Agent / Reported'} ({pct}%)
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
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-[#f5b82e]/12 text-[#f5b82e] border border-[#f5b82e]/30 rounded-sm">
        Corroborated
      </span>
    );
  }
  if (lifecycle === 'updated') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-white/[0.05] text-[#cbd2dc] border border-white/10 rounded-sm">
        Updated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-white/[0.03] text-[#8a94a6] border border-white/[0.07] rounded-sm">
      Indexed
    </span>
  );
}
