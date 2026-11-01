let cached: { usd: number; at: number } | null = null;

export async function fetchSolUsd(): Promise<number> {
  if (cached && Date.now() - cached.at < 30_000) return cached.usd;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    );
    if (res.ok) {
      const json = (await res.json()) as { solana?: { usd?: number } };
      const usd = json.solana?.usd;
      if (usd) {
        cached = { usd, at: Date.now() };
        return usd;
      }
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
    );
    if (res.ok) {
      const json = (await res.json()) as { pairs?: Array<{ priceUsd?: string }> };
      const usd = Number(json.pairs?.[0]?.priceUsd ?? 0);
      if (usd) {
        cached = { usd, at: Date.now() };
        return usd;
      }
    }
  } catch {
    // fall through
  }

  return cached?.usd ?? 150;
}
