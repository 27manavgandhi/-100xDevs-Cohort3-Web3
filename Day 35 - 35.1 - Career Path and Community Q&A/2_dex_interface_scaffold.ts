// Project Starter - DEX Interface (Uniswap/Jupiter Clone)
// Day 35.1 - Career Path Planning
//
// Build a beautiful DEX interface with swap functionality
//
// Difficulty: Intermediate
// Time: 2-3 weeks
// Impact: High (employers love DEX projects)

/*
═══════════════════════════════════════════════════════════════════════════════
PROJECT OVERVIEW
═══════════════════════════════════════════════════════════════════════════════

Name: SwapHub - Multi-Chain DEX Interface
Description: Swap tokens across Ethereum and Solana with best prices
Tech Stack:
  - Frontend: Next.js, TypeScript, Tailwind, Framer Motion
  - Web3: Ethers.js, @solana/web3.js, Uniswap SDK, Jupiter API
  - State: Zustand
  - UI: Headless UI, Heroicons

Features:
  ✅ Token swapping on Ethereum (via Uniswap)
  ✅ Token swapping on Solana (via Jupiter)
  ✅ Price quotes with routing
  ✅ Slippage protection
  ✅ Transaction history
  ✅ Price charts
  ✅ Wallet connection
  ✅ Multi-chain support

Why This Project?
  1. DEX interfaces are complex - shows advanced skills
  2. Combines frontend + multiple Web3 integrations
  3. Very relevant for DeFi jobs
  4. Can be monetized (add small fee)
  5. Great talking point in interviews
*/

/*
═══════════════════════════════════════════════════════════════════════════════
WEEK-BY-WEEK PLAN
═══════════════════════════════════════════════════════════════════════════════

Week 1: Setup & Wallet Integration
  - Day 1-2: Project setup, design system
  - Day 3-4: Wallet connection (MetaMask, Phantom)
  - Day 5-7: Token selection component

Week 2: Ethereum Swaps
  - Day 1-3: Uniswap SDK integration
  - Day 4-5: Quote fetching
  - Day 6-7: Swap execution

Week 3: Solana Swaps & Polish
  - Day 1-3: Jupiter integration
  - Day 4-5: Transaction history
  - Day 6-7: Charts, animations, deploy

*/

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 1: WALLET CONNECTION
═══════════════════════════════════════════════════════════════════════════════
*/

// Install dependencies
// npm install @rainbow-me/rainbowkit wagmi viem @solana/wallet-adapter-react

// src/components/WalletConnect.tsx

'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletConnect() {
  // TODO: Implement
  // 1. Show chain selector (Ethereum / Solana)
  // 2. Show appropriate wallet button based on chain
  // 3. Handle wallet connection state
  
  return (
    <div className="flex gap-4">
      {/* Ethereum wallet */}
      <ConnectButton />
      
      {/* Solana wallet */}
      <WalletMultiButton />
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 2: TOKEN SELECTION
═══════════════════════════════════════════════════════════════════════════════
*/

// src/components/TokenSelector.tsx

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

export function TokenSelector({
  selectedToken,
  onSelect,
  chain
}: {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  chain: 'ethereum' | 'solana';
}) {
  // TODO: Implement
  // 1. Modal with token list
  // 2. Search functionality
  // 3. Popular tokens section
  // 4. Custom token import
  
  // Token lists:
  // Ethereum: https://tokens.uniswap.org/
  // Solana: https://token.jup.ag/all
  
  return (
    <button className="flex items-center gap-2">
      {selectedToken ? (
        <>
          <img src={selectedToken.logoURI} className="w-6 h-6 rounded-full" />
          <span>{selectedToken.symbol}</span>
        </>
      ) : (
        <span>Select Token</span>
      )}
    </button>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 3: SWAP INTERFACE
═══════════════════════════════════════════════════════════════════════════════
*/

// src/components/SwapCard.tsx

export function SwapCard() {
  // TODO: Implement
  // State:
  // - inputToken, outputToken
  // - inputAmount, outputAmount
  // - slippage
  // - loading states
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      {/* Input Token */}
      <div className="space-y-2">
        <label className="text-sm text-gray-500">You Pay</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            placeholder="0.0"
            className="flex-1 text-3xl bg-transparent"
          />
          <TokenSelector />
        </div>
      </div>
      
      {/* Swap Direction Button */}
      <div className="flex justify-center my-4">
        <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          ↓
        </button>
      </div>
      
      {/* Output Token */}
      <div className="space-y-2">
        <label className="text-sm text-gray-500">You Receive</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            placeholder="0.0"
            className="flex-1 text-3xl bg-transparent"
            disabled
          />
          <TokenSelector />
        </div>
      </div>
      
      {/* Quote Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Rate</span>
          <span>1 ETH = 2,000 USDC</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-500">Price Impact</span>
          <span className="text-green-600">{'<'}0.01%</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-500">Network Fee</span>
          <span>~$2.50</span>
        </div>
      </div>
      
      {/* Swap Button */}
      <button className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
        Swap
      </button>
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 4: UNISWAP INTEGRATION
═══════════════════════════════════════════════════════════════════════════════
*/

// npm install @uniswap/sdk-core @uniswap/v3-sdk

// src/lib/uniswap.ts

import { ethers } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter } from '@uniswap/smart-order-router';

export async function getUniswapQuote(
  inputToken: Token,
  outputToken: Token,
  inputAmount: string,
  provider: ethers.Provider
) {
  // TODO: Implement
  // 1. Create AlphaRouter instance
  // 2. Get best route
  // 3. Return quote with price impact
  
  const router = new AlphaRouter({
    chainId: 1,
    provider: provider as any
  });
  
  const amount = CurrencyAmount.fromRawAmount(
    inputToken,
    ethers.parseUnits(inputAmount, inputToken.decimals).toString()
  );
  
  const route = await router.route(
    amount,
    outputToken,
    TradeType.EXACT_INPUT,
    {
      slippageTolerance: new Percent(50, 10_000), // 0.5%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes
    }
  );
  
  if (!route) throw new Error('No route found');
  
  return {
    outputAmount: route.quote.toFixed(),
    priceImpact: route.estimatedGasUsedQuoteToken.toFixed(),
    route: route.route
  };
}

export async function executeUniswapSwap(
  route: any,
  signer: ethers.Signer
) {
  // TODO: Implement
  // 1. Build transaction from route
  // 2. Get user approval if needed
  // 3. Execute swap
  // 4. Return transaction hash
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 5: JUPITER INTEGRATION
═══════════════════════════════════════════════════════════════════════════════
*/

// src/lib/jupiter.ts

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number
) {
  // TODO: Implement (reuse from Day 34)
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: '50'
  });
  
  const response = await fetch(
    `https://quote-api.jup.ag/v6/quote?${params}`
  );
  
  return response.json();
}

export async function executeJupiterSwap(
  quote: any,
  userPublicKey: string
) {
  // TODO: Implement (reuse from Day 34)
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 6: SLIPPAGE SETTINGS
═══════════════════════════════════════════════════════════════════════════════
*/

// src/components/SlippageSettings.tsx

export function SlippageSettings() {
  // TODO: Implement
  // Preset buttons: 0.1%, 0.5%, 1%
  // Custom input
  // Warning for high slippage
  
  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-3">Slippage Tolerance</h3>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-lg bg-gray-100">0.1%</button>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white">0.5%</button>
        <button className="px-4 py-2 rounded-lg bg-gray-100">1%</button>
        <input
          type="number"
          placeholder="Custom"
          className="px-4 py-2 w-24 rounded-lg border"
        />
      </div>
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 7: TRANSACTION HISTORY
═══════════════════════════════════════════════════════════════════════════════
*/

// src/components/TransactionHistory.tsx

interface SwapTransaction {
  hash: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
}

export function TransactionHistory() {
  // TODO: Implement
  // 1. Fetch user's past swaps
  // 2. Show in table/list
  // 3. Link to block explorer
  // 4. Filter by chain
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recent Swaps</h2>
      
      {/* Transaction list */}
      <div className="divide-y">
        {/* Map through transactions */}
      </div>
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 8: PRICE CHARTS
═══════════════════════════════════════════════════════════════════════════════
*/

// npm install lightweight-charts

// src/components/PriceChart.tsx

import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export function PriceChart({ tokenPair }: { tokenPair: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });
    
    // TODO: Fetch price data
    // TODO: Add to chart
    
    return () => chart.remove();
  }, [tokenPair]);
  
  return <div ref={chartContainerRef} />;
}

/*
═══════════════════════════════════════════════════════════════════════════════
ADVANCED FEATURES (After MVP)
═══════════════════════════════════════════════════════════════════════════════

1. Limit orders
2. Recurring buys (DCA)
3. Portfolio view
4. Price alerts
5. Multi-hop swaps
6. Gas optimization
7. Transaction batching
8. Referral system (earn fees)
9. Analytics dashboard
10. Mobile app

*/

/*
═══════════════════════════════════════════════════════════════════════════════
MONETIZATION IDEAS
═══════════════════════════════════════════════════════════════════════════════

1. Small fee on swaps (0.1-0.3%)
2. Premium features subscription
3. Referral program
4. White-label for other projects
5. API access for developers

With 1000 users doing $100k volume/month at 0.2% fee = $2,000/month revenue!

*/

export {};
