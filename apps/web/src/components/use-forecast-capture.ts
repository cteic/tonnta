'use client';

import { useEffect, useState } from 'react';

import { SURF_VERDICT_ENGINE_VERSION } from '@tonnta/data';
import type { SpotConditions } from '@tonnta/web-conditions';

import { forecastHoursToCapture } from '@/lib/forecast-capture';
import { captureForecastSnapshots, persistForecastSnapshots } from '@/lib/forecast-snapshots';

/** Private local evidence for a later beach check. No network writes or account required. */
export function useForecastCapture(conditions: SpotConditions) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const capturedAt = Date.now();
    const hours = forecastHoursToCapture(conditions, capturedAt);
    if (hours.length === 0) return;
    async function save() {
      try {
        const snapshots = await captureForecastSnapshots({
          spotId: conditions.spot.id,
          checkedAt: conditions.loadedAt,
          capturedAt,
          engineVersion: SURF_VERDICT_ENGINE_VERSION,
          hours,
        });
        if (cancelled) return;
        const result = persistForecastSnapshots(window.localStorage, snapshots);
        setFailed(!result.ok);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void save();
    return () => {
      cancelled = true;
    };
  }, [conditions]);
  return failed;
}
