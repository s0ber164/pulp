import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TokenMarket } from '../types/market';
import { colors } from '../theme/colors';
import { formatPct, formatUsd } from '../utils/format';
import { sparklineFromChanges } from '../api/dexscreener';
import { Sparkline } from './Sparkline';
import { TokenAvatar } from './TokenAvatar';

type Props = {
  token: TokenMarket;
  onPress: () => void;
};

export function TokenRow({ token, onPress }: Props) {
  const up = token.change1h >= 0;
  const spark = sparklineFromChanges(token);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <TokenAvatar uri={token.imageUrl} symbol={token.symbol} size={42} />
      <View style={styles.meta}>
        <Text style={styles.symbol} numberOfLines={1}>
          {token.symbol}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {token.name}
        </Text>
      </View>
      <Sparkline data={spark} width={64} height={26} positive={up} />
      <View style={styles.right}>
        <Text style={styles.price}>{formatUsd(token.priceUsd)}</Text>
        <Text style={[styles.chg, { color: up ? colors.up : colors.down }]}>
          {formatPct(token.change1h)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pressed: { backgroundColor: colors.bgPanel },
  meta: { flex: 1, minWidth: 0 },
  symbol: { color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  name: { color: colors.textMute, fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', minWidth: 78 },
  price: {
    color: colors.text,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  chg: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'], fontWeight: '600' },
});
