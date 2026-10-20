import { z } from 'zod';

import {
  DEFAULT_SPOT_ID,
  assessHour,
  currentHour,
  fetchHourlyConditions,
  getSpot,
} from '@tonnta/data';

export interface ForecastCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

const resultSchema = z.object({
  spot: z.literal('donabate'),
  time: z.iso.datetime(),
  verdict: z.enum(['go', 'maybe', 'flat', 'blown']),
  board: z.enum(['sup', 'foamie', 'longboard']).optional(),
  reason: z.string().min(1),
});

export async function surfVerdict(
  cache: ForecastCache,
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch
) {
  const hourKey = new Date(now).toISOString().slice(0, 13);
  const key = `mcp:surf-verdict:v1:donabate:${hourKey}`;
  try {
    const cached = await cache.get(key);
    if (cached !== null) {
      const parsed = resultSchema.safeParse(JSON.parse(cached));
      if (parsed.success && parsed.data.time.slice(0, 13) === hourKey) return parsed.data;
    }
  } catch {}

  const spot = getSpot(DEFAULT_SPOT_ID);
  if (spot === undefined) throw new Error('Default spot is unavailable');
  const hours = await fetchHourlyConditions(spot, fetchImpl);
  const hour = currentHour(hours, now);
  const result = resultSchema.parse({
    spot: 'donabate',
    time: hour.time,
    ...assessHour(hour, spot),
  });
  try {
    await cache.put(key, JSON.stringify(result), { expirationTtl: 300 });
  } catch {}
  return result;
}
