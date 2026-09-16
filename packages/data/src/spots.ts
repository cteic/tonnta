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
    buoyStationId: 'M2',
    tideStationId: 'Skerries',
    epaBeachId: 'IEEABWC020_0000_0100',
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
