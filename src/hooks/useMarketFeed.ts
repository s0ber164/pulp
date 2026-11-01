import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTokenByAddress, fetchTrendingSolana, searchTokens } from '../api/dexscreener';
import { fetchSolUsd } from '../api/solPrice';
import type { TokenMarket } from '../types/market';

export function useMarketFeed(pollMs = 20_000) {
  const [tokens, setTokens] = useState<TokenMarket[]>([]);
  const [solUsd, setSolUsd] = useState(150);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [list, sol] = await Promise.all([fetchTrendingSolana(), fetchSolUsd()]);
      if (!mounted.current) return;
      const normalized = list.map((t) => ({
        ...t,
        priceNative: sol > 0 && t.priceUsd > 0 ? t.priceUsd / sol : t.priceNative,
      }));
      setTokens(normalized);
      setSolUsd(sol);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : 'Feed failed');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { tokens, solUsd, loading, error, updatedAt, refresh };
}

export function useTokenDetail(address: string) {
  const [token, setToken] = useState<TokenMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [t, sol] = await Promise.all([fetchTokenByAddress(address), fetchSolUsd()]);
      if (t && sol > 0 && t.priceUsd > 0) t.priceNative = t.priceUsd / sol;
      setToken(t);
      setError(t ? null : 'Token not found');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(refresh, 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { token, loading, error, refresh };
}

export function useTokenSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TokenMarket[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchTokens(query);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return { query, setQuery, results, searching };
}
