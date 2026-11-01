import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeaderBar } from '../components/HeaderBar';
import { TokenRow } from '../components/TokenRow';
import { useMarketFeed, useTokenSearch } from '../hooks/useMarketFeed';
import { usePaperTrading } from '../store/PaperTradingContext';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { timeAgo } from '../utils/format';

type Props = BottomTabScreenProps<MainTabParamList, 'Discover'>;
type Tab = 'hot' | 'gainers' | 'new';

export function DiscoverScreen(_props: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { portfolio } = usePaperTrading();
  const { tokens, loading, error, refresh, updatedAt } = useMarketFeed();
  const { query, setQuery, results, searching } = useTokenSearch();
  const [tab, setTab] = useState<Tab>('hot');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (tab === 'gainers') return [...tokens].sort((a, b) => b.change1h - a.change1h);
    if (tab === 'new') {
      return [...tokens].sort((a, b) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0));
    }
    return tokens;
  }, [tokens, tab]);

  const data = query.trim() ? results : filtered;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      <HeaderBar
        title="Terminal"
        subtitle={updatedAt ? `Live · ${timeAgo(updatedAt)}` : 'Solana meme tape'}
        cashSol={portfolio.cashSol}
      />

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search mint, ticker, or name"
          placeholderTextColor={colors.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
      </View>

      {!query.trim() ? (
        <View style={styles.tabs}>
          {(
            [
              ['hot', 'HOT'],
              ['gainers', 'GAINERS'],
              ['new', 'NEW'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading && !tokens.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.hint}>Pulling Solana pairs…</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.address}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            error ? (
              <Text style={styles.error}>{error}</Text>
            ) : searching ? (
              <Text style={styles.hintPad}>Searching…</Text>
            ) : (
              <View />
            )
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.hint}>No pairs matched.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TokenRow
              token={item}
              onPress={() =>
                navigation.navigate('Token', { address: item.address, symbol: item.symbol })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
  tabText: { color: colors.textMute, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tabTextActive: { color: colors.accent },
  center: { padding: 40, alignItems: 'center', gap: 10 },
  hint: { color: colors.textMute, fontSize: 13 },
  hintPad: { color: colors.textMute, fontSize: 12, padding: 12 },
  error: { color: colors.down, padding: 12, fontSize: 12 },
});
