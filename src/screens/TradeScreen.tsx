import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TokenAvatar } from '../components/TokenAvatar';
import { useTokenDetail } from '../hooks/useMarketFeed';
import type { RootStackParamList } from '../navigation/types';
import { usePaperTrading } from '../store/PaperTradingContext';
import { colors } from '../theme/colors';
import { SLIPPAGE_BPS, TRADE_FEE_BPS } from '../types/portfolio';
import { formatSol, formatTokenAmount, formatUsd } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Trade'>;
type Side = 'buy' | 'sell';

export function TradeScreen({ navigation, route }: Props) {
  const { address } = route.params;
  const insets = useSafeAreaInsets();
  const { token, loading } = useTokenDetail(address);
  const { portfolio, buy, sell, previewBuy, previewSell, getPosition } = usePaperTrading();
  const position = getPosition(address);
  const [side, setSide] = useState<Side>('buy');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const numeric = Number(amount) || 0;

  const quote = useMemo(() => {
    if (!token || numeric <= 0) return null;
    return side === 'buy' ? previewBuy(token, numeric) : previewSell(token, numeric);
  }, [token, numeric, side, previewBuy, previewSell]);

  const setPct = (pct: number) => {
    if (!token) return;
    if (side === 'buy') setAmount((portfolio.cashSol * pct).toFixed(4));
    else if (position) setAmount((position.amount * pct).toFixed(6));
  };

  const submit = () => {
    if (!token || !quote) return;
    try {
      setBusy(true);
      if (side === 'buy') {
        const t = buy(token, numeric);
        setFlash(`Filled BUY ${formatTokenAmount(t.amountToken)} ${token.symbol}`);
      } else {
        const t = sell(token, numeric);
        setFlash(
          `Filled SELL ${formatTokenAmount(t.amountToken)} ${token.symbol} · ${formatSol(t.amountSol)} SOL`,
        );
      }
      setAmount('');
    } catch (e) {
      Alert.alert('Order rejected', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.navLink}>← Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>PAPER TICKET</Text>
        <View style={{ width: 48 }} />
      </View>

      {!token || loading ? (
        <View style={styles.center}>
          <Text style={styles.mute}>Loading live quote…</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.tokenHead}>
            <TokenAvatar uri={token.imageUrl} symbol={token.symbol} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sym}>{token.symbol}</Text>
              <Text style={styles.px}>
                {formatUsd(token.priceUsd)} · {formatSol(token.priceNative, 8)} SOL
              </Text>
            </View>
          </View>

          <View style={styles.sideRow}>
            {(['buy', 'sell'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setSide(s);
                  setAmount('');
                  setFlash(null);
                }}
                style={[
                  styles.sideBtn,
                  side === s && (s === 'buy' ? styles.buyActive : styles.sellActive),
                ]}
              >
                <Text
                  style={[
                    styles.sideText,
                    side === s && { color: s === 'buy' ? colors.bg : colors.text },
                  ]}
                >
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>
            {side === 'buy' ? 'SOL TO SPEND' : `${token.symbol} TO SELL`}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMute}
            style={styles.input}
          />

          <View style={styles.pctRow}>
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <Pressable key={p} onPress={() => setPct(p)} style={styles.pct}>
                <Text style={styles.pctText}>{p === 1 ? 'MAX' : `${p * 100}%`}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.balances}>
            <Text style={styles.bal}>Cash {formatSol(portfolio.cashSol)} SOL</Text>
            <Text style={styles.bal}>
              Bag {position ? formatTokenAmount(position.amount) : '0'} {token.symbol}
            </Text>
          </View>

          {quote ? (
            <View style={styles.quote}>
              <Row
                k="You get"
                v={
                  side === 'buy'
                    ? `${formatTokenAmount(quote.tokenAmount)} ${token.symbol}`
                    : `${formatSol(quote.solAmount)} SOL`
                }
              />
              <Row k="Fee" v={`${formatSol(quote.feeSol)} SOL (${TRADE_FEE_BPS / 100}%)`} />
              <Row k="Impact" v={`${(SLIPPAGE_BPS / 100).toFixed(2)}% sim`} />
              <Row k="Exec px" v={`${formatSol(quote.effectivePriceNative, 8)} SOL`} />
            </View>
          ) : null}

          {flash ? <Text style={styles.flash}>{flash}</Text> : null}

          <Pressable
            disabled={busy || !quote}
            onPress={submit}
            style={[
              styles.submit,
              side === 'sell' && styles.submitSell,
              (!quote || busy) && styles.submitDisabled,
            ]}
          >
            <Text style={[styles.submitText, side === 'sell' && { color: colors.text }]}>
              {busy ? 'FILLING…' : `SIMULATE ${side.toUpperCase()}`}
            </Text>
          </Pressable>

          <Text style={styles.note}>
            Paper fill at live DexScreener mark + fee/slippage model. Nothing hits the chain.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.qRow}>
      <Text style={styles.qk}>{k}</Text>
      <Text style={styles.qv}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  navLink: { color: colors.accent, fontWeight: '700' },
  navTitle: { color: colors.text, fontWeight: '800', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mute: { color: colors.textMute },
  body: { padding: 16, gap: 12, flex: 1 },
  tokenHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  sym: { color: colors.text, fontSize: 20, fontWeight: '800' },
  px: { color: colors.textDim, marginTop: 2, fontVariant: ['tabular-nums'] },
  sideRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sideBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
  },
  buyActive: { backgroundColor: colors.up, borderColor: colors.up },
  sellActive: { backgroundColor: colors.down, borderColor: colors.down },
  sideText: { color: colors.textDim, fontWeight: '900', letterSpacing: 1 },
  label: {
    color: colors.textMute,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 12,
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontVariant: ['tabular-nums'],
  },
  pctRow: { flexDirection: 'row', gap: 8 },
  pct: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pctText: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
  balances: { flexDirection: 'row', justifyContent: 'space-between' },
  bal: { color: colors.textMute, fontSize: 12 },
  quote: {
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 8,
  },
  qRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qk: { color: colors.textMute, fontSize: 12 },
  qv: { color: colors.text, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  flash: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  submit: {
    backgroundColor: colors.up,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  submitSell: { backgroundColor: colors.down },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: colors.bg, fontWeight: '900', letterSpacing: 1 },
  note: { color: colors.textMute, fontSize: 11, lineHeight: 15 },
});
