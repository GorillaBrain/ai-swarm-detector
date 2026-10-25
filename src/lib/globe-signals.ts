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
  category: string;
  agentCount: number | null;
  targetLat?: number;
  targetLon?: number;
  targetName?: string;
  originName?: string;
}

// Known origin -> target attack vector pairings for high-profile agentic campaigns
const ATTACK_VECTORS: Record<string, { originCode: string; originName: string; targetCode: string; targetName: string }> = {
  'storm-0940': {
    originCode: 'CN',
    originName: 'Beijing Attribution Node, CN',
    targetCode: 'US',
    targetName: 'ConnectWise Ops, Tampa FL, US',
  },
  'artex': {
    originCode: 'CN',
    originName: 'Beijing Attribution Node, CN',
    targetCode: 'US',
    targetName: 'US Technology Infrastructure',
  },
  'disinformation': {
    originCode: 'RU',
    originName: 'St. Petersburg Node, RU',
    targetCode: 'GB',
    targetName: 'London Media & Public Sector, UK',
  },
  'lazarus': {
    originCode: 'KP',
    originName: 'Pyongyang Lazarus Node, KP',
    targetCode: 'KR',
    targetName: 'Seoul Financial Sector, KR',
  },
  'mcp': {
    originCode: 'US',
    originName: 'San Francisco AI Lab, US',
    targetCode: 'DE',
    targetName: 'Frankfurt Cloud Gateway, DE',
  },
};

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
      lon += ((seed * 7) % 10 - 5) * 0.4;
    }

    // Check if incident title matches known attack vectors
    let targetLat: number | undefined;
    let targetLon: number | undefined;
    let targetName: string | undefined;
    let originName: string | undefined;

    const titleLower = inc.title.toLowerCase();
    for (const [key, vector] of Object.entries(ATTACK_VECTORS)) {
      if (titleLower.includes(key)) {
        const targetGeo = COUNTRY_CENTROIDS[vector.targetCode];
        if (targetGeo) {
          targetLat = targetGeo.latitude;
          targetLon = targetGeo.longitude;
          targetName = vector.targetName;
          originName = vector.originName;
        }
        break;
      }
    }

    // Default target for cyber operations if not explicitly matched
    if (!targetLat && inc.primary_category === 'ai_driven_cyber_operations') {
      const defaultTarget = COUNTRY_CENTROIDS[code === 'US' ? 'DE' : 'US'];
      if (defaultTarget) {
        targetLat = defaultTarget.latitude;
        targetLon = defaultTarget.longitude;
        targetName = `${defaultTarget.name} Enterprise Target`;
        originName = `${geo.name} Incursion Vector`;
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
