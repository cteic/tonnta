import type { CSSProperties } from 'react';

import { seaStateFor } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

interface SeaStateLabelProps {
  hour?: HourlyConditions | undefined;
  /** Type for the word; each hero sets its own. */
  wordStyle: CSSProperties;
  /** Type for the number rule printed under the word. */
  ruleStyle: CSSProperties;
}

/**
 * One word for the sea surface with the number rule behind it, for example
 * "Glassy" over "wind under 8km/h". It describes the water and gives no
 * advice. Renders nothing when no rule fits or a value is missing.
 */
export function SeaStateLabel({ hour, wordStyle, ruleStyle }: SeaStateLabelProps) {
  const seaState = seaStateFor(hour);
  if (seaState === undefined) return null;
  return (
    <p data-sea-state={seaState.word} style={wordStyle}>
      {seaState.word}
      <span style={{ display: 'block', ...ruleStyle }}>{seaState.rule}</span>
    </p>
  );
}
