export type OperatingMode = 'live' | 'demo';

export type SwarmCategory =
  | 'coordinated_ai_agents'
  | 'ai_driven_cyber_operations'
  | 'ai_social_manipulation'
  | 'autonomous_agent_incidents'
  | 'agent_infrastructure_abuse'
  | 'benign_research_activity'
  | 'unverified_suspected_activity';

export type SeverityLevel =
  | 'informational'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type VerificationStatus =
  | 'confirmed'
  | 'corroborated'
  | 'reported'
  | 'suspected'
  | 'unverified';

export type EvidenceStrength = 'strong' | 'moderate' | 'circumstantial' | 'weak';

export type SourceType =
  | 'rss'
  | 'atom'
  | 'rest_json'
  | 'yaml_dataset'
  | 'advisory_feed'
  | 'manual';

export type ReliabilityTier =
  | 'primary_research_cert'
  | 'major_security_vendor'
  | 'established_media'
  | 'community_preprint'
  | 'unverified_source';

export type SourceOperationalStatus =
  | 'healthy'
  | 'degraded'
  | 'unavailable'
  | 'no_new_reports'
  | 'rate_limited'
  | 'unconfigured';

export type LocationPrecision =
  | 'exact'
  | 'city'
  | 'country'
  | 'region'
  | 'global'
  | 'unknown';

export type LocationBasis =
  | 'occurrence_location'
  | 'targeted_location'
  | 'reporting_org_only'
  | 'unknown';

export type RecordLifecycle = 'new' | 'updated' | 'merged';

export type EntityType =
  | 'organization'
  | 'agent_framework'
  | 'ai_system'
  | 'threat_actor'
  | 'research_group'
  | 'government_agency';

export type EntityRole =
  | 'affected_organization'
  | 'reporting_organization'
  | 'agent_framework_used'
  | 'ai_system_involved'
  | 'attributed_actor'
  | 'research_institution'
  | 'mentioned_entity';

export interface Source {
  id: string;
  slug: string;
  name: string;
  source_type: SourceType;
  endpoint_url: string;
  homepage_url: string;
  reliability_score: number;
  reliability_tier: ReliabilityTier;
  is_primary_producer: boolean;
  enabled: boolean;
  requires_api_key: boolean;
  api_key_env_var: string | null;
  rate_limit_seconds: number;
  status: SourceOperationalStatus;
  last_successful_run_at: string | null;
  last_attempted_run_at: string | null;
  last_error: string | null;
  total_records_fetched: number;
  total_incidents_linked: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceRun {
  id: string;
  source_id: string;
  source_name?: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'succeeded' | 'partial' | 'failed' | 'skipped_rate_limit';
  trigger_type: 'scheduled' | 'manual' | 'startup' | 'seed';
  records_retrieved: number;
  records_accepted: number;
  duplicates_detected: number;
  irrelevant_filtered: number;
  processing_errors: number;
  error_message: string | null;
  duration_ms: number | null;
  operating_mode: OperatingMode;
}

export interface SourceRecord {
  id: string;
  source_id: string;
  external_id: string;
  original_url: string;
  canonical_url: string;
  title: string;
  normalized_title: string;
  author: string | null;
  published_at: string;
  retrieved_at: string;
  raw_excerpt: string;
  quotation_snippet: string | null;
  citation_group_id: string | null;
  content_hash: string;
  is_primary_source: boolean;
  raw_metadata: Record<string, unknown>;
  operating_mode: OperatingMode;
}

export interface Incident {
  id: string;
  slug: string;
  title: string;
  summary: string;
  main_event: string;
  incident_type: string;
  primary_category: SwarmCategory;
  categories: SwarmCategory[];
  severity: SeverityLevel;
  verification_status: VerificationStatus;
  source_reliability: number;
  evidence_strength: EvidenceStrength;
  classification_confidence: number;
  swarm_evidence: string;
  evidence_summary: string;
  classification_rationale: string;
  known_facts: string[];
  uncertainties: string[];
  contradictions: string[];
  reported_agent_count: number | null;
  reported_agent_count_note: string | null;
  human_supervision_level: string | null;
  reported_impact: string | null;
  affected_systems: string[];
  affected_industries: string[];
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_precision: LocationPrecision;
  location_basis: LocationBasis;
  occurred_at: string | null;
  first_published_at: string;
  discovered_at: string;
  updated_at: string;
  record_lifecycle: RecordLifecycle;
  independent_source_count: number;
  has_primary_source: boolean;
  ai_model_used: string;
  is_confirmed_swarm: boolean;
  operating_mode: OperatingMode;
}

export interface IncidentSourceLink {
  id: string;
  incident_id: string;
  source_record_id: string;
  source_id: string;
  relationship_type:
    | 'primary_report'
    | 'independent_corroboration'
    | 'secondary_reporting'
    | 'conflicting_account';
  extracted_claims: string[];
  quotation: string | null;
  similarity_score: number;
  linked_at: string;
}

export interface Entity {
  id: string;
  slug: string;
  name: string;
  entity_type: EntityType;
  aliases: string[];
  description: string;
  country_code: string | null;
  first_seen_at: string;
  last_seen_at: string;
  match_confidence: number;
  operating_mode: OperatingMode;
}

export interface IncidentEntityLink {
  id: string;
  incident_id: string;
  entity_id: string;
  role: EntityRole;
  relationship_certainty: 'confirmed' | 'observed' | 'suspected';
  evidence_note: string | null;
}

export interface IncidentTimelineEvent {
  id: string;
  incident_id: string;
  event_time: string;
  phase_type:
    | 'occurrence'
    | 'publication'
    | 'ingestion'
    | 'corroboration'
    | 'classification'
    | 'analyst_review';
  title: string;
  description: string;
  source_record_id: string | null;
  created_at: string;
}

export interface ClassificationHistoryEntry {
  id: string;
  incident_id: string;
  classified_at: string;
  model_or_actor: string;
  previous_category: SwarmCategory | null;
  new_category: SwarmCategory;
  previous_severity: SeverityLevel | null;
  new_severity: SeverityLevel;
  previous_verification: VerificationStatus | null;
  new_verification: VerificationStatus;
  confidence_score: number;
  rationale: string;
  is_manual_override: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  notify_in_app: boolean;
  min_severity: SeverityLevel;
  created_at: string;
  updated_at: string;
  operating_mode: OperatingMode;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  item_type: 'entity' | 'category' | 'keyword' | 'country' | 'severity';
  item_value: string;
  label: string;
  created_at: string;
}

export interface UserFeedback {
  id: string;
  incident_id: string;
  analyst_handle: string;
  feedback_type:
    | 'reclassify_category'
    | 'adjust_severity'
    | 'dispute_swarm_status'
    | 'add_corroboration'
    | 'flag_false_positive';
  proposed_category: SwarmCategory | null;
  proposed_severity: SeverityLevel | null;
  proposed_verification: VerificationStatus | null;
  rationale: string;
  supporting_url: string | null;
  applied: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target_type: string;
  target_id: string | null;
  status: 'allowed' | 'denied' | 'failed';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EnrichedIncident extends Incident {
  sources: Array<{
    link: IncidentSourceLink;
    record: SourceRecord;
    source: Source;
  }>;
  entities: Array<{
    link: IncidentEntityLink;
    entity: Entity;
  }>;
  timeline?: IncidentTimelineEvent[];
  classification_history?: ClassificationHistoryEntry[];
  feedback?: UserFeedback[];
  related_incidents?: Array<
    Pick<
      Incident,
      | 'id'
      | 'slug'
      | 'title'
      | 'primary_category'
      | 'severity'
      | 'verification_status'
      | 'first_published_at'
    >
  >;
}

export const SWARM_CATEGORY_META: Record<
  SwarmCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    inclusionCriteria: string;
    badgeClass: string;
  }
> = {
  coordinated_ai_agents: {
    label: 'Coordinated AI Agents',
    shortLabel: 'Coordinated Agents',
    description:
      'Multiple AI agents coordinating tasks, handoffs, or sub-goals toward a shared objective.',
    inclusionCriteria:
      'Requires documented multi-agent orchestration, inter-agent task delegation, or swarm topology.',
    badgeClass: 'bg-white/[0.04] text-[#f3f5f8] border-white/10',
  },
  ai_driven_cyber_operations: {
    label: 'AI-Driven Cyber Operations',
    shortLabel: 'Cyber Operations',
    description:
      'Reported use of coordinated or autonomous agents for intrusion, reconnaissance, vulnerability exploitation, or malware operations.',
    inclusionCriteria:
      'Requires threat intelligence or advisory reporting of AI agent frameworks used in offensive cyber operations.',
    badgeClass: 'bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/30',
  },
  ai_social_manipulation: {
    label: 'AI Social Manipulation',
    shortLabel: 'Social Manipulation',
    description:
      'Coordinated AI-generated personas, automated influence campaigns, synthetic consensus, or disinformation networks.',
    inclusionCriteria:
      'Requires evidence of coordinated multi-persona or automated LLM agent networks operating across social platforms.',
    badgeClass: 'bg-[#f5b82e]/10 text-[#fde68a] border-[#f5b82e]/25',
  },
  autonomous_agent_incidents: {
    label: 'Autonomous Agent Incidents',
    shortLabel: 'Autonomous Incident',
    description:
      'AI agents performing consequential real-world or system actions with limited human supervision, including unintended or runaway behavior.',
    inclusionCriteria:
      'Requires documented autonomous tool-calling, goal pursuit, or unsupervised execution leading to consequential outcomes.',
    badgeClass: 'bg-white/[0.04] text-[#cbd2dc] border-white/10',
  },
  agent_infrastructure_abuse: {
    label: 'Agent Infrastructure Abuse',
    shortLabel: 'Infrastructure Abuse',
    description:
      'Misuse, compromise, or exposure of multi-agent frameworks, MCP servers, orchestration control planes, or agent toolchains.',
    inclusionCriteria:
      'Requires vulnerability disclosure, exploit report, or abuse analysis targeting agent orchestration frameworks or endpoints.',
    badgeClass: 'bg-[#f5b82e]/10 text-[#fde68a] border-[#f5b82e]/25',
  },
  benign_research_activity: {
    label: 'Benign or Research Activity',
    shortLabel: 'Research Benchmark',
    description:
      'Legitimate multi-agent experiments, safety evaluations, red-team benchmarks, simulations, and authorized testing.',
    inclusionCriteria:
      'Controlled academic, lab, or CERT evaluation of multi-agent systems without unauthorized external harm.',
    badgeClass: 'bg-white/[0.03] text-[#8a94a6] border-white/[0.08]',
  },
  unverified_suspected_activity: {
    label: 'Unverified Suspected Activity',
    shortLabel: 'Unverified / Suspected',
    description:
      'Reports suggesting possible swarm behavior or ordinary automation conflated with AI agents without sufficient evidence to confirm swarm architecture.',
    inclusionCriteria:
      'Assigned when reports allege AI swarm behavior without technical telemetry or when ordinary scripts/botnets cannot be ruled out.',
    badgeClass: 'bg-white/[0.02] text-[#64748b] border-white/[0.06]',
  },
};

export const SEVERITY_META: Record<
  SeverityLevel,
  {
    label: string;
    rank: number;
    code: string;
    description: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  critical: {
    label: 'Critical',
    rank: 5,
    code: 'SEV-1',
    description:
      'Active widespread compromise, critical infrastructure impact, or verified multi-organization supply chain breach.',
    badgeClass: 'bg-[#ef4444]/15 text-[#fca5a5] border-[#ef4444]/40',
    dotClass: 'bg-[#ef4444]',
  },
  high: {
    label: 'High',
    rank: 4,
    code: 'SEV-2',
    description:
      'Confirmed unauthorized intrusion, active influence operation, or severe vulnerability in deployed agent infrastructure.',
    badgeClass: 'bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/25',
    dotClass: 'bg-[#f87171]',
  },
  medium: {
    label: 'Medium',
    rank: 3,
    code: 'SEV-3',
    description:
      'Localized operational disruption, contained agent misbehavior, or high-impact security research proof-of-concept.',
    badgeClass: 'bg-[#f5b82e]/12 text-[#fde68a] border-[#f5b82e]/30',
    dotClass: 'bg-[#f5b82e]',
  },
  low: {
    label: 'Low',
    rank: 2,
    code: 'SEV-4',
    description:
      'Minor scope, experimental anomaly, or early warning indicator with minimal documented real-world harm.',
    badgeClass: 'bg-white/[0.04] text-[#cbd2dc] border-white/10',
    dotClass: 'bg-[#8a94a6]',
  },
  informational: {
    label: 'Informational',
    rank: 1,
    code: 'SEV-5',
    description:
      'Controlled benchmark, academic multi-agent study, or taxonomy reference without active threat impact.',
    badgeClass: 'bg-white/[0.02] text-[#8a94a6] border-white/[0.07]',
    dotClass: 'bg-[#545e70]',
  },
};

export const VERIFICATION_META: Record<
  VerificationStatus,
  {
    label: string;
    code: string;
    rule: string;
    badgeClass: string;
  }
> = {
  confirmed: {
    label: 'Confirmed',
    code: 'VRF-CONF',
    rule: 'Strong primary-source forensic evidence or official disclosure directly establishes the event and agent architecture.',
    badgeClass: 'bg-[#f5b82e]/15 text-[#f5b82e] border-[#f5b82e]/35',
  },
  corroborated: {
    label: 'Corroborated',
    code: 'VRF-CORR',
    rule: 'Multiple sufficiently independent sources (distinct domains/investigations) support the core factual claims.',
    badgeClass: 'bg-white/[0.06] text-[#f3f5f8] border-white/15',
  },
  reported: {
    label: 'Reported',
    code: 'VRF-REPT',
    rule: 'A single credible publication or vendor reports the event, but independent third-party verification is limited.',
    badgeClass: 'bg-white/[0.03] text-[#cbd2dc] border-white/[0.08]',
  },
  suspected: {
    label: 'Suspected',
    code: 'VRF-SUSP',
    rule: 'Available indicators suggest possible autonomous or coordinated agent involvement, but technical proof is incomplete.',
    badgeClass: 'bg-[#f5b82e]/10 text-[#fde68a] border-[#f5b82e]/20',
  },
  unverified: {
    label: 'Unverified',
    code: 'VRF-UNVR',
    rule: 'Insufficient reliable evidence, single uncorroborated claim, or likely ordinary automation misattributed as an AI swarm.',
    badgeClass: 'bg-white/[0.02] text-[#8a94a6] border-white/[0.06]',
  },
};
