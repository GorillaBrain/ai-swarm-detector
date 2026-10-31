import { EnrichedIncident } from './types';
import { COUNTRY_CENTROIDS } from './geo';

export interface GlobeSignal {
  id: string;
  incidentId: string;
  slug: string;
  title: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  severity: string;
  verification: string;
  isConfirmedSwarm: boolean;
  isMaliciousSwarm: boolean;
  category: string;
  agentCount: number | null;
  publishedDate: string;
  originCountryCode: string;
  originCountryName: string;
  originName?: string;
  targetCountryCode?: string;
  targetCountryName?: string;
  targetLat?: number;
  targetLon?: number;
  targetName?: string;
}

interface CampaignVectorSpec {
  originCountryCode: string;
  originCountryName: string;
  originName: string;
  targetCountryCode: string;
  targetCountryName: string;
  targetLat: number;
  targetLon: number;
  targetName: string;
}

// Documented Origin Country -> Target Country attack vector pairings for historical & current confirmed AI swarms
const CONFIRMED_SWARM_VECTORS: Record<string, CampaignVectorSpec> = {
  'hugging face': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'OpenAI Frontier Sandbox Cluster, San Francisco, US',
    targetCountryCode: 'FR',
    targetCountryName: 'France',
    targetLat: 48.8566,
    targetLon: 2.3522,
    targetName: 'Hugging Face Cloud Repository Hub, Paris, FR',
  },
  'vm escapes': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'OpenAI RL Sandbox Fleet, San Francisco, US',
    targetCountryCode: 'FR',
    targetCountryName: 'France',
    targetLat: 48.8566,
    targetLon: 2.3522,
    targetName: 'External Hugging Face Cloud Nodes, Paris, FR',
  },
  'dashboard research': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'Evaluation Agent Sandbox, San Francisco, US',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 38.9072,
    targetLon: -77.0369,
    targetName: 'Internal Production Infrastructure, US',
  },
  'storm-0940': {
    originCountryCode: 'CN',
    originCountryName: 'China',
    originName: 'Beijing State-Sponsored Node, CN',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 27.9506,
    targetLon: -82.4572,
    targetName: 'ConnectWise Managed Infrastructure, Tampa FL, US',
  },
  'artex': {
    originCountryCode: 'CN',
    originCountryName: 'China',
    originName: 'Storm-0940 Attribution Cluster, Beijing, CN',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 27.9506,
    targetLon: -82.4572,
    targetName: 'ConnectWise & Enterprise Supply Chain, US',
  },
  'ransomware': {
    originCountryCode: 'RU',
    originCountryName: 'Russia',
    originName: 'Phantom Red-Team Swarm Node, Moscow, RU',
    targetCountryCode: 'DE',
    targetCountryName: 'Germany',
    targetLat: 50.1109,
    targetLon: 8.6821,
    targetName: 'Enterprise Cloud Interconnect, Frankfurt, DE',
  },
  'distillation': {
    originCountryCode: 'CN',
    originCountryName: 'China',
    originName: '24,000-Account Extraction Swarm, Shanghai, CN',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 37.7749,
    targetLon: -122.4194,
    targetName: 'Anthropic Claude API Core, San Francisco, US',
  },
  'aml.cs0047': {
    originCountryCode: 'RU',
    originCountryName: 'Russia',
    originName: 'Adversarial Supply-Chain Actor, RU',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 47.6062,
    targetLon: -122.3321,
    targetName: 'AWS Amazon Q Extension Fleet, Seattle, US',
  },
  'destructive ai agent': {
    originCountryCode: 'RU',
    originCountryName: 'Russia',
    originName: 'Adversarial Supply-Chain Actor, RU',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 47.6062,
    targetLon: -122.3321,
    targetName: 'AWS Amazon Q Extension Fleet, Seattle, US',
  },
  'aml.cs0048': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'External Reconnaissance Scanner, US',
    targetCountryCode: 'DE',
    targetCountryName: 'Germany',
    targetLat: 50.1109,
    targetLon: 8.6821,
    targetName: 'Exposed ClawdBot Control Interfaces, EU/Global',
  },
  'aml.cs0049': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'Poisoned ClawdHub Skill Registry, US',
    targetCountryCode: 'GB',
    targetCountryName: 'United Kingdom',
    targetLat: 51.5072,
    targetLon: -0.1276,
    targetName: 'Connected ClawdBot Agent Fleet, London, UK',
  },
  'aml.cs0050': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: '1-Click RCE Exploit Payload (CVE-2026-25253), US',
    targetCountryCode: 'JP',
    targetCountryName: 'Japan',
    targetLat: 35.6762,
    targetLon: 139.6503,
    targetName: 'OpenClaw Connected Messaging Nodes, Tokyo, JP',
  },
  'aml.cs0051': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'Indirect Prompt Injection C2 Relay, US',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 37.3861,
    targetLon: -122.0839,
    targetName: 'Silicon Valley Agent Runtime Gateway, US',
  },
  'openclaw': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'Adversarial Prompt C2 Operator, US',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 37.3861,
    targetLon: -122.0839,
    targetName: 'Silicon Valley Cloud API Gateway, US',
  },
  'forest blizzard': {
    originCountryCode: 'RU',
    originCountryName: 'Russia',
    originName: 'Forest Blizzard (APT28) LLM Node, Moscow, RU',
    targetCountryCode: 'UA',
    targetCountryName: 'Ukraine',
    targetLat: 50.4501,
    targetLon: 30.5234,
    targetName: 'Ukrainian Defense & Radar Sector, Kyiv, UA',
  },
  'doppelganger': {
    originCountryCode: 'IL',
    originCountryName: 'Israel',
    originName: 'STOIC / Doppelganger Persona Swarm, Tel Aviv, IL',
    targetCountryCode: 'CA',
    targetCountryName: 'Canada',
    targetLat: 45.4215,
    targetLon: -75.6972,
    targetName: 'North American & EU Public Discourse Networks, CA/US',
  },
  'fangxiao': {
    originCountryCode: 'CN',
    originCountryName: 'China',
    originName: 'Fangxiao 42K-Domain AI Malware Swarm, Shenzhen, CN',
    targetCountryCode: 'GB',
    targetCountryName: 'United Kingdom',
    targetLat: 51.5072,
    targetLon: -0.1276,
    targetName: 'Enterprise Endpoints & Financial Sector, London, UK',
  },
  'gtg-1002': {
    originCountryCode: 'CN',
    originCountryName: 'China',
    originName: 'GTG-1002 Autonomous Espionage Swarm, Beijing, CN',
    targetCountryCode: 'TW',
    targetCountryName: 'Taiwan',
    targetLat: 25.033,
    targetLon: 121.5654,
    targetName: 'Semiconductor & Telecom Infrastructure, Taipei, TW',
  },
  'thousands of ai agents': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'OpenAI & PerturbAI Distributed Swarm, San Francisco, US',
    targetCountryCode: 'GB',
    targetCountryName: 'United Kingdom',
    targetLat: 52.2053,
    targetLon: 0.1218,
    targetName: 'Global Genomic Compute Cluster, Cambridge, UK',
  },
  'your token is gone': {
    originCountryCode: 'SG',
    originCountryName: 'Singapore',
    originName: 'Multi-Agent Scam Swarm Cluster, SG',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 40.7128,
    targetLon: -74.006,
    targetName: 'Consumer Financial & Voice Networks, New York, US',
  },
  'lifting binary': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: 'ATLAS Multi-Agent Binary Lifting Swarm, US',
    targetCountryCode: 'DE',
    targetCountryName: 'Germany',
    targetLat: 52.52,
    targetLon: 13.405,
    targetName: 'Compiled Binary Verification Target, Berlin, DE',
  },
  'network topology shapes consensus': {
    originCountryCode: 'GB',
    originCountryName: 'United Kingdom',
    originName: 'Interacting LLM Population Swarm, London, UK',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 42.3601,
    targetLon: -71.0589,
    targetName: 'Distributed Agent Consensus Network, Boston, US',
  },
  'petri-net supervisory': {
    originCountryCode: 'CH',
    originCountryName: 'Switzerland',
    originName: 'Prompt-Injected Agent Tool Fleet, Zurich, CH',
    targetCountryCode: 'DE',
    targetCountryName: 'Germany',
    targetLat: 50.1109,
    targetLon: 8.6821,
    targetName: 'Enterprise Tool-Execution Runtime, Frankfurt, DE',
  },
  'social-humint': {
    originCountryCode: 'DE',
    originCountryName: 'Germany',
    originName: 'Social-HUMINT Automated Profiling Swarm, Munich, DE',
    targetCountryCode: 'FR',
    targetCountryName: 'France',
    targetLat: 48.8566,
    targetLon: 2.3522,
    targetName: 'European Social Media Telemetry Nodes, Paris, FR',
  },
  '14-agent': {
    originCountryCode: 'US',
    originCountryName: 'United States',
    originName: '14-Agent Autonomous Recon Swarm, Washington DC, US',
    targetCountryCode: 'DE',
    targetCountryName: 'Germany',
    targetLat: 50.1109,
    targetLon: 8.6821,
    targetName: 'Industrial Grid Substation Digital Twin, Frankfurt, DE',
  },
  '85-persona': {
    originCountryCode: 'RU',
    originCountryName: 'Russia',
    originName: '85-Persona Synthetic Consensus Swarm, St. Petersburg, RU',
    targetCountryCode: 'GB',
    targetCountryName: 'United Kingdom',
    targetLat: 51.5072,
    targetLon: -0.1276,
    targetName: 'European Municipal Transit Forums, London, UK',
  },
  'langgraph': {
    originCountryCode: 'DE',
    originCountryName: 'Germany',
    originName: '6-Agent LangGraph Staging Cluster, Frankfurt, DE',
    targetCountryCode: 'US',
    targetCountryName: 'United States',
    targetLat: 37.7749,
    targetLon: -122.4194,
    targetName: 'Cloud Billing & Orchestration API, San Francisco, US',
  },
  'mcp tool': {
    originCountryCode: 'SG',
    originCountryName: 'Singapore',
    originName: '4-Agent CrewAI / MCP Pipeline, SG',
    targetCountryCode: 'JP',
    targetCountryName: 'Japan',
    targetLat: 35.6762,
    targetLon: 139.6503,
    targetName: 'APAC Developer OAuth Endpoint, Tokyo, JP',
  },
};

const SEVERITY_SORT_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

/**
 * Builds a deterministic list of geographically mapped signals from stored incidents.
 * STRICT RULE:
 * - Every confirmed AI swarm (is_confirmed_swarm === true), whether from the past or current time,
 *   receives an explicit Origin Country ➔ Target Country attack vector and renders the red attack beam.
 * - Normal "Reported" incidents (is_confirmed_swarm === false) ONLY highlight their location (no attack beam).
 * - Confirmed AI swarms are prioritized at the top of the returned signal list so historical & current
 *   swarms (like the Hugging Face incident, OpenClaw, ARTEX, GTG-1002, etc.) are immediately visible.
 */
export function buildGlobeSignals(incidents: EnrichedIncident[]): GlobeSignal[] {
  const signals: GlobeSignal[] = [];
  const countryCounts: Record<string, number> = {};

  for (const inc of incidents) {
    const code = (inc.country_code || 'US').toUpperCase();
    const geo = COUNTRY_CENTROIDS[code] || COUNTRY_CENTROIDS.US;

    const count = countryCounts[code] || 0;
    countryCounts[code] = count + 1;

    let lat = geo.latitude;
    let lon = geo.longitude;

    // Distribute incidents across known city hubs so markers never stack on top of each other
    if (geo.hubs && geo.hubs.length > 0) {
      const hub = geo.hubs[count % geo.hubs.length];
      lat = hub.lat;
      lon = hub.lon;
    } else {
      const seed =
        (inc.id.charCodeAt(0) + inc.id.charCodeAt(inc.id.length - 1)) % 10;
      lat += (seed - 5) * 0.4;
      lon += (((seed * 7) % 10) - 5) * 0.4;
    }

    const isConfirmedSwarm = Boolean(inc.is_confirmed_swarm);
    // Every confirmed AI swarm gets an attack beam showing Origin Country -> Target Country
    const isMalicious = isConfirmedSwarm;

    let originCountryCode = code;
    let originCountryName = geo.name;
    let originName: string | undefined = `${geo.name} (${code})`;
    let targetCountryCode: string | undefined;
    let targetCountryName: string | undefined;
    let targetLat: number | undefined;
    let targetLon: number | undefined;
    let targetName: string | undefined;

    if (isConfirmedSwarm) {
      const combinedLower = `${inc.title} ${inc.summary}`.toLowerCase();

      // Match documented campaign vector
      for (const [key, vector] of Object.entries(CONFIRMED_SWARM_VECTORS)) {
        if (combinedLower.includes(key)) {
          originCountryCode = vector.originCountryCode;
          originCountryName = vector.originCountryName;
          originName = vector.originName;
          targetCountryCode = vector.targetCountryCode;
          targetCountryName = vector.targetCountryName;
          targetLat = vector.targetLat;
          targetLon = vector.targetLon;
          targetName = vector.targetName;
          break;
        }
      }

      // Default Origin -> Target vector for any newly discovered real-time confirmed AI swarm
      if (targetLat === undefined || targetLon === undefined) {
        if (code === 'CN' || code === 'RU' || code === 'KP' || code === 'IR') {
          targetCountryCode = 'US';
          targetCountryName = 'United States';
          targetLat = 38.9072;
          targetLon = -77.0369;
          targetName = 'US Cloud & Defense Infrastructure, Washington DC, US';
          originName = `${geo.name} Swarm Origin (${code})`;
        } else if (code === 'US') {
          targetCountryCode = 'DE';
          targetCountryName = 'Germany';
          targetLat = 50.1109;
          targetLon: 8.6821;
          targetLon = 8.6821;
          targetName = 'European Cloud Interconnect Gateway, Frankfurt, DE';
          originName = `United States Agent Cluster (US)`;
        } else {
          targetCountryCode = 'US';
          targetCountryName = 'United States';
          targetLat = 37.7749;
          targetLon = -122.4194;
          targetName = 'Global Cloud API Backbone, San Francisco, US';
          originName = `${geo.name} Agent Node (${code})`;
        }
      }
    }

    const publishedDate = (
      inc.occurred_at ||
      inc.first_published_at ||
      new Date().toISOString()
    ).slice(0, 10);

    signals.push({
      id: inc.id,
      incidentId: inc.id,
      slug: inc.slug,
      title: inc.title,
      countryCode: code,
      countryName: geo.name,
      lat,
      lon,
      severity: inc.severity,
      verification: inc.verification_status,
      isConfirmedSwarm,
      isMaliciousSwarm: isMalicious,
      category: inc.primary_category,
      agentCount: inc.reported_agent_count,
      publishedDate,
      originCountryCode,
      originCountryName,
      originName,
      targetCountryCode,
      targetCountryName,
      targetLat,
      targetLon,
      targetName,
    });
  }

  // Sort so ALL Confirmed AI Swarms (past & present) appear first, ordered by severity & recency
  signals.sort((a, b) => {
    if (a.isConfirmedSwarm !== b.isConfirmedSwarm) {
      return a.isConfirmedSwarm ? -1 : 1;
    }
    const sevDiff =
      (SEVERITY_SORT_RANK[b.severity] || 0) -
      (SEVERITY_SORT_RANK[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;
    return b.publishedDate.localeCompare(a.publishedDate);
  });

  return signals;
}
