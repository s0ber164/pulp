# Pulp — Solana meme paper terminal

iPhone-first Expo app for **paper trading Solana meme coins** with **live market data**. Feels like a real terminal. No real money, no on-chain transactions.

## Features

- Live Solana tape from [DexScreener](https://dexscreener.com) (hot / gainers / new + search)
- Optional [Helius](https://helius.dev) DAS metadata via `EXPO_PUBLIC_HELIUS_API_KEY`
- Paper wallet starting at **100 SOL**
- Simulated fills with fee (0.50%) + slippage (0.30%)
- Marked-to-market portfolio, positions, and fill history (AsyncStorage)

## Run on iPhone (Expo Go)

```bash
npm install
cp .env.example .env   # add your Helius key if you have one
npx expo start
```

Scan the QR with **Expo Go**, or use tunnel mode from another network:

```bash
npx expo start --tunnel ngrok
```

## Stack

Expo SDK 58 · React Native · React Navigation · AsyncStorage · DexScreener · Helius RPC/DAS
