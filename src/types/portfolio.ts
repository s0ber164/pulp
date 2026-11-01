export type Position = {
  address: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  amount: number;
  avgCostSol: number;
  avgCostUsd: number;
};

export type TradeSide = 'buy' | 'sell';

export type Trade = {
  id: string;
  side: TradeSide;
  address: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  amountToken: number;
  amountSol: number;
  priceUsd: number;
  priceNative: number;
  feeSol: number;
  realizedPnlSol?: number;
  timestamp: number;
};

export type PortfolioState = {
  cashSol: number;
  startingSol: number;
  positions: Record<string, Position>;
  trades: Trade[];
  createdAt: number;
  updatedAt: number;
};

export const STARTING_SOL = 100;
export const TRADE_FEE_BPS = 50;
export const SLIPPAGE_BPS = 30;
