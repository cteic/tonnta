import type { Spot } from '@tonnta/types';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

/**
 * JSON-LD graphs. Two audiences read these: classic rich-result pipelines,
 * and any model doing retrieval that would rather read facts than parse a
 * hero. `Dataset` is the one that matters most here — Tonnta is a data
 * product, and this is how you say so in a machine-readable way.
 *
 * No FAQPage: the site has no genuine question-and-answer copy, and
 * inventing some to hang markup on is exactly the thing that gets markup
 * ignored.
 */

const SCHEMA_CONTEXT = 'https://schema.org';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const WEBAPP_ID = `${SITE_URL}/#webapp`;
export const PLACE_ID = `${SITE_URL}/#donabate`;
export const DATASET_ID = `${SITE_URL}/#forecast`;

interface SchemaReference {
  '@id': string;
}

interface GeoCoordinatesSchema {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

interface CountrySchema {
  '@type': 'Country';
  name: string;
}

interface AdministrativeAreaSchema {
  '@type': 'AdministrativeArea';
  name: string;
  containedInPlace: CountrySchema;
}

export interface PlaceSchema {
  '@type': 'Place';
  '@id': string;
  name: string;
  alternateName?: string;
  description: string;
  url: string;
  geo: GeoCoordinatesSchema;
  containedInPlace: AdministrativeAreaSchema;
}

export interface OrganizationSchema {
  '@type': 'Organization';
  '@id': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  areaServed: SchemaReference;
}

export interface WebSiteSchema {
  '@type': 'WebSite';
  '@id': string;
  name: string;
  alternateName: string;
  url: string;
  description: string;
  inLanguage: string;
  publisher: SchemaReference;
}

interface OfferSchema {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
}

export interface WebApplicationSchema {
  '@type': 'WebApplication';
  '@id': string;
  name: string;
  url: string;
  description: string;
  applicationCategory: 'SportsApplication';
  operatingSystem: 'Web';
  browserRequirements: string;
  inLanguage: string;
  isPartOf: SchemaReference;
  publisher: SchemaReference;
  about: SchemaReference;
  featureList: string[];
  offers: OfferSchema;
}

interface PropertyValueSchema {
  '@type': 'PropertyValue';
  name: string;
  unitCode: string;
  unitText: string;
}

interface DataDownloadSchema {
  '@type': 'DataDownload';
  name: string;
  encodingFormat: string;
  contentUrl: string;
  description: string;
}

export interface DatasetSchema {
  '@type': 'Dataset';
  '@id': string;
  name: string;
  description: string;
  url: string;
  creator: SchemaReference;
  isAccessibleForFree: true;
  license: string;
  keywords: string[];
  temporalCoverage: string;
  spatialCoverage: SchemaReference;
  measurementTechnique: string[];
  variableMeasured: PropertyValueSchema[];
  distribution: DataDownloadSchema[];
}

type SchemaNode =
  OrganizationSchema | WebSiteSchema | WebApplicationSchema | PlaceSchema | DatasetSchema;

export interface StructuredDataGraph {
  '@context': typeof SCHEMA_CONTEXT;
  '@graph': SchemaNode[];
}

/** How far ahead the forecast reaches — Open-Meteo marine gives us a week. */
const FORECAST_DAYS = 7;

function isoDate(value: Date): string {
  const iso = value.toISOString().split('T')[0];
  return iso ?? '';
}

export function buildOrganization(): OrganizationSchema {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon`,
    description: `${SITE_NAME} — ${SITE_TAGLINE} ${SITE_DESCRIPTION}`,
    areaServed: { '@id': PLACE_ID },
  };
}

export function buildWebSite(): WebSiteSchema {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-IE',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function buildPlace(spot: Spot): PlaceSchema {
  const place: PlaceSchema = {
    '@type': 'Place',
    '@id': PLACE_ID,
    name: `${spot.name} Beach`,
    description: `Beach break at ${spot.name}, ${spot.region}. Faces ${spot.facing}° (ENE), so westerly and south-westerly wind blows offshore and north-easterly through south-easterly wind blows onshore.`,
    url: `${SITE_URL}/`,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: spot.latitude,
      longitude: spot.longitude,
    },
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: 'County Dublin',
      containedInPlace: { '@type': 'Country', name: 'Ireland' },
    },
  };
  if (spot.irishName !== undefined) {
    place.alternateName = spot.irishName;
  }
  return place;
}

export function buildWebApplication(): WebApplicationSchema {
  return {
    '@type': 'WebApplication',
    '@id': WEBAPP_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires a modern browser with JavaScript enabled.',
    inLanguage: 'en-IE',
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
    about: { '@id': PLACE_ID },
    featureList: [
      'Surf verdict for right now — GO, MAYBE, FLAT or BLOWN OUT',
      'Board call — SUP, foamie or longboard, with the reasoning',
      'Seven-day outlook and the next good surfable window',
      'Live buoy observations, tide times and sea temperature',
      'Snámh mode — the same sea read for swimmers',
      'Push alerts when the waves and wind line up',
    ],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };
}

/**
 * The forecast feed described as what it is: a rolling seven-day hourly
 * dataset for one point on the Irish Sea, readable by machines at /mcp.
 */
export function buildDataset(spot: Spot, now: Date): DatasetSchema {
  const end = new Date(now.getTime() + FORECAST_DAYS * 24 * 60 * 60 * 1000);
  return {
    '@type': 'Dataset',
    '@id': DATASET_ID,
    name: `${spot.name} surf and sea-state forecast`,
    description: `Rolling seven-day hourly forecast for ${spot.name}, ${spot.region}: significant wave height, wave period and direction, wind speed, gust and direction, sea surface temperature and tide predictions, plus the surfable/swimmable verdict derived from them.`,
    url: `${SITE_URL}/`,
    creator: { '@id': ORGANIZATION_ID },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    keywords: [
      'surf forecast',
      'wave height',
      'sea state',
      'tides',
      spot.name,
      'County Dublin',
      'Ireland',
    ],
    temporalCoverage: `${isoDate(now)}/${isoDate(end)}`,
    spatialCoverage: { '@id': PLACE_ID },
    measurementTechnique: [
      'Open-Meteo marine and weather forecast models',
      'Marine Institute ERDDAP buoy observations and tide predictions',
      'EPA bathing-water quality notices',
    ],
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'Significant wave height',
        unitCode: 'MTR',
        unitText: 'm',
      },
      { '@type': 'PropertyValue', name: 'Wave period', unitCode: 'SEC', unitText: 's' },
      { '@type': 'PropertyValue', name: 'Wave direction', unitCode: 'DD', unitText: 'degrees' },
      { '@type': 'PropertyValue', name: 'Wind speed', unitCode: 'KMH', unitText: 'km/h' },
      { '@type': 'PropertyValue', name: 'Wind gust', unitCode: 'KMH', unitText: 'km/h' },
      { '@type': 'PropertyValue', name: 'Wind direction', unitCode: 'DD', unitText: 'degrees' },
      { '@type': 'PropertyValue', name: 'Tide height', unitCode: 'MTR', unitText: 'm' },
      {
        '@type': 'PropertyValue',
        name: 'Sea surface temperature',
        unitCode: 'CEL',
        unitText: '°C',
      },
    ],
    distribution: [
      {
        '@type': 'DataDownload',
        name: 'Tonnta MCP endpoint',
        encodingFormat: 'application/json',
        contentUrl: `${SITE_URL}/mcp`,
        description:
          'JSON-RPC 2.0 over POST. Call tools/list to enumerate, then tools/call with get_surf_conditions for the current reading.',
      },
    ],
  };
}

/** Site-wide identity — rendered once, in the root layout. */
export function buildSiteGraph(): StructuredDataGraph {
  return {
    '@context': SCHEMA_CONTEXT,
    '@graph': [buildOrganization(), buildWebSite()],
  };
}

/** Home-page graph — what the app is, where it is, and the data behind it. */
export function buildHomeGraph(spot: Spot, now: Date): StructuredDataGraph {
  return {
    '@context': SCHEMA_CONTEXT,
    '@graph': [buildWebApplication(), buildPlace(spot), buildDataset(spot, now)],
  };
}
