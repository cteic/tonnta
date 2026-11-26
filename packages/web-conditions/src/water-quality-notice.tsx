import { waterQualityMessage } from '@tonnta/data';
import type { Spot, WaterQualityCheck, WaterQualityStatus } from '@tonnta/types';

import { formatDayDate, formatHour } from './format';

/** Notice availability is not a water sample or a promise that entering is safe. */
export function WaterQualityNotice({
  status = 'unchecked',
  check,
  spot,
}: {
  status?: WaterQualityStatus | undefined;
  check?: WaterQualityCheck | undefined;
  spot: Spot;
}) {
  const retrievedDate = check?.status === 'checked' ? new Date(check.checkedAt) : undefined;
  const retrievedAt =
    retrievedDate !== undefined &&
    Number.isFinite(retrievedDate.getTime()) &&
    (status === 'not-reported' ||
      status === 'checked' ||
      status === 'stale' ||
      status === 'restricted')
      ? retrievedDate.toISOString()
      : undefined;
  return (
    <section
      aria-label="Water-quality notices"
      role={status === 'restricted' ? 'alert' : 'status'}
      style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px', lineHeight: 1.5 }}
    >
      <strong>Water-quality notices</strong>
      <p style={{ margin: '4px 0' }}>{waterQualityMessage(status)}</p>
      {retrievedAt !== undefined ? (
        <small>
          Notices retrieved {formatDayDate(retrievedAt, spot.timezone)} at{' '}
          {formatHour(retrievedAt, spot.timezone)}. This is not a water sampling time.
        </small>
      ) : null}
    </section>
  );
}
