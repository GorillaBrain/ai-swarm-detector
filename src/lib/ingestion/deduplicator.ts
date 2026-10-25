import crypto from 'crypto';
import { Incident, SourceRecord } from '../types';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
]);

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'over',
  'after',
  'under',
  'about',
  'using',
  'used',
  'uses',
  'new',
  'how',
  'why',
  'what',
  'when',
  'where',
  'who',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'says',
  'said',
  'report',
  'reports',
  'reported',
  'news',
  'blog',
  'post',
  'article',
]);

const GENERIC_ENTITIES = new Set([
  'openai',
  'microsoft',
  'google',
  'anthropic',
  'meta',
  'github',
  'cisa',
  'mitre',
  'langchain',
  'autogpt',
  'crewai',
]);

/**
 * Canonicalizes a URL for deterministic deduplication.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim();
    const parsed = new URL(trimmed);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    for (const [key, val] of Array.from(parsed.searchParams.entries())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      } else if (val.endsWith('/')) {
        parsed.searchParams.set(key, val.replace(/\/+$/, ''));
      }
    }
    parsed.searchParams.sort();
    parsed.hash = '';
    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '/';
    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSignificantWords(text: string): string[] {
  return normalizeTitle(text)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function computeContentHash(title: string, excerpt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${normalizeTitle(title)}||${excerpt.trim().slice(0, 500).toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
}

export function computeTokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenizeSignificantWords(a));
  const tokensB = new Set(tokenizeSignificantWords(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface CorrelationMatch {
  incident: Incident;
  similarityScore: number;
  relationshipType: 'independent_corroboration' | 'secondary_reporting';
  reason: string;
}

/**
 * Determines whether an incoming SourceRecord describes an already-recorded Incident.
 * Uses:
 * 1. Explicit shared citation group ID (e.g., AI Incident Database incident #1781)
 * 2. High title + excerpt token similarity within a 21-day publication window
 *    PLUS shared specific event tokens (explicitly avoiding merging two unrelated
 *    incidents merely because both mention a major vendor like OpenAI or Microsoft).
 */
export function findCorrelatedIncident(
  incomingRecord: Pick<
    SourceRecord,
    | 'canonical_url'
    | 'title'
    | 'normalized_title'
    | 'raw_excerpt'
    | 'published_at'
    | 'citation_group_id'
  >,
  existingIncidents: Incident[],
  existingRecordsByIncident: Map<string, SourceRecord[]>
): CorrelationMatch | null {
  const incomingDomain = extractDomain(incomingRecord.canonical_url);
  const incomingTime = Date.parse(incomingRecord.published_at) || Date.now();

  let bestMatch: CorrelationMatch | null = null;

  for (const incident of existingIncidents) {
    const linkedRecords = existingRecordsByIncident.get(incident.id) || [];

    // 1. Check explicit citation group ID match (deterministic correlation)
    if (incomingRecord.citation_group_id) {
      const hasSameCitationGroup = linkedRecords.some(
        (r) =>
          r.citation_group_id &&
          r.citation_group_id === incomingRecord.citation_group_id
      );
      if (hasSameCitationGroup) {
        const existingDomains = new Set(
          linkedRecords.map((r) => extractDomain(r.canonical_url))
        );
        const isIndependent = !existingDomains.has(incomingDomain);
        return {
          incident,
          similarityScore: 0.96,
          relationshipType: isIndependent
            ? 'independent_corroboration'
            : 'secondary_reporting',
          reason: `Matched shared incident citation identifier (${incomingRecord.citation_group_id})`,
        };
      }
    }

    // 2. Check temporal window (within 21 days of first_published_at)
    const incidentTime = Date.parse(incident.first_published_at) || incomingTime;
    const daysApart = Math.abs(incomingTime - incidentTime) / (1000 * 60 * 60 * 24);
    if (daysApart > 21) continue;

    // 3. Compute title & summary similarity, excluding generic vendor-only overlap
    const titleSim = computeTokenSimilarity(
      incomingRecord.title,
      incident.title
    );
    const combinedSim = computeTokenSimilarity(
      `${incomingRecord.title} ${incomingRecord.raw_excerpt}`,
      `${incident.title} ${incident.summary}`
    );

    // Check non-generic shared tokens
    const tokensA = new Set(
      tokenizeSignificantWords(incomingRecord.title).filter(
        (t) => !GENERIC_ENTITIES.has(t)
      )
    );
    const tokensB = new Set(
      tokenizeSignificantWords(incident.title).filter(
        (t) => !GENERIC_ENTITIES.has(t)
      )
    );
    let specificOverlap = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) specificOverlap++;
    }

    // Require strong specific overlap so two unrelated articles about "OpenAI" or "LangChain" never merge
    const score = Math.max(titleSim, combinedSim * 0.9);
    if (specificOverlap >= 3 && score >= 0.42) {
      const existingDomains = new Set(
        linkedRecords.map((r) => extractDomain(r.canonical_url))
      );
      // Also check if the excerpt appears to be a verbatim wire repost (e.g. Reuters syndicated)
      const isWireRepost = linkedRecords.some(
        (r) => computeTokenSimilarity(r.raw_excerpt, incomingRecord.raw_excerpt) > 0.85
      );
      const isIndependent = !existingDomains.has(incomingDomain) && !isWireRepost;

      if (!bestMatch || score > bestMatch.similarityScore) {
        bestMatch = {
          incident,
          similarityScore: Number(score.toFixed(3)),
          relationshipType: isIndependent
            ? 'independent_corroboration'
            : 'secondary_reporting',
          reason: `Matched ${specificOverlap} specific event tokens with similarity ${(
            score * 100
          ).toFixed(0)}%`,
        };
      }
    }
  }

  return bestMatch;
}
