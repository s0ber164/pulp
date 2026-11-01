import type { CandlePoint, TokenMarket } from '../types/market';

const BASE = 'https://api.dexscreener.com';
const WSOL = 'So11111111111111111111111111111111111111112';
const STABLES = new Set(['USDC', 'USDT', 'USD1', 'USDS', 'DAI', 'PYUSD']);
const SKIP_SYMBOLS = new Set([
  'SOL',
  'WSOL',
  'SOL-USDC',
  'SOL-USDT',
  'USDC-SOL',
  'USDT-SOL',
  'JITOSOL',
  'MSOL',
  'BSOL',
  'BNSOL',
  'INF',
  ...STABLES,
]);

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative?: string;
  priceUsd?: string;
  txns?: { h24?: { buys?: number; sells?: number } };
  volume?: { h24?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

function isMemeBase(pair: DexPair): boolean {
  const sym = (pair.baseToken?.symbol || '').toUpperCase();
  const name = (pair.baseToken?.name || '').toUpperCase();
  const addr = pair.baseToken?.address;
  if (!addr || addr === WSOL) return false;
  if (SKIP_SYMBOLS.has(sym)) return false;
  if (sym.includes('USDC') || sym.includes('USDT') || sym.includes('-SOL')) return false;
  if (name.includes('STAKED SOL') || name.includes('USD COIN')) return false;
  return true;
}

function toMarket(pair: DexPair): TokenMarket | null {
  if (pair.chainId !== 'solana') return null;
  if (!isMemeBase(pair)) return null;
  const priceUsd = Number(pair.priceUsd ?? 0);
  const priceNative = Number(pair.priceNative ?? 0);
  if (!pair.baseToken?.address || (!priceUsd && !priceNative)) return null;

  return {
    address: pair.baseToken.address,
    name: pair.baseToken.name || pair.baseToken.symbol,
    symbol: pair.baseToken.symbol || '???',
    imageUrl: pair.info?.imageUrl,
    priceUsd,
    priceNative,
    change5m: pair.priceChange?.m5 ?? 0,
    change1h: pair.priceChange?.h1 ?? 0,
    change6h: pair.priceChange?.h6 ?? 0,
    change24h: pair.priceChange?.h24 ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? pair.fdv ?? 0,
    fdv: pair.fdv ?? 0,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    url: pair.url,
    buys24h: pair.txns?.h24?.buys ?? 0,
    sells24h: pair.txns?.h24?.sells ?? 0,
    pairCreatedAt: pair.pairCreatedAt,
  };
}

function rankScore(t: TokenMarket): number {
  const liq = Math.max(t.liquidity, 1);
  const vol = Math.max(t.volume24h, 1);
  const ageBoost = t.pairCreatedAt && Date.now() - t.pairCreatedAt < 86_400_000 ? 1.35 : 1;
  return Math.log10(vol) * Math.log10(liq) * ageBoost + Math.abs(t.change1h) * 0.05;
}

function dedupeBest(tokens: TokenMarket[]): TokenMarket[] {
  const map = new Map<string, TokenMarket>();
  for (const t of tokens) {
    const prev = map.get(t.address);
    if (!prev || t.liquidity > prev.liquidity) map.set(t.address, t);
  }
  return Array.from(map.values());
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  return res.json() as Promise<T>;
}

type BoostOrProfile = {
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
};

async function fetchSolanaMintsFromFeed(path: string): Promise<string[]> {
  try {
    const data = await fetchJson<BoostOrProfile[]>(path);
    return (data ?? [])
      .filter((x) => x.chainId === 'solana' && x.tokenAddress)
      .map((x) => x.tokenAddress as string)
      .slice(0, 30);
  } catch {
    return [];
  }
}

async function fetchMarketsForMints(mints: string[]): Promise<TokenMarket[]> {
  if (!mints.length) return [];
  const chunk = mints.slice(0, 30).join(',');
  try {
    const data = await fetchJson<{ pairs?: DexPair[] }>(`/latest/dex/tokens/${chunk}`);
    return (data.pairs ?? [])
      .map(toMarket)
      .filter((t): t is TokenMarket => !!t && t.liquidity >= 1_500);
  } catch {
    return [];
  }
}

export async function fetchTrendingSolana(): Promise<TokenMarket[]> {
  const queries = ['SOL/USDC', 'pump', 'bonk', 'meme', 'wif', 'popcat'];
  const [boostMints, profileMints, ...batches] = await Promise.all([
    fetchSolanaMintsFromFeed('/token-boosts/top/v1'),
    fetchSolanaMintsFromFeed('/token-profiles/latest/v1'),
    ...queries.map(async (q) => {
      try {
        const data = await fetchJson<{ pairs?: DexPair[] }>(
          `/latest/dex/search?q=${encodeURIComponent(q)}`,
        );
        return (data.pairs ?? [])
          .map(toMarket)
          .filter((t): t is TokenMarket => !!t && t.liquidity >= 8_000 && t.volume24h >= 2_000);
      } catch {
        return [] as TokenMarket[];
      }
    }),
  ]);

  const feedMarkets = await fetchMarketsForMints(
    Array.from(new Set([...boostMints, ...profileMints])),
  );

  const merged = dedupeBest([...feedMarkets, ...batches.flat()]);
  return merged.sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 60);
}

export async function fetchTokenByAddress(address: string): Promise<TokenMarket | null> {
  const data = await fetchJson<DexPair[] | { pairs?: DexPair[] }>(
    `/token-pairs/v1/solana/${address}`,
  );
  const pairs = Array.isArray(data) ? data : data.pairs ?? [];
  const markets = pairs.map(toMarket).filter((t): t is TokenMarket => !!t);
  if (!markets.length) {
    const fallback = await fetchJson<{ pairs?: DexPair[] }>(`/latest/dex/tokens/${address}`);
    const fb = (fallback.pairs ?? []).map(toMarket).filter((t): t is TokenMarket => !!t);
    return dedupeBest(fb).sort((a, b) => b.liquidity - a.liquidity)[0] ?? null;
  }
  return markets.sort((a, b) => b.liquidity - a.liquidity)[0] ?? null;
}

export async function searchTokens(query: string): Promise<TokenMarket[]> {
  if (!query.trim()) return [];
  const data = await fetchJson<{ pairs?: DexPair[] }>(
    `/latest/dex/search?q=${encodeURIComponent(query.trim())}`,
  );
  return dedupeBest(
    (data.pairs ?? [])
      .map(toMarket)
      .filter((t): t is TokenMarket => !!t && t.liquidity > 1_000),
  )
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 30);
}

export function synthesizeSparkline(token: TokenMarket, points = 28): CandlePoint[] {
  const now = Date.now();
  let price = Math.max(token.priceUsd, 1e-12);
  const series: CandlePoint[] = [{ t: now, v: price }];
  const segments = [
    { n: 8, pct: token.change5m },
    { n: 8, pct: token.change1h - token.change5m },
    { n: 6, pct: token.change6h - token.change1h },
    { n: 6, pct: token.change24h - token.change6h },
  ];

  let cursor = now;
  for (const seg of segments) {
    const step = seg.pct / Math.max(seg.n, 1);
    for (let i = 0; i < seg.n; i++) {
      cursor -= 5 * 60_000;
      price = price / (1 + step / 100);
      series.unshift({ t: cursor, v: Math.max(price, 1e-18) });
    }
  }

  const seeded = token.address.charCodeAt(0) + token.address.charCodeAt(4);
  return series.slice(-points).map((p, i) => {
    const wobble = 1 + (((seeded * (i + 3)) % 17) - 8) * 0.0015;
    return { t: p.t, v: p.v * wobble };
  });
}

export function sparklineFromChanges(token: TokenMarket): number[] {
  return synthesizeSparkline(token).map((p) => p.v);
}
