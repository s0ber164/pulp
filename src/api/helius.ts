import type { HeliusAsset } from '../types/market';

export function getHeliusApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_HELIUS_API_KEY;
  return key && key.length > 8 ? key : undefined;
}

export function getHeliusRpcUrl(): string {
  const key = getHeliusApiKey();
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`;
  return 'https://api.mainnet-beta.solana.com';
}

export async function fetchHeliusAsset(mint: string): Promise<HeliusAsset | null> {
  const key = getHeliusApiKey();
  if (!key) return null;

  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'pulp-asset',
        method: 'getAsset',
        params: { id: mint },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: HeliusAsset };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export function heliusConfigured(): boolean {
  return !!getHeliusApiKey();
}
