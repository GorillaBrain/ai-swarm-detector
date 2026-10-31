import { LocationBasis, LocationPrecision } from './types';

export interface CountryGeoReference {
  code: string;
  numericId: string;
  atlasName: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  hubs?: Array<{ name: string; lat: number; lon: number }>;
}

/**
 * Standard ISO-3166 country centroids and documented cybersecurity/AI research hubs.
 * Never used when location is unknown.
 */
export const COUNTRY_CENTROIDS: Record<string, CountryGeoReference> = {
  US: {
    code: 'US',
    numericId: '840',
    atlasName: 'United States of America',
    name: 'United States',
    region: 'North America',
    latitude: 39.8283,
    longitude: -98.5795,
    hubs: [
      { name: 'San Francisco / Silicon Valley, US', lat: 37.7749, lon: -122.4194 },
      { name: 'Washington D.C. (CISA / US-CERT), US', lat: 38.9072, lon: -77.0369 },
      { name: 'Redmond (Microsoft Threat Intel), US', lat: 47.674, lon: -122.1215 },
      { name: 'McLean / Bedford (MITRE ATLAS), US', lat: 38.9339, lon: -77.1773 },
      { name: 'New York Cyber Corridor, US', lat: 40.7128, lon: -74.006 },
      { name: 'Tampa (ConnectWise Ops), US', lat: 27.9506, lon: -82.4572 },
      { name: 'Boston / Cambridge AI Lab Hub, US', lat: 42.3601, lon: -71.0589 },
      { name: 'Austin Tech Corridor, US', lat: 30.2672, lon: -97.7431 },
      { name: 'Berkeley (METR Evaluation Lab), US', lat: 37.8715, lon: -122.273 },
      { name: 'Atlanta SOC Hub, US', lat: 33.749, lon: -84.388 },
    ],
  },
  GB: {
    code: 'GB',
    numericId: '826',
    atlasName: 'United Kingdom',
    name: 'United Kingdom',
    region: 'Europe',
    latitude: 54.7024,
    longitude: -3.2766,
    hubs: [
      { name: 'London (NCSC / AISI), UK', lat: 51.5072, lon: -0.1276 },
      { name: 'Cambridge AI Research Hub, UK', lat: 52.2053, lon: 0.1218 },
      { name: 'Oxford Alignment Lab, UK', lat: 51.752, lon: -1.2577 },
      { name: 'Manchester Cyber Corridor, UK', lat: 53.4808, lon: -2.2426 },
    ],
  },
  CN: {
    code: 'CN',
    numericId: '156',
    atlasName: 'China',
    name: 'China',
    region: 'East Asia',
    latitude: 35.8617,
    longitude: 104.1954,
    hubs: [
      { name: 'Beijing Attribution Cluster, CN', lat: 39.9042, lon: 116.4074 },
      { name: 'Shanghai AI Research Hub, CN', lat: 31.2304, lon: 121.4737 },
      { name: 'Shenzhen Tech Cluster, CN', lat: 22.5431, lon: 114.0579 },
      { name: 'Chengdu Cyber Operations Node, CN', lat: 30.5728, lon: 104.0668 },
    ],
  },
  RU: {
    code: 'RU',
    numericId: '643',
    atlasName: 'Russia',
    name: 'Russia',
    region: 'Eurasia',
    latitude: 61.524,
    longitude: 105.3188,
    hubs: [
      { name: 'Moscow Attribution Node, RU', lat: 55.7558, lon: 37.6173 },
      { name: 'St. Petersburg Influence Node, RU', lat: 59.9343, lon: 30.3351 },
    ],
  },
  IR: {
    code: 'IR',
    numericId: '364',
    atlasName: 'Iran',
    name: 'Iran',
    region: 'Middle East',
    latitude: 32.4279,
    longitude: 53.688,
    hubs: [{ name: 'Tehran Attribution Node, IR', lat: 35.6892, lon: 51.389 }],
  },
  KP: {
    code: 'KP',
    numericId: '408',
    atlasName: 'North Korea',
    name: 'North Korea',
    region: 'East Asia',
    latitude: 40.3399,
    longitude: 127.5101,
    hubs: [{ name: 'Pyongyang Lazarus Node, KP', lat: 39.0392, lon: 125.7625 }],
  },
  IL: {
    code: 'IL',
    numericId: '376',
    atlasName: 'Israel',
    name: 'Israel',
    region: 'Middle East',
    latitude: 31.0461,
    longitude: 34.8516,
    hubs: [{ name: 'Tel Aviv Cyber Defense Hub, IL', lat: 32.0853, lon: 34.7818 }],
  },
  UA: {
    code: 'UA',
    numericId: '804',
    atlasName: 'Ukraine',
    name: 'Ukraine',
    region: 'Europe',
    latitude: 48.3794,
    longitude: 31.1656,
    hubs: [{ name: 'Kyiv CERT-UA Sector, UA', lat: 50.4501, lon: 30.5234 }],
  },
  DE: {
    code: 'DE',
    numericId: '276',
    atlasName: 'Germany',
    name: 'Germany',
    region: 'Europe',
    latitude: 51.1657,
    longitude: 10.4515,
    hubs: [
      { name: 'Berlin / Bonn (BSI), DE', lat: 52.52, lon: 13.405 },
      { name: 'Frankfurt Cloud Interconnect, DE', lat: 50.1109, lon: 8.6821 },
      { name: 'Munich AI Research Cluster, DE', lat: 48.1351, lon: 11.582 },
    ],
  },
  FR: {
    code: 'FR',
    numericId: '250',
    atlasName: 'France',
    name: 'France',
    region: 'Europe',
    latitude: 46.2276,
    longitude: 2.2137,
    hubs: [{ name: 'Paris (ANSSI / AI Action Hub), FR', lat: 48.8566, lon: 2.3522 }],
  },
  JP: {
    code: 'JP',
    numericId: '392',
    atlasName: 'Japan',
    name: 'Japan',
    region: 'East Asia',
    latitude: 36.2048,
    longitude: 138.2529,
    hubs: [
      { name: 'Tokyo (JPCERT / AISI), JP', lat: 35.6762, lon: 139.6503 },
      { name: 'Osaka Research Sector, JP', lat: 34.6937, lon: 135.5023 },
    ],
  },
  KR: {
    code: 'KR',
    numericId: '410',
    atlasName: 'South Korea',
    name: 'South Korea',
    region: 'East Asia',
    latitude: 35.9078,
    longitude: 127.7669,
    hubs: [{ name: 'Seoul (KISA Cyber Center), KR', lat: 37.5665, lon: 126.978 }],
  },
  TW: {
    code: 'TW',
    numericId: '158',
    atlasName: 'Taiwan',
    name: 'Taiwan',
    region: 'East Asia',
    latitude: 23.6978,
    longitude: 120.9605,
    hubs: [{ name: 'Taipei Semiconductor & Cyber Hub, TW', lat: 25.033, lon: 121.5654 }],
  },
  IN: {
    code: 'IN',
    numericId: '356',
    atlasName: 'India',
    name: 'India',
    region: 'South Asia',
    latitude: 20.5937,
    longitude: 78.9629,
    hubs: [
      { name: 'Bengaluru AI Engineering Hub, IN', lat: 12.9716, lon: 77.5946 },
      { name: 'New Delhi (CERT-In), IN', lat: 28.6139, lon: 77.209 },
    ],
  },
  SG: {
    code: 'SG',
    numericId: '702',
    atlasName: 'Singapore',
    name: 'Singapore',
    region: 'Southeast Asia',
    latitude: 1.3521,
    longitude: 103.8198,
    hubs: [{ name: 'Singapore (CSA / AI Verify Foundation), SG', lat: 1.3521, lon: 103.8198 }],
  },
  AU: {
    code: 'AU',
    numericId: '036',
    atlasName: 'Australia',
    name: 'Australia',
    region: 'Oceania',
    latitude: -25.2744,
    longitude: 133.7751,
    hubs: [
      { name: 'Canberra / Sydney (ACSC), AU', lat: -33.8688, lon: 151.2093 },
      { name: 'Melbourne AI Safety Hub, AU', lat: -37.8136, lon: 144.9631 },
    ],
  },
  CA: {
    code: 'CA',
    numericId: '124',
    atlasName: 'Canada',
    name: 'Canada',
    region: 'North America',
    latitude: 56.1304,
    longitude: -106.3468,
    hubs: [
      { name: 'Toronto / Montreal AI Institute Hub, CA', lat: 43.6532, lon: -79.3832 },
      { name: 'Ottawa (Canadian Centre for Cyber Security), CA', lat: 45.4215, lon: -75.6972 },
    ],
  },
  BR: {
    code: 'BR',
    numericId: '076',
    atlasName: 'Brazil',
    name: 'Brazil',
    region: 'South America',
    latitude: -14.235,
    longitude: -51.9253,
    hubs: [{ name: 'São Paulo CERT.br Hub, BR', lat: -23.5505, lon: -46.6333 }],
  },
  NL: {
    code: 'NL',
    numericId: '528',
    atlasName: 'Netherlands',
    name: 'Netherlands',
    region: 'Europe',
    latitude: 52.1326,
    longitude: 5.2913,
    hubs: [{ name: 'The Hague / Amsterdam (NCSC-NL), NL', lat: 52.3676, lon: 4.9041 }],
  },
  CH: {
    code: 'CH',
    numericId: '756',
    atlasName: 'Switzerland',
    name: 'Switzerland',
    region: 'Europe',
    latitude: 46.8182,
    longitude: 8.2275,
    hubs: [{ name: 'Zurich / Geneva AI Governance Hub, CH', lat: 47.3769, lon: 8.5417 }],
  },
  SE: {
    code: 'SE',
    numericId: '752',
    atlasName: 'Sweden',
    name: 'Sweden',
    region: 'Europe',
    latitude: 60.1282,
    longitude: 18.6435,
    hubs: [{ name: 'Stockholm NCSC-SE Hub, SE', lat: 59.3293, lon: 18.0686 }],
  },
  PL: {
    code: 'PL',
    numericId: '616',
    atlasName: 'Poland',
    name: 'Poland',
    region: 'Europe',
    latitude: 51.9194,
    longitude: 19.1451,
    hubs: [{ name: 'Warsaw CERT Polska Hub, PL', lat: 52.2297, lon: 21.0122 }],
  },
  ES: {
    code: 'ES',
    numericId: '724',
    atlasName: 'Spain',
    name: 'Spain',
    region: 'Europe',
    latitude: 40.4637,
    longitude: -3.7492,
    hubs: [{ name: 'Madrid CCN-CERT Cyber Hub, ES', lat: 40.4168, lon: -3.7038 }],
  },
  AE: {
    code: 'AE',
    numericId: '784',
    atlasName: 'United Arab Emirates',
    name: 'United Arab Emirates',
    region: 'Middle East',
    latitude: 23.4241,
    longitude: 53.8478,
    hubs: [{ name: 'Abu Dhabi / Dubai AI Hub, AE', lat: 24.4539, lon: 54.3773 }],
  },
  LB: {
    code: 'LB',
    numericId: '422',
    atlasName: 'Lebanon',
    name: 'Lebanon',
    region: 'Middle East',
    latitude: 33.8547,
    longitude: 35.8623,
    hubs: [{ name: 'Beirut Jurisdiction Node, LB', lat: 33.8938, lon: 35.5018 }],
  },
  GL: {
    code: 'GL',
    numericId: '304',
    atlasName: 'Greenland',
    name: 'Greenland',
    region: 'Arctic / North Atlantic',
    latitude: 71.7069,
    longitude: -42.6043,
    hubs: [{ name: 'Nuuk Arctic Telemetry Relay, GL', lat: 64.1814, lon: -51.6941 }],
  },
};

export function resolveSupportedLocation(input: {
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  location_precision: LocationPrecision;
  location_basis: LocationBasis;
}): {
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_precision: LocationPrecision;
  location_basis: LocationBasis;
} {
  // Never place a map marker if location cannot be established or is global/unknown
  if (
    !input.country_code ||
    input.location_precision === 'unknown' ||
    input.location_precision === 'global' ||
    input.location_basis === 'unknown'
  ) {
    return {
      country_code: null,
      country_name: input.country_name || null,
      region_name: input.region_name || null,
      latitude: null,
      longitude: null,
      location_precision:
        input.location_precision === 'global' ? 'global' : 'unknown',
      location_basis: input.location_basis || 'unknown',
    };
  }

  const code = input.country_code.toUpperCase();
  const ref = COUNTRY_CENTROIDS[code];
  if (!ref) {
    return {
      country_code: code,
      country_name: input.country_name,
      region_name: input.region_name,
      latitude: null,
      longitude: null,
      location_precision: 'country',
      location_basis: input.location_basis,
    };
  }

  return {
    country_code: ref.code,
    country_name: input.country_name || ref.name,
    region_name: input.region_name || ref.region,
    latitude: ref.latitude,
    longitude: ref.longitude,
    location_precision: 'country',
    location_basis: input.location_basis,
  };
}
