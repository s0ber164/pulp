import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchTokenByAddress } from '../api/dexscreener';
import { HeaderBar } from '../components/HeaderBar';
import { PnLText } from '../components/PnLText';
import { StatBlock } from '../components/StatBlock';
import { TokenAvatar } from '../components/TokenAvatar';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { usePaperTrading, usePortfolioMark } from '../store/PaperTradingContext';
import { colors } from '../theme/colors';
import { formatSol, formatTokenAmount, formatUsd } from '../utils/format';
import { fetchSolUsd } from '../api/solPrice';

type Props = BottomTabScreenProps<MainTabParamList, 'Portfolio'>;

export function PortfolioScreen(_props: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { portfolio, resetPortfolio } = usePaperTrading();
  const [prices, setPrices] = useState<
    Record<string, { priceNative: number; priceUsd: number }>
  >({});

  const addresses = useMemo(() => Object.keys(portfolio.positions), [portfolio.positions]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sol = await fetchSolUsd();
      const entries = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const t = await fetchTokenByAddress(addr);
            if (!t) return null;
            const priceNative = sol > 0 && t.priceUsd > 0 ? t.priceUsd / sol : t.priceNative;
            return [addr, { priceNative, priceUsd: t.priceUsd }] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, { priceNative: number; priceUsd: number }> = {};
      for (const e of entries) if (e) next[e[0]] = e[1];
      setPrices(next);
    };
    if (addresses.length) load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [addresses]);

  const mark = usePortfolioMark(prices);

  const confirmReset = () => {
    Alert.alert('Reset paper account?', `Back to ${portfolio.startingSol} SOL. Trades wiped.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetPortfolio },
    ]);
  };

  return (
    <View style={styles.root}>
      <HeaderBar title="Portfolio" subtitle="Marked to live Solana prices" cashSol={mark.cashSol} />

      <View style={styles.summary}>
        <Text style={styles.equityLabel}>EQUITY</Text>
        <Text style={styles.equity}>{formatSol(mark.equitySol, 3)} SOL</Text>
        <PnLText value={mark.totalPnlSol} style={styles.pnl} />
        <PnLText value={mark.totalPnlPct} kind="pct" style={styles.pnlPct} />
      </View>

      <View style={styles.stats}>
        <StatBlock label="CASH" value={`${formatSol(mark.cashSol, 2)} SOL`} tone="accent" />
        <StatBlock
          label="UNREALIZED"
          value={`${mark.unrealizedSol >= 0 ? '+' : ''}${formatSol(mark.unrealizedSol)}`}
          tone={mark.unrealizedSol >= 0 ? 'up' : 'down'}
        />
        <StatBlock
          label="REALIZED"
          value={`${mark.realizedSol >= 0 ? '+' : ''}${formatSol(mark.realizedSol)}`}
          tone={mark.realizedSol >= 0 ? 'up' : 'down'}
        />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>POSITIONS</Text>
        <Pressable onPress={confirmReset}>
          <Text style={styles.reset}>RESET</Text>
        </Pressable>
      </View>

      <FlatList
        data={mark.marked}
        keyExtractor={(item) => item.address}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No open bags</Text>
            <Text style={styles.emptyBody}>Hit the tape and paper-buy a Solana meme.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('Token', { address: item.address, symbol: item.symbol })
            }
          >
            <TokenAvatar uri={item.imageUrl} symbol={item.symbol} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sym}>{item.symbol}</Text>
              <Text style={styles.meta}>
                {formatTokenAmount(item.amount)} · {formatUsd(item.valueUsd)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.val}>{formatSol(item.valueSol)} SOL</Text>
              <PnLText value={item.pnlPct} kind="pct" style={styles.rowPnl} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  summary: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  equityLabel: {
    color: colors.textMute,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  equity: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  pnl: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  pnlPct: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: colors.textMute,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  reset: { color: colors.down, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  sym: { color: colors.text, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.textMute, fontSize: 12, marginTop: 2 },
  val: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowPnl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  empty: { padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptyBody: { color: colors.textMute, textAlign: 'center' },
});
