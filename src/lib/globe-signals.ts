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
  targetLat?: number;
  targetLon?: number;
  targetName?: string;
  originName?: string;
}

// Documented origin -> target attack vector pairings for high-profile malicious agentic campaigns
const MALICIOUS_CAMPAIGN_VECTORS: Record<
  string,
  { originName: string; targetLat: number; targetLon: number; targetName: string }
> = {
  'storm-0940': {
    originName: 'Beijing State-Sponsored Node, CN',
    targetLat: 27.95,
    targetLon: -82.45,
    targetName: 'ConnectWise Managed Infrastructure, Tampa FL, US',
  },
  'artex': {
    originName: 'Beijing Attribution Node, CN',
    targetLat: 38.9,
    targetLon: -77.03,
    targetName: 'US Technology & Defense Sector, Washington DC, US',
  },
  'ransomware': {
    originName: 'Eastern European Threat Group, RU',
    targetLat: 50.11,
    targetLon: 8.68,
    targetName: 'Global Cloud Enterprise Infrastructure, Frankfurt, DE',
  },
  'openclaw': {
    originName: 'Adversarial Agent Operator',
    targetLat: 37.38,
    targetLon: -122.08,
    targetName: 'Silicon Valley Cloud API Gateway, US',
  },
  'destructive': {
    originName: 'Hostile Cyber Actor',
    targetLat: 40.71,
    targetLon: -74.0,
    targetName: 'Financial Network Core, New York, US',
  },
  'lazarus': {
    originName: 'Pyongyang Cyber Command, KP',
    targetLat: 35.67,
    targetLon: 139.65,
    targetName: 'Tokyo Cryptocurrency & Banking Core, JP',
  },
  'disinformation': {
    originName: 'Doppelganger Coordinated Bot Farm, RU',
    targetLat: 51.5,
    targetLon: -0.12,
    targetName: 'London Media & Public Sector Networks, UK',
  },
  'volt typhoon': {
    originName: 'Fuzhou Attribution Node, CN',
    targetLat: 13.44,
    targetLon: 144.79,
    targetName: 'Pacific Communications & Military Node, Guam',
  },
  'hugging face': {
    originName: 'San Francisco Autonomous Agent Fleet, US',
    targetLat: 40.71,
    targetLon: -74.0,
    targetName: 'External Hugging Face Cloud Repositories, NY, US',
  },
  'distillation': {
    originName: 'Frontier Model Extraction Swarm, Shanghai, CN',
    targetLat: 37.77,
    targetLon: -122.41,
    targetName: 'Anthropic Claude Core Infrastructure, San Francisco, US',
  },
};

/**
 * Checks whether an incident is genuinely a confirmed malicious AI swarm attacking world networks.
 * STRICT USER REQUIREMENT: Only SWARM CONFIRMED incidents (is_confirmed_swarm === true)
 * receive the attack beam. If it is merely "REPORTED", NO attack beam is drawn—only highlight location!
 */
function isMaliciousSwarmIncident(inc: EnrichedIncident): boolean {
  // CRITICAL USER RULE: ONLY CONFIRMED SWARMS get the attack beam!
  // If it's just "REPORTED" (is_confirmed_swarm === false), no attack beam, only highlight location!
  if (!inc.is_confirmed_swarm) {
    return false;
  }

  // Benign research activity (even if multi-agent swarm experiment) is legitimate research, not an attack
  if (inc.primary_category === 'benign_research_activity') {
    return false;
  }

  // Normal legal lawsuits, partnerships, policy announcements are not attacks
  const titleLower = inc.title.toLowerCase();
  const summaryLower = (inc.summary || '').toLowerCase();
  const combined = titleLower + ' ' + summaryLower;
  if (
    combined.includes('lawsuit') ||
    combined.includes('sues') ||
    combined.includes('sued') ||
    combined.includes('partner') ||
    combined.includes('governance')
  ) {
    return false;
  }

  return true;
}

/**
 * Builds a deterministic list of geographically mapped signals from stored incidents.
 * Distributes multiple incidents across known city hubs so they form an authentic
 * constellation of signals matching the reference interface.
 */
export function buildGlobeSignals(incidents: EnrichedIncident[]): GlobeSignal[] {
  const signals: GlobeSignal[] = [];
  const countryCounts: Record<string, number> = {};

  for (const inc of incidents) {
    if (!inc.country_code) continue;
    const code = inc.country_code.toUpperCase();
    const geo = COUNTRY_CENTROIDS[code];
    if (!geo) continue;

    const count = countryCounts[code] || 0;
    countryCounts[code] = count + 1;

    let lat = geo.latitude;
    let lon = geo.longitude;

    // If the country has known tech/security hubs, distribute incidents across them
    if (geo.hubs && geo.hubs.length > 0) {
      const hub = geo.hubs[count % geo.hubs.length];
      lat = hub.lat;
      lon = hub.lon;
    } else {
      // Deterministic slight offset for visual constellation
      const seed = (inc.id.charCodeAt(0) + inc.id.charCodeAt(inc.id.length - 1)) % 10;
      lat += (seed - 5) * 0.4;
      lon += (((seed * 7) % 10) - 5) * 0.4;
    }

    // Determine if this is a genuine malicious AI swarm attack
    const isMalicious = isMaliciousSwarmIncident(inc);

    let targetLat: number | undefined;
    let targetLon: number | undefined;
    let targetName: string | undefined;
    let originName: string | undefined;

    // ONLY malicious AI swarm incidents receive attack vectors pointing to target network infrastructure
    if (isMalicious) {
      const titleLower = inc.title.toLowerCase();

      // Check for specific campaign match
      for (const [key, vector] of Object.entries(MALICIOUS_CAMPAIGN_VECTORS)) {
        if (titleLower.includes(key)) {
          targetLat = vector.targetLat;
          targetLon = vector.targetLon;
          targetName = vector.targetName;
          originName = vector.originName;
          break;
        }
      }

      // Default malicious target hub for other confirmed cyber operations
      if (!targetLat) {
        if (code === 'CN' || code === 'RU' || code === 'KP' || code === 'IR') {
          // Point toward Western/Global critical digital infrastructure
          targetLat = 38.9;
          targetLon = -77.03;
          targetName = 'US Cloud & Government Infrastructure, Washington DC';
          originName = `${geo.name} Attribution Origin`;
        } else {
          // Point toward European/Global cloud infrastructure
          targetLat = 50.11;
          targetLon = 8.68;
          targetName = 'European Interconnection Gateway, Frankfurt, DE';
          originName = `${geo.name} Hostile Origin`;
        }
      }
    }

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
      isConfirmedSwarm: inc.is_confirmed_swarm,
      isMaliciousSwarm: isMalicious,
      category: inc.primary_category,
      agentCount: inc.reported_agent_count,
      targetLat,
      targetLon,
      targetName,
      originName,
    });
  }

  return signals;
}
