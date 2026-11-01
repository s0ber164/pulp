import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { synthesizeSparkline } from '../api/dexscreener';
import { fetchHeliusAsset, heliusConfigured } from '../api/helius';
import { Sparkline } from '../components/Sparkline';
import { StatBlock } from '../components/StatBlock';
import { TokenAvatar } from '../components/TokenAvatar';
import { useTokenDetail } from '../hooks/useMarketFeed';
import type { RootStackParamList } from '../navigation/types';
import { usePaperTrading } from '../store/PaperTradingContext';
import { colors } from '../theme/colors';
import {
  formatAge,
  formatPct,
  formatSol,
  formatTokenAmount,
  formatUsd,
  shortAddress,
} from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Token'>;

export function TokenScreen({ navigation, route }: Props) {
  const { address } = route.params;
  const insets = useSafeAreaInsets();
  const { token, loading, error } = useTokenDetail(address);
  const { getPosition } = usePaperTrading();
  const position = getPosition(address);
  const [heliusName, setHeliusName] = useState<string | null>(null);

  useEffect(() => {
    if (!heliusConfigured()) return;
    fetchHeliusAsset(address).then((asset) => {
      const name = asset?.content?.metadata?.name || asset?.token_info?.symbol;
      if (name) setHeliusName(name);
    });
  }, [address]);

  const spark = useMemo(
    () => (token ? synthesizeSparkline(token, 40).map((p) => p.v) : []),
    [token],
  );

  if (loading && !token) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.error}>{error || 'Token unavailable'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const up = token.change1h >= 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.navLink}>← Tape</Text>
        </Pressable>
        <Text style={styles.navTitle}>{token.symbol}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <TokenAvatar uri={token.imageUrl} symbol={token.symbol} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.symbol}>{token.symbol}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {heliusName || token.name}
            </Text>
            <Text style={styles.mint}>{shortAddress(token.address, 6)}</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.price}>{formatUsd(token.priceUsd)}</Text>
            <Text style={[styles.chg, { color: up ? colors.up : colors.down }]}>
              {formatPct(token.change1h)} 1h
            </Text>
          </View>
        </View>

        <View style={styles.chart}>
          <Sparkline data={spark} width={340} height={88} positive={up} />
          <Text style={styles.chartNote}>Reconstructed from live % moves · not OHLC</Text>
        </View>

        <View style={styles.stats}>
          <StatBlock label="MCAP" value={formatUsd(token.marketCap, true)} />
          <StatBlock label="LIQ" value={formatUsd(token.liquidity, true)} />
          <StatBlock label="VOL 24H" value={formatUsd(token.volume24h, true)} />
          <StatBlock
            label="5M"
            value={formatPct(token.change5m)}
            tone={token.change5m >= 0 ? 'up' : 'down'}
          />
          <StatBlock
            label="24H"
            value={formatPct(token.change24h)}
            tone={token.change24h >= 0 ? 'up' : 'down'}
          />
          <StatBlock label="AGE" value={formatAge(token.pairCreatedAt)} />
          <StatBlock label="BUYS" value={String(token.buys24h)} tone="up" />
          <StatBlock label="SELLS" value={String(token.sells24h)} tone="down" />
          <StatBlock label="DEX" value={token.dexId.toUpperCase()} />
        </View>

        {position ? (
          <View style={styles.pos}>
            <Text style={styles.posLabel}>YOUR PAPER POSITION</Text>
            <Text style={styles.posValue}>
              {formatTokenAmount(position.amount)} {token.symbol}
            </Text>
            <Text style={styles.posMeta}>
              Avg {formatSol(position.avgCostSol)} SOL · Mark{' '}
              {formatSol(position.amount * token.priceNative)} SOL
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.tradeCta}
          onPress={() =>
            navigation.navigate('Trade', { address: token.address, symbol: token.symbol })
          }
        >
          <Text style={styles.tradeCtaText}>OPEN PAPER TICKET</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Simulated fills only. Prices from DexScreener
          {heliusConfigured() ? ' · metadata via Helius' : ''}. No on-chain txs.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  navLink: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  navTitle: { color: colors.text, fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  symbol: { color: colors.text, fontSize: 22, fontWeight: '800' },
  name: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  mint: { color: colors.textMute, fontSize: 11, marginTop: 4, fontVariant: ['tabular-nums'] },
  heroRight: { alignItems: 'flex-end' },
  price: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chg: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  chart: {
    backgroundColor: colors.bgPanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartNote: { color: colors.textMute, fontSize: 10, marginTop: 8, letterSpacing: 0.4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pos: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentDim,
    padding: 14,
  },
  posLabel: { color: colors.accentDim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  posValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  posMeta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  tradeCta: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tradeCtaText: { color: colors.bg, fontWeight: '900', letterSpacing: 1.2, fontSize: 14 },
  disclaimer: { color: colors.textMute, fontSize: 11, lineHeight: 16 },
  error: { color: colors.down },
  backBtn: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: { color: colors.text },
});
