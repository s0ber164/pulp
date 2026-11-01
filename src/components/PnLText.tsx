import { Text, TextStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';
import { formatPct, formatSol } from '../utils/format';

type Props = {
  value: number;
  kind?: 'sol' | 'pct' | 'raw';
  style?: StyleProp<TextStyle>;
  digits?: number;
  prefix?: string;
};

export function PnLText({ value, kind = 'sol', style, digits = 4, prefix = '' }: Props) {
  const color = value > 0 ? colors.up : value < 0 ? colors.down : colors.textDim;
  let label = '';
  if (kind === 'pct') label = formatPct(value);
  else if (kind === 'sol') label = `${value >= 0 ? '+' : ''}${formatSol(value, digits)} SOL`;
  else label = String(value);

  return (
    <Text style={[{ color, fontVariant: ['tabular-nums'] }, style]}>
      {prefix}
      {label}
    </Text>
  );
}
