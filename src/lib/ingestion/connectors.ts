import { XMLParser } from 'fast-xml-parser';
import * as yaml from 'js-yaml';
import { Source } from '../types';
import {
  canonicalizeUrl,
  computeContentHash,
  normalizeTitle,
} from './deduplicator';

export interface ParsedConnectorRecord {
  external_id: string;
  original_url: string;
  canonical_url: string;
  title: string;
  normalized_title: string;
  author: string | null;
  published_at: string;
  raw_excerpt: string;
  quotation_snippet: string | null;
  citation_group_id: string | null;
  content_hash: string;
  is_primary_source: boolean;
  occurred_at_hint?: string | null;
  raw_metadata: Record<string, unknown>;
}

export interface ConnectorFetchResult {
  sourceSlug: string;
  status: 'succeeded' | 'no_new_reports' | 'rate_limited' | 'failed';
  records: ParsedConnectorRecord[];
  errorMessage: string | null;
  durationMs: number;
}

export const INITIAL_SOURCES: Omit<
  Source,
  | 'id'
  | 'last_successful_run_at'
  | 'last_attempted_run_at'
  | 'last_error'
  | 'total_records_fetched'
  | 'total_incidents_linked'
  | 'created_at'
  | 'updated_at'
>[] = [
  {
    slug: 'ai-incident-database',
    name: 'AI Incident Database (AIID)',
    source_type: 'rss',
    endpoint_url: 'https://incidentdatabase.ai/rss.xml',
    homepage_url: 'https://incidentdatabase.ai',
    reliability_score: 92,
    reliability_tier: 'primary_research_cert',
    is_primary_producer: false,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 60,
    status: 'healthy',
    notes:
      'Partnership on AI indexed citations of real-world intelligent system harms and agentic incidents.',
  },
  {
    slug: 'microsoft-security-blog',
    name: 'Microsoft Security & Threat Intelligence Blog',
    source_type: 'rss',
    endpoint_url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    homepage_url: 'https://www.microsoft.com/en-us/security/blog/',
    reliability_score: 95,
    reliability_tier: 'major_security_vendor',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 60,
    status: 'healthy',
    notes:
      'Primary threat intelligence disclosures from Microsoft Threat Intelligence (Storm-* actor tracking, agentic AI abuse).',
  },
  {
    slug: 'mitre-atlas',
    name: 'MITRE ATLAS Case Studies Dataset',
    source_type: 'yaml_dataset',
    endpoint_url:
      'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml',
    homepage_url: 'https://atlas.mitre.org',
    reliability_score: 96,
    reliability_tier: 'primary_research_cert',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 300,
    status: 'healthy',
    notes:
      'Adversarial Threat Landscape for Artificial-Intelligence Systems (MITRE ATLAS) structured YAML case studies.',
  },
  {
    slug: 'arxiv-multi-agent',
    name: 'arXiv Multi-Agent Security & Swarm Research API',
    source_type: 'atom',
    endpoint_url:
      'https://export.arxiv.org/api/query?search_query=all:(%22multi-agent%22+OR+%22AI+swarm%22+OR+%22agentic%22)+AND+all:(security+OR+attack+OR+manipulation+OR+autonomous)&sortBy=submittedDate&sortOrder=descending&max_results=15',
    homepage_url: 'https://arxiv.org',
    reliability_score: 84,
    reliability_tier: 'community_preprint',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 120,
    status: 'healthy',
    notes:
      'Cornell University arXiv Atom API filtered for multi-agent security, swarm coordination, and adversarial evaluation papers.',
  },
  {
    slug: 'metr-research',
    name: 'METR (Model Evaluation & Threat Research)',
    source_type: 'rss',
    endpoint_url: 'https://metr.org/feed.xml',
    homepage_url: 'https://metr.org',
    reliability_score: 94,
    reliability_tier: 'primary_research_cert',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 180,
    status: 'healthy',
    notes:
      'Autonomous frontier AI agent capability evaluations, replication benchmarks, and safety disclosures.',
  },
  {
    slug: 'openai-security',
    name: 'OpenAI News & Threat Disruption Reports',
    source_type: 'rss',
    endpoint_url: 'https://openai.com/news/rss.xml',
    homepage_url: 'https://openai.com/news/security/',
    reliability_score: 91,
    reliability_tier: 'major_security_vendor',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 120,
    status: 'healthy',
    notes:
      'Official OpenAI publications including disruption of covert influence operations and deceptive agent networks.',
  },
  {
    slug: 'google-security-blog',
    name: 'Google Security & Threat Intelligence Blog',
    source_type: 'atom',
    endpoint_url: 'https://security.googleblog.com/feeds/posts/default',
    homepage_url: 'https://security.googleblog.com',
    reliability_score: 94,
    reliability_tier: 'major_security_vendor',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 120,
    status: 'healthy',
    notes:
      'Google Security and TAG/Mandiant research on AI-assisted threat actors and agentic defenses.',
  },
  {
    slug: 'cisa-advisories',
    name: 'CISA Cybersecurity Advisories (US-CERT)',
    source_type: 'advisory_feed',
    endpoint_url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    homepage_url: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
    reliability_score: 97,
    reliability_tier: 'primary_research_cert',
    is_primary_producer: true,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 180,
    status: 'healthy',
    notes:
      'Official U.S. Cybersecurity and Infrastructure Security Agency advisories; pre-filtered for AI/autonomous system relevance.',
  },
  {
    slug: 'the-hacker-news',
    name: 'The Hacker News (Cybersecurity Intelligence)',
    source_type: 'rss',
    endpoint_url: 'https://feeds.feedburner.com/TheHackersNews',
    homepage_url: 'https://thehackernews.com',
    reliability_score: 78,
    reliability_tier: 'established_media',
    is_primary_producer: false,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 90,
    status: 'healthy',
    notes:
      'High-frequency cybersecurity reporting; pre-filtered for AI agent, MCP, and swarm threat indicators.',
  },
  {
    slug: 'hn-algolia-ai-agents',
    name: 'HN Algolia Security & AI Agent Stream',
    source_type: 'rest_json',
    endpoint_url:
      'https://hn.algolia.com/api/v1/search_by_date?query=%22AI%20agent%22%20OR%20%22multi-agent%22%20OR%20%22agent%20swarm%22&tags=story&hitsPerPage=15',
    homepage_url: 'https://hn.algolia.com',
    reliability_score: 70,
    reliability_tier: 'community_preprint',
    is_primary_producer: false,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 60,
    status: 'healthy',
    notes:
      'Public JSON API tracking newly surfaced technical discussions and incident reports on autonomous AI agents.',
  },
  {
    slug: 'gdelt-ai-doc-api',
    name: 'GDELT Global Document 2.0 API',
    source_type: 'rest_json',
    endpoint_url:
      'https://api.gdeltproject.org/api/v2/doc/doc?query=%22AI%20agents%22&mode=artlist&format=json&maxrecords=10',
    homepage_url: 'https://www.gdeltproject.org',
    reliability_score: 74,
    reliability_tier: 'established_media',
    is_primary_producer: false,
    enabled: true,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 300,
    status: 'rate_limited',
    notes:
      'Global broadcast and print news index; enforces strict upstream rate limits (HTTP 429 handled gracefully).',
  },
  {
    slug: 'anthropic-research-feed',
    name: 'Anthropic Alignment & Security Publications',
    source_type: 'rss',
    endpoint_url: 'https://www.anthropic.com/rss.xml',
    homepage_url: 'https://www.anthropic.com/research',
    reliability_score: 93,
    reliability_tier: 'major_security_vendor',
    is_primary_producer: true,
    enabled: false,
    requires_api_key: false,
    api_key_env_var: null,
    rate_limit_seconds: 300,
    status: 'unavailable',
    notes:
      'Anthropic does not currently expose a public unauthenticated RSS feed at /rss.xml (TLS connection reset); tracked via AIID and secondary citations.',
  },
];

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTimestamp(rawDate: unknown): string {
  if (!rawDate) return new Date().toISOString();
  const str = String(rawDate).trim();
  const parsed = Date.parse(str);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

/**
 * Parses standard RSS 2.0 or Atom XML feeds into normalized ParsedConnectorRecord[]
 */
export function parseXmlFeedRecords(
  xmlContent: string,
  source: Pick<Source, 'slug' | 'name' | 'is_primary_producer'>,
  maxItems = 18
): ParsedConnectorRecord[] {
  const parsed = xmlParser.parse(xmlContent);
  const records: ParsedConnectorRecord[] = [];

  // RSS 2.0 <rss><channel><item>
  const rssItems = parsed?.rss?.channel?.item;
  if (rssItems) {
    const items = Array.isArray(rssItems) ? rssItems : [rssItems];
    for (const item of items.slice(0, maxItems)) {
      const rawTitle = stripHtmlTags(String(item.title || 'Untitled Report'));
      const rawLink = String(item.link || item.guid?.['#text'] || item.guid || '').trim();
      if (!rawLink || !rawTitle) continue;

      const rawDesc = stripHtmlTags(
        String(item.description || item['content:encoded'] || '')
      );
      const guidVal = String(
        item.guid?.['#text'] || item.guid || rawLink
      ).trim();

      // Detect AIID citation group e.g. (https://incidentdatabase.ai/cite/1781#8195)
      let citationGroupId: string | null = null;
      const aiidMatch = rawDesc.match(/incidentdatabase\.ai\/cite\/(\d+)/i);
      if (aiidMatch) {
        citationGroupId = `AIID-CITE-${aiidMatch[1]}`;
      }

      const canonical = canonicalizeUrl(rawLink);
      records.push({
        external_id: guidVal.slice(0, 180),
        original_url: rawLink,
        canonical_url: canonical,
        title: rawTitle,
        normalized_title: normalizeTitle(rawTitle),
        author: item['dc:creator']
          ? stripHtmlTags(String(item['dc:creator']))
          : source.name,
        published_at: normalizeTimestamp(item.pubDate || item['dc:date']),
        raw_excerpt: rawDesc.slice(0, 1400) || rawTitle,
        quotation_snippet: rawDesc ? `"${rawDesc.slice(0, 240)}..."` : null,
        citation_group_id: citationGroupId,
        content_hash: computeContentHash(rawTitle, rawDesc),
        is_primary_source: source.is_primary_producer,
        raw_metadata: {
          source_slug: source.slug,
          feed_format: 'rss_2.0',
          citation_group_id: citationGroupId,
        },
      });
    }
    return records;
  }

  // Atom <feed><entry>
  const atomEntries = parsed?.feed?.entry;
  if (atomEntries) {
    const entries = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
    for (const entry of entries.slice(0, maxItems)) {
      const rawTitle = stripHtmlTags(
        String(entry.title?.['#text'] || entry.title || 'Untitled Entry')
      );
      let rawLink = '';
      if (Array.isArray(entry.link)) {
        const alt =
          entry.link.find((l: Record<string, string>) => l['@_rel'] === 'alternate') ||
          entry.link[0];
        rawLink = String(alt?.['@_href'] || '');
      } else if (entry.link && typeof entry.link === 'object') {
        rawLink = String((entry.link as Record<string, string>)['@_href'] || '');
      } else if (typeof entry.link === 'string') {
        rawLink = entry.link;
      }
      if (!rawLink && entry.id) {
        rawLink = String(entry.id);
      }
      if (!rawLink || !rawTitle) continue;

      const rawSummary = stripHtmlTags(
        String(
          entry.summary?.['#text'] ||
            entry.summary ||
            entry.content?.['#text'] ||
            entry.content ||
            ''
        )
      );
      let authorName = source.name;
      if (entry.author) {
        const authors = Array.isArray(entry.author)
          ? entry.author
          : [entry.author];
        const names = authors
          .map((a: Record<string, unknown>) => String(a?.name || ''))
          .filter(Boolean);
        if (names.length > 0) authorName = names.slice(0, 3).join(', ');
      }

      const canonical = canonicalizeUrl(rawLink);
      records.push({
        external_id: String(entry.id || canonical).slice(0, 180),
        original_url: rawLink,
        canonical_url: canonical,
        title: rawTitle,
        normalized_title: normalizeTitle(rawTitle),
        author: authorName,
        published_at: normalizeTimestamp(entry.published || entry.updated),
        raw_excerpt: rawSummary.slice(0, 1400) || rawTitle,
        quotation_snippet: rawSummary ? `"${rawSummary.slice(0, 240)}..."` : null,
        citation_group_id: null,
        content_hash: computeContentHash(rawTitle, rawSummary),
        is_primary_source: source.is_primary_producer,
        raw_metadata: {
          source_slug: source.slug,
          feed_format: 'atom_1.0',
        },
      });
    }
  }

  return records;
}

/**
 * Parses MITRE ATLAS YAML case studies
 */
export function parseMitreAtlasYaml(
  yamlContent: string,
  source: Pick<Source, 'slug' | 'name' | 'is_primary_producer'>,
  maxItems = 12
): ParsedConnectorRecord[] {
  const doc = yaml.load(yamlContent) as {
    'case-studies'?: Array<{
      id: string;
      name: string;
      summary: string;
      'incident-date'?: string | Date;
      references?: Array<{ title?: string; url?: string }>;
    }>;
  };
  const studies = doc?.['case-studies'] || [];
  // Take most recent case studies at the end of the array
  const selected = studies.slice(-maxItems).reverse();

  return selected.map((cs) => {
    const cleanSummary = stripHtmlTags(String(cs.summary || cs.name));
    const url = `https://atlas.mitre.org/studies/${cs.id}`;
    const incidentDate = cs['incident-date']
      ? normalizeTimestamp(cs['incident-date'])
      : new Date().toISOString();

    return {
      external_id: cs.id,
      original_url: url,
      canonical_url: canonicalizeUrl(url),
      title: `MITRE ATLAS Case Study ${cs.id}: ${cs.name}`,
      normalized_title: normalizeTitle(`${cs.id} ${cs.name}`),
      author: 'MITRE ATLAS Threat Research',
      published_at: incidentDate,
      occurred_at_hint: incidentDate,
      raw_excerpt: cleanSummary.slice(0, 1400),
      quotation_snippet: `"${cleanSummary.slice(0, 240)}..."`,
      citation_group_id: `MITRE-${cs.id}`,
      content_hash: computeContentHash(cs.name, cleanSummary),
      is_primary_source: true,
      raw_metadata: {
        source_slug: source.slug,
        atlas_id: cs.id,
        references: cs.references || [],
      },
    };
  });
}

/**
 * Parses Hacker News Algolia JSON API stories
 */
export function parseHnAlgoliaJson(
  jsonContent: string,
  source: Pick<Source, 'slug' | 'name' | 'is_primary_producer'>,
  maxItems = 12
): ParsedConnectorRecord[] {
  const data = JSON.parse(jsonContent) as {
    hits?: Array<{
      objectID: string;
      title?: string;
      url?: string;
      author?: string;
      created_at?: string;
      story_text?: string;
      points?: number;
    }>;
  };
  const hits = data?.hits || [];
  const records: ParsedConnectorRecord[] = [];

  for (const hit of hits.slice(0, maxItems)) {
    if (!hit.title) continue;
    const rawUrl =
      hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const excerpt = stripHtmlTags(
      hit.story_text ||
        `Technical report surfaced via HN Intelligence Stream (${hit.points || 1} pts): ${hit.title}`
    );
    const canonical = canonicalizeUrl(rawUrl);
    records.push({
      external_id: `hn-${hit.objectID}`,
      original_url: rawUrl,
      canonical_url: canonical,
      title: stripHtmlTags(hit.title),
      normalized_title: normalizeTitle(hit.title),
      author: hit.author || 'HN Contributor',
      published_at: normalizeTimestamp(hit.created_at),
      raw_excerpt: excerpt.slice(0, 1200),
      quotation_snippet: `"${hit.title}"`,
      citation_group_id: null,
      content_hash: computeContentHash(hit.title, excerpt),
      is_primary_source: false,
      raw_metadata: {
        source_slug: source.slug,
        hn_object_id: hit.objectID,
        points: hit.points || 0,
      },
    });
  }
  return records;
}

/**
 * Executes a single source connector with timeout, rate-limit detection, and error isolation.
 */
export async function executeSourceConnector(
  source: Source,
  timeoutMs = 12000
): Promise<ConnectorFetchResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(source.endpoint_url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'AISwarmDetector/1.0 (+https://github.com/GorillaBrain/ai-swarm-detector; threat-intel-ingestion)',
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/plain, */*',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.status === 429) {
      return {
        sourceSlug: source.slug,
        status: 'rate_limited',
        records: [],
        errorMessage: 'Upstream provider returned HTTP 429 Too Many Requests',
        durationMs: Date.now() - started,
      };
    }

    if (!response.ok) {
      return {
        sourceSlug: source.slug,
        status: 'failed',
        records: [],
        errorMessage: `HTTP ${response.status} ${response.statusText}`,
        durationMs: Date.now() - started,
      };
    }

    const bodyText = await response.text();
    let records: ParsedConnectorRecord[] = [];

    if (source.source_type === 'yaml_dataset') {
      records = parseMitreAtlasYaml(bodyText, source, 10);
    } else if (source.source_type === 'rest_json') {
      if (source.slug === 'hn-algolia-ai-agents') {
        records = parseHnAlgoliaJson(bodyText, source, 12);
      } else {
        const parsed = JSON.parse(bodyText);
        const articles = parsed?.articles || [];
        records = articles.slice(0, 10).map((a: Record<string, unknown>, idx: number) => {
          const title = String(a.title || `GDELT Report ${idx}`);
          const url = String(a.url || source.homepage_url);
          return {
            external_id: `gdelt-${computeContentHash(title, url).slice(0, 16)}`,
            original_url: url,
            canonical_url: canonicalizeUrl(url),
            title,
            normalized_title: normalizeTitle(title),
            author: String(a.domain || source.name),
            published_at: normalizeTimestamp(a.seendate),
            raw_excerpt: title,
            quotation_snippet: `"${title}"`,
            citation_group_id: null,
            content_hash: computeContentHash(title, url),
            is_primary_source: false,
            raw_metadata: a,
          };
        });
      }
    } else {
      records = parseXmlFeedRecords(bodyText, source, 16);
    }

    return {
      sourceSlug: source.slug,
      status: records.length > 0 ? 'succeeded' : 'no_new_reports',
      records,
      errorMessage: null,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown connector error';
    return {
      sourceSlug: source.slug,
      status: 'failed',
      records: [],
      errorMessage: message,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}
