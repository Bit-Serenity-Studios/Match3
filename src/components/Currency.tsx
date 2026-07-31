import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';

/** Currency → CC0 icon. Keeps every wallet/reward glyph consistent app-wide. */
const CURRENCY_ICON = {
  coins: 'coin',
  gems: 'star',
  embers: 'ember',
  moonstones: 'moonstone',
} as const satisfies Record<string, IconName>;

export type CurrencyKind = keyof typeof CURRENCY_ICON;

interface AmountProps {
  kind: CurrencyKind;
  amount: number | string;
  size?: number;
  /** Tint the icon (use on light backgrounds where the gold art washes out). */
  tint?: string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/** A single "12 <icon>" pairing — number then its currency icon. */
export function CurrencyAmount({
  kind,
  amount,
  size = 14,
  tint,
  textStyle,
  style,
}: AmountProps): React.ReactElement {
  return (
    <View style={[styles.pair, style]}>
      <Text style={textStyle}>{amount}</Text>
      <Icon name={CURRENCY_ICON[kind]} size={size} tint={tint} />
    </View>
  );
}

interface ChipsProps {
  grants: Partial<Record<CurrencyKind, number | undefined>>;
  size?: number;
  tint?: string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/** Renders whichever of coins/embers/gems/moonstones are present, in order. */
export function RewardChips({
  grants,
  size = 14,
  tint,
  textStyle,
  style,
}: ChipsProps): React.ReactElement {
  const order: CurrencyKind[] = ['coins', 'embers', 'gems', 'moonstones'];
  const parts = order.filter((k) => grants[k]);
  return (
    <View style={[styles.row, style]}>
      {parts.map((k) => (
        <CurrencyAmount
          key={k}
          kind={k}
          amount={grants[k] as number}
          size={size}
          tint={tint}
          textStyle={textStyle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
});
