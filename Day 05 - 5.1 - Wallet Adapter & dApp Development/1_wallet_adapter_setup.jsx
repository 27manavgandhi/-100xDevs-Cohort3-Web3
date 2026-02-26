// Lecture Code - 1_wallet_adapter_setup.jsx
// Topic: Setting up Solana Wallet Adapter in a React App
// Day 5.1 - Wallet Adapter & dApp Development
//
// npm install @solana/wallet-adapter-base @solana/wallet-adapter-react
//             @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// ── How the Provider tree works ────────────────────────────────────────────────
//
// ConnectionProvider  ← sets RPC endpoint (Alchemy/Quicknode/devnet)
//   └── WalletProvider  ← manages which wallet is connected
//         └── WalletModalProvider  ← renders the "Select Wallet" modal
//               └── Your App Components
//                     ├── WalletMultiButton     (connect/disconnect button)
//                     ├── WalletDisconnectButton
//                     └── Airdrop, Balance, SendTx, etc.

// ── App.jsx ───────────────────────────────────────────────────────────────────
function App() {
  // Use devnet for development — replace with mainnet endpoint for production
  const endpoint = "https://solana-devnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY";

  // wallets={[]} means auto-detect installed wallets (Phantom, Backpack, Solflare etc.)
  // autoConnect=true will reconnect on page refresh if wallet was previously connected

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>

          {/* Pre-built UI buttons from @solana/wallet-adapter-react-ui */}
          <WalletMultiButton />
          <WalletDisconnectButton />

          {/* Your dApp components go here */}
          {/* <Airdrop /> */}
          {/* <ShowSolBalance /> */}
          {/* <SendTransaction /> */}
          {/* <SignMessage /> */}

        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;

// ── Using wallet hooks in child components ─────────────────────────────────────
//
// import { useWallet, useConnection } from "@solana/wallet-adapter-react";
//
// function MyComponent() {
//   const { publicKey, sendTransaction, signMessage } = useWallet();
//   const { connection } = useConnection();
//
//   if (!publicKey) return <p>Please connect your wallet</p>;
//
//   return <p>Connected: {publicKey.toBase58()}</p>;
// }

/*
KEY CONCEPTS:
- ConnectionProvider: wraps your app with an RPC connection (like a provider in React context)
- WalletProvider: manages wallet state — which wallet is selected, connected, publicKey
- WalletModalProvider: renders the modal UI for selecting a wallet
- WalletMultiButton: pre-built button that shows "Select Wallet" / connected address
- useWallet(): hook to get publicKey, connected, sendTransaction, signMessage, signTransaction
- useConnection(): hook to get the Connection object for RPC calls
- wallets={[]}: pass specific wallet adapters or leave empty for auto-detection
- autoConnect: remembers the last connected wallet and reconnects on page load
*/
