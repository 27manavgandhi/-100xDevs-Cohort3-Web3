// Lecture Code - 1_wagmi_config_and_providers.tsx
// Topic: Wagmi + Viem + TanStack setup — config, providers, chains, connectors
// Day 11.1 - Wallets in ETH, Wallet Adapter, Wagmi, TanStack & Viem
//
// npm install wagmi viem@2.x @tanstack/react-query

// ── wagmi.config.ts ───────────────────────────────────────────────────────────
// This is the central config for your entire Ethereum app.
// It defines:
//   - Which chains you support (mainnet, sepolia, etc.)
//   - Which wallet connectors (MetaMask, Coinbase, WalletConnect)
//   - Which transport (how you talk to the blockchain — HTTP RPC)

import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  // Chains this app supports
  chains: [mainnet, sepolia, polygon],

  // Wallet connectors — each one adds a "Connect with X" option
  connectors: [
    injected(),           // Any browser-injected wallet (MetaMask, Brave Wallet, etc.)
    metaMask(),           // MetaMask specifically (with deeplink support)
    coinbaseWallet({      // Coinbase Wallet
      appName: 'My ETH DApp',
    }),
  ],

  // How to communicate with each chain's RPC
  // http() = use public RPC (slow). Pass your own URL for production:
  //   http('https://mainnet.infura.io/v3/YOUR_KEY')
  transports: {
    [mainnet.id]:  http(),
    [sepolia.id]:  http(),
    [polygon.id]:  http(),
  },
})

// ── main.tsx — Provider tree ──────────────────────────────────────────────────
// The provider order matters:
// 1. WagmiProvider     → provides wallet state to entire app
// 2. QueryClientProvider → provides TanStack Query cache to entire app
// Wagmi uses TanStack Query internally for caching balances, block data, etc.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

// TanStack Query client — manages caching, background refetching
// staleTime: how long until data is considered stale and refetched
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* WagmiProvider: inject config, makes all wagmi hooks available */}
    <WagmiProvider config={config}>
      {/* QueryClientProvider: TanStack Query for caching + background updates */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)

/*
WHY THIS STACK?

TanStack Query handles:
  - Caching wallet/balance/contract data
  - Background refetching when window regains focus
  - Deduplicating identical requests
  - Loading/error/success states automatically

Viem handles:
  - Low-level Ethereum JSON-RPC calls
  - ABI encoding/decoding
  - Transaction building and signing
  - TypeScript types for everything

Wagmi handles:
  - React hooks over Viem (useAccount, useBalance, useSendTransaction...)
  - Wallet connection lifecycle (connect, disconnect, auto-reconnect)
  - Multi-wallet support via connectors
  - Chain switching

You write:
  const { address } = useAccount()
  → Wagmi calls Viem → Viem calls RPC → TanStack caches the result
  → React re-renders with the data
*/
