// Lecture Code - 1_App.jsx
// Topic: Full DApp setup — App.jsx with Wallet Adapter providers
// Day 8.1 - Solana Blockchain Deep Dive, Token Program, PDAs & DApps
//
// npm install @solana/wallet-adapter-base @solana/wallet-adapter-react
//             @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
//             @solana/web3.js react

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

// Import your components
import { RequestAirdrop } from './RequestAirdrop';
import { ShowSolBalance } from './ShowSolBalance';
import { SendTokens } from './SendTokens';
import { SignMessage } from './SignMessage';

// ── DApp Flow ─────────────────────────────────────────────────────────────────
// 1. First load → user sees "Select Wallet" button
// 2. Click → popup shows all installed wallets (Phantom, Backpack, etc.)
// 3. Click on wallet → wallet popup asks permission
// 4. DApp gets the PUBLIC KEY only — never the private key
// 5. Now all hooks (useWallet, useConnection) work in child components

function App() {
  // WalletAdapterNetwork.Devnet → uses "https://api.devnet.solana.com"
  // Change to WalletAdapterNetwork.Mainnet for production
  const network = WalletAdapterNetwork.Devnet;

  // useMemo ensures we don't re-create the endpoint on every render
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  return (
    // ConnectionProvider: sets the RPC endpoint for all child hooks
    <ConnectionProvider endpoint={endpoint}>

      {/* WalletProvider: manages wallet connection state */}
      {/* wallets={[]} = auto-detect all installed wallets */}
      {/* autoConnect = reconnect on page refresh */}
      <WalletProvider wallets={[]} autoConnect>

        {/* WalletModalProvider: renders the wallet selection modal */}
        <WalletModalProvider>

          {/* Top bar with connect/disconnect buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20 }}>
            <WalletMultiButton />       {/* Shows "Select Wallet" / connected address */}
            <WalletDisconnectButton />  {/* Disconnects the wallet */}
          </div>

          {/* App components — each uses useWallet() and useConnection() */}
          <RequestAirdrop />   {/* Airdrop devnet SOL to connected wallet */}
          <ShowSolBalance />   {/* Display connected wallet's SOL balance */}
          <SendTokens />       {/* Send SOL to another address */}
          <SignMessage />      {/* Sign and verify a message */}

        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;

/*
KEY CONCEPTS:
- WalletAdapterNetwork.Devnet → devnet RPC
- clusterApiUrl(network) → returns the correct RPC URL for the network
- wallets={[]} → auto-detects Phantom, Backpack, Solflare, etc.
- autoConnect → reconnects last used wallet on page reload
- DApp only receives publicKey when user connects — private key stays in wallet
- All child components access wallet via useWallet() hook
- All child components access RPC via useConnection() hook
*/
