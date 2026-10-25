import {
  ClassificationHistoryEntry,
  Entity,
  Incident,
  IncidentEntityLink,
  IncidentSourceLink,
  IncidentTimelineEvent,
  Source,
  SourceRecord,
  SourceRun,
  UserFeedback,
  Watchlist,
  WatchlistItem,
} from '../types';

export interface RelationalStoreSnapshot {
  sources: Source[];
  source_runs: SourceRun[];
  source_records: SourceRecord[];
  incidents: Incident[];
  incident_sources: IncidentSourceLink[];
  entities: Entity[];
  incident_entities: IncidentEntityLink[];
  incident_timeline: IncidentTimelineEvent[];
  classification_history: ClassificationHistoryEntry[];
  watchlists: Watchlist[];
  watchlist_items: WatchlistItem[];
  user_feedback: UserFeedback[];
}

export function buildSyntheticDemoSnapshot(): RelationalStoreSnapshot {
  const now = '2026-10-25T12:00:00.000Z';

  const sources: Source[] = [
    {
      id: 'demo-src-1',
      slug: 'demo-cert-advisory',
      name: '[SYNTHETIC DEMO] Global CERT Simulation Feed',
      source_type: 'advisory_feed',
      endpoint_url: 'https://example.org/demo/cert-feed.xml',
      homepage_url: 'https://example.org/demo/cert',
      reliability_score: 95,
      reliability_tier: 'primary_research_cert',
      is_primary_producer: true,
      enabled: true,
      requires_api_key: false,
      api_key_env_var: null,
      rate_limit_seconds: 60,
      status: 'healthy',
      last_successful_run_at: now,
      last_attempted_run_at: now,
      last_error: null,
      total_records_fetched: 5,
      total_incidents_linked: 5,
      notes: 'Synthetic primary CERT source used exclusively in Demo Mode.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-src-2',
      slug: 'demo-threat-lab',
      name: '[SYNTHETIC DEMO] Sentinel Agentic Research Lab',
      source_type: 'rss',
      endpoint_url: 'https://example.org/demo/sentinel-lab.xml',
      homepage_url: 'https://example.org/demo/sentinel',
      reliability_score: 88,
      reliability_tier: 'major_security_vendor',
      is_primary_producer: true,
      enabled: true,
      requires_api_key: false,
      api_key_env_var: null,
      rate_limit_seconds: 60,
      status: 'healthy',
      last_successful_run_at: now,
      last_attempted_run_at: now,
      last_error: null,
      total_records_fetched: 4,
      total_incidents_linked: 4,
      notes: 'Synthetic security vendor feed for testing multi-source corroboration in Demo Mode.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-src-3',
      slug: 'demo-community-rumor',
      name: '[SYNTHETIC DEMO] Unverified Forum Aggregator',
      source_type: 'rest_json',
      endpoint_url: 'https://example.org/demo/forum.json',
      homepage_url: 'https://example.org/demo/forum',
      reliability_score: 48,
      reliability_tier: 'unverified_source',
      is_primary_producer: false,
      enabled: true,
      requires_api_key: false,
      api_key_env_var: null,
      rate_limit_seconds: 120,
      status: 'healthy',
      last_successful_run_at: now,
      last_attempted_run_at: now,
      last_error: null,
      total_records_fetched: 2,
      total_incidents_linked: 2,
      notes: 'Low-reliability synthetic source demonstrating unverified and false-positive swarm claims.',
      created_at: now,
      updated_at: now,
    },
  ];

  const source_runs: SourceRun[] = [
    {
      id: 'demo-run-1',
      source_id: 'demo-src-1',
      source_name: '[SYNTHETIC DEMO] Global CERT Simulation Feed',
      started_at: '2026-10-25T11:59:50.000Z',
      completed_at: now,
      status: 'succeeded',
      trigger_type: 'seed',
      records_retrieved: 5,
      records_accepted: 5,
      duplicates_detected: 0,
      irrelevant_filtered: 0,
      processing_errors: 0,
      error_message: null,
      duration_ms: 420,
      operating_mode: 'demo',
    },
  ];

  const source_records: SourceRecord[] = [
    {
      id: 'demo-rec-1a',
      source_id: 'demo-src-1',
      external_id: 'DEMO-CERT-2026-001',
      original_url: 'https://example.org/demo/cert/2026-001',
      canonical_url: 'https://example.org/demo/cert/2026-001',
      title:
        '[DEMO SCENARIO] Coordinated 14-Agent Reconnaissance & Exploit Swarm in Simulated Grid Exercise',
      normalized_title:
        'demo scenario coordinated 14 agent reconnaissance exploit swarm in simulated grid exercise',
      author: 'Demo CERT Red Team',
      published_at: '2026-10-24T14:30:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC EXERCISE RECORD: During controlled tabletop telemetry capture, a supervisor agent orchestrated 14 specialized sub-agents (4 recon agents, 6 vulnerability enumerators, 4 lateral movement planners) communicating over a shared memory bus.',
      quotation_snippet:
        '"A supervisor agent orchestrated 14 specialized sub-agents communicating over a shared memory bus."',
      citation_group_id: 'DEMO-GROUP-1',
      content_hash: 'demo-hash-1a',
      is_primary_source: true,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
    {
      id: 'demo-rec-1b',
      source_id: 'demo-src-2',
      external_id: 'DEMO-LAB-2026-104',
      original_url: 'https://example.org/demo/sentinel/104',
      canonical_url: 'https://example.org/demo/sentinel/104',
      title:
        '[DEMO SCENARIO] Independent Telemetry Verification of 14-Agent Hierarchical Cyber Swarm',
      normalized_title:
        'demo scenario independent telemetry verification of 14 agent hierarchical cyber swarm',
      author: 'Sentinel Agentic Research Lab',
      published_at: '2026-10-24T18:15:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC CORROBORATION RECORD: Independent packet capture confirms the 14-agent hierarchical task delegation pattern, though 2 lateral movement sub-agents entered a hallmarked retry loop before completion.',
      quotation_snippet:
        '"Independent packet capture confirms the 14-agent hierarchical task delegation pattern."',
      citation_group_id: 'DEMO-GROUP-1',
      content_hash: 'demo-hash-1b',
      is_primary_source: true,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
    {
      id: 'demo-rec-2',
      source_id: 'demo-src-3',
      external_id: 'DEMO-FORUM-992',
      original_url: 'https://example.org/demo/forum/992',
      canonical_url: 'https://example.org/demo/forum/992',
      title:
        '[DEMO FALSE POSITIVE] Suspected "AI Swarm" DDoS Against Retail Portal Found to Be Legacy Bash Botnet',
      normalized_title:
        'demo false positive suspected ai swarm ddos against retail portal found to be legacy bash botnet',
      author: 'Forum Reporter',
      published_at: '2026-10-23T09:00:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC NON-SWARM FIXTURE: Initial social media posts claimed an autonomous AI agent swarm attacked a retail portal. Log inspection revealed a standard Mirai-variant shell script cycling static HTTP GET requests without any LLM or agentic coordination.',
      quotation_snippet:
        '"Log inspection revealed a standard Mirai-variant shell script cycling static HTTP GET requests without any LLM or agentic coordination."',
      citation_group_id: null,
      content_hash: 'demo-hash-2',
      is_primary_source: false,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
    {
      id: 'demo-rec-3',
      source_id: 'demo-src-2',
      external_id: 'DEMO-LAB-2026-108',
      original_url: 'https://example.org/demo/sentinel/108',
      canonical_url: 'https://example.org/demo/sentinel/108',
      title:
        '[DEMO SCENARIO] Synthetic Persona Cluster Using Multi-Agent Debate Loop for Astroturfing',
      normalized_title:
        'demo scenario synthetic persona cluster using multi agent debate loop for astroturfing',
      author: 'Sentinel Influence Analysts',
      published_at: '2026-10-22T16:40:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC DEMO RECORD: Analysis of a simulated influence network of 48 automated personas showed 3distinct agent roles (Seeder, Amplifier, Fact-Contester) replying to one another within 90 seconds to manufacture artificial consensus.',
      quotation_snippet:
        '"3 distinct agent roles (Seeder, Amplifier, Fact-Contester) replying to one another within 90 seconds to manufacture artificial consensus."',
      citation_group_id: null,
      content_hash: 'demo-hash-3',
      is_primary_source: true,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
    {
      id: 'demo-rec-4',
      source_id: 'demo-src-1',
      external_id: 'DEMO-CERT-2026-004',
      original_url: 'https://example.org/demo/cert/2026-004',
      canonical_url: 'https://example.org/demo/cert/2026-004',
      title:
        '[DEMO SCENARIO] Exposed Model Context Protocol (MCP) Orchestrator Allows Cross-Agent Tool Injection',
      normalized_title:
        'demo scenario exposed model context protocol mcp orchestrator allows cross agent tool injection',
      author: 'Demo CERT Vulnerability Team',
      published_at: '2026-10-21T11:20:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC DEMO RECORD: An unauthenticated agent orchestration gateway allowed indirect prompt payloads in shared scratchpads to hijack downstream tool-execution agents.',
      quotation_snippet:
        '"Indirect prompt payloads in shared scratchpads hijacked downstream tool-execution agents."',
      citation_group_id: null,
      content_hash: 'demo-hash-4',
      is_primary_source: true,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
    {
      id: 'demo-rec-5',
      source_id: 'demo-src-2',
      external_id: 'DEMO-LAB-2026-112',
      original_url: 'https://example.org/demo/sentinel/112',
      canonical_url: 'https://example.org/demo/sentinel/112',
      title:
        '[DEMO BENCHMARK] Controlled Evaluation of 8 Cooperative Defensive Patching Agents in Sandbox',
      normalized_title:
        'demo benchmark controlled evaluation of 8 cooperative defensive patching agents in sandbox',
      author: 'Sentinel Academic Fellowship',
      published_at: '2026-10-20T08:00:00.000Z',
      retrieved_at: now,
      raw_excerpt:
        'SYNTHETIC RESEARCH RECORD: Controlled academic benchmark evaluating 8 cooperative defensive agents triaging synthetic CVEs in an air-gapped container cluster.',
      quotation_snippet:
        '"Controlled academic benchmark evaluating 8 cooperative defensive agents in an air-gapped container cluster."',
      citation_group_id: null,
      content_hash: 'demo-hash-5',
      is_primary_source: true,
      raw_metadata: { synthetic_demo: true },
      operating_mode: 'demo',
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'demo-inc-1',
      slug: 'demo-coordinated-14-agent-recon-swarm',
      title:
        '[SYNTHETIC DEMO] Coordinated 14-Agent Reconnaissance & Exploit Swarm in Simulated Exercise',
      summary:
        'Synthetic training fixture illustrating a corroborated multi-agent cyber operation where a supervisor agent delegated reconnaissance, enumeration, and planning tasks across 14 sub-agents.',
      main_event:
        'Simulated 14-agent hierarchical cyber operation corroborated by two synthetic sources',
      incident_type: 'Multi-Agent Cyber Intrusion Simulation',
      primary_category: 'ai_driven_cyber_operations',
      categories: ['ai_driven_cyber_operations', 'coordinated_ai_agents'],
      severity: 'high',
      verification_status: 'corroborated',
      source_reliability: 95,
      evidence_strength: 'strong',
      classification_confidence: 0.94,
      swarm_evidence:
        'Explicit supervisor-to-worker multi-agent architecture with 14 specialized sub-agents sharing state over a message bus.',
      evidence_summary:
        'Two independent synthetic sources (Demo CERT and Sentinel Lab) provide primary telemetry confirming 14 coordinated agents.',
      classification_rationale:
        'Classified as AI-Driven Cyber Operations + Coordinated AI Agents due to documented multi-agent task delegation and corroborating telemetry.',
      known_facts: [
        '14 specialized sub-agents operated under 1 supervisor planner agent.',
        'Sub-agents were divided into 4 recon, 6 enumeration, and 4 lateral-movement roles.',
      ],
      uncertainties: [
        'Whether the retry loop in 2 lateral-movement agents was triggered by network latency or context window truncation.',
      ],
      contradictions: [
        'Source A reported all 14 sub-agents completed execution, whereas Source B documented 2 sub-agents stalling in a retry loop.',
      ],
      reported_agent_count: 14,
      reported_agent_count_note:
        'Explicitly documented as 14 sub-agents + 1 supervisor in synthetic telemetry.',
      human_supervision_level: 'Human-on-the-loop red-team exercise supervisor',
      reported_impact:
        'Simulated compromise of testbed domain controller within 18 minutes (no real-world systems affected).',
      affected_systems: ['LangGraph Testbed', 'Simulated AD Environment'],
      affected_industries: ['Energy & Grid Simulation'],
      country_code: 'US',
      country_name: 'United States',
      region_name: 'North America',
      latitude: 39.8283,
      longitude: -98.5795,
      location_precision: 'country',
      location_basis: 'occurrence_location',
      occurred_at: '2026-10-24T10:00:00.000Z',
      first_published_at: '2026-10-24T14:30:00.000Z',
      discovered_at: now,
      updated_at: now,
      record_lifecycle: 'merged',
      independent_source_count: 2,
      has_primary_source: true,
      ai_model_used: 'demo-seed-fixture',
      is_confirmed_swarm: true,
      operating_mode: 'demo',
    },
    {
      id: 'demo-inc-2',
      slug: 'demo-false-positive-legacy-bash-botnet',
      title:
        '[SYNTHETIC DEMO] Suspected "AI Swarm" DDoS Found to Be Ordinary Scripted Botnet',
      summary:
        'Synthetic QA fixture demonstrating that ordinary scripted automation (Mirai-style HTTP floods) is NOT misclassified as a confirmed AI swarm.',
      main_event:
        'Legacy bash DDoS script mischaracterized on social forums as an AI agent swarm',
      incident_type: 'Ordinary Scripted Automation (Non-Swarm)',
      primary_category: 'unverified_suspected_activity',
      categories: ['unverified_suspected_activity'],
      severity: 'low',
      verification_status: 'unverified',
      source_reliability: 48,
      evidence_strength: 'weak',
      classification_confidence: 0.91,
      swarm_evidence:
        'No evidence of AI agents or multi-agent coordination. Forensic logs showed deterministic bash loop HTTP requests.',
      evidence_summary:
        'Rejected as a confirmed AI swarm because telemetry shows static scripted requests without autonomous decision-making.',
      classification_rationale:
        'Per Section 2 taxonomy rules, ordinary botnets and automated scripts must not be labeled as confirmed AI swarms.',
      known_facts: [
        'Forum rumors alleged an AI swarm attack.',
        'Server logs showed static HTTP GET requests from a conventional shell script.',
      ],
      uncertainties: ['Origin of the initial forum rumor.'],
      contradictions: [
        'Forum post claimed autonomous LLM agents were adapting payloads; server logs showed identical static requests.',
      ],
      reported_agent_count: null,
      reported_agent_count_note:
        'Zero AI agents confirmed; activity consisted of conventional non-AI scripts.',
      human_supervision_level: 'Conventional scripted cron/botnet execution',
      reported_impact: 'Brief rate-limiting on demo retail staging endpoint.',
      affected_systems: ['Legacy HTTP Endpoint'],
      affected_industries: ['Retail (Simulated)'],
      country_code: null,
      country_name: null,
      region_name: null,
      latitude: null,
      longitude: null,
      location_precision: 'unknown',
      location_basis: 'unknown',
      occurred_at: null,
      first_published_at: '2026-10-23T09:00:00.000Z',
      discovered_at: now,
      updated_at: now,
      record_lifecycle: 'new',
      independent_source_count: 1,
      has_primary_source: false,
      ai_model_used: 'demo-seed-fixture',
      is_confirmed_swarm: false,
      operating_mode: 'demo',
    },
    {
      id: 'demo-inc-3',
      slug: 'demo-synthetic-persona-influence-swarm',
      title:
        '[SYNTHETIC DEMO] 48-Persona Multi-Agent Debate Loop for Synthetic Consensus',
      summary:
        'Synthetic fixture modeling a 3-role coordinated AI social manipulation swarm (Seeder, Amplifier, Fact-Contester) across 48 automated personas.',
      main_event:
        'Simulated 48-persona multi-agent social manipulation network',
      incident_type: 'Coordinated Synthetic Influence Network',
      primary_category: 'ai_social_manipulation',
      categories: ['ai_social_manipulation', 'coordinated_ai_agents'],
      severity: 'medium',
      verification_status: 'confirmed',
      source_reliability: 88,
      evidence_strength: 'strong',
      classification_confidence: 0.89,
      swarm_evidence:
        'Documented 3-tier role specialization across 48 LLM-driven personas coordinating cross-replies within 90-second windows.',
      evidence_summary:
        'Primary lab analysis verified inter-agent coordination hooks and role handoffs.',
      classification_rationale:
        'Matches AI Social Manipulation and Coordinated AI Agents criteria.',
      known_facts: [
        '48 automated personas divided into Seeder, Amplifier, and Fact-Contester roles.',
        'Cross-replies coordinated within 90 seconds.',
      ],
      uncertainties: ['Upstream foundation model provider used by the persona cluster.'],
      contradictions: [],
      reported_agent_count: 48,
      reported_agent_count_note: '48 coordinated persona agents documented in synthetic study.',
      human_supervision_level: 'Campaign campaign-goal prompt with autonomous reply scheduling',
      reported_impact: 'Simulated distortion of comment-thread sentiment metrics.',
      affected_systems: ['Social Discussion Sandbox'],
      affected_industries: ['Media & Communications'],
      country_code: 'GB',
      country_name: 'United Kingdom',
      region_name: 'Europe',
      latitude: 54.7024,
      longitude: -3.2766,
      location_precision: 'country',
      location_basis: 'occurrence_location',
      occurred_at: '2026-10-22T12:00:00.000Z',
      first_published_at: '2026-10-22T16:40:00.000Z',
      discovered_at: now,
      updated_at: now,
      record_lifecycle: 'new',
      independent_source_count: 1,
      has_primary_source: true,
      ai_model_used: 'demo-seed-fixture',
      is_confirmed_swarm: true,
      operating_mode: 'demo',
    },
    {
      id: 'demo-inc-4',
      slug: 'demo-exposed-mcp-orchestrator-injection',
      title:
        '[SYNTHETIC DEMO] Exposed Agent Orchestrator Allows Cross-Agent Scratchpad Injection',
      summary:
        'Synthetic fixture illustrating Agent Infrastructure Abuse where an exposed orchestration server permitted indirect prompt injection across downstream tool agents.',
      main_event: 'Cross-agent tool injection via exposed orchestration scratchpad',
      incident_type: 'Agent Orchestration Infrastructure Abuse',
      primary_category: 'agent_infrastructure_abuse',
      categories: ['agent_infrastructure_abuse', 'autonomous_agent_incidents'],
      severity: 'high',
      verification_status: 'confirmed',
      source_reliability: 95,
      evidence_strength: 'strong',
      classification_confidence: 0.92,
      swarm_evidence:
        'Multi-agent shared scratchpad propagated untrusted instructions to downstream tool-calling agents.',
      evidence_summary:
        'Primary CERT synthetic advisory demonstrating cross-agent privilege escalation.',
      classification_rationale:
        'Classified under Agent Infrastructure Abuse due to orchestration control-plane exposure.',
      known_facts: [
        'Shared memory scratchpad lacked agent-to-agent input sanitization.',
        'Downstream tool agent executed unauthorized read calls in sandbox.',
      ],
      uncertainties: [],
      contradictions: [],
      reported_agent_count: 3,
      reported_agent_count_note: '1 ingestion agent + 2 downstream tool-execution agents.',
      human_supervision_level: 'Unsupervised automated pipeline',
      reported_impact: 'Sandbox credential exposure in test environment.',
      affected_systems: ['Model Context Protocol (MCP)', 'CrewAI'],
      affected_industries: ['Cloud Infrastructure'],
      country_code: 'DE',
      country_name: 'Germany',
      region_name: 'Europe',
      latitude: 51.1657,
      longitude: 10.4515,
      location_precision: 'country',
      location_basis: 'occurrence_location',
      occurred_at: '2026-10-21T08:00:00.000Z',
      first_published_at: '2026-10-21T11:20:00.000Z',
      discovered_at: now,
      updated_at: now,
      record_lifecycle: 'new',
      independent_source_count: 1,
      has_primary_source: true,
      ai_model_used: 'demo-seed-fixture',
      is_confirmed_swarm: true,
      operating_mode: 'demo',
    },
    {
      id: 'demo-inc-5',
      slug: 'demo-benign-8-agent-defensive-patching-benchmark',
      title:
        '[SYNTHETIC DEMO] Controlled Benchmark of 8 Cooperative Defensive Patching Agents',
      summary:
        'Synthetic fixture representing legitimate Benign or Research Activity involving 8 cooperative defensive AI agents triaging vulnerabilities in an air-gapped lab.',
      main_event: 'Academic evaluation of 8 cooperative defensive patching agents',
      incident_type: 'Authorized Multi-Agent Security Research',
      primary_category: 'benign_research_activity',
      categories: ['benign_research_activity', 'coordinated_ai_agents'],
      severity: 'informational',
      verification_status: 'confirmed',
      source_reliability: 88,
      evidence_strength: 'strong',
      classification_confidence: 0.96,
      swarm_evidence:
        '8 cooperative agents coordinated patch generation and regression verification in a closed benchmark.',
      evidence_summary:
        'Authorized academic benchmark with full telemetry and zero external risk.',
      classification_rationale:
        'Classified as Benign or Research Activity with Informational severity.',
      known_facts: [
        '8 cooperative agents evaluated in an air-gapped container cluster.',
        'Authorized research study with no external impact.',
      ],
      uncertainties: [],
      contradictions: [],
      reported_agent_count: 8,
      reported_agent_count_note: '8 cooperative defensive agents.',
      human_supervision_level: 'Full researcher supervision in air-gapped sandbox',
      reported_impact: 'Benign research benchmark; no adverse impact.',
      affected_systems: ['Microsoft AutoGen'],
      affected_industries: ['Academic Research'],
      country_code: 'JP',
      country_name: 'Japan',
      region_name: 'East Asia',
      latitude: 36.2048,
      longitude: 138.2529,
      location_precision: 'country',
      location_basis: 'occurrence_location',
      occurred_at: '2026-10-20T04:00:00.000Z',
      first_published_at: '2026-10-20T08:00:00.000Z',
      discovered_at: now,
      updated_at: now,
      record_lifecycle: 'new',
      independent_source_count: 1,
      has_primary_source: true,
      ai_model_used: 'demo-seed-fixture',
      is_confirmed_swarm: true,
      operating_mode: 'demo',
    },
  ];

  const incident_sources: IncidentSourceLink[] = [
    {
      id: 'demo-is-1a',
      incident_id: 'demo-inc-1',
      source_record_id: 'demo-rec-1a',
      source_id: 'demo-src-1',
      relationship_type: 'primary_report',
      extracted_claims: [
        'Supervisor agent orchestrated 14 specialized sub-agents.',
        'Sub-agents communicated over a shared memory bus.',
      ],
      quotation:
        '"A supervisor agent orchestrated 14 specialized sub-agents communicating over a shared memory bus."',
      similarity_score: 1.0,
      linked_at: now,
    },
    {
      id: 'demo-is-1b',
      incident_id: 'demo-inc-1',
      source_record_id: 'demo-rec-1b',
      source_id: 'demo-src-2',
      relationship_type: 'independent_corroboration',
      extracted_claims: [
        'Independent packet capture confirmed the 14-agent hierarchy.',
        '2 lateral-movement sub-agents entered a retry loop before completion.',
      ],
      quotation:
        '"Independent packet capture confirms the 14-agent hierarchical task delegation pattern."',
      similarity_score: 0.94,
      linked_at: now,
    },
    {
      id: 'demo-is-2',
      incident_id: 'demo-inc-2',
      source_record_id: 'demo-rec-2',
      source_id: 'demo-src-3',
      relationship_type: 'primary_report',
      extracted_claims: [
        'Traffic originated from a static Mirai-variant bash script, not AI agents.',
      ],
      quotation:
        '"Log inspection revealed a standard Mirai-variant shell script cycling static HTTP GET requests without any LLM or agentic coordination."',
      similarity_score: 1.0,
      linked_at: now,
    },
    {
      id: 'demo-is-3',
      incident_id: 'demo-inc-3',
      source_record_id: 'demo-rec-3',
      source_id: 'demo-src-2',
      relationship_type: 'primary_report',
      extracted_claims: [
        '48 automated personas operated in Seeder, Amplifier, and Fact-Contester roles.',
      ],
      quotation:
        '"3 distinct agent roles (Seeder, Amplifier, Fact-Contester) replying to one another within 90 seconds."',
      similarity_score: 1.0,
      linked_at: now,
    },
    {
      id: 'demo-is-4',
      incident_id: 'demo-inc-4',
      source_record_id: 'demo-rec-4',
      source_id: 'demo-src-1',
      relationship_type: 'primary_report',
      extracted_claims: [
        'Shared scratchpad allowed indirect prompt payloads to hijack downstream agents.',
      ],
      quotation:
        '"Indirect prompt payloads in shared scratchpads hijacked downstream tool-execution agents."',
      similarity_score: 1.0,
      linked_at: now,
    },
    {
      id: 'demo-is-5',
      incident_id: 'demo-inc-5',
      source_record_id: 'demo-rec-5',
      source_id: 'demo-src-2',
      relationship_type: 'primary_report',
      extracted_claims: [
        '8 cooperative defensive agents evaluated in an air-gapped container cluster.',
      ],
      quotation:
        '"Controlled academic benchmark evaluating 8 cooperative defensive agents in an air-gapped container cluster."',
      similarity_score: 1.0,
      linked_at: now,
    },
  ];

  const entities: Entity[] = [
    {
      id: 'demo-ent-1',
      slug: 'langgraph',
      name: 'LangGraph',
      entity_type: 'agent_framework',
      aliases: ['LangChain Graph Orchestrator'],
      description: 'Stateful multi-agent orchestration framework referenced in testbed telemetry.',
      country_code: 'US',
      first_seen_at: '2026-10-20T08:00:00.000Z',
      last_seen_at: now,
      match_confidence: 0.95,
      operating_mode: 'demo',
    },
    {
      id: 'demo-ent-2',
      slug: 'model-context-protocol-mcp',
      name: 'Model Context Protocol (MCP)',
      entity_type: 'agent_framework',
      aliases: ['MCP Server', 'MCP'],
      description: 'Open protocol connecting AI agents to external data sources and tools.',
      country_code: 'US',
      first_seen_at: '2026-10-21T11:20:00.000Z',
      last_seen_at: now,
      match_confidence: 0.96,
      operating_mode: 'demo',
    },
    {
      id: 'demo-ent-3',
      slug: 'microsoft-autogen',
      name: 'Microsoft AutoGen',
      entity_type: 'agent_framework',
      aliases: ['AutoGen Multi-Agent Framework'],
      description: 'Multi-agent conversation framework used in research and engineering.',
      country_code: 'US',
      first_seen_at: '2026-10-20T08:00:00.000Z',
      last_seen_at: now,
      match_confidence: 0.94,
      operating_mode: 'demo',
    },
  ];

  const incident_entities: IncidentEntityLink[] = [
    {
      id: 'demo-ie-1',
      incident_id: 'demo-inc-1',
      entity_id: 'demo-ent-1',
      role: 'agent_framework_used',
      relationship_certainty: 'confirmed',
      evidence_note: 'Used as the state graph bus in the simulated red-team exercise.',
    },
    {
      id: 'demo-ie-2',
      incident_id: 'demo-inc-4',
      entity_id: 'demo-ent-2',
      role: 'agent_framework_used',
      relationship_certainty: 'confirmed',
      evidence_note: 'Exposed orchestrator endpoint tested in synthetic advisory.',
    },
    {
      id: 'demo-ie-3',
      incident_id: 'demo-inc-5',
      entity_id: 'demo-ent-3',
      role: 'agent_framework_used',
      relationship_certainty: 'confirmed',
      evidence_note: 'Used to coordinate the 8 defensive patching agents in benchmark.',
    },
  ];

  const incident_timeline: IncidentTimelineEvent[] = [
    {
      id: 'demo-tl-1',
      incident_id: 'demo-inc-1',
      event_time: '2026-10-24T10:00:00.000Z',
      phase_type: 'occurrence',
      title: 'Simulated Exercise Execution',
      description: '14-agent hierarchical swarm initiated in controlled red-team environment.',
      source_record_id: 'demo-rec-1a',
      created_at: now,
    },
    {
      id: 'demo-tl-2',
      incident_id: 'demo-inc-1',
      event_time: '2026-10-24T14:30:00.000Z',
      phase_type: 'publication',
      title: 'Primary CERT Simulation Advisory Published',
      description: 'Demo CERT published initial telemetry report.',
      source_record_id: 'demo-rec-1a',
      created_at: now,
    },
    {
      id: 'demo-tl-3',
      incident_id: 'demo-inc-1',
      event_time: '2026-10-24T18:15:00.000Z',
      phase_type: 'corroboration',
      title: 'Independent Corroboration Linked',
      description: 'Sentinel Agentic Research Lab packet capture correlated to incident.',
      source_record_id: 'demo-rec-1b',
      created_at: now,
    },
  ];

  const classification_history: ClassificationHistoryEntry[] = [
    {
      id: 'demo-ch-1',
      incident_id: 'demo-inc-1',
      classified_at: '2026-10-24T14:35:00.000Z',
      model_or_actor: 'demo-seed-fixture',
      previous_category: null,
      new_category: 'ai_driven_cyber_operations',
      previous_severity: null,
      new_severity: 'high',
      previous_verification: 'reported',
      new_verification: 'corroborated',
      confidence_score: 0.94,
      rationale:
        'Upgraded verification from Reported to Corroborated upon linking independent Sentinel Lab telemetry.',
      is_manual_override: false,
    },
  ];

  const watchlists: Watchlist[] = [
    {
      id: 'demo-wl-1',
      name: '[DEMO] Critical Agentic Cyber & Infrastructure Alerts',
      description:
        'Monitors high-severity agentic cyber operations and MCP/orchestration abuse in Demo Mode.',
      notify_in_app: true,
      min_severity: 'medium',
      created_at: now,
      updated_at: now,
      operating_mode: 'demo',
    },
  ];

  const watchlist_items: WatchlistItem[] = [
    {
      id: 'demo-wli-1',
      watchlist_id: 'demo-wl-1',
      item_type: 'category',
      item_value: 'ai_driven_cyber_operations',
      label: 'Category: AI-Driven Cyber Operations',
      created_at: now,
    },
    {
      id: 'demo-wli-2',
      watchlist_id: 'demo-wl-1',
      item_type: 'entity',
      item_value: 'model-context-protocol-mcp',
      label: 'Framework: Model Context Protocol (MCP)',
      created_at: now,
    },
  ];

  return {
    sources,
    source_runs,
    source_records,
    incidents,
    incident_sources,
    entities,
    incident_entities,
    incident_timeline,
    classification_history,
    watchlists,
    watchlist_items,
    user_feedback: [],
  };
}
