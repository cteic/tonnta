import { type WidgetEnvironment, createWidget } from 'expo-widgets';

import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';

import { PLACEHOLDER_PROPS, type VerdictWidgetProps } from './verdict-widget-props';

/**
 * iOS home-screen widget. The layout runs in the widget extension, not the
 * app: it may only use its props, its environment and `@expo/ui/swift-ui`.
 */
function VerdictWidgetLayout(props: VerdictWidgetProps, environment: WidgetEnvironment) {
  'widget';
  const medium = environment.widgetFamily === 'systemMedium';
  return (
    <VStack
      alignment="leading"
      spacing={3}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(props.background, 'widget'),
        widgetURL('tonnta://'),
      ]}
    >
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(props.mutedColor)]}>
        {props.irish.toUpperCase()}
      </Text>
      <Text
        modifiers={[
          font({ size: medium ? 38 : 32, weight: 'bold' }),
          foregroundStyle(props.verdictColor),
          lineLimit(1),
          minimumScaleFactor(0.5),
        ]}
      >
        {props.verdict}
      </Text>
      <Text
        modifiers={[
          font({ size: 12, weight: 'medium' }),
          foregroundStyle(props.textColor),
          lineLimit(1),
          minimumScaleFactor(0.7),
        ]}
      >
        {props.detail}
      </Text>
      {props.board !== '' ? (
        <Text
          modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(props.textColor)]}
        >
          {props.board}
        </Text>
      ) : null}
      {medium && props.reason !== '' ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(props.textColor), lineLimit(2)]}>
          {props.reason}
        </Text>
      ) : null}
      <Spacer />
      <Text modifiers={[font({ size: 10 }), foregroundStyle(props.mutedColor), lineLimit(1)]}>
        {props.footer}
      </Text>
    </VStack>
  );
}

export const VerdictWidget = createWidget('TonntaVerdict', VerdictWidgetLayout, PLACEHOLDER_PROPS);

export default VerdictWidget;
