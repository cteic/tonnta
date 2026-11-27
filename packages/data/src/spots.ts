import type { Spot } from '@tonnta/types';

/**
 * Spot registry. Donabate is the launch spot; everything downstream is
 * driven by this config so new spots are entries, not features.
 */
export const SPOTS: readonly Spot[] = [
  {
    id: 'donabate',
    name: 'Donabate',
    irishName: 'Domhnach Bat',
    region: 'North County Dublin',
    country: 'IE',
    latitude: 53.487,
    longitude: -6.107,
    timezone: 'Europe/Dublin',
    facing: 70,
    // Provisional uncertainty guard, not a measured local surfability boundary.
    thresholds: {
      flatBelowM: 0.3,
      goFromM: 0.4,
      minGoPeriodS: 4,
      maxWindKmh: 25,
      maxWindOffshoreKmh: 30,
      blownOnshoreKmh: 35,
    },
    buoyStationId: 'M2',
    tideStationId: 'Skerries',
    tideGaugeId: 'Skerries Harbour',
    epaBeachId: 'IEEABWC020_0000_0100',
  },
  {
    // Long west-facing strand in Donegal Bay. M4, the nearest buoy, has been offline since March 2026.
    id: 'rossnowlagh',
    name: 'Rossnowlagh',
    irishName: 'Ros Neamhlach',
    region: 'County Donegal',
    country: 'IE',
    latitude: 54.555,
    longitude: -8.213,
    timezone: 'Europe/Dublin',
    facing: 264,
    tideStationId: 'Killybegs',
    tideGaugeId: 'Killybegs Port',
    epaBeachId: 'IENWBWC010_0000_0200',
  },
  {
    // Faces west-northwest; rocks in the lineup and swimming is banned. No EPA bathing water.
    id: 'strandhill',
    name: 'Strandhill',
    region: 'County Sligo',
    country: 'IE',
    latitude: 54.271,
    longitude: -8.61,
    timezone: 'Europe/Dublin',
    facing: 296,
    tideStationId: 'Sligo',
    tideGaugeId: 'Sligo',
  },
  {
    // Open to the south-west; rips and rocks at the west end.
    id: 'keel-achill',
    name: 'Keel, Achill',
    irishName: 'An Caol',
    region: 'County Mayo',
    country: 'IE',
    latitude: 53.966,
    longitude: -10.053,
    timezone: 'Europe/Dublin',
    facing: 224,
    tideStationId: 'Achill_Island_MODELLED',
    tideGaugeId: 'Roonagh Pier',
    epaBeachId: 'IEWEBWC250_0000_0200',
  },
  {
    // Faces west-southwest; rips and rocks, often crowded.
    id: 'lahinch',
    name: 'Lahinch',
    irishName: 'Trá an Leachta',
    region: 'County Clare',
    country: 'IE',
    latitude: 52.938,
    longitude: -9.355,
    timezone: 'Europe/Dublin',
    facing: 235,
    buoyStationId: 'M3',
    tideStationId: 'Lahinch_MODELLED',
    tideGaugeId: 'Inishmore',
    epaBeachId: 'IESHBWC100_0000_0100',
  },
  {
    // Long spit facing west-southwest into Dingle Bay.
    id: 'inch-kerry',
    name: 'Inch',
    irishName: 'Trá Inse',
    region: 'County Kerry',
    country: 'IE',
    latitude: 52.127,
    longitude: -9.969,
    timezone: 'Europe/Dublin',
    facing: 247,
    buoyStationId: 'M3',
    tideStationId: 'Dingle',
    tideGaugeId: 'Dingle Harbour',
    epaBeachId: 'IESWBWC230_0000_0200',
  },
  {
    // Faces north-west; the strand runs several kilometres, so this point is mid-strand. No EPA bathing water on this side.
    id: 'brandon-bay',
    name: 'Brandon Bay (Fermoyle)',
    irishName: 'Trá Fhormaoileach',
    region: 'County Kerry',
    country: 'IE',
    latitude: 52.259,
    longitude: -10.066,
    timezone: 'Europe/Dublin',
    facing: 314,
    buoyStationId: 'M3',
    tideStationId: 'Fenit',
  },
  {
    // West beach, facing south-southeast; dangerous rips.
    id: 'inchydoney',
    name: 'Inchydoney',
    irishName: 'Oileán Inse Duine',
    region: 'County Cork',
    country: 'IE',
    latitude: 51.597,
    longitude: -8.861,
    timezone: 'Europe/Dublin',
    facing: 153,
    buoyStationId: 'M3',
    tideStationId: 'Union_Hall',
    tideGaugeId: 'Union Hall Harbor',
    epaBeachId: 'IESWBWC100_0000_0100',
  },
  {
    // Faces south; rocks, groynes and rips. M3 chosen over the nearer M5 because swell here arrives from the south-west.
    id: 'garrettstown',
    name: 'Garrettstown',
    irishName: 'Baile Ghearóid',
    region: 'County Cork',
    country: 'IE',
    latitude: 51.644,
    longitude: -8.579,
    timezone: 'Europe/Dublin',
    facing: 188,
    buoyStationId: 'M3',
    tideStationId: 'Kinsale_MODELLED',
    epaBeachId: 'IESWBWC090_0000_0200',
  },
  {
    // East-coast beach facing east-southeast; needs an easterly swell.
    id: 'brittas-bay',
    name: 'Brittas Bay',
    irishName: 'Cuan an Bhriotáis',
    region: 'County Wicklow',
    country: 'IE',
    latitude: 52.883,
    longitude: -6.058,
    timezone: 'Europe/Dublin',
    facing: 113,
    buoyStationId: 'M2',
    tideStationId: 'Arklow',
    epaBeachId: 'IEEABWC140_0000_0300',
  },
  {
    id: 'el-cotillo',
    name: 'El Cotillo',
    region: 'Fuerteventura',
    country: 'ES',
    latitude: 28.674,
    longitude: -14.017,
    timezone: 'Atlantic/Canary',
    // Piedra Playa faces the open Atlantic to the west
    facing: 275,
    thresholds: {
      flatBelowM: 0.6,
      goFromM: 0.8,
      maxWindKmh: 25,
      maxWindOffshoreKmh: 30,
      blownOnshoreKmh: 35,
    },
  },
  {
    id: 'corralejo',
    name: 'Corralejo — Flag Beach',
    region: 'Fuerteventura',
    country: 'ES',
    latitude: 28.712,
    longitude: -13.833,
    timezone: 'Atlantic/Canary',
    // Flag Beach looks east-northeast across the Lobos channel
    facing: 65,
    thresholds: {
      flatBelowM: 0.6,
      goFromM: 0.8,
      maxWindKmh: 25,
      maxWindOffshoreKmh: 30,
      blownOnshoreKmh: 35,
    },
  },
] as const;

export const DEFAULT_SPOT_ID = 'donabate';

export function getSpot(id: string): Spot | undefined {
  return SPOTS.find((spot) => spot.id === id);
}
