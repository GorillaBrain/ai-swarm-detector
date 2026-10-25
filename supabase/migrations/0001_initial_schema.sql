-- ============================================================================
-- AI SWARM DETECTOR — Global AI Agent Threat Intelligence & Incident Monitoring
-- Database Migration: 0001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SOURCES TABLE
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'atom', 'rest_json', 'yaml_dataset', 'advisory_feed', 'manual')),
  endpoint_url TEXT NOT NULL,
  homepage_url TEXT NOT NULL,
  reliability_score INTEGER NOT NULL DEFAULT 75 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  reliability_tier TEXT NOT NULL DEFAULT 'established_media' CHECK (reliability_tier IN ('primary_research_cert', 'major_security_vendor', 'established_media', 'community_preprint', 'unverified_source')),
  is_primary_producer BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  requires_api_key BOOLEAN NOT NULL DEFAULT FALSE,
  api_key_env_var TEXT,
  rate_limit_seconds INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unavailable', 'no_new_reports', 'rate_limited', 'unconfigured')),
  last_successful_run_at TIMESTAMPTZ,
  last_attempted_run_at TIMESTAMPTZ,
  last_error TEXT,
  total_records_fetched INTEGER NOT NULL DEFAULT 0,
  total_incidents_linked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);

-- 2. SOURCE RUNS TABLE
CREATE TABLE IF NOT EXISTS source_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'partial', 'failed', 'skipped_rate_limit')),
  trigger_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (trigger_type IN ('scheduled', 'manual', 'startup', 'seed')),
  records_retrieved INTEGER NOT NULL DEFAULT 0,
  records_accepted INTEGER NOT NULL DEFAULT 0,
  duplicates_detected INTEGER NOT NULL DEFAULT 0,
  irrelevant_filtered INTEGER NOT NULL DEFAULT 0,
  processing_errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  operating_mode TEXT NOT NULL DEFAULT 'live' CHECK (operating_mode IN ('live', 'demo'))
);

CREATE INDEX IF NOT EXISTS idx_source_runs_source_id ON source_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_runs_started_at ON source_runs(started_at DESC);

-- 3. SOURCE RECORDS TABLE (Raw / Normalized Original Reports)
CREATE TABLE IF NOT EXISTS source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_excerpt TEXT NOT NULL,
  quotation_snippet TEXT,
  citation_group_id TEXT,
  content_hash TEXT NOT NULL,
  is_primary_source BOOLEAN NOT NULL DEFAULT FALSE,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  operating_mode TEXT NOT NULL DEFAULT 'live' CHECK (operating_mode IN ('live', 'demo')),
  UNIQUE(source_id, external_id, operating_mode),
  UNIQUE(canonical_url, operating_mode)
);

CREATE INDEX IF NOT EXISTS idx_source_records_published_at ON source_records(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_records_canonical_url ON source_records(canonical_url);
CREATE INDEX IF NOT EXISTS idx_source_records_mode ON source_records(operating_mode);

-- 4. INCIDENTS TABLE (Normalized & Correlated Threat Intelligence Records)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  main_event TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  primary_category TEXT NOT NULL CHECK (primary_category IN (
    'coordinated_ai_agents',
    'ai_driven_cyber_operations',
    'ai_social_manipulation',
    'autonomous_agent_incidents',
    'agent_infrastructure_abuse',
    'benign_research_activity',
    'unverified_suspected_activity'
  )),
  categories TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('confirmed', 'corroborated', 'reported', 'suspected', 'unverified')),
  source_reliability INTEGER NOT NULL DEFAULT 75 CHECK (source_reliability >= 0 AND source_reliability <= 100),
  evidence_strength TEXT NOT NULL CHECK (evidence_strength IN ('strong', 'moderate', 'circumstantial', 'weak')),
  classification_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  swarm_evidence TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  classification_rationale TEXT NOT NULL,
  known_facts TEXT[] NOT NULL DEFAULT '{}',
  uncertainties TEXT[] NOT NULL DEFAULT '{}',
  contradictions TEXT[] NOT NULL DEFAULT '{}',
  reported_agent_count INTEGER,
  reported_agent_count_note TEXT,
  human_supervision_level TEXT,
  reported_impact TEXT,
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  affected_industries TEXT[] NOT NULL DEFAULT '{}',
  country_code TEXT,
  country_name TEXT,
  region_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_precision TEXT NOT NULL DEFAULT 'unknown' CHECK (location_precision IN ('exact', 'city', 'country', 'region', 'global', 'unknown')),
  location_basis TEXT NOT NULL DEFAULT 'unknown' CHECK (location_basis IN ('occurrence_location', 'targeted_location', 'reporting_org_only', 'unknown')),
  occurred_at TIMESTAMPTZ,
  first_published_at TIMESTAMPTZ NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_lifecycle TEXT NOT NULL DEFAULT 'new' CHECK (record_lifecycle IN ('new', 'updated', 'merged')),
  independent_source_count INTEGER NOT NULL DEFAULT 1,
  has_primary_source BOOLEAN NOT NULL DEFAULT FALSE,
  ai_model_used TEXT NOT NULL DEFAULT 'rule-engine-v1',
  is_confirmed_swarm BOOLEAN NOT NULL DEFAULT FALSE,
  operating_mode TEXT NOT NULL DEFAULT 'live' CHECK (operating_mode IN ('live', 'demo'))
);

CREATE INDEX IF NOT EXISTS idx_incidents_mode_published ON incidents(operating_mode, first_published_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_primary_category ON incidents(primary_category);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_verification ON incidents(verification_status);
CREATE INDEX IF NOT EXISTS idx_incidents_country ON incidents(country_code);
CREATE INDEX IF NOT EXISTS idx_incidents_updated ON incidents(updated_at DESC);

-- 5. INCIDENT SOURCES TABLE (Many-to-Many Join with Claim Traceability)
CREATE TABLE IF NOT EXISTS incident_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'primary_report' CHECK (relationship_type IN ('primary_report', 'independent_corroboration', 'secondary_reporting', 'conflicting_account')),
  extracted_claims TEXT[] NOT NULL DEFAULT '{}',
  quotation TEXT,
  similarity_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(incident_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_sources_incident ON incident_sources(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_sources_record ON incident_sources(source_record_id);

-- 6. ENTITIES TABLE (Organizations, Threat Actors, AI Systems, Agent Frameworks)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'agent_framework', 'ai_system', 'threat_actor', 'research_group', 'government_agency')),
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  country_code TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.900,
  operating_mode TEXT NOT NULL DEFAULT 'live' CHECK (operating_mode IN ('live', 'demo')),
  UNIQUE(slug, operating_mode)
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_mode ON entities(operating_mode);

-- 7. INCIDENT ENTITIES TABLE
CREATE TABLE IF NOT EXISTS incident_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('affected_organization', 'reporting_organization', 'agent_framework_used', 'ai_system_involved', 'attributed_actor', 'research_institution', 'mentioned_entity')),
  relationship_certainty TEXT NOT NULL DEFAULT 'observed' CHECK (relationship_certainty IN ('confirmed', 'observed', 'suspected')),
  evidence_note TEXT,
  UNIQUE(incident_id, entity_id, role)
);

CREATE INDEX IF NOT EXISTS idx_incident_entities_incident ON incident_entities(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_entities_entity ON incident_entities(entity_id);

-- 8. INCIDENT TIMELINE TABLE
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('occurrence', 'publication', 'ingestion', 'corroboration', 'classification', 'analyst_review')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_record_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id, event_time ASC);

-- 9. CLASSIFICATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_or_actor TEXT NOT NULL,
  previous_category TEXT,
  new_category TEXT NOT NULL,
  previous_severity TEXT,
  new_severity TEXT NOT NULL,
  previous_verification TEXT,
  new_verification TEXT NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  rationale TEXT NOT NULL,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_classification_history_incident ON classification_history(incident_id, classified_at DESC);

-- 10. WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  notify_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  min_severity TEXT NOT NULL DEFAULT 'low' CHECK (min_severity IN ('informational', 'low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operating_mode TEXT NOT NULL DEFAULT 'live' CHECK (operating_mode IN ('live', 'demo'))
);

-- 11. WATCHLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('entity', 'category', 'keyword', 'country', 'severity')),
  item_value TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(watchlist_id, item_type, item_value)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);

-- 12. USER FEEDBACK & ANALYST CORRECTIONS TABLE
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  analyst_handle TEXT NOT NULL DEFAULT 'SOC-Analyst',
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('reclassify_category', 'adjust_severity', 'dispute_swarm_status', 'add_corroboration', 'flag_false_positive')),
  proposed_category TEXT,
  proposed_severity TEXT,
  proposed_verification TEXT,
  rationale TEXT NOT NULL,
  supporting_url TEXT,
  applied BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_incident ON user_feedback(incident_id, created_at DESC);

-- 13. AUDIT LOGS TABLE (Security Requirement Section 16)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('allowed', 'denied', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for intelligence analysis; mutations restricted to service_role
CREATE POLICY "Public read sources" ON sources FOR SELECT USING (true);
CREATE POLICY "Public read source_runs" ON source_runs FOR SELECT USING (true);
CREATE POLICY "Public read source_records" ON source_records FOR SELECT USING (true);
CREATE POLICY "Public read incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Public read incident_sources" ON incident_sources FOR SELECT USING (true);
CREATE POLICY "Public read entities" ON entities FOR SELECT USING (true);
CREATE POLICY "Public read incident_entities" ON incident_entities FOR SELECT USING (true);
CREATE POLICY "Public read incident_timeline" ON incident_timeline FOR SELECT USING (true);
CREATE POLICY "Public read classification_history" ON classification_history FOR SELECT USING (true);
CREATE POLICY "Public read watchlists" ON watchlists FOR SELECT USING (true);
CREATE POLICY "Public read watchlist_items" ON watchlist_items FOR SELECT USING (true);
CREATE POLICY "Public read user_feedback" ON user_feedback FOR SELECT USING (true);
