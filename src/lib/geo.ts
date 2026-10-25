import { LocationBasis, LocationPrecision } from './types';

export interface CountryGeoReference {
  code: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

/**
 * Standard ISO-3166 country centroids used ONLY when a report explicitly
 * establishes a country-level occurrence or target location.
 * Never used to fabricate street/city coordinates when only a country is known,
 * and never assigned when location is unknown.
 */
export const COUNTRY_CENTROIDS: Record<string, CountryGeoReference> = {
  US: {
    code: 'US',
    name: 'United States',
    region: 'North America',
    latitude: 39.8283,
    longitude: -98.5795,
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    region: 'Europe',
    latitude: 54.7024,
    longitude: -3.2766,
  },
  CN: {
    code: 'CN',
    name: 'China',
    region: 'East Asia',
    latitude: 35.8617,
    longitude: 104.1954,
  },
  RU: {
    code: 'RU',
    name: 'Russia',
    region: 'Eurasia',
    latitude: 61.524,
    longitude: 105.3188,
  },
  IR: {
    code: 'IR',
    name: 'Iran',
    region: 'Middle East',
    latitude: 32.4279,
    longitude: 53.688,
  },
  KP: {
    code: 'KP',
    name: 'North Korea',
    region: 'East Asia',
    latitude: 40.3399,
    longitude: 127.5101,
  },
  IL: {
    code: 'IL',
    name: 'Israel',
    region: 'Middle East',
    latitude: 31.0461,
    longitude: 34.8516,
  },
  UA: {
    code: 'UA',
    name: 'Ukraine',
    region: 'Europe',
    latitude: 48.3794,
    longitude: 31.1656,
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    region: 'Europe',
    latitude: 51.1657,
    longitude: 10.4515,
  },
  FR: {
    code: 'FR',
    name: 'France',
    region: 'Europe',
    latitude: 46.2276,
    longitude: 2.2137,
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    region: 'East Asia',
    latitude: 36.2048,
    longitude: 138.2529,
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    region: 'East Asia',
    latitude: 35.9078,
    longitude: 127.7669,
  },
  TW: {
    code: 'TW',
    name: 'Taiwan',
    region: 'East Asia',
    latitude: 23.6978,
    longitude: 120.9605,
  },
  IN: {
    code: 'IN',
    name: 'India',
    region: 'South Asia',
    latitude: 20.5937,
    longitude: 78.9629,
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    region: 'Southeast Asia',
    latitude: 1.3521,
    longitude: 103.8198,
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    region: 'Oceania',
    latitude: -25.2744,
    longitude: 133.7751,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    region: 'North America',
    latitude: 56.1304,
    longitude: -106.3468,
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    region: 'South America',
    latitude: -14.235,
    longitude: -51.9253,
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    region: 'Europe',
    latitude: 52.1326,
    longitude: 5.2913,
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    region: 'Europe',
    latitude: 46.8182,
    longitude: 8.2275,
  },
  SE: {
    code: 'SE',
    name: 'Sweden',
    region: 'Europe',
    latitude: 60.1282,
    longitude: 18.6435,
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    region: 'Europe',
    latitude: 51.9194,
    longitude: 19.1451,
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    region: 'Middle East',
    latitude: 23.4241,
    longitude: 53.8478,
  },
  LB: {
    code: 'LB',
    name: 'Lebanon',
    region: 'Middle East',
    latitude: 33.8547,
    longitude: 35.8623,
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
