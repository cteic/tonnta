import { createWidget } from 'expo-widgets';

import { Column, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';

import { PLACEHOLDER_PROPS, type VerdictWidgetProps } from './verdict-widget-props';

/**
 * Android home-screen widget, rendered through Glance. The layout runs
 * outside the app: it may only use its props and `@expo/ui/jetpack-compose`.
 */
function VerdictWidgetLayout(props: VerdictWidgetProps) {
  'widget';
  return (
    <Column
      modifiers={[fillMaxSize(), background(props.background), cornerRadius(20), paddingAll(14)]}
    >
      <Text color={props.mutedColor} style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>
        {props.irish.toUpperCase()}
      </Text>
      <Text color={props.verdictColor} maxLines={1} style={{ fontSize: 32, fontWeight: '700' }}>
        {props.verdict}
      </Text>
      <Text color={props.textColor} maxLines={1} style={{ fontSize: 12, fontWeight: '500' }}>
        {props.detail}
      </Text>
      {props.board !== '' ? (
        <Text color={props.textColor} maxLines={1} style={{ fontSize: 12, fontWeight: '600' }}>
          {props.board}
        </Text>
      ) : null}
      <Text color={props.mutedColor} maxLines={1} style={{ fontSize: 10 }}>
        {props.footer}
      </Text>
    </Column>
  );
}

export const VerdictWidget = createWidget('TonntaVerdict', VerdictWidgetLayout, PLACEHOLDER_PROPS);

export default VerdictWidget;
