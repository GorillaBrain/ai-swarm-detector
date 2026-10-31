import { z } from 'zod';

export const SwarmCategorySchema = z.enum([
  'coordinated_ai_agents',
  'ai_driven_cyber_operations',
  'ai_social_manipulation',
  'autonomous_agent_incidents',
  'agent_infrastructure_abuse',
  'benign_research_activity',
  'unverified_suspected_activity',
]);

export const SeverityLevelSchema = z.enum([
  'informational',
  'low',
  'medium',
  'high',
  'critical',
]);

export const VerificationStatusSchema = z.enum([
  'confirmed',
  'corroborated',
  'reported',
  'suspected',
  'unverified',
]);

export const EvidenceStrengthSchema = z.enum([
  'strong',
  'moderate',
  'circumstantial',
  'weak',
]);

export const LocationPrecisionSchema = z.enum([
  'exact',
  'city',
  'country',
  'region',
  'global',
  'unknown',
]);

export const LocationBasisSchema = z.enum([
  'occurrence_location',
  'targeted_location',
  'reporting_org_only',
  'unknown',
]);

export const ExtractedEntitySchema = z.object({
  name: z.string().min(1).max(160),
  entity_type: z.enum([
    'organization',
    'agent_framework',
    'ai_system',
    'threat_actor',
    'research_group',
    'government_agency',
  ]),
  role: z.enum([
    'affected_organization',
    'reporting_organization',
    'agent_framework_used',
    'ai_system_involved',
    'attributed_actor',
    'research_institution',
    'mentioned_entity',
  ]),
  relationship_certainty: z.enum(['confirmed', 'observed', 'suspected']),
  evidence_note: z.string().nullable().default(null),
});

export const AIClassificationOutputSchema = z.object({
  main_event: z.string().min(5).max(500),
  incident_type: z.string().min(3).max(160),
  summary: z.string().min(10).max(1500),
  classification: SwarmCategorySchema,
  secondary_categories: z.array(SwarmCategorySchema).default([]),
  severity: SeverityLevelSchema,
  verification_status: VerificationStatusSchema,
  evidence_strength: EvidenceStrengthSchema,
  confidence_score: z.number().min(0).max(1),
  is_confirmed_swarm: z.boolean(),
  swarm_evidence: z.string().min(5),
  evidence_summary: z.string().min(5),
  classification_rationale: z.string().min(5),
  known_facts: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
  supporting_source_ids: z.array(z.string()).default([]),
  occurred_at: z.string().nullable().default(null),
  reported_agent_count: z.number().int().positive().nullable().default(null),
  reported_agent_count_note: z.string().nullable().default(null),
  human_supervision_level: z.string().nullable().default(null),
  reported_impact: z.string().nullable().default(null),
  affected_systems: z.array(z.string()).default([]),
  affected_industries: z.array(z.string()).default([]),
  country_code: z.string().length(2).nullable().default(null),
  country_name: z.string().nullable().default(null),
  region_name: z.string().nullable().default(null),
  location_precision: LocationPrecisionSchema.default('unknown'),
  location_basis: LocationBasisSchema.default('unknown'),
  entities: z.array(ExtractedEntitySchema).default([]),
});

export type AIClassificationOutput = z.infer<typeof AIClassificationOutputSchema>;

/**
 * Enforces Section 2, 8, and 9 integrity rules on validated AI output:
 * - Weak evidence cannot produce 'confirmed' or 'corroborated' status, even if model confidence is high.
 * - Ordinary automation / unverified activity cannot be flagged as is_confirmed_swarm = true.
 * - Missing dates or unknown agent counts remain null.
 */
export function enforceClassificationIntegrityRules(
  raw: AIClassificationOutput,
  sourceReliability: number
): AIClassificationOutput {
  const result = { ...raw };

  // Rule 1: Weak or circumstantial evidence cannot be confirmed
  if (result.evidence_strength === 'weak') {
    result.is_confirmed_swarm = false;
    if (
      result.verification_status === 'confirmed' ||
      result.verification_status === 'corroborated' ||
      result.verification_status === 'reported'
    ) {
      result.verification_status = 'unverified';
    }
  } else if (result.evidence_strength === 'circumstantial') {
    result.is_confirmed_swarm = false;
    if (result.verification_status === 'confirmed') {
      result.verification_status = 'suspected';
    }
  }

  // Rule 2: Low reliability source cannot unilaterally confirm a swarm incident
  if (sourceReliability < 65 && result.verification_status === 'confirmed') {
    result.verification_status = 'reported';
    result.is_confirmed_swarm = false;
  }

  // Rule 3: Unverified suspected activity category cannot be marked as a confirmed swarm
  if (result.classification === 'unverified_suspected_activity') {
    result.is_confirmed_swarm = false;
    if (result.verification_status === 'confirmed') {
      result.verification_status = 'suspected';
    }
  }

  // Ensure primary classification is included in categories list
  const catSet = new Set([result.classification, ...result.secondary_categories]);
  result.secondary_categories = Array.from(catSet);

  // Validate occurred_at is a valid ISO timestamp or null
  if (result.occurred_at) {
    const parsed = Date.parse(result.occurred_at);
    if (Number.isNaN(parsed)) {
      result.occurred_at = null;
    } else {
      result.occurred_at = new Date(parsed).toISOString();
    }
  }

  return result;
}

export const IncidentFilterSchema = z.object({
  mode: z.enum(['live', 'demo']).default('live'),
  q: z.string().trim().max(200).optional(),
  category: SwarmCategorySchema.optional(),
  severity: SeverityLevelSchema.optional(),
  verification: VerificationStatusSchema.optional(),
  country: z.string().trim().max(60).optional(),
  sourceId: z.string().trim().max(100).optional(),
  entitySlug: z.string().trim().max(120).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  confirmedSwarmOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'updated', 'severity', 'confidence']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(20),
});

export const AnalystFeedbackInputSchema = z.object({
  incident_id: z.string().min(1),
  analyst_handle: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .default('SOC-Analyst-01'),
  feedback_type: z.enum([
    'reclassify_category',
    'adjust_severity',
    'dispute_swarm_status',
    'add_corroboration',
    'flag_false_positive',
  ]),
  proposed_category: SwarmCategorySchema.nullable().optional(),
  proposed_severity: SeverityLevelSchema.nullable().optional(),
  proposed_verification: VerificationStatusSchema.nullable().optional(),
  rationale: z.string().trim().min(10).max(1500),
  supporting_url: z.string().url().nullable().optional().or(z.literal('')),
});

export const WatchlistCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(400),
  notify_in_app: z.boolean().default(true),
  min_severity: SeverityLevelSchema.default('low'),
  mode: z.enum(['live', 'demo']).default('live'),
  items: z
    .array(
      z.object({
        item_type: z.enum(['entity', 'category', 'keyword', 'country', 'severity']),
        item_value: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
      })
    )
    .min(1),
});
