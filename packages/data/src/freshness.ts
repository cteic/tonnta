/** A retained screen must not masquerade as freshly checked conditions indefinitely. */
export const MAX_FORECAST_AGE_MS = 60 * 60 * 1000;

export function isForecastFresh(loadedAt: number, now: number): boolean {
  const age = now - loadedAt;
  return Number.isFinite(age) && age >= 0 && age < MAX_FORECAST_AGE_MS;
}
