import crypto from 'crypto';
import {
  classifyIncidentReport,
  isRelevantToAISwarmIntelligence,
} from '../classification/classifier';
import {
  loadDatabase,
  recordAuditLog,
  saveDatabase,
} from '../db';
import { resolveSupportedLocation } from '../geo';
import {
  Entity,
  Incident,
  OperatingMode,
  Source,
  SourceRecord,
  SourceRun,
} from '../types';
import {
  executeSourceConnector,
  ParsedConnectorRecord,
} from './connectors';
import { findCorrelatedIncident } from './deduplicator';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export interface IngestionPipelineResult {
  startedAt: string;
  completedAt: string;
  mode: OperatingMode;
  sourcesChecked: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  totalRetrieved: number;
  totalAccepted: number;
  totalDuplicates: number;
  totalIrrelevantFiltered: number;
  newIncidentsCreated: number;
  existingIncidentsCorroborated: number;
  runs: SourceRun[];
}

/**
 * Runs the real-world ingestion, deduplication, correlation, and AI-assisted
 * classification pipeline across all enabled sources (or a specific sourceSlug).
 */
export async function runIngestionPipeline(options?: {
  sourceSlug?: string;
  triggerType?: 'scheduled' | 'manual' | 'startup' | 'seed';
  force?: boolean;
  maxAiCallsPerRun?: number;
}): Promise<IngestionPipelineResult> {
  const startedAt = new Date().toISOString();
  const triggerType = options?.triggerType || 'manual';
  const maxAiCalls = options?.maxAiCallsPerRun ?? 8;
  let aiCallsUsed = 0;

  const db = loadDatabase();
  const store = db.live;

  const targetSources = store.sources.filter((s) => {
    if (options?.sourceSlug) return s.slug === options.sourceSlug;
    return s.enabled;
  });

  const runs: SourceRun[] = [];
  let sourcesSucceeded = 0;
  let sourcesFailed = 0;
  let totalRetrieved = 0;
  let totalAccepted = 0;
  let totalDuplicates = 0;
  let totalIrrelevantFiltered = 0;
  let newIncidentsCreated = 0;
  let existingIncidentsCorroborated = 0;

  // Bounded concurrency batching (4 connectors at a time)
  const BATCH_SIZE = 4;
  for (let i = 0; i < targetSources.length; i += BATCH_SIZE) {
    const batch = targetSources.slice(i, i + BATCH_SIZE);

    const connectorResults = await Promise.all(
      batch.map(async (source) => {
        const nowMs = Date.now();
        const lastAttemptMs = source.last_attempted_run_at
          ? Date.parse(source.last_attempted_run_at)
          : 0;

        // Enforce rate-limit cooldown unless forced
        if (
          !options?.force &&
          lastAttemptMs > 0 &&
          nowMs - lastAttemptMs < Math.min(source.rate_limit_seconds * 1000, 15000)
        ) {
          return {
            source,
            skippedCooldown: true,
            fetchResult: null,
          };
        }

        source.last_attempted_run_at = new Date().toISOString();
        const fetchResult = await executeSourceConnector(source);
        return {
          source,
          skippedCooldown: false,
          fetchResult,
        };
      })
    );

    for (const item of connectorResults) {
      const { source, skippedCooldown, fetchResult } = item;
      const runStarted = new Date().toISOString();

      if (skippedCooldown || !fetchResult) {
        const skippedRun: SourceRun = {
          id: crypto.randomUUID(),
          source_id: source.id,
          source_name: source.name,
          started_at: runStarted,
          completed_at: new Date().toISOString(),
          status: 'skipped_rate_limit',
          trigger_type: triggerType,
          records_retrieved: 0,
          records_accepted: 0,
          duplicates_detected: 0,
          irrelevant_filtered: 0,
          processing_errors: 0,
          error_message: 'Skipped: within source rate-limit cooldown window',
          duration_ms: 0,
          operating_mode: 'live',
        };
        store.source_runs.unshift(skippedRun);
        runs.push(skippedRun);
        continue;
      }

      if (
        fetchResult.status === 'failed' ||
        fetchResult.status === 'rate_limited'
      ) {
        sourcesFailed += 1;
        source.status =
          fetchResult.status === 'rate_limited' ? 'rate_limited' : 'degraded';
        source.last_error = fetchResult.errorMessage;
        source.updated_at = new Date().toISOString();

        const failedRun: SourceRun = {
          id: crypto.randomUUID(),
          source_id: source.id,
          source_name: source.name,
          started_at: runStarted,
          completed_at: new Date().toISOString(),
          status:
            fetchResult.status === 'rate_limited'
              ? 'skipped_rate_limit'
              : 'failed',
          trigger_type: triggerType,
          records_retrieved: 0,
          records_accepted: 0,
          duplicates_detected: 0,
          irrelevant_filtered: 0,
          processing_errors: 1,
          error_message: fetchResult.errorMessage,
          duration_ms: fetchResult.durationMs,
          operating_mode: 'live',
        };
        store.source_runs.unshift(failedRun);
        runs.push(failedRun);
        continue;
      }

      sourcesSucceeded += 1;
      let runAccepted = 0;
      let runDuplicates = 0;
      let runIrrelevant = 0;
      let runErrors = 0;

      totalRetrieved += fetchResult.records.length;

      for (const parsedRec of fetchResult.records) {
        try {
          // 1. Deterministic idempotency check (external_id or canonical_url or content_hash)
          const isDuplicate = store.source_records.some(
            (existing) =>
              (existing.source_id === source.id &&
                existing.external_id === parsedRec.external_id) ||
              existing.canonical_url === parsedRec.canonical_url ||
              existing.content_hash === parsedRec.content_hash
          );

          if (isDuplicate) {
            runDuplicates += 1;
            totalDuplicates += 1;
            continue;
          }

          // 2. Fast relevance triage before invoking AI / incident creation
          if (
            !isRelevantToAISwarmIntelligence(
              parsedRec.title,
              parsedRec.raw_excerpt,
              source.slug
            )
          ) {
            runIrrelevant += 1;
            totalIrrelevantFiltered += 1;
            continue;
          }

          // 3. Persist the SourceRecord
          const nowIso = new Date().toISOString();
          const newRecord: SourceRecord = {
            id: crypto.randomUUID(),
            source_id: source.id,
            external_id: parsedRec.external_id,
            original_url: parsedRec.original_url,
            canonical_url: parsedRec.canonical_url,
            title: parsedRec.title,
            normalized_title: parsedRec.normalized_title,
            author: parsedRec.author,
            published_at: parsedRec.published_at,
            retrieved_at: nowIso,
            raw_excerpt: parsedRec.raw_excerpt,
            quotation_snippet: parsedRec.quotation_snippet,
            citation_group_id: parsedRec.citation_group_id,
            content_hash: parsedRec.content_hash,
            is_primary_source: parsedRec.is_primary_source,
            raw_metadata: parsedRec.raw_metadata,
            operating_mode: 'live',
          };
          store.source_records.unshift(newRecord);
          runAccepted += 1;
          totalAccepted += 1;
          source.total_records_fetched += 1;

          // 4. Check for multi-source incident correlation
          const recordsByIncident = new Map<string, SourceRecord[]>();
          for (const link of store.incident_sources) {
            const rec = store.source_records.find(
              (r) => r.id === link.source_record_id
            );
            if (rec) {
              const list = recordsByIncident.get(link.incident_id) || [];
              list.push(rec);
              recordsByIncident.set(link.incident_id, list);
            }
          }

          const correlation = findCorrelatedIncident(
            newRecord,
            store.incidents,
            recordsByIncident
          );

          if (correlation) {
            const matchedIncident = correlation.incident;
            store.incident_sources.push({
              id: crypto.randomUUID(),
              incident_id: matchedIncident.id,
              source_record_id: newRecord.id,
              source_id: source.id,
              relationship_type: correlation.relationshipType,
              extracted_claims: [
                newRecord.title,
                newRecord.raw_excerpt.slice(0, 220),
              ],
              quotation: newRecord.quotation_snippet,
              similarity_score: correlation.similarityScore,
              linked_at: nowIso,
            });

            matchedIncident.record_lifecycle = 'merged';
            matchedIncident.updated_at = nowIso;
            if (newRecord.is_primary_source) {
              matchedIncident.has_primary_source = true;
            }

            if (correlation.relationshipType === 'independent_corroboration') {
              matchedIncident.independent_source_count += 1;
              const prevVerification = matchedIncident.verification_status;
              if (
                matchedIncident.independent_source_count >= 2 &&
                matchedIncident.evidence_strength !== 'weak'
              ) {
                matchedIncident.verification_status = 'corroborated';
              }

              store.incident_timeline.push({
                id: crypto.randomUUID(),
                incident_id: matchedIncident.id,
                event_time: newRecord.published_at,
                phase_type: 'corroboration',
                title: `Corroborating Report Linked (${source.name})`,
                description: `${correlation.reason}: "${newRecord.title}"`,
                source_record_id: newRecord.id,
                created_at: nowIso,
              });

              if (prevVerification !== matchedIncident.verification_status) {
                store.classification_history.unshift({
                  id: crypto.randomUUID(),
                  incident_id: matchedIncident.id,
                  classified_at: nowIso,
                  model_or_actor: 'correlation-engine-v1',
                  previous_category: matchedIncident.primary_category,
                  new_category: matchedIncident.primary_category,
                  previous_severity: matchedIncident.severity,
                  new_severity: matchedIncident.severity,
                  previous_verification: prevVerification,
                  new_verification: matchedIncident.verification_status,
                  confidence_score: matchedIncident.classification_confidence,
                  rationale: `Upgraded verification status to Corroborated after independent source (${source.name}) corroborated core event claims.`,
                  is_manual_override: false,
                });
              }
            }

            source.total_incidents_linked += 1;
            existingIncidentsCorroborated += 1;
            continue;
          }

          // 5. Classify new incident (respect per-run AI quota)
          await createNewIncidentFromRecord(
            newRecord,
            parsedRec,
            source,
            store,
            aiCallsUsed < maxAiCalls
          );
          aiCallsUsed += 1;
          source.total_incidents_linked += 1;
          newIncidentsCreated += 1;
        } catch {
          runErrors += 1;
        }
      }

      source.last_successful_run_at = new Date().toISOString();
      source.last_error = null;
      source.status = runAccepted > 0 ? 'healthy' : 'no_new_reports';
      source.updated_at = new Date().toISOString();

      const completedRun: SourceRun = {
        id: crypto.randomUUID(),
        source_id: source.id,
        source_name: source.name,
        started_at: runStarted,
        completed_at: new Date().toISOString(),
        status: runErrors > 0 && runAccepted === 0 ? 'partial' : 'succeeded',
        trigger_type: triggerType,
        records_retrieved: fetchResult.records.length,
        records_accepted: runAccepted,
        duplicates_detected: runDuplicates,
        irrelevant_filtered: runIrrelevant,
        processing_errors: runErrors,
        error_message: null,
        duration_ms: fetchResult.durationMs,
        operating_mode: 'live',
      };
      store.source_runs.unshift(completedRun);
      runs.push(completedRun);
    }
  }

  // Keep source_runs bounded to most recent 150 entries
  if (store.source_runs.length > 150) {
    store.source_runs = store.source_runs.slice(0, 150);
  }

  saveDatabase(db);

  recordAuditLog({
    action: 'run_ingestion_pipeline',
    actor: triggerType,
    target_type: 'pipeline',
    target_id: options?.sourceSlug || 'all_enabled_sources',
    status: 'allowed',
    metadata: {
      sourcesChecked: targetSources.length,
      sourcesSucceeded,
      sourcesFailed,
      totalRetrieved,
      totalAccepted,
      newIncidentsCreated,
      existingIncidentsCorroborated,
    },
  });

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    mode: 'live',
    sourcesChecked: targetSources.length,
    sourcesSucceeded,
    sourcesFailed,
    totalRetrieved,
    totalAccepted,
    totalDuplicates,
    totalIrrelevantFiltered,
    newIncidentsCreated,
    existingIncidentsCorroborated,
    runs,
  };
}

async function createNewIncidentFromRecord(
  record: SourceRecord,
  parsedRec: ParsedConnectorRecord,
  source: Source,
  store: ReturnType<typeof loadDatabase>['live'],
  allowExternalAiCall: boolean
): Promise<Incident> {
  const { classifyWithRuleEngine } = await import(
    '../classification/classifier'
  );

  const articleInput = {
    sourceSlug: source.slug,
    sourceName: source.name,
    sourceReliability: source.reliability_score,
    isPrimaryProducer: source.is_primary_producer,
    externalId: record.external_id,
    title: record.title,
    excerpt: record.raw_excerpt,
    originalUrl: record.original_url,
    publishedAt: record.published_at,
    occurredAtHint: parsedRec.occurred_at_hint || null,
  };

  const { output: classified, modelUsed } = allowExternalAiCall
    ? await classifyIncidentReport(articleInput)
    : classifyWithRuleEngine(articleInput);

  const geo = resolveSupportedLocation({
    country_code: classified.country_code,
    country_name: classified.country_name,
    region_name: classified.region_name,
    location_precision: classified.location_precision,
    location_basis: classified.location_basis,
  });

  const nowIso = new Date().toISOString();
  const baseSlug = slugify(record.title) || 'incident';
  const uniqueSlug = `${baseSlug}-${record.id.slice(0, 6)}`;

  const incident: Incident = {
    id: crypto.randomUUID(),
    slug: uniqueSlug,
    title: record.title,
    summary: classified.summary,
    main_event: classified.main_event,
    incident_type: classified.incident_type,
    primary_category: classified.classification,
    categories: classified.secondary_categories,
    severity: classified.severity,
    verification_status: classified.verification_status,
    source_reliability: source.reliability_score,
    evidence_strength: classified.evidence_strength,
    classification_confidence: classified.confidence_score,
    swarm_evidence: classified.swarm_evidence,
    evidence_summary: classified.evidence_summary,
    classification_rationale: classified.classification_rationale,
    known_facts: classified.known_facts,
    uncertainties: classified.uncertainties,
    contradictions: classified.contradictions,
    reported_agent_count: classified.reported_agent_count,
    reported_agent_count_note: classified.reported_agent_count_note,
    human_supervision_level: classified.human_supervision_level,
    reported_impact: classified.reported_impact,
    affected_systems: classified.affected_systems,
    affected_industries: classified.affected_industries,
    country_code: geo.country_code,
    country_name: geo.country_name,
    region_name: geo.region_name,
    latitude: geo.latitude,
    longitude: geo.longitude,
    location_precision: geo.location_precision,
    location_basis: geo.location_basis,
    occurred_at: classified.occurred_at,
    first_published_at: record.published_at,
    discovered_at: nowIso,
    updated_at: nowIso,
    record_lifecycle: 'new',
    independent_source_count: 1,
    has_primary_source: record.is_primary_source,
    ai_model_used: modelUsed,
    is_confirmed_swarm: classified.is_confirmed_swarm,
    operating_mode: 'live',
  };

  store.incidents.unshift(incident);

  // Link primary source record
  store.incident_sources.push({
    id: crypto.randomUUID(),
    incident_id: incident.id,
    source_record_id: record.id,
    source_id: source.id,
    relationship_type: 'primary_report',
    extracted_claims: classified.known_facts.slice(0, 3),
    quotation: record.quotation_snippet,
    similarity_score: 1.0,
    linked_at: nowIso,
  });

  // Upsert extracted entities and link them
  for (const extEnt of classified.entities) {
    const entSlug = slugify(extEnt.name);
    if (!entSlug) continue;
    let entity: Entity | undefined = store.entities.find(
      (e) => e.slug === entSlug
    );
    if (!entity) {
      entity = {
        id: crypto.randomUUID(),
        slug: entSlug,
        name: extEnt.name,
        entity_type: extEnt.entity_type,
        aliases: [],
        description: `${extEnt.entity_type.replace(/_/g, ' ')} identified in public threat intelligence reporting.`,
        country_code: geo.country_code,
        first_seen_at: record.published_at,
        last_seen_at: record.published_at,
        match_confidence: 0.9,
        operating_mode: 'live',
      };
      store.entities.push(entity);
    } else if (
      Date.parse(record.published_at) > Date.parse(entity.last_seen_at)
    ) {
      entity.last_seen_at = record.published_at;
    }

    const alreadyLinked = store.incident_entities.some(
      (ie) =>
        ie.incident_id === incident.id &&
        ie.entity_id === entity!.id &&
        ie.role === extEnt.role
    );
    if (!alreadyLinked) {
      store.incident_entities.push({
        id: crypto.randomUUID(),
        incident_id: incident.id,
        entity_id: entity.id,
        role: extEnt.role,
        relationship_certainty: extEnt.relationship_certainty,
        evidence_note: extEnt.evidence_note,
      });
    }
  }

  // Timeline events (separating occurrence, publication, ingestion, classification)
  if (incident.occurred_at) {
    store.incident_timeline.push({
      id: crypto.randomUUID(),
      incident_id: incident.id,
      event_time: incident.occurred_at,
      phase_type: 'occurrence',
      title: 'Reported Incident Occurrence Window',
      description: `Documented occurrence date/period for: ${incident.main_event}`,
      source_record_id: record.id,
      created_at: nowIso,
    });
  }

  store.incident_timeline.push({
    id: crypto.randomUUID(),
    incident_id: incident.id,
    event_time: record.published_at,
    phase_type: 'publication',
    title: `Source Report Published (${source.name})`,
    description: `Published "${record.title}" at ${record.original_url}`,
    source_record_id: record.id,
    created_at: nowIso,
  });

  store.incident_timeline.push({
    id: crypto.randomUUID(),
    incident_id: incident.id,
    event_time: nowIso,
    phase_type: 'ingestion',
    title: 'Ingested & Classified by AI Swarm Detector',
    description: `Classified via ${modelUsed} as ${incident.primary_category} (${incident.severity} severity, ${incident.verification_status} verification).`,
    source_record_id: record.id,
    created_at: nowIso,
  });

  store.classification_history.unshift({
    id: crypto.randomUUID(),
    incident_id: incident.id,
    classified_at: nowIso,
    model_or_actor: modelUsed,
    previous_category: null,
    new_category: incident.primary_category,
    previous_severity: null,
    new_severity: incident.severity,
    previous_verification: null,
    new_verification: incident.verification_status,
    confidence_score: incident.classification_confidence,
    rationale: incident.classification_rationale,
    is_manual_override: false,
  });

  return incident;
}
