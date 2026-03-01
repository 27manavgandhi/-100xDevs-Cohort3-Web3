// Lecture Code - 2_RequestAirdrop_and_ShowSolBalance.jsx
// Topic: Airdrop devnet SOL + show SOL balance
// Day 8.1 - Solana Blockchain Deep Dive, Token Program, PDAs & DApps

import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";

// ── RequestAirdrop ────────────────────────────────────────────────────────────
// Devnet-only: request free SOL for testing
// useWallet() → get connected wallet's publicKey
// useConnection() → get the RPC connection
// connection.requestAirdrop(publicKey, lamports) → request SOL airdrop

export function RequestAirdrop() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState("");

  async function requestAirdrop() {
    if (!wallet.publicKey) {
      setStatus("Connect your wallet first!");
      return;
    }

    const amount = document.getElementById("amount").value;
    if (!amount || isNaN(amount) || amount <= 0) {
      setStatus("Enter a valid amount (max 2 SOL)");
      return;
    }

    try {
      setStatus("Requesting airdrop...");
      // requestAirdrop takes LAMPORTS (not SOL)
      // 1 SOL = 1,000,000,000 lamports = LAMPORTS_PER_SOL
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        amount * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig);
      setStatus(`✅ Airdropped ${amount} SOL to ${wallet.publicKey.toBase58()}`);
    } catch (err) {
      setStatus(`❌ Airdrop failed: ${err.message}`);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>Request Airdrop (Devnet)</h3>
      <br/><br/>
      <input id="amount" type="text" placeholder="Amount (SOL)" />
      <button onClick={requestAirdrop}>Request Airdrop</button>
      {status && <p>{status}</p>}
    </div>
  );
}

// ── ShowSolBalance ────────────────────────────────────────────────────────────
// connection.getBalance(publicKey) → returns balance in lamports
// Divide by LAMPORTS_PER_SOL to convert to SOL
// getBalance() is called automatically on mount via the function call inside render

export function ShowSolBalance() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [balance, setBalance] = useState(null);

  async function getBalance() {
    if (wallet.publicKey) {
      const lamports = await connection.getBalance(wallet.publicKey);
      // Update the DOM directly (lecture style) OR use state (better practice)
      document.getElementById("balance").innerHTML = lamports / LAMPORTS_PER_SOL;
      setBalance(lamports / LAMPORTS_PER_SOL);
    }
  }

  // Auto-fetch balance when component renders
  // Note: In production, use useEffect with wallet.publicKey as dependency
  getBalance();

  return (
    <div style={{ padding: 20 }}>
      <h3>SOL Balance</h3>
      <p>SOL Balance: </p>
      <div id="balance"></div>
      {balance !== null && <p>{balance.toFixed(4)} SOL</p>}
    </div>
  );
}

/*
KEY CONCEPTS:
- useWallet(): returns { publicKey, connected, sendTransaction, signMessage }
- useConnection(): returns { connection } — the active RPC Connection
- connection.requestAirdrop(pubkey, lamports) — devnet only, rate limited
- connection.getBalance(pubkey) — returns current lamports (integer)
- LAMPORTS_PER_SOL = 1_000_000_000 — always use this constant for conversions
- connection.confirmTransaction(sig) — wait for tx to land on-chain before alerting
*/
