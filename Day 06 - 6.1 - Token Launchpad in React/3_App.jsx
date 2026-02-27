// Lecture Code - 3_App.jsx
// Topic: App.jsx — Wallet Adapter setup for Token Launchpad
// Day 6.1 - Token Launchpad in React
//
// Ref: https://github.com/anza-xyz/wallet-adapter/blob/master/APP.md
// Final code ref: https://github.com/100xdevs-cohort-3/week-6-web3-token-launchpad/blob/main/2-token-launchpad-with-adapter/src/App.jsx

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { TokenLaunchpad } from './TokenLaunchpad';

// ── App.jsx ───────────────────────────────────────────────────────────────────
// Provider hierarchy (order matters!):
//
//  ConnectionProvider   ← sets the RPC endpoint
//    WalletProvider     ← manages wallet connection state
//      WalletModalProvider  ← renders the "Select Wallet" popup
//        App UI         ← your components here

function App() {
  // Use devnet for development
  // Replace with mainnet-beta endpoint for production:
  // "https://api.mainnet-beta.solana.com" or Alchemy/Quicknode URL
  const endpoint = "https://api.devnet.solana.com";

  return (
    <div>
      <ConnectionProvider endpoint={endpoint}>
        {/*
          wallets={[]} → auto-detects all installed wallets (Phantom, Backpack, etc.)
          autoConnect  → reconnects on page refresh if wallet was previously connected
        */}
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>

            {/* Top navigation bar with connect/disconnect buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 20
            }}>
              {/* WalletMultiButton: shows "Select Wallet" / connected address */}
              <WalletMultiButton />
              {/* WalletDisconnectButton: disconnects the wallet */}
              <WalletDisconnectButton />
            </div>

            {/* Main app — TokenLaunchpad uses useWallet() and useConnection() */}
            <TokenLaunchpad />

          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

export default App;

// ── vite.config.ts — add nodePolyfills ───────────────────────────────────────
//
// Some @solana packages use Node.js APIs (Buffer, crypto) not available in browsers.
// vite-plugin-node-polyfills patches these.
//
// npm install --save-dev vite-plugin-node-polyfills
//
// vite.config.ts:
// ─────────────────────────────────────────────────
// import { defineConfig } from 'vite'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
//
// export default defineConfig({
//   plugins: [
//     nodePolyfills(),
//   ],
// })
// ─────────────────────────────────────────────────

/*
KEY CONCEPTS:
- ConnectionProvider: must wrap everything — provides the RPC connection to all child hooks
- WalletProvider: manages which wallet is connected, publicKey, signTransaction
- WalletModalProvider: renders the wallet selection modal when user clicks connect
- wallets={[]}: Wallet Adapter auto-detects any installed Solana wallet extensions
- autoConnect: remembers last session — user doesn't have to reconnect every visit
- WalletMultiButton: all-in-one button — shows "Select Wallet", then wallet address once connected
- WalletDisconnectButton: simple disconnect button
- vite-plugin-node-polyfills: required because @solana/web3.js uses Node.js built-ins
*/
