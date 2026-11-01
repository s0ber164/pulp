import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { formatSol } from '../utils/format';
import { heliusConfigured } from '../api/helius';

type Props = {
  title: string;
  subtitle?: string;
  cashSol?: number;
  right?: React.ReactNode;
};

export function HeaderBar({ title, subtitle, cashSol, right }: Props) {
  const insets = useSafeAreaInsets();
  const live = heliusConfigured();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>PULP</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightCol}>
          {right}
          {typeof cashSol === 'number' ? (
            <View style={styles.cash}>
              <Text style={styles.cashLabel}>PAPER</Text>
              <Text style={styles.cashValue}>{formatSol(cashSol, 2)} SOL</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.strip}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <Text style={styles.stripText}>PAPER MODE · NO REAL FUNDS</Text>
        <Text style={styles.stripSep}>·</Text>
        <Text style={[styles.stripText, { color: live ? colors.accent : colors.textMute }]}>
          {live ? 'HELIUS ON' : 'DEXSCREENER'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: fonts.monoBold,
    letterSpacing: 3,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontFamily: fonts.sansBold,
    letterSpacing: -0.5,
  },
  sub: { color: colors.textDim, fontSize: 13, fontFamily: fonts.sans, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  cash: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  cashLabel: {
    color: colors.textMute,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cashValue: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stripText: {
    color: colors.textMute,
    fontSize: 10,
    fontFamily: fonts.monoBold,
    letterSpacing: 0.8,
  },
  stripSep: { color: colors.lineStrong },
});
