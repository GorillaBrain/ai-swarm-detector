'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  FileText,
  Flag,
  GitMerge,
  Globe,
  HelpCircle,
  History,
  Quote,
  Scale,
  ShieldAlert,
  Sparkles,
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
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
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
      setFeedbackMsg('Please provide at least 10 characters of analytical rationale.');
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
          'Analyst override recorded and logged in classification history.'
        );
      }
    } catch {
      setFeedbackMsg('Network error submitting analyst feedback.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0f17] border border-slate-800/90 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Command Center</span>
            </Link>
          )}
          <div className="text-xs font-mono text-slate-400">
            DOSSIER ID: <span className="text-slate-200">{incident.id}</span>
          </div>
          <LifecycleBadge lifecycle={incident.record_lifecycle} />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/incidents/${incident.slug}?mode=${incident.operating_mode}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Standalone Permalink</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowFeedbackForm((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-amber-950/80 hover:bg-amber-900/80 text-amber-200 border border-amber-700/70 rounded transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report / Override Classification</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded bg-emerald-950/70 border border-emerald-700/70 text-emerald-200 text-xs font-mono flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Analyst Feedback & Classification Override Drawer */}
      {showFeedbackForm && (
        <form
          onSubmit={handleFeedbackSubmit}
          className="bg-[#0e1420] border border-amber-700/60 rounded-lg p-4 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Analyst Classification Correction & Evidence Review
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              All changes are preserved in Classification History & Audit Log
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Analyst Handle
              </label>
              <input
                type="text"
                value={analystHandle}
                onChange={(e) => setAnalystHandle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Correction Type
              </label>
              <select
                value={feedbackType}
                onChange={(e) =>
                  setFeedbackType(e.target.value as typeof feedbackType)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="reclassify_category">Reclassify Category</option>
                <option value="adjust_severity">Adjust Severity Level</option>
                <option value="dispute_swarm_status">Dispute Swarm Status</option>
                <option value="add_corroboration">Add Corroborating Note</option>
                <option value="flag_false_positive">
                  Flag as False Positive (Ordinary Automation)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Proposed Category
              </label>
              <select
                value={proposedCategory}
                onChange={(e) =>
                  setProposedCategory(e.target.value as SwarmCategory)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              >
                {Object.entries(SWARM_CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Proposed Severity
              </label>
              <select
                value={proposedSeverity}
                onChange={(e) =>
                  setProposedSeverity(e.target.value as SeverityLevel)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              >
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.code} - {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Proposed Verification
              </label>
              <select
                value={proposedVerification}
                onChange={(e) =>
                  setProposedVerification(e.target.value as VerificationStatus)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              >
                {Object.entries(VERIFICATION_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-mono mb-1">
                Analytical Rationale (Required, min 10 chars)
              </label>
              <input
                type="text"
                placeholder="Explain the forensic or source evidence supporting this classification change..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1">
                Supporting Source URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={supportingUrl}
                onChange={(e) => setSupportingUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowFeedbackForm(false)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-900 text-slate-300 border border-slate-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-mono bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded disabled:opacity-50"
            >
              {submitting ? 'Applying Override...' : 'Commit Analyst Override'}
            </button>
          </div>
        </form>
      )}

      {/* Primary Header Card */}
      <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
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

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-50 leading-snug">
            {incident.title}
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-1">
            Incident Type: {incident.incident_type} • Main Event:{' '}
            {incident.main_event}
          </p>
        </div>

        {/* AI Provenance Notice & Summary */}
        <div className="p-3.5 rounded bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                AI-Assisted Structured Summary & Extraction (Processor:{' '}
                {incident.ai_model_used})
              </span>
            </span>
            <span>
              Traceable to {incident.sources.length} source record(s)
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {incident.summary}
          </p>
        </div>

        {/* 3-Timestamp Separation Bar (Occurrence vs Publication vs Ingestion) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>Incident Occurrence Date</span>
            </div>
            <div className="text-slate-100 mt-1">
              {incident.occurred_at
                ? `${new Date(incident.occurred_at).toISOString().slice(0, 10)} UTC`
                : 'Not Stated in Source (Unknown)'}
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>First Report Published</span>
            </div>
            <div className="text-slate-100 mt-1">
              {new Date(incident.first_published_at)
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19)}{' '}
              UTC
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Platform Discovery / Ingest</span>
            </div>
            <div className="text-slate-100 mt-1">
              {new Date(incident.discovered_at)
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19)}{' '}
              UTC
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <History className="w-3 h-3 text-purple-400" />
              <span>Last Record Update</span>
            </div>
            <div className="text-slate-100 mt-1">
              {new Date(incident.updated_at)
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19)}{' '}
              UTC
            </div>
          </div>
        </div>
      </div>

      {/* 3-Dimension Trust & Confidence Matrix (Section 8: Confidence Is Not Truth) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span>1. SOURCE RELIABILITY</span>
            <span className="text-cyan-300 font-bold">
              {incident.source_reliability}/100
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${incident.source_reliability}%` }}
            />
          </div>
          <p className="text-xs text-slate-300">
            Measures historical editorial and forensic trustworthiness of the reporting publication(s).{' '}
            {incident.has_primary_source
              ? 'Includes direct primary-producer intelligence.'
              : 'Derived from secondary or aggregator reporting.'}
          </p>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span>2. EVIDENCE STRENGTH</span>
            <span className="uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
              {incident.evidence_strength}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            {incident.swarm_evidence}
          </p>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span>3. CLASSIFICATION ALIGNMENT</span>
            <span className="text-emerald-300 font-bold">
              {Math.round(incident.classification_confidence * 100)}% (Uncalibrated)
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {incident.classification_rationale}
          </p>
        </div>
      </div>

      {/* Main Two-Column Investigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Sources, Claims, Quotations, Facts vs Uncertainties */}
        <div className="lg:col-span-7 space-y-5">
          {/* Contributing Sources & Quotations */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Supporting Sources & Traceable Quotations ({incident.sources.length})
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {incident.independent_source_count} independent domain(s)
              </span>
            </div>

            <div className="space-y-3">
              {incident.sources.map(({ link, record, source }) => (
                <div
                  key={link.id}
                  className="p-3.5 rounded bg-slate-950/90 border border-slate-800/90 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-cyan-950/90 text-cyan-300 border border-cyan-700/60">
                        {link.relationship_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {source.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        (Reliability: {source.reliability_score}/100)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Published:{' '}
                      {new Date(record.published_at)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16)}{' '}
                      UTC
                    </span>
                  </div>

                  <div className="text-xs font-medium text-slate-100">
                    {record.title}
                  </div>

                  {link.quotation && (
                    <div className="p-2.5 rounded bg-slate-900/90 border-l-2 border-cyan-500 text-xs text-slate-300 italic flex items-start gap-2">
                      <Quote className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{link.quotation}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-slate-400 truncate max-w-md">
                      Canonical: {record.canonical_url}
                    </span>
                    <a
                      href={record.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                    >
                      <span>Open Original Publication</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Known Facts vs Uncertain Claims vs Contradictions */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2.5">
              Analytical Decomposition: Known Facts vs. Uncertainties & Contradictions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-800/50">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-emerald-300 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Documented Facts ({incident.known_facts.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                  {incident.known_facts.map((fact, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded bg-amber-950/20 border border-amber-800/50">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-amber-300 mb-2">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    Unresolved Uncertainties ({incident.uncertainties.length})
                  </span>
                </div>
                {incident.uncertainties.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                    {incident.uncertainties.map((u, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {u}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    No major unresolved uncertainties flagged.
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded bg-red-950/20 border border-red-900/50">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-red-300 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  Conflicting / Contradictory Accounts ({incident.contradictions.length})
                </span>
              </div>
              {incident.contradictions.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-red-200 list-disc list-inside">
                  {incident.contradictions.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  No contradictory claims detected across linked sources.
                </p>
              )}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Chronological Event & Ingestion Timeline
              </h2>
            </div>
            <div className="space-y-3 pl-2 border-l border-slate-800">
              {(incident.timeline || []).map((ev) => (
                <div key={ev.id} className="relative pl-4">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-slate-950" />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="uppercase px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                      {ev.phase_type}
                    </span>
                    <span className="text-slate-400">
                      {new Date(ev.event_time)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 19)}{' '}
                      UTC
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 mt-1">
                    {ev.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ev.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Agent Architecture, Entities, Geolocation, History, Related */}
        <div className="lg:col-span-5 space-y-5">
          {/* Swarm & Agent Architecture Telemetry */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Swarm Architecture & Impact Assessment
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-mono text-[10px] uppercase text-slate-400 block">
                  Reported Number of AI Agents
                </span>
                <span className="text-sm font-mono font-bold text-cyan-300">
                  {incident.reported_agent_count !== null
                    ? `${incident.reported_agent_count} Agents Documented`
                    : 'Unknown / Not Explicitly Stated'}
                </span>
                {incident.reported_agent_count_note && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {incident.reported_agent_count_note}
                  </p>
                )}
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-mono text-[10px] uppercase text-slate-400 block">
                  Human Supervision / Autonomy Level
                </span>
                <span className="text-slate-200 font-medium">
                  {incident.human_supervision_level || 'Not documented'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-mono text-[10px] uppercase text-slate-400 block">
                  Documented Impact
                </span>
                <span className="text-slate-200">
                  {incident.reported_impact || 'Not specified in source excerpt'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1">
                  Geographic Attribution & Basis
                </span>
                <div className="flex items-center gap-2 text-slate-200 font-mono">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {incident.country_name
                      ? `${incident.country_name} (${incident.country_code}) — ${incident.region_name}`
                      : incident.region_name || 'Location Unspecified / Global'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Precision: {incident.location_precision} • Attribution Basis:{' '}
                  {incident.location_basis.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Named Organizations, Actors & Agent Frameworks */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Named Organizations, Actors & Frameworks ({incident.entities.length})
              </h2>
            </div>

            {incident.entities.length > 0 ? (
              <div className="space-y-2">
                {incident.entities.map(({ link, entity }) => (
                  <div
                    key={link.id}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-100">
                          {entity.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        Role: {link.role.replace(/_/g, ' ')} • Type:{' '}
                        {entity.entity_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                        link.relationship_certainty === 'confirmed'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {link.relationship_certainty}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No specific named organizations or agent frameworks extracted from this excerpt.
              </p>
            )}
          </div>

          {/* Classification History Audit Trail */}
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <History className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Classification & Verification History
              </h2>
            </div>

            <div className="space-y-2.5">
              {(incident.classification_history || []).map((ch) => (
                <div
                  key={ch.id}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-cyan-300">{ch.model_or_actor}</span>
                    <span className="text-slate-400">
                      {new Date(ch.classified_at)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16)}{' '}
                      UTC
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    Category: {ch.new_category} • Severity: {ch.new_severity} •
                    Verification: {ch.new_verification}
                  </div>
                  <p className="text-slate-400 text-[11px]">{ch.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related Incidents */}
          {incident.related_incidents && incident.related_incidents.length > 0 && (
            <div className="bg-[#0b0f17] border border-slate-800/90 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <GitMerge className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Related Intelligence Reports
                </h2>
              </div>

              <div className="space-y-2">
                {incident.related_incidents.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectRelatedIncident?.(rel.slug)}
                    className="p-2.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <SeverityBadge severity={rel.severity} />
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(rel.first_published_at)
                          .toISOString()
                          .slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium line-clamp-2">
                      {rel.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
