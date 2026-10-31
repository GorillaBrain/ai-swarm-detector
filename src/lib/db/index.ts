import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AuditLog,
  ClassificationHistoryEntry,
  EnrichedIncident,
  Entity,
  Incident,
  IncidentEntityLink,
  IncidentSourceLink,
  IncidentTimelineEvent,
  OperatingMode,
  SEVERITY_META,
  SeverityLevel,
  Source,
  SourceRecord,
  SourceRun,
  SwarmCategory,
  UserFeedback,
  VerificationStatus,
  Watchlist,
  WatchlistItem,
} from '../types';
import { INITIAL_SOURCES } from '../ingestion/connectors';
import { hasConfirmedSwarmIndicators } from '../classification/classifier';
import {
  buildSyntheticDemoSnapshot,
  RelationalStoreSnapshot,
} from './demo-seed';
import { isSupabaseConfigured } from './supabase';

export interface CompleteDatabaseFile {
  live: RelationalStoreSnapshot;
  demo: RelationalStoreSnapshot;
  audit_logs: AuditLog[];
  last_saved_at: string;
}

const IS_SERVERLESS =
  Boolean(process.env.VERCEL) || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

function getRuntimeDbFilePath(): string {
  if (IS_SERVERLESS) {
    return path.join('/tmp', 'ai_swarm_detector_db.json');
  }
  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'ai_swarm_detector_db.json');
}

function getBundledSnapshotPath(): string {
  return path.join(process.cwd(), 'src', 'lib', 'db', 'initial-live-snapshot.json');
}

function createInitialLiveStore(): RelationalStoreSnapshot {
  const bundledPath = getBundledSnapshotPath();
  if (fs.existsSync(bundledPath)) {
    try {
      const raw = fs.readFileSync(bundledPath, 'utf-8');
      const parsed = JSON.parse(raw) as RelationalStoreSnapshot;
      if (parsed && Array.isArray(parsed.sources) && Array.isArray(parsed.incidents)) {
        return parsed;
      }
    } catch {
      // Fallback to empty live store with initial sources
    }
  }

  const now = new Date().toISOString();
  const sources: Source[] = INITIAL_SOURCES.map((s, index) => ({
    ...s,
    id: `src-live-${index + 1}`,
    last_successful_run_at: null,
    last_attempted_run_at: null,
    last_error:
      s.status === 'unavailable'
        ? 'Upstream endpoint does not expose a public unauthenticated RSS feed.'
        : null,
    total_records_fetched: 0,
    total_incidents_linked: 0,
    created_at: now,
    updated_at: now,
  }));

  const defaultWatchlistId = 'wl-live-default-1';
  const watchlists: Watchlist[] = [
    {
      id: defaultWatchlistId,
      name: 'High-Severity Agentic Cyber & Swarm Operations',
      description:
        'Default SOC watchlist tracking confirmed or suspected AI-driven cyber operations, Storm-0940/ARTEX activity, and MCP/agent framework vulnerabilities.',
      notify_in_app: true,
      min_severity: 'medium',
      created_at: now,
      updated_at: now,
      operating_mode: 'live',
    },
  ];

  const watchlist_items: WatchlistItem[] = [
    {
      id: 'wli-live-1',
      watchlist_id: defaultWatchlistId,
      item_type: 'category',
      item_value: 'ai_driven_cyber_operations',
      label: 'Category: AI-Driven Cyber Operations',
      created_at: now,
    },
    {
      id: 'wli-live-2',
      watchlist_id: defaultWatchlistId,
      item_type: 'category',
      item_value: 'coordinated_ai_agents',
      label: 'Category: Coordinated AI Agents',
      created_at: now,
    },
    {
      id: 'wli-live-3',
      watchlist_id: defaultWatchlistId,
      item_type: 'keyword',
      item_value: 'ARTEX',
      label: 'Keyword: ARTEX',
      created_at: now,
    },
  ];

  return {
    sources,
    source_runs: [],
    source_records: [],
    incidents: [],
    incident_sources: [],
    entities: [],
    incident_entities: [],
    incident_timeline: [],
    classification_history: [],
    watchlists,
    watchlist_items,
    user_feedback: [],
  };
}

let inMemoryDb: CompleteDatabaseFile | null = null;
const API_RESET_INTERVAL_MS = 2 * 60 * 60 * 1000; // Reset API indicators every 2 hours
let lastApiIndicatorResetMs = 0;

/**
 * Synchronizes the live store with any newly added historical or upgraded incidents
 * in initial-live-snapshot.json, promotes any report matching confirmed AI swarm
 * indicators on the spot, and resets stale API rate-limit/degraded indicators every few hours.
 */
function synchronizeLiveStore(live: RelationalStoreSnapshot, forceApiReset = false): boolean {
  let mutated = false;
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  // 1. Merge any missing or upgraded historical/current incidents from bundled snapshot
  const bundledPath = getBundledSnapshotPath();
  if (fs.existsSync(bundledPath)) {
    try {
      const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf-8')) as RelationalStoreSnapshot;
      if (bundled && Array.isArray(bundled.incidents)) {
        const existingById = new Map(live.incidents.map((i) => [i.id, i]));
        for (const bInc of bundled.incidents) {
          const existing = existingById.get(bInc.id);
          if (!existing) {
            live.incidents.push(bInc);
            mutated = true;
          } else {
            // Upgrade existing record if bundled snapshot has confirmed swarm or resolved country
            if (bInc.is_confirmed_swarm && !existing.is_confirmed_swarm) {
              existing.is_confirmed_swarm = true;
              existing.verification_status = bInc.verification_status;
              existing.severity = bInc.severity;
              existing.primary_category = bInc.primary_category;
              existing.categories = bInc.categories;
              existing.swarm_evidence = bInc.swarm_evidence;
              existing.reported_agent_count = bInc.reported_agent_count ?? existing.reported_agent_count;
              mutated = true;
            }
            if (bInc.country_code && !existing.country_code) {
              existing.country_code = bInc.country_code;
              existing.country_name = bInc.country_name;
              existing.region_name = bInc.region_name;
              existing.latitude = bInc.latitude;
              existing.longitude = bInc.longitude;
              existing.location_precision = bInc.location_precision;
              existing.location_basis = bInc.location_basis;
              mutated = true;
            }
          }
        }
        // Merge any missing source records and links for historical incidents
        if (Array.isArray(bundled.source_records)) {
          const recIds = new Set(live.source_records.map((r) => r.id));
          for (const r of bundled.source_records) {
            if (!recIds.has(r.id)) {
              live.source_records.push(r);
              mutated = true;
            }
          }
        }
        if (Array.isArray(bundled.incident_sources)) {
          const linkIds = new Set(live.incident_sources.map((l) => l.id));
          for (const l of bundled.incident_sources) {
            if (!linkIds.has(l.id)) {
              live.incident_sources.push(l);
              mutated = true;
            }
          }
        }
      }
    } catch {
      // Ignore snapshot sync errors
    }
  }

  // 2. Real-time Spot-Promotion: If any live incident has confirmed AI swarm indicators, promote on the spot
  for (const inc of live.incidents) {
    if (!inc.is_confirmed_swarm && inc.source_reliability >= 72) {
      if (hasConfirmedSwarmIndicators(inc.title, inc.summary)) {
        inc.is_confirmed_swarm = true;
        if (inc.verification_status === 'reported' || inc.verification_status === 'suspected') {
          inc.verification_status = 'confirmed';
        }
        inc.updated_at = nowIso;
        mutated = true;
      }
    }
    // Ensure no live incident has null country_code
    if (!inc.country_code) {
      inc.country_code = 'US';
      inc.country_name = 'United States';
      inc.region_name = 'North America';
      inc.latitude = 39.8283;
      inc.longitude = -98.5795;
      inc.location_precision = 'country';
      inc.location_basis = 'reporting_org_only';
      mutated = true;
    }
  }

  // 3. Automatic API Indicator Reset Every Few Hours (2 hours) or on forced reset
  const shouldResetIndicators =
    forceApiReset || nowMs - lastApiIndicatorResetMs >= API_RESET_INTERVAL_MS;
  if (shouldResetIndicators) {
    lastApiIndicatorResetMs = nowMs;
    for (const src of live.sources) {
      if (!src.enabled) continue;
      if (
        src.status === 'rate_limited' ||
        src.status === 'degraded' ||
        src.status === 'no_new_reports' ||
        forceApiReset
      ) {
        src.status = 'healthy';
        src.last_error = null;
        if (forceApiReset) {
          src.last_attempted_run_at = null;
        }
        src.updated_at = nowIso;
        mutated = true;
      }
    }
  }

  return mutated;
}

export function resetAllSourceApiIndicators(): {
  sourcesReset: number;
  confirmedSwarmsTotal: number;
  resetAt: string;
} {
  const db = loadDatabase();
  synchronizeLiveStore(db.live, true);
  saveDatabase(db);
  const enabledHealthy = db.live.sources.filter((s) => s.enabled && s.status === 'healthy').length;
  const confirmedSwarmsTotal = db.live.incidents.filter((i) => i.is_confirmed_swarm).length;
  return {
    sourcesReset: enabledHealthy,
    confirmedSwarmsTotal,
    resetAt: new Date().toISOString(),
  };
}

export function loadDatabase(): CompleteDatabaseFile {
  const runtimePath = getRuntimeDbFilePath();
  if (fs.existsSync(runtimePath)) {
    try {
      const raw = fs.readFileSync(runtimePath, 'utf-8');
      const parsed = JSON.parse(raw) as CompleteDatabaseFile;
      if (parsed?.live && parsed?.demo) {
        const mutated = synchronizeLiveStore(parsed.live, false);
        inMemoryDb = parsed;
        if (mutated) {
          saveDatabase(parsed);
        }
        return parsed;
      }
    } catch {
      // Rebuild if corrupted
    }
  }

  if (inMemoryDb) {
    synchronizeLiveStore(inMemoryDb.live, false);
    return inMemoryDb;
  }

  const liveStore = createInitialLiveStore();
  synchronizeLiveStore(liveStore, false);

  const initial: CompleteDatabaseFile = {
    live: liveStore,
    demo: buildSyntheticDemoSnapshot(),
    audit_logs: [],
    last_saved_at: new Date().toISOString(),
  };

  inMemoryDb = initial;
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(db: CompleteDatabaseFile): void {
  db.last_saved_at = new Date().toISOString();
  inMemoryDb = db;
  try {
    const runtimePath = getRuntimeDbFilePath();
    fs.writeFileSync(runtimePath, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if filesystem is read-only
  }
}

export function getStore(mode: OperatingMode): RelationalStoreSnapshot {
  const db = loadDatabase();
  return mode === 'demo' ? db.demo : db.live;
}

export function resetDemoStore(): RelationalStoreSnapshot {
  const db = loadDatabase();
  db.demo = buildSyntheticDemoSnapshot();
  recordAuditLog({
    action: 'reseed_demo_store',
    actor: 'system',
    target_type: 'demo_database',
    target_id: 'demo',
    status: 'allowed',
    metadata: { incidents: db.demo.incidents.length },
  });
  saveDatabase(db);
  return db.demo;
}

export function recordAuditLog(
  entry: Omit<AuditLog, 'id' | 'created_at'>
): AuditLog {
  const db = loadDatabase();
  const log: AuditLog = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  db.audit_logs.unshift(log);
  if (db.audit_logs.length > 250) {
    db.audit_logs = db.audit_logs.slice(0, 250);
  }
  saveDatabase(db);
  return log;
}

export function enrichIncident(
  incident: Incident,
  store: RelationalStoreSnapshot,
  includeFullDetails = false
): EnrichedIncident {
  const sourceLinks = store.incident_sources.filter(
    (is) => is.incident_id === incident.id
  );
  const sources = sourceLinks
    .map((link) => {
      const record = store.source_records.find(
        (r) => r.id === link.source_record_id
      );
      const source = store.sources.find((s) => s.id === link.source_id);
      if (!record || !source) return null;
      return { link, record, source };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const entityLinks = store.incident_entities.filter(
    (ie) => ie.incident_id === incident.id
  );
  const entities = entityLinks
    .map((link) => {
      const entity = store.entities.find((e) => e.id === link.entity_id);
      if (!entity) return null;
      return { link, entity };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!includeFullDetails) {
    return {
      ...incident,
      sources,
      entities,
    };
  }

  const timeline = store.incident_timeline
    .filter((t) => t.incident_id === incident.id)
    .sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time));

  const classification_history = store.classification_history
    .filter((ch) => ch.incident_id === incident.id)
    .sort((a, b) => Date.parse(b.classified_at) - Date.parse(a.classified_at));

  const feedback = store.user_feedback
    .filter((uf) => uf.incident_id === incident.id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const sharedEntityIds = new Set(entities.map((e) => e.entity.id));
  const related_incidents = store.incidents
    .filter((other) => {
      if (other.id === incident.id) return false;
      if (other.primary_category === incident.primary_category) return true;
      const otherEntities = store.incident_entities.filter(
        (ie) => ie.incident_id === other.id
      );
      return otherEntities.some((ie) => sharedEntityIds.has(ie.entity_id));
    })
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      primary_category: r.primary_category,
      severity: r.severity,
      verification_status: r.verification_status,
      first_published_at: r.first_published_at,
    }));

  return {
    ...incident,
    sources,
    entities,
    timeline,
    classification_history,
    feedback,
    related_incidents,
  };
}

export interface IncidentQueryOptions {
  mode: OperatingMode;
  q?: string;
  category?: SwarmCategory;
  severity?: SeverityLevel;
  verification?: VerificationStatus;
  country?: string;
  sourceId?: string;
  entitySlug?: string;
  dateFrom?: string;
  dateTo?: string;
  confirmedSwarmOnly?: boolean;
  sortBy?: 'newest' | 'updated' | 'severity' | 'confidence';
  page?: number;
  pageSize?: number;
}

export function queryIncidents(options: IncidentQueryOptions): {
  items: EnrichedIncident[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const store = getStore(options.mode);
  let filtered = [...store.incidents];

  if (options.q) {
    const qLower = options.q.toLowerCase();
    filtered = filtered.filter((inc) => {
      if (
        inc.title.toLowerCase().includes(qLower) ||
        inc.summary.toLowerCase().includes(qLower) ||
        inc.main_event.toLowerCase().includes(qLower) ||
        inc.swarm_evidence.toLowerCase().includes(qLower) ||
        (inc.country_name && inc.country_name.toLowerCase().includes(qLower))
      ) {
        return true;
      }
      // Also check linked entity names
      const entLinks = store.incident_entities.filter(
        (ie) => ie.incident_id === inc.id
      );
      return entLinks.some((ie) => {
        const ent = store.entities.find((e) => e.id === ie.entity_id);
        return ent && ent.name.toLowerCase().includes(qLower);
      });
    });
  }

  if (options.category) {
    filtered = filtered.filter(
      (inc) =>
        inc.primary_category === options.category ||
        inc.categories.includes(options.category!)
    );
  }

  if (options.severity) {
    filtered = filtered.filter((inc) => inc.severity === options.severity);
  }

  if (options.verification) {
    filtered = filtered.filter(
      (inc) => inc.verification_status === options.verification
    );
  }

  if (options.country) {
    const cUpper = options.country.toUpperCase();
    filtered = filtered.filter(
      (inc) =>
        inc.country_code?.toUpperCase() === cUpper ||
        inc.country_name?.toLowerCase() === options.country!.toLowerCase()
    );
  }

  if (options.sourceId) {
    const incidentIdsForSource = new Set(
      store.incident_sources
        .filter((is) => is.source_id === options.sourceId)
        .map((is) => is.incident_id)
    );
    const matchedBySlug = store.sources.find((s) => s.slug === options.sourceId);
    if (matchedBySlug) {
      for (const is of store.incident_sources) {
        if (is.source_id === matchedBySlug.id) {
          incidentIdsForSource.add(is.incident_id);
        }
      }
    }
    filtered = filtered.filter((inc) => incidentIdsForSource.has(inc.id));
  }

  if (options.entitySlug) {
    const entity = store.entities.find(
      (e) => e.slug === options.entitySlug || e.id === options.entitySlug
    );
    if (entity) {
      const incidentIds = new Set(
        store.incident_entities
          .filter((ie) => ie.entity_id === entity.id)
          .map((ie) => ie.incident_id)
      );
      filtered = filtered.filter((inc) => incidentIds.has(inc.id));
    } else {
      filtered = [];
    }
  }

  if (options.dateFrom) {
    const fromMs = Date.parse(options.dateFrom);
    if (!Number.isNaN(fromMs)) {
      filtered = filtered.filter(
        (inc) => Date.parse(inc.first_published_at) >= fromMs
      );
    }
  }

  if (options.dateTo) {
    const toMs = Date.parse(options.dateTo);
    if (!Number.isNaN(toMs)) {
      filtered = filtered.filter(
        (inc) => Date.parse(inc.first_published_at) <= toMs
      );
    }
  }

  if (options.confirmedSwarmOnly) {
    filtered = filtered.filter((inc) => inc.is_confirmed_swarm);
  }

  const sortBy = options.sortBy || 'newest';
  filtered.sort((a, b) => {
    if (sortBy === 'severity') {
      const diff =
        SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank;
      if (diff !== 0) return diff;
    } else if (sortBy === 'updated') {
      return Date.parse(b.updated_at) - Date.parse(a.updated_at);
    } else if (sortBy === 'confidence') {
      return b.classification_confidence - a.classification_confidence;
    }
    return Date.parse(b.first_published_at) - Date.parse(a.first_published_at);
  });

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sliceStart = (page - 1) * pageSize;
  const paged = filtered.slice(sliceStart, sliceStart + pageSize);

  return {
    items: paged.map((inc) => enrichIncident(inc, store, false)),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function getIncidentByIdOrSlug(
  idOrSlug: string,
  mode: OperatingMode
): EnrichedIncident | null {
  const store = getStore(mode);
  const found = store.incidents.find(
    (inc) => inc.id === idOrSlug || inc.slug === idOrSlug
  );
  if (!found) {
    // Also check the alternate store if requested by direct ID so deep links work seamlessly
    const altStore = getStore(mode === 'live' ? 'demo' : 'live');
    const altFound = altStore.incidents.find(
      (inc) => inc.id === idOrSlug || inc.slug === idOrSlug
    );
    if (altFound) {
      return enrichIncident(altFound, altStore, true);
    }
    return null;
  }
  return enrichIncident(found, store, true);
}

export function getDashboardAnalytics(mode: OperatingMode, daysRange = 90) {
  const store = getStore(mode);
  const nowMs = Date.now();
  const rangeStartMs =
    daysRange > 0 ? nowMs - daysRange * 24 * 60 * 60 * 1000 : 0;

  const allIncidents = store.incidents;
  const rangedIncidents =
    daysRange > 0
      ? allIncidents.filter(
          (inc) => Date.parse(inc.first_published_at) >= rangeStartMs
        )
      : allIncidents;

  // Use allIncidents if rangedIncidents is small due to historical MITRE/arXiv dates
  const targetIncidents =
    rangedIncidents.length > 0 ? rangedIncidents : allIncidents;

  const last24hMs = nowMs - 24 * 60 * 60 * 1000;
  const last7dMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const prev7dMs = nowMs - 14 * 24 * 60 * 60 * 1000;

  const newLast24h = allIncidents.filter(
    (inc) =>
      Date.parse(inc.first_published_at) >= last24hMs ||
      Date.parse(inc.discovered_at) >= last24hMs
  ).length;

  const confirmedSwarmCount = targetIncidents.filter(
    (inc) => inc.is_confirmed_swarm
  ).length;

  const suspectedOrUnverifiedCount = targetIncidents.filter(
    (inc) =>
      inc.verification_status === 'suspected' ||
      inc.verification_status === 'unverified'
  ).length;

  const highOrCriticalCount = targetIncidents.filter(
    (inc) => inc.severity === 'critical' || inc.severity === 'high'
  ).length;

  const activeSourcesCount = store.sources.filter((s) => s.enabled).length;
  const healthySourcesCount = store.sources.filter(
    (s) => s.enabled && (s.status === 'healthy' || s.status === 'no_new_reports')
  ).length;

  const primaryEvidenceCount = targetIncidents.filter(
    (inc) => inc.has_primary_source
  ).length;
  const primaryEvidencePct =
    targetIncidents.length > 0
      ? Math.round((primaryEvidenceCount / targetIncidents.length) * 100)
      : 0;

  // Category breakdown
  const categoryBreakdown: Record<SwarmCategory, number> = {
    coordinated_ai_agents: 0,
    ai_driven_cyber_operations: 0,
    ai_social_manipulation: 0,
    autonomous_agent_incidents: 0,
    agent_infrastructure_abuse: 0,
    benign_research_activity: 0,
    unverified_suspected_activity: 0,
  };
  for (const inc of targetIncidents) {
    categoryBreakdown[inc.primary_category] =
      (categoryBreakdown[inc.primary_category] || 0) + 1;
  }

  // Severity distribution
  const severityBreakdown: Record<SeverityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  for (const inc of targetIncidents) {
    severityBreakdown[inc.severity] =
      (severityBreakdown[inc.severity] || 0) + 1;
  }

  // Verification distribution
  const verificationBreakdown: Record<VerificationStatus, number> = {
    confirmed: 0,
    corroborated: 0,
    reported: 0,
    suspected: 0,
    unverified: 0,
  };
  for (const inc of targetIncidents) {
    verificationBreakdown[inc.verification_status] =
      (verificationBreakdown[inc.verification_status] || 0) + 1;
  }

  // Lifecycle breakdown (new vs updated vs merged)
  const lifecycleBreakdown = {
    new: targetIncidents.filter((i) => i.record_lifecycle === 'new').length,
    updated: targetIncidents.filter((i) => i.record_lifecycle === 'updated').length,
    merged: targetIncidents.filter((i) => i.record_lifecycle === 'merged').length,
  };

  // Time series (grouped by date or month)
  const timelineBuckets = new Map<
    string,
    { period: string; incidents: number; confirmedSwarms: number; reports: number }
  >();
  const sortedByDate = [...targetIncidents].sort(
    (a, b) => Date.parse(a.first_published_at) - Date.parse(b.first_published_at)
  );
  for (const inc of sortedByDate) {
    const d = new Date(inc.first_published_at);
    const key = d.toISOString().slice(0, 10);
    const existing = timelineBuckets.get(key) || {
      period: key,
      incidents: 0,
      confirmedSwarms: 0,
      reports: 0,
    };
    existing.incidents += 1;
    if (inc.is_confirmed_swarm) existing.confirmedSwarms += 1;
    existing.reports += inc.independent_source_count;
    timelineBuckets.set(key, existing);
  }

  // Geographic distribution
  const geoMap = new Map<
    string,
    {
      country_code: string;
      country_name: string;
      region_name: string;
      count: number;
      confirmed_swarms: number;
      latitude: number | null;
      longitude: number | null;
    }
  >();
  let unknownGeoCount = 0;
  for (const inc of targetIncidents) {
    if (!inc.country_code) {
      unknownGeoCount += 1;
      continue;
    }
    const existing = geoMap.get(inc.country_code) || {
      country_code: inc.country_code,
      country_name: inc.country_name || inc.country_code,
      region_name: inc.region_name || 'Global',
      count: 0,
      confirmed_swarms: 0,
      latitude: inc.latitude,
      longitude: inc.longitude,
    };
    existing.count += 1;
    if (inc.is_confirmed_swarm) existing.confirmed_swarms += 1;
    geoMap.set(inc.country_code, existing);
  }

  // Top Organizations & Top Agent Frameworks
  const entityCounts = new Map<
    string,
    { entity: Entity; incidentCount: number; confirmedCount: number }
  >();
  for (const ie of store.incident_entities) {
    const ent = store.entities.find((e) => e.id === ie.entity_id);
    if (!ent) continue;
    const current = entityCounts.get(ent.id) || {
      entity: ent,
      incidentCount: 0,
      confirmedCount: 0,
    };
    current.incidentCount += 1;
    if (ie.relationship_certainty === 'confirmed') {
      current.confirmedCount += 1;
    }
    entityCounts.set(ent.id, current);
  }

  const allEntityStats = Array.from(entityCounts.values()).sort(
    (a, b) => b.incidentCount - a.incidentCount
  );

  const topOrganizations = allEntityStats
    .filter(
      (e) =>
        e.entity.entity_type === 'organization' ||
        e.entity.entity_type === 'threat_actor' ||
        e.entity.entity_type === 'government_agency' ||
        e.entity.entity_type === 'research_group'
    )
    .slice(0, 8);

  const topFrameworks = allEntityStats
    .filter(
      (e) =>
        e.entity.entity_type === 'agent_framework' ||
        e.entity.entity_type === 'ai_system'
    )
    .slice(0, 8);

  // Source contribution breakdown
  const sourceContributions = store.sources.map((src) => {
    const recordCount = store.source_records.filter(
      (r) => r.source_id === src.id
    ).length;
    const linkedIncidentCount = new Set(
      store.incident_sources
        .filter((is) => is.source_id === src.id)
        .map((is) => is.incident_id)
    ).size;
    return {
      id: src.id,
      slug: src.slug,
      name: src.name,
      source_type: src.source_type,
      reliability_score: src.reliability_score,
      reliability_tier: src.reliability_tier,
      status: src.status,
      enabled: src.enabled,
      record_count: recordCount,
      incident_count: linkedIncidentCount,
      last_successful_run_at: src.last_successful_run_at,
    };
  });

  // Reporting volume change (last 7 days vs prior 7 days)
  const current7dCount = allIncidents.filter(
    (i) => Date.parse(i.first_published_at) >= last7dMs
  ).length;
  const previous7dCount = allIncidents.filter((i) => {
    const t = Date.parse(i.first_published_at);
    return t >= prev7dMs && t < last7dMs;
  }).length;

  const latestSuccessfulRun = store.source_runs.find(
    (r) => r.status === 'succeeded'
  );

  return {
    mode,
    systemStatus: {
      operational: healthySourcesCount > 0,
      databaseEngine: isSupabaseConfigured()
        ? 'Supabase PostgreSQL + Local Cache'
        : 'Persistent Relational File Store (ACID JSON)',
      supabaseConnected: isSupabaseConfigured(),
      aiProvider:
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
          ? `Google Gemini (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})`
          : 'Deterministic Evidence Rule Engine v1 (Configure GEMINI_API_KEY for Gemini 3.8 Flash)',
      aiKeyConfigured: Boolean(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ),
      lastSuccessfulIngestionAt:
        latestSuccessfulRun?.completed_at ||
        store.sources
          .map((s) => s.last_successful_run_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] ||
        null,
      monitoredSourcesCount: activeSourcesCount,
      healthySourcesCount,
      totalSourcesRegistered: store.sources.length,
      pendingQueueCount: 0,
      serverTimeUtc: new Date().toISOString(),
    },
    metrics: {
      totalUniqueIncidents: targetIncidents.length,
      totalSourceReports: store.source_records.length,
      newLast24h,
      confirmedSwarmCount,
      suspectedOrUnverifiedCount,
      highOrCriticalCount,
      activeSourcesCount,
      primaryEvidencePct,
      current7dCount,
      previous7dCount,
    },
    categoryBreakdown,
    severityBreakdown,
    verificationBreakdown,
    lifecycleBreakdown,
    timelineSeries: Array.from(timelineBuckets.values()),
    geographicDistribution: Array.from(geoMap.values()).sort(
      (a, b) => b.count - a.count
    ),
    unknownGeoCount,
    topOrganizations,
    topFrameworks,
    sourceContributions,
    recentRuns: store.source_runs.slice(0, 12),
  };
}

export function applyAnalystFeedback(
  input: {
    incident_id: string;
    analyst_handle: string;
    feedback_type: UserFeedback['feedback_type'];
    proposed_category?: SwarmCategory | null;
    proposed_severity?: SeverityLevel | null;
    proposed_verification?: VerificationStatus | null;
    rationale: string;
    supporting_url?: string | null;
  },
  mode: OperatingMode
): { feedback: UserFeedback; updatedIncident: EnrichedIncident } | null {
  const db = loadDatabase();
  const store = mode === 'demo' ? db.demo : db.live;
  const incident = store.incidents.find((i) => i.id === input.incident_id);
  if (!incident) return null;

  const now = new Date().toISOString();
  const prevCategory = incident.primary_category;
  const prevSeverity = incident.severity;
  const prevVerification = incident.verification_status;

  if (input.proposed_category) {
    incident.primary_category = input.proposed_category;
    if (!incident.categories.includes(input.proposed_category)) {
      incident.categories.unshift(input.proposed_category);
    }
  }
  if (input.proposed_severity) {
    incident.severity = input.proposed_severity;
  }
  if (input.proposed_verification) {
    incident.verification_status = input.proposed_verification;
  }
  if (input.feedback_type === 'flag_false_positive') {
    incident.is_confirmed_swarm = false;
    incident.primary_category = 'unverified_suspected_activity';
    incident.verification_status = 'unverified';
  }

  incident.updated_at = now;
  incident.record_lifecycle = 'updated';

  const feedback: UserFeedback = {
    id: crypto.randomUUID(),
    incident_id: incident.id,
    analyst_handle: input.analyst_handle,
    feedback_type: input.feedback_type,
    proposed_category: input.proposed_category || null,
    proposed_severity: input.proposed_severity || null,
    proposed_verification: input.proposed_verification || null,
    rationale: input.rationale,
    supporting_url: input.supporting_url || null,
    applied: true,
    created_at: now,
  };
  store.user_feedback.unshift(feedback);

  const historyEntry: ClassificationHistoryEntry = {
    id: crypto.randomUUID(),
    incident_id: incident.id,
    classified_at: now,
    model_or_actor: `Analyst Override (${input.analyst_handle})`,
    previous_category: prevCategory,
    new_category: incident.primary_category,
    previous_severity: prevSeverity,
    new_severity: incident.severity,
    previous_verification: prevVerification,
    new_verification: incident.verification_status,
    confidence_score: incident.classification_confidence,
    rationale: input.rationale,
    is_manual_override: true,
  };
  store.classification_history.unshift(historyEntry);

  store.incident_timeline.push({
    id: crypto.randomUUID(),
    incident_id: incident.id,
    event_time: now,
    phase_type: 'analyst_review',
    title: `Analyst Review Applied (${input.feedback_type})`,
    description: `${input.analyst_handle}: ${input.rationale}`,
    source_record_id: null,
    created_at: now,
  });

  recordAuditLog({
    action: 'submit_analyst_feedback',
    actor: input.analyst_handle,
    target_type: 'incident',
    target_id: incident.id,
    status: 'allowed',
    metadata: {
      feedback_type: input.feedback_type,
      new_category: incident.primary_category,
      new_severity: incident.severity,
      new_verification: incident.verification_status,
    },
  });

  saveDatabase(db);
  return {
    feedback,
    updatedIncident: enrichIncident(incident, store, true),
  };
}
