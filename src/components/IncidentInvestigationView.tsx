'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  Globe,
  Quote,
} from 'lucide-react';
import {
  EnrichedIncident,
  OperatingMode,
  SEVERITY_META,
  SeverityLevel,
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

interface IncidentInvestigationViewProps {
  incident: EnrichedIncident;
  mode: OperatingMode;
  onBack?: () => void;
  onSelectRelatedIncident?: (idOrSlug: string) => void;
  onIncidentUpdated?: (updated: EnrichedIncident) => void;
}

export function IncidentInvestigationView({
  incident: initialIncident,
  mode,
  onBack,
  onSelectRelatedIncident,
  onIncidentUpdated,
}: IncidentInvestigationViewProps) {
  const [incident, setIncident] = useState<EnrichedIncident>(initialIncident);

  // Sync when prop changes
  useEffect(() => {
    setIncident(initialIncident);
  }, [initialIncident]);

  // Progressive disclosure toggles
  const [showTimeline, setShowTimeline] = useState<boolean>(true);
  const [showAnalyticalDecomp, setShowAnalyticalDecomp] =
    useState<boolean>(false);
  const [showAuditHistory, setShowAuditHistory] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);

  // Analyst override state
  const [analystHandle, setAnalystHandle] = useState('SOC-Analyst-01');
  const [feedbackType, setFeedbackType] = useState<
    | 'reclassify_category'
    | 'adjust_severity'
    | 'dispute_swarm_status'
    | 'add_corroboration'
    | 'flag_false_positive'
  >('reclassify_category');
  const [proposedCategory, setProposedCategory] = useState<SwarmCategory>(
    incident.primary_category
  );
  const [proposedSeverity, setProposedSeverity] = useState<SeverityLevel>(
    incident.severity
  );
  const [proposedVerification, setProposedVerification] =
    useState<VerificationStatus>(incident.verification_status);
  const [rationale, setRationale] = useState('');
  const [supportingUrl, setSupportingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rationale.trim().length < 10) {
      setFeedbackMsg(
        'Please provide at least 10 characters of analytical rationale.'
      );
      return;
    }
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          incident_id: incident.id,
          analyst_handle: analystHandle,
          feedback_type: feedbackType,
          proposed_category: proposedCategory,
          proposed_severity: proposedSeverity,
          proposed_verification: proposedVerification,
          rationale,
          supporting_url: supportingUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackMsg(data.error || 'Failed to submit analyst correction.');
      } else if (data.updatedIncident) {
        setIncident(data.updatedIncident);
        onIncidentUpdated?.(data.updatedIncident);
        setRationale('');
        setSupportingUrl('');
        setShowFeedbackForm(false);
        setFeedbackMsg(
          'Analyst classification override recorded in audit trail.'
        );
      }
    } catch {
      setFeedbackMsg('Network error submitting analyst feedback.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 text-[#f3f5f8]">
      {/* ================================================================== */}
      {/* TOP NAVIGATION & BRIEFING CONTROLS                                 */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-2 text-xs font-display tracking-[0.14em] uppercase text-[#cbd2dc] hover:text-[#f3f5f8] transition cursor-pointer"
            >
              <span className="px-2 py-1 bg-[#f3f5f8] text-[#080a0f] font-mono font-bold text-[10px] tracking-wider">
                ESC
              </span>
              <span className="group-hover:text-[#f5b82e] transition">
                BACK TO OPERATIONS
              </span>
            </button>
          ) : (
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xs font-display tracking-[0.14em] uppercase text-[#cbd2dc] hover:text-[#f3f5f8] transition"
            >
              <ArrowLeft className="w-4 h-4 text-[#f5b82e]" />
              <span>RETURN TO COMMAND CENTER</span>
            </Link>
          )}

          <span className="text-white/15">|</span>
          <span className="font-mono text-xs text-[#8a94a6]">
            DOSSIER // {incident.id.slice(0, 8).toUpperCase()}
          </span>
          <LifecycleBadge lifecycle={incident.record_lifecycle} />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/incidents/${incident.slug}?mode=${incident.operating_mode}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#cbd2dc] hover:text-[#f3f5f8] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition"
          >
            <span>Permalink</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8a94a6]" />
          </Link>

          <button
            type="button"
            onClick={() => setShowFeedbackForm((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
              showFeedbackForm
                ? 'bg-[#f5b82e] text-[#080a0f] border-[#f5b82e]'
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-[#f5b82e] border-[#f5b82e]/35'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Analyst Override</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 bg-[#f5b82e]/10 border-l-2 border-[#f5b82e] text-xs text-[#f3f5f8] flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-[#8a94a6] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* EXPANDABLE ANALYST CLASSIFICATION OVERRIDE DRAWER                  */}
      {/* ================================================================== */}
      {showFeedbackForm && (
        <form
          onSubmit={handleFeedbackSubmit}
          className="bg-[#0c1018] border border-[#f5b82e]/35 p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-[#f3f5f8]">
                ANALYST CLASSIFICATION OVERRIDE
              </h3>
              <p className="text-xs text-[#8a94a6] mt-0.5">
                All classification adjustments are recorded in the permanent audit log.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Analyst Handle
              </label>
              <input
                type="text"
                value={analystHandle}
                onChange={(e) => setAnalystHandle(e.target.value)}
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
                required
              />
            </div>

            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Action Type
              </label>
              <select
                value={feedbackType}
                onChange={(e) =>
                  setFeedbackType(e.target.value as typeof feedbackType)
                }
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              >
                <option value="reclassify_category">Reclassify Category</option>
                <option value="adjust_severity">Adjust Severity Level</option>
                <option value="dispute_swarm_status">Dispute Swarm Status</option>
                <option value="add_corroboration">Add Corroborating Note</option>
                <option value="flag_false_positive">
                  Flag as Ordinary Automation
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Proposed Category
              </label>
              <select
                value={proposedCategory}
                onChange={(e) =>
                  setProposedCategory(e.target.value as SwarmCategory)
                }
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              >
                {Object.entries(SWARM_CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Proposed Severity
              </label>
              <select
                value={proposedSeverity}
                onChange={(e) =>
                  setProposedSeverity(e.target.value as SeverityLevel)
                }
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              >
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.code} — {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Proposed Verification
              </label>
              <select
                value={proposedVerification}
                onChange={(e) =>
                  setProposedVerification(e.target.value as VerificationStatus)
                }
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              >
                {Object.entries(VERIFICATION_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[#8a94a6] mb-1.5">
                Analytical Rationale (Required)
              </label>
              <input
                type="text"
                placeholder="Document the forensic or source evidence supporting this override..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
                required
              />
            </div>
            <div>
              <label className="block text-[#8a94a6] mb-1.5">
                Supporting Source URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={supportingUrl}
                onChange={(e) => setSupportingUrl(e.target.value)}
                className="w-full bg-[#080a0f] border border-white/12 px-3 py-2 text-[#f3f5f8] focus:outline-none focus:border-[#f5b82e]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowFeedbackForm(false)}
              className="px-4 py-2 text-xs text-[#8a94a6] hover:text-white border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-display font-semibold tracking-wider uppercase bg-[#f5b82e] hover:bg-[#fbbf24] text-[#080a0f] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Applying...' : 'Commit Override'}
            </button>
          </div>
        </form>
      )}

      {/* ================================================================== */}
      {/* PRIMARY BRIEFING HEADER & EXECUTIVE OVERVIEW                       */}
      {/* ================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SeverityBadge severity={incident.severity} showCode />
          <VerificationBadge
            status={incident.verification_status}
            independentSources={incident.independent_source_count}
          />
          {incident.categories.map((cat) => (
            <CategoryBadge key={cat} category={cat} />
          ))}
          <SwarmConfirmationBadge
            isConfirmedSwarm={incident.is_confirmed_swarm}
            evidenceStrength={incident.evidence_strength}
            confidence={incident.classification_confidence}
          />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#f3f5f8] leading-tight">
            {incident.title}
          </h1>
          <p className="text-xs text-[#8a94a6]">
            {incident.incident_type} — {incident.main_event}
          </p>
        </div>

        {/* Executive Overview Paragraph */}
        <div className="p-6 bg-[#0c1018] border-l-2 border-[#f5b82e] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#8a94a6]">
            <span className="font-display uppercase tracking-[0.16em] text-[#f3f5f8]">
              :: EXECUTIVE OVERVIEW
            </span>
            <span className="font-mono text-[11px]">
              Processor: {incident.ai_model_used} • {incident.sources.length}{' '}
              Linked Source(s)
            </span>
          </div>
          <p className="text-sm sm:text-base text-[#cbd2dc] leading-relaxed">
            {incident.summary}
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ESSENTIAL INTELLIGENCE MATRIX (4 PILLARS)                          */}
      {/* ================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Geographic Location */}
        <div className="p-4 bg-[#0c1018] border-t border-white/15 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-display tracking-[0.14em] text-[#8a94a6] uppercase">
            <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
            <span>GEOGRAPHIC LOCATION</span>
          </div>
          <div className="text-sm font-medium text-[#f3f5f8] flex items-center gap-1.5 pt-1">
            <Globe className="w-4 h-4 text-[#8a94a6] shrink-0" />
            <span>
              {incident.country_name
                ? `${incident.country_name} (${incident.country_code})`
                : incident.region_name || 'Global / Unspecified'}
            </span>
          </div>
          <p className="text-xs text-[#8a94a6]">
            Precision: {incident.location_precision} • Basis:{' '}
            {incident.location_basis.replace(/_/g, ' ')}
          </p>
        </div>

        {/* 2. Threat Classification & Agent Fleet */}
        <div className="p-4 bg-[#0c1018] border-t border-white/15 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-display tracking-[0.14em] text-[#8a94a6] uppercase">
            <span className="w-2 h-2 rotate-45 bg-[#ef4444]" />
            <span>SWARM ARCHITECTURE</span>
          </div>
          <div className="text-sm font-medium text-[#f3f5f8] pt-1">
            {incident.reported_agent_count !== null
              ? `${incident.reported_agent_count.toLocaleString()} Coordinated Agents`
              : incident.is_confirmed_swarm
                ? 'Multi-Agent Swarm Documented'
                : 'Single-Agent / Unverified'}
          </div>
          <p className="text-xs text-[#8a94a6] line-clamp-2">
            {incident.human_supervision_level || incident.swarm_evidence}
          </p>
        </div>

        {/* 3. Source Reliability */}
        <div className="p-4 bg-[#0c1018] border-t border-white/15 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-display tracking-[0.14em] text-[#8a94a6] uppercase">
            <span>SOURCE RELIABILITY</span>
            <span className="font-mono text-[#f3f5f8]">
              {incident.source_reliability}/100
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] my-2">
            <div
              className="h-full bg-[#f5b82e]"
              style={{ width: `${incident.source_reliability}%` }}
            />
          </div>
          <p className="text-xs text-[#8a94a6]">
            {incident.has_primary_source
              ? 'Direct primary-producer disclosure.'
              : 'Secondary reporting.'}
          </p>
        </div>

        {/* 4. Verification & Evidence Strength */}
        <div className="p-4 bg-[#0c1018] border-t border-white/15 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-display tracking-[0.14em] text-[#8a94a6] uppercase">
            <span>EVIDENCE STRENGTH</span>
            <span className="font-mono text-[#f5b82e] uppercase">
              {incident.evidence_strength}
            </span>
          </div>
          <div className="text-sm font-medium text-[#f3f5f8] pt-1">
            {Math.round(incident.classification_confidence * 100)}% Alignment
          </div>
          <p className="text-xs text-[#8a94a6] line-clamp-2">
            {incident.classification_rationale}
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ASSOCIATED AI ACTORS, ORGANIZATIONS & SOURCE ATTRIBUTION           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Source Attribution & Traceable Quotations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
              :: SOURCE ATTRIBUTION ({incident.sources.length})
            </h2>
            <span className="text-xs text-[#8a94a6]">
              {incident.independent_source_count} independent domain(s)
            </span>
          </div>

          <div className="space-y-3">
            {incident.sources.map(({ link, record, source }) => (
              <div
                key={link.id}
                className="p-4 bg-[#0c1018] border border-white/[0.07] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-white/[0.05] text-[#f5b82e] border border-[#f5b82e]/30">
                      {link.relationship_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-semibold text-[#f3f5f8]">
                      {source.name}
                    </span>
                    <span className="text-xs font-mono text-[#8a94a6]">
                      ({source.reliability_score}/100)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#8a94a6]">
                    {new Date(record.published_at).toISOString().slice(0, 10)}
                  </span>
                </div>

                <div className="text-sm font-medium text-[#cbd2dc]">
                  {record.title}
                </div>

                {link.quotation && (
                  <div className="p-3 bg-white/[0.02] border-l-2 border-white/20 text-xs text-[#8a94a6] italic flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-[#f5b82e] shrink-0 mt-0.5" />
                    <span>{link.quotation}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-mono text-[11px] text-[#64748b] truncate max-w-sm">
                    {record.canonical_url}
                  </span>
                  <a
                    href={record.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#f5b82e] hover:underline font-medium"
                  >
                    <span>Source Publication</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Associated AI Actors, Organizations & Impact */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-2.5">
              <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
                :: ASSOCIATED ACTORS & SYSTEMS ({incident.entities.length})
              </h2>
            </div>

            {incident.entities.length > 0 ? (
              <div className="space-y-2">
                {incident.entities.map(({ link, entity }) => (
                  <div
                    key={link.id}
                    className="p-3.5 bg-[#0c1018] border border-white/[0.07] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#f3f5f8]">
                        {entity.name}
                      </div>
                      <div className="text-xs text-[#8a94a6] mt-0.5 capitalize">
                        {link.role.replace(/_/g, ' ')} •{' '}
                        {entity.entity_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-white/[0.04] text-[#cbd2dc] border border-white/10">
                      {link.relationship_certainty}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8a94a6] p-4 bg-[#0c1018] border border-white/[0.07]">
                No named organizations or agent frameworks extracted from this summary.
              </p>
            )}
          </div>

          {/* Documented Impact */}
          {incident.reported_impact && (
            <div className="p-4 bg-[#0c1018] border-t border-white/15 space-y-1.5">
              <span className="font-display text-xs font-semibold tracking-[0.16em] uppercase text-[#8a94a6]">
                :: DOCUMENTED IMPACT
              </span>
              <p className="text-xs text-[#cbd2dc] leading-relaxed">
                {incident.reported_impact}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* PROGRESSIVE DISCLOSURE SECTIONS                                    */}
      {/* ================================================================== */}
      <div className="space-y-3 pt-2">
        {/* 1. TIMELINE OF DEVELOPMENTS & TEMPORAL SEPARATION */}
        <div className="bg-[#0c1018] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rotate-45 bg-[#f5b82e]" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
                TIMELINE OF DEVELOPMENTS & TEMPORAL SEPARATION
              </span>
            </div>
            {showTimeline ? (
              <ChevronUp className="w-4 h-4 text-[#8a94a6]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8a94a6]" />
            )}
          </button>

          {showTimeline && (
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-5">
              {/* 3-Timestamp Separation Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#080a0f] border border-white/[0.06]">
                  <span className="text-[#8a94a6] block text-[11px]">
                    1. Incident Occurrence Date
                  </span>
                  <span className="font-mono text-[#f3f5f8] mt-1 block">
                    {incident.occurred_at
                      ? `${new Date(incident.occurred_at).toISOString().slice(0, 10)} UTC`
                      : 'Not Stated in Source'}
                  </span>
                </div>
                <div className="p-3 bg-[#080a0f] border border-white/[0.06]">
                  <span className="text-[#8a94a6] block text-[11px]">
                    2. First Source Publication
                  </span>
                  <span className="font-mono text-[#f3f5f8] mt-1 block">
                    {new Date(incident.first_published_at)
                      .toISOString()
                      .replace('T', ' ')
                      .slice(0, 16)}{' '}
                    UTC
                  </span>
                </div>
                <div className="p-3 bg-[#080a0f] border border-white/[0.06]">
                  <span className="text-[#8a94a6] block text-[11px]">
                    3. Platform Ingestion Timestamp
                  </span>
                  <span className="font-mono text-[#f3f5f8] mt-1 block">
                    {new Date(incident.discovered_at)
                      .toISOString()
                      .replace('T', ' ')
                      .slice(0, 16)}{' '}
                    UTC
                  </span>
                </div>
              </div>

              {/* Chronological Events */}
              <div className="space-y-3 pl-3 border-l border-white/15">
                {(incident.timeline || []).map((ev) => (
                  <div key={ev.id} className="relative pl-4">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rotate-45 bg-[#f5b82e]" />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[11px] uppercase text-[#f5b82e]">
                        {ev.phase_type}
                      </span>
                      <span className="font-mono text-[11px] text-[#8a94a6]">
                        {new Date(ev.event_time)
                          .toISOString()
                          .replace('T', ' ')
                          .slice(0, 16)}{' '}
                        UTC
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#f3f5f8] mt-0.5">
                      {ev.title}
                    </div>
                    <p className="text-xs text-[#8a94a6] mt-0.5">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. ANALYTICAL DECOMPOSITION (KNOWN FACTS VS UNCERTAINTIES) */}
        <div className="bg-[#0c1018] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowAnalyticalDecomp((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rotate-45 border border-[#f5b82e]" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
                ANALYTICAL DECOMPOSITION: FACTS VS. UNCERTAINTIES
              </span>
            </div>
            {showAnalyticalDecomp ? (
              <ChevronUp className="w-4 h-4 text-[#8a94a6]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8a94a6]" />
            )}
          </button>

          {showAnalyticalDecomp && (
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-[#080a0f] border border-white/[0.06] space-y-2">
                <span className="font-display uppercase tracking-wider text-[#f3f5f8] block">
                  Documented Facts ({incident.known_facts.length})
                </span>
                <ul className="space-y-1.5 text-[#cbd2dc] list-disc list-inside">
                  {incident.known_facts.map((fact, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[#080a0f] border border-white/[0.06] space-y-2">
                <span className="font-display uppercase tracking-wider text-[#f5b82e] block">
                  Uncertainties ({incident.uncertainties.length})
                </span>
                {incident.uncertainties.length > 0 ? (
                  <ul className="space-y-1.5 text-[#cbd2dc] list-disc list-inside">
                    {incident.uncertainties.map((u, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {u}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#8a94a6]">
                    No major unresolved uncertainties flagged.
                  </p>
                )}
              </div>

              <div className="p-4 bg-[#080a0f] border border-white/[0.06] space-y-2">
                <span className="font-display uppercase tracking-wider text-[#ef4444] block">
                  Contradictions ({incident.contradictions.length})
                </span>
                {incident.contradictions.length > 0 ? (
                  <ul className="space-y-1.5 text-[#fca5a5] list-disc list-inside">
                    {incident.contradictions.map((c, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#8a94a6]">
                    No conflicting accounts across linked sources.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. CLASSIFICATION AUDIT TRAIL */}
        <div className="bg-[#0c1018] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowAuditHistory((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rotate-45 border border-[#8a94a6]" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#cbd2dc]">
                CLASSIFICATION AUDIT HISTORY (
                {(incident.classification_history || []).length})
              </span>
            </div>
            {showAuditHistory ? (
              <ChevronUp className="w-4 h-4 text-[#8a94a6]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8a94a6]" />
            )}
          </button>

          {showAuditHistory && (
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-2.5 text-xs">
              {(incident.classification_history || []).map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 bg-[#080a0f] border border-white/[0.06] space-y-1"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#f5b82e]">{ch.model_or_actor}</span>
                    <span className="text-[#8a94a6]">
                      {new Date(ch.classified_at)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16)}{' '}
                      UTC
                    </span>
                  </div>
                  <div className="text-[#cbd2dc]">
                    Category: {ch.new_category} • Severity: {ch.new_severity} •
                    Verification: {ch.new_verification}
                  </div>
                  <p className="text-[#8a94a6]">{ch.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* RELATED INCIDENTS                                                  */}
      {/* ================================================================== */}
      {incident.related_incidents && incident.related_incidents.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="border-b border-white/10 pb-2.5">
            <h2 className="font-display text-xs font-semibold tracking-[0.18em] uppercase text-[#f3f5f8]">
              :: RELATED INTELLIGENCE DOSSIERS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incident.related_incidents.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelatedIncident?.(rel.slug)}
                className="p-4 bg-[#0c1018] hover:bg-[#111621] border border-white/[0.07] hover:border-[#f5b82e]/40 cursor-pointer transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <SeverityBadge severity={rel.severity} />
                  <span className="font-mono text-[11px] text-[#8a94a6]">
                    {new Date(rel.first_published_at).toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="text-sm font-medium text-[#f3f5f8] line-clamp-2">
                  {rel.title}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
