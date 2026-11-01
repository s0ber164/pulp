export type TokenMarket = {
  address: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  priceUsd: number;
  priceNative: number;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  pairAddress: string;
  dexId: string;
  url: string;
  buys24h: number;
  sells24h: number;
  pairCreatedAt?: number;
};

export type CandlePoint = {
  t: number;
  v: number;
};

export type HeliusAsset = {
  id: string;
  content?: {
    json_uri?: string;
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
    };
    links?: {
      image?: string;
    };
    files?: Array<{ uri?: string; cdn_uri?: string }>;
  };
  token_info?: {
    symbol?: string;
    supply?: number;
    decimals?: number;
    price_info?: {
      price_per_token?: number;
      currency?: string;
    };
  };
};
