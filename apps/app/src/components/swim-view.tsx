import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { seaTempBand } from '@tonnta/data';
import type { SeaTempBand, SwimWindow } from '@tonnta/data';
import type { HourlyConditions, Spot, SwimVerdictResult, WaterQualityAlert } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import { formatDayName, formatHour, formatHourRange } from '@/lib/format';

import { Body, Eyebrow } from './screen';

/**
 * Snámh: the same hourly data read for swimming. Calm, pale water is the
 * good outcome here, so the colours run the other way from surf.
 */

const SWIM_LABEL: Record<SwimVerdictResult['verdict'], { english: string; irish: string }> = {
  great: { english: 'PERFECT', irish: 'Foirfe' },
  ok: { english: 'GRAND', irish: 'Ceart go leor' },
  no: { english: 'NOT TODAY', irish: 'Ná téigh' },
};

const SWIM_SEA_TOKEN: Record<SwimVerdictResult['verdict'], string> = {
  great: '$seaFlat',
  ok: '$seaClean',
  no: '$seaBlown',
};

/** Thermometer scale, °C. Irish waters run about 8 to 19. */
const SCALE_MIN_C = 6;
const SCALE_MAX_C = 22;

const BAND_COLOUR: Record<SeaTempBand, string> = {
  baltic: '#6FA8DC',
  bracing: '#7FC4C4',
  fresh: '#8FC1B5',
  mild: '#E8C36A',
  warm: '#E8A33D',
};

interface ThermometerProps {
  seaTempC: number;
  colour: string;
}

function Thermometer({ seaTempC, colour }: ThermometerProps) {
  const fill = Math.min(1, Math.max(0, (seaTempC - SCALE_MIN_C) / (SCALE_MAX_C - SCALE_MIN_C)));
  const top = 6;
  const bottom = 58;
  const level = bottom - fill * (bottom - top);
  return (
    <Svg width={34} height={84} viewBox="0 0 34 84" accessibilityElementsHidden>
      <Rect
        x={11}
        y={2}
        width={12}
        height={62}
        rx={6}
        fill="none"
        stroke={colour}
        strokeWidth={2}
      />
      <Rect x={14} y={level} width={6} height={bottom - level + 6} rx={3} fill={colour} />
      <Circle cx={17} cy={70} r={11} fill={colour} />
      {[0.25, 0.5, 0.75].map((tick) => (
        <Line
          key={tick}
          x1={25}
          x2={30}
          y1={bottom - tick * (bottom - top)}
          y2={bottom - tick * (bottom - top)}
          stroke={colour}
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}
    </Svg>
  );
}

interface SeaTempCardProps {
  seaTempC: number;
}

/** The sea temperature up front: a thermometer, the band, and what to wear. */
export function SeaTempCard({ seaTempC }: SeaTempCardProps) {
  const band = seaTempBand(seaTempC);
  const colour = BAND_COLOUR[band.band];
  return (
    <XStack
      gap="$6"
      alignItems="center"
      padding="$7"
      borderRadius="$5"
      borderWidth={1}
      borderColor={colour}
      backgroundColor="$surfaceRaised"
      testID="sea-temp"
    >
      <Thermometer seaTempC={seaTempC} colour={colour} />
      <YStack flex={1} gap="$2">
        <Text fontFamily="$display" fontSize="$7" lineHeight="$7" fontWeight="700" color="$color">
          {`${seaTempC.toFixed(1)}°C`}
        </Text>
        <Text
          fontFamily="$body"
          fontSize="$2"
          fontWeight="600"
          letterSpacing={1.2}
          textTransform="uppercase"
          color={colour}
        >
          {`${band.label} sea`}
        </Text>
        <Body muted>{band.advice}</Body>
      </YStack>
    </XStack>
  );
}

interface SwimHeroProps {
  swim: SwimVerdictResult;
  hour: HourlyConditions | undefined;
  waterQuality: WaterQualityAlert | undefined;
}

function SwimHero({ swim, hour, waterQuality }: SwimHeroProps) {
  const label = SWIM_LABEL[swim.verdict];
  return (
    <YStack gap="$4" padding="$10" borderRadius="$6" backgroundColor={SWIM_SEA_TOKEN[swim.verdict]}>
      <Eyebrow>{label.irish}</Eyebrow>
      <Text
        accessibilityRole="header"
        testID="verdict-heading"
        fontFamily="$display"
        fontSize="$7"
        lineHeight="$7"
        fontWeight="700"
        letterSpacing={-1.5}
        color={swim.verdict === 'great' ? '$accent' : '$color'}
      >
        {label.english}
      </Text>
      {hour !== undefined ? (
        <Text fontFamily="$mono" fontSize="$5" lineHeight="$5" color="$color">
          {`${hour.waveHeightM.toFixed(1)}m sea · ${Math.round(hour.windSpeedKmh)}km/h wind`}
        </Text>
      ) : null}
      <Body>{swim.reason}</Body>
      {waterQuality?.restrictionInPlace === true ? (
        <YStack padding="$5" borderRadius="$4" backgroundColor="$surfaceRaised">
          <Body>{`Bathing restriction in place at ${waterQuality.beachName}. EPA notice.`}</Body>
        </YStack>
      ) : null}
    </YStack>
  );
}

interface SwimWindowsProps {
  windows: SwimWindow[];
  spot: Spot;
}

function SwimWindows({ windows, spot }: SwimWindowsProps) {
  return (
    <YStack gap="$4">
      <Eyebrow>Fuinneoga snámha · Swim windows</Eyebrow>
      {windows.length === 0 ? (
        <Body muted>No swimmable windows in the next few days. The sea needs to settle first.</Body>
      ) : (
        windows.map((window) => (
          <YStack key={window.start} gap="$1">
            <Text
              fontFamily="$display"
              fontSize="$4"
              fontWeight="600"
              color={window.nearHighTide ? '$accent' : '$color'}
            >
              {`${formatDayName(window.start, spot.timezone)} ${formatHourRange(window.start, window.end, spot.timezone)}`}
            </Text>
            <Body muted>
              {window.highTide !== undefined
                ? `Around high tide, ${formatHour(window.highTide, spot.timezone)}`
                : 'Low water, a long walk out'}
            </Body>
          </YStack>
        ))
      )}
    </YStack>
  );
}

interface SwimViewProps {
  spot: Spot;
  swim: SwimVerdictResult;
  hour: HourlyConditions | undefined;
  waterQuality: WaterQualityAlert | undefined;
  windows: SwimWindow[];
  /** False after dark, when the dark hero replaces the swim hero. */
  showHero: boolean;
}

export function SwimView({ spot, swim, hour, waterQuality, windows, showHero }: SwimViewProps) {
  return (
    <>
      {showHero ? <SwimHero swim={swim} hour={hour} waterQuality={waterQuality} /> : null}
      {hour?.seaTempC !== undefined ? <SeaTempCard seaTempC={hour.seaTempC} /> : null}
      <SwimWindows windows={windows} spot={spot} />
    </>
  );
}
