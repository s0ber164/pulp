import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  PortfolioState,
  Position,
  SLIPPAGE_BPS,
  STARTING_SOL,
  TRADE_FEE_BPS,
  Trade,
} from '../types/portfolio';
import type { TokenMarket } from '../types/market';

const STORAGE_KEY = 'pulp.paper.v1';

type QuotePreview = {
  side: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  feeSol: number;
  effectivePriceNative: number;
  impactBps: number;
};

type PaperTradingContextValue = {
  ready: boolean;
  portfolio: PortfolioState;
  buy: (token: TokenMarket, solSpend: number) => Trade;
  sell: (token: TokenMarket, tokenAmount: number) => Trade;
  previewBuy: (token: TokenMarket, solSpend: number) => QuotePreview;
  previewSell: (token: TokenMarket, tokenAmount: number) => QuotePreview;
  resetPortfolio: () => void;
  getPosition: (address: string) => Position | undefined;
};

const PaperTradingContext = createContext<PaperTradingContextValue | null>(null);

function freshPortfolio(): PortfolioState {
  const now = Date.now();
  return {
    cashSol: STARTING_SOL,
    startingSol: STARTING_SOL,
    positions: {},
    trades: [],
    createdAt: now,
    updatedAt: now,
  };
}

function applyImpact(price: number, side: 'buy' | 'sell'): number {
  const mult = SLIPPAGE_BPS / 10_000;
  return side === 'buy' ? price * (1 + mult) : price * (1 - mult);
}

export function PaperTradingProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = useState<PortfolioState>(freshPortfolio);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as PortfolioState;
          if (parsed?.cashSol != null && parsed.positions) setPortfolio(parsed);
        }
      } catch {
        // keep fresh
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)).catch(() => undefined);
  }, [portfolio, ready]);

  const previewBuy = useCallback((token: TokenMarket, solSpend: number): QuotePreview => {
    const spend = Math.max(0, solSpend);
    const feeSol = (spend * TRADE_FEE_BPS) / 10_000;
    const solAfterFee = Math.max(0, spend - feeSol);
    const px = applyImpact(Math.max(token.priceNative, 1e-18), 'buy');
    return {
      side: 'buy',
      tokenAmount: solAfterFee / px,
      solAmount: spend,
      feeSol,
      effectivePriceNative: px,
      impactBps: SLIPPAGE_BPS,
    };
  }, []);

  const previewSell = useCallback((token: TokenMarket, tokenAmount: number): QuotePreview => {
    const amount = Math.max(0, tokenAmount);
    const px = applyImpact(Math.max(token.priceNative, 1e-18), 'sell');
    const grossSol = amount * px;
    const feeSol = (grossSol * TRADE_FEE_BPS) / 10_000;
    return {
      side: 'sell',
      tokenAmount: amount,
      solAmount: Math.max(0, grossSol - feeSol),
      feeSol,
      effectivePriceNative: px,
      impactBps: SLIPPAGE_BPS,
    };
  }, []);

  const buy = useCallback(
    (token: TokenMarket, solSpend: number): Trade => {
      if (solSpend <= 0) throw new Error('Enter a SOL amount');
      if (solSpend > portfolio.cashSol + 1e-9) throw new Error('Insufficient paper SOL');
      if (!token.priceNative) throw new Error('No live price');
      const quote = previewBuy(token, solSpend);
      const trade: Trade = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        side: 'buy',
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        imageUrl: token.imageUrl,
        amountToken: quote.tokenAmount,
        amountSol: quote.solAmount,
        priceUsd: token.priceUsd,
        priceNative: quote.effectivePriceNative,
        feeSol: quote.feeSol,
        timestamp: Date.now(),
      };
      setPortfolio((prev) => {
        const existing = prev.positions[token.address];
        const nextAmount = (existing?.amount ?? 0) + quote.tokenAmount;
        const prevCost = (existing?.avgCostSol ?? 0) * (existing?.amount ?? 0);
        const avgCostSol = nextAmount > 0 ? (prevCost + quote.solAmount) / nextAmount : 0;
        const prevUsd = (existing?.avgCostUsd ?? 0) * (existing?.amount ?? 0);
        const avgCostUsd =
          nextAmount > 0 ? (prevUsd + quote.tokenAmount * token.priceUsd) / nextAmount : 0;
        return {
          ...prev,
          cashSol: prev.cashSol - quote.solAmount,
          positions: {
            ...prev.positions,
            [token.address]: {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              imageUrl: token.imageUrl || existing?.imageUrl,
              amount: nextAmount,
              avgCostSol,
              avgCostUsd,
            },
          },
          trades: [trade, ...prev.trades].slice(0, 200),
          updatedAt: Date.now(),
        };
      });
      return trade;
    },
    [portfolio.cashSol, previewBuy],
  );

  const sell = useCallback(
    (token: TokenMarket, tokenAmount: number): Trade => {
      const pos = portfolio.positions[token.address];
      if (!pos || pos.amount <= 0) throw new Error('No position');
      if (tokenAmount <= 0) throw new Error('Enter a token amount');
      if (tokenAmount > pos.amount + 1e-12) throw new Error('Not enough tokens');
      if (!token.priceNative) throw new Error('No live price');
      const quote = previewSell(token, tokenAmount);
      const realizedPnlSol = quote.solAmount - pos.avgCostSol * tokenAmount;
      const trade: Trade = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        side: 'sell',
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        imageUrl: token.imageUrl,
        amountToken: quote.tokenAmount,
        amountSol: quote.solAmount,
        priceUsd: token.priceUsd,
        priceNative: quote.effectivePriceNative,
        feeSol: quote.feeSol,
        realizedPnlSol,
        timestamp: Date.now(),
      };
      setPortfolio((prev) => {
        const current = prev.positions[token.address];
        if (!current) return prev;
        const remaining = current.amount - tokenAmount;
        const positions = { ...prev.positions };
        if (remaining <= 1e-12) delete positions[token.address];
        else positions[token.address] = { ...current, amount: remaining };
        return {
          ...prev,
          cashSol: prev.cashSol + quote.solAmount,
          positions,
          trades: [trade, ...prev.trades].slice(0, 200),
          updatedAt: Date.now(),
        };
      });
      return trade;
    },
    [portfolio.positions, previewSell],
  );

  const resetPortfolio = useCallback(() => setPortfolio(freshPortfolio()), []);
  const getPosition = useCallback(
    (address: string) => portfolio.positions[address],
    [portfolio.positions],
  );

  const value = useMemo(
    () => ({ ready, portfolio, buy, sell, previewBuy, previewSell, resetPortfolio, getPosition }),
    [ready, portfolio, buy, sell, previewBuy, previewSell, resetPortfolio, getPosition],
  );

  return <PaperTradingContext.Provider value={value}>{children}</PaperTradingContext.Provider>;
}

export function usePaperTrading(): PaperTradingContextValue {
  const ctx = useContext(PaperTradingContext);
  if (!ctx) throw new Error('usePaperTrading requires PaperTradingProvider');
  return ctx;
}

export function usePortfolioMark(
  prices: Record<string, { priceNative: number; priceUsd: number }>,
) {
  const { portfolio } = usePaperTrading();
  return useMemo(() => {
    let positionsValueSol = 0;
    let positionsValueUsd = 0;
    let costSol = 0;
    const marked = Object.values(portfolio.positions).map((p) => {
      const px = prices[p.address];
      const priceNative = px?.priceNative ?? p.avgCostSol;
      const priceUsd = px?.priceUsd ?? p.avgCostUsd;
      const valueSol = p.amount * priceNative;
      const valueUsd = p.amount * priceUsd;
      const pnlSol = valueSol - p.amount * p.avgCostSol;
      const pnlPct = p.avgCostSol > 0 ? (pnlSol / (p.amount * p.avgCostSol)) * 100 : 0;
      positionsValueSol += valueSol;
      positionsValueUsd += valueUsd;
      costSol += p.amount * p.avgCostSol;
      return { ...p, priceNative, priceUsd, valueSol, valueUsd, pnlSol, pnlPct };
    });
    const equitySol = portfolio.cashSol + positionsValueSol;
    const totalPnlSol = equitySol - portfolio.startingSol;
    const totalPnlPct = (totalPnlSol / portfolio.startingSol) * 100;
    const unrealizedSol = positionsValueSol - costSol;
    const realizedSol = portfolio.trades
      .filter((t) => t.side === 'sell')
      .reduce((sum, t) => sum + (t.realizedPnlSol ?? 0), 0);
    return {
      marked,
      equitySol,
      positionsValueSol,
      positionsValueUsd,
      totalPnlSol,
      totalPnlPct,
      unrealizedSol,
      realizedSol,
      cashSol: portfolio.cashSol,
    };
  }, [portfolio, prices]);
}
