// Project Starter - Portfolio Tracker (Full-Stack Web3 App)
// Day 35.1 - Career Path Planning
//
// This is a complete project scaffold to help you build your first
// impressive portfolio project.
//
// To use:
// 1. Copy this entire structure
// 2. Follow the TODOs in order
// 3. Customize to your style
// 4. Deploy and share!

/*
═══════════════════════════════════════════════════════════════════════════════
PROJECT OVERVIEW
═══════════════════════════════════════════════════════════════════════════════

Name: Web3 Portfolio Tracker
Description: Track multiple wallets across chains with real-time prices
Tech Stack:
  - Frontend: Next.js 14, TypeScript, Tailwind CSS
  - State: React Context + Local Storage
  - Web3: Ethers.js, @solana/web3.js
  - APIs: Alchemy, Jupiter, CoinGecko
  - Deployment: Vercel

Features:
  ✅ Add multiple wallets (Ethereum + Solana)
  ✅ Track portfolio value across chains
  ✅ Real-time price updates
  ✅ Transaction history
  ✅ Token holdings breakdown
  ✅ Portfolio charts
  ✅ Export to CSV

Why This Project?
  1. Shows you can work with multiple chains
  2. Demonstrates frontend + Web3 integration
  3. Real user value (people actually want this!)
  4. Can be extended endlessly
  5. Great for interviews
*/

/*
═══════════════════════════════════════════════════════════════════════════════
PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

portfolio-tracker/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── .env.local
├── public/
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── analytics/
│   │       └── page.tsx
│   ├── components/
│   │   ├── WalletCard.tsx
│   │   ├── PortfolioChart.tsx
│   │   ├── TokenList.tsx
│   │   ├── AddWalletModal.tsx
│   │   └── TransactionHistory.tsx
│   ├── lib/
│   │   ├── ethereum.ts
│   │   ├── solana.ts
│   │   ├── prices.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── context/
│       └── PortfolioContext.tsx
└── tests/
    └── wallet.test.ts

*/

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 1: SETUP (Week 1, Day 1-2)
═══════════════════════════════════════════════════════════════════════════════
*/

// Initialize Next.js project
// npx create-next-app@latest portfolio-tracker --typescript --tailwind --app

// Install dependencies
// npm install ethers @solana/web3.js recharts date-fns

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 2: TYPES (Week 1, Day 2)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/types/index.ts

export type Chain = 'ethereum' | 'solana';

export interface Wallet {
  id: string;
  address: string;
  chain: Chain;
  name: string;
  addedAt: Date;
}

export interface TokenHolding {
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price: number;
  value: number;
  chain: Chain;
  logo?: string;
}

export interface Portfolio {
  wallets: Wallet[];
  totalValue: number;
  holdings: TokenHolding[];
  lastUpdated: Date;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  timestamp: Date;
  chain: Chain;
  status: 'success' | 'failed' | 'pending';
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 3: ETHEREUM INTEGRATION (Week 1, Day 3-4)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/lib/ethereum.ts

import { ethers } from 'ethers';
import { TokenHolding, Transaction } from '@/types';

// TODO: Add your Alchemy API key
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
);

export async function getEthereumBalance(address: string): Promise<number> {
  // TODO: Implement
  // 1. Get ETH balance
  // 2. Convert from wei to ETH
  // 3. Return as number
  
  const balanceWei = await provider.getBalance(address);
  return parseFloat(ethers.formatEther(balanceWei));
}

export async function getERC20Holdings(
  address: string
): Promise<TokenHolding[]> {
  // TODO: Implement
  // 1. Use Alchemy API to get token balances
  // 2. Fetch token metadata (symbol, decimals)
  // 3. Get prices from CoinGecko
  // 4. Calculate values
  // 5. Return array of TokenHolding
  
  // Hint: Use Alchemy's getTokenBalances API
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'alchemy_getTokenBalances',
      params: [address],
      id: 1
    })
  });
  
  const data = await response.json();
  
  // Process and return
  return []; // Replace with actual implementation
}

export async function getEthereumTransactions(
  address: string,
  limit: number = 10
): Promise<Transaction[]> {
  // TODO: Implement
  // 1. Use Etherscan API or Alchemy
  // 2. Fetch recent transactions
  // 3. Format to Transaction type
  // 4. Return array
  
  return []; // Replace with actual implementation
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 4: SOLANA INTEGRATION (Week 1, Day 4-5)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/lib/solana.ts

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenHolding, Transaction } from '@/types';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

export async function getSolanaBalance(address: string): Promise<number> {
  // TODO: Implement
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export async function getSPLTokenHoldings(
  address: string
): Promise<TokenHolding[]> {
  // TODO: Implement
  // 1. Get all token accounts
  // 2. Fetch metadata
  // 3. Get prices from Jupiter
  // 4. Calculate values
  
  const publicKey = new PublicKey(address);
  
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  
  // Process and return
  return []; // Replace with actual implementation
}

export async function getSolanaTransactions(
  address: string,
  limit: number = 10
): Promise<Transaction[]> {
  // TODO: Implement
  const publicKey = new PublicKey(address);
  
  const signatures = await connection.getSignaturesForAddress(
    publicKey,
    { limit }
  );
  
  // Process and return
  return []; // Replace with actual implementation
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 5: PRICE FETCHING (Week 1, Day 5-6)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/lib/prices.ts

export async function getTokenPrice(
  symbol: string,
  chain: 'ethereum' | 'solana'
): Promise<number> {
  // TODO: Implement
  // Use CoinGecko API or Jupiter API
  
  if (chain === 'ethereum') {
    // Use CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[symbol]?.usd || 0;
  } else {
    // Use Jupiter for Solana
    // Implement Jupiter price fetch
    return 0;
  }
}

export async function getBatchPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  // TODO: Implement batch price fetching
  const prices: Record<string, number> = {};
  
  // Batch fetch for efficiency
  
  return prices;
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 6: CONTEXT & STATE MANAGEMENT (Week 2, Day 1-2)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/context/PortfolioContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Wallet, Portfolio } from '@/types';

interface PortfolioContextType {
  portfolio: Portfolio;
  addWallet: (wallet: Wallet) => void;
  removeWallet: (walletId: string) => void;
  refreshPortfolio: () => Promise<void>;
  loading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    wallets: [],
    totalValue: 0,
    holdings: [],
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(false);
  
  // TODO: Implement
  // 1. Load wallets from localStorage on mount
  // 2. Fetch balances for all wallets
  // 3. Update portfolio state
  
  const addWallet = (wallet: Wallet) => {
    // TODO: Implement
    // 1. Add to portfolio.wallets
    // 2. Save to localStorage
    // 3. Refresh portfolio
  };
  
  const removeWallet = (walletId: string) => {
    // TODO: Implement
  };
  
  const refreshPortfolio = async () => {
    // TODO: Implement
    // 1. For each wallet, fetch balances
    // 2. Aggregate all holdings
    // 3. Calculate total value
    // 4. Update state
  };
  
  return (
    <PortfolioContext.Provider value={{
      portfolio,
      addWallet,
      removeWallet,
      refreshPortfolio,
      loading
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider');
  return context;
}

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 7: COMPONENTS (Week 2, Day 3-7)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/components/WalletCard.tsx

'use client';

import { Wallet } from '@/types';

export function WalletCard({ wallet }: { wallet: Wallet }) {
  // TODO: Implement
  // Display wallet address, chain, balance
  // Add remove button
  // Show last updated
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{wallet.name}</h3>
          <p className="text-sm text-gray-500">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>
        <span className="text-xs px-2 py-1 bg-blue-100 rounded">
          {wallet.chain}
        </span>
      </div>
      {/* Add more details */}
    </div>
  );
}

// src/components/PortfolioChart.tsx
// TODO: Implement using recharts
// Show portfolio value over time

// src/components/TokenList.tsx
// TODO: Implement
// Show all tokens across all wallets

// src/components/AddWalletModal.tsx
// TODO: Implement
// Form to add new wallet

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 8: PAGES (Week 3)
═══════════════════════════════════════════════════════════════════════════════
*/

// src/app/page.tsx - Landing page
// src/app/dashboard/page.tsx - Main portfolio view
// src/app/analytics/page.tsx - Charts and analytics

/*
═══════════════════════════════════════════════════════════════════════════════
STEP 9: POLISH & DEPLOY (Week 4)
═══════════════════════════════════════════════════════════════════════════════

1. Add loading states
2. Error handling
3. Responsive design
4. Dark mode
5. Export to CSV feature
6. Share portfolio feature
7. Write tests
8. Deploy to Vercel
9. Write README
10. Share on Twitter!

*/

/*
═══════════════════════════════════════════════════════════════════════════════
FEATURES TO ADD LATER (After MVP)
═══════════════════════════════════════════════════════════════════════════════

1. Price alerts
2. Portfolio history tracking
3. Multiple portfolios
4. Profit/loss tracking
5. Transaction categorization
6. Tax reporting
7. NFT support
8. DeFi position tracking
9. Cross-chain swaps
10. Portfolio sharing

*/

/*
═══════════════════════════════════════════════════════════════════════════════
README TEMPLATE
═══════════════════════════════════════════════════════════════════════════════

# Web3 Portfolio Tracker

Track your cryptocurrency portfolio across Ethereum and Solana chains.

## Features

- 🔗 Multi-chain support (Ethereum + Solana)
- 💰 Real-time portfolio valuation
- 📊 Holdings breakdown by token
- 📈 Historical performance charts
- 📱 Responsive design
- 🌙 Dark mode support

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Web3**: Ethers.js, @solana/web3.js
- **APIs**: Alchemy, Jupiter, CoinGecko
- **Deployment**: Vercel

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Add your API keys
5. Run dev server: `npm run dev`

## Environment Variables

```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

## Screenshots

[Add screenshots here]

## Demo

[Live demo link]

## Roadmap

- [ ] NFT support
- [ ] DeFi position tracking
- [ ] Price alerts
- [ ] Tax reporting

## Contributing

Contributions welcome! Please open an issue first.

## License

MIT

*/

export {}; // Make this a module
