import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { HeaderBar } from '../components/HeaderBar';
import { PnLText } from '../components/PnLText';
import { TokenAvatar } from '../components/TokenAvatar';
import type { MainTabParamList } from '../navigation/types';
import { usePaperTrading } from '../store/PaperTradingContext';
import { colors } from '../theme/colors';
import { formatSol, formatTokenAmount, timeAgo } from '../utils/format';

type Props = BottomTabScreenProps<MainTabParamList, 'Activity'>;

export function ActivityScreen(_props: Props) {
  const { portfolio } = usePaperTrading();

  return (
    <View style={styles.root}>
      <HeaderBar
        title="Activity"
        subtitle={`${portfolio.trades.length} simulated fills`}
        cashSol={portfolio.cashSol}
      />
      <FlatList
        data={portfolio.trades}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No fills yet</Text>
            <Text style={styles.emptyBody}>Your paper ticket tape shows up here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const buy = item.side === 'buy';
          return (
            <View style={styles.row}>
              <TokenAvatar uri={item.imageUrl} symbol={item.symbol} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  <Text style={{ color: buy ? colors.up : colors.down }}>
                    {buy ? 'BUY' : 'SELL'}
                  </Text>{' '}
                  {item.symbol}
                </Text>
                <Text style={styles.meta}>
                  {formatTokenAmount(item.amountToken)} · {timeAgo(item.timestamp)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.sol}>
                  {buy ? '−' : '+'}
                  {formatSol(item.amountSol)} SOL
                </Text>
                {item.side === 'sell' && item.realizedPnlSol != null ? (
                  <PnLText value={item.realizedPnlSol} style={styles.pnl} digits={3} />
                ) : (
                  <Text style={styles.fee}>fee {formatSol(item.feeSol, 4)}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 14 },
  meta: { color: colors.textMute, fontSize: 12, marginTop: 2 },
  sol: {
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontSize: 13,
  },
  fee: { color: colors.textMute, fontSize: 11, marginTop: 2 },
  pnl: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  empty: { padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptyBody: { color: colors.textMute },
});
