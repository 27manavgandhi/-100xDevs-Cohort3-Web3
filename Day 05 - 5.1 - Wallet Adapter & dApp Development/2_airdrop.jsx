// Lecture Code - 2_airdrop.jsx
// Topic: Requesting SOL Airdrop on Devnet using Wallet Adapter
// Day 5.1 - Wallet Adapter & dApp Development
// Inspired by: https://solfaucet.com/

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";

// ── Airdrop Component ─────────────────────────────────────────────────────────
// useConnection() → gives us the RPC connection
// useWallet()     → gives us the connected wallet's publicKey
//
// connection.requestAirdrop(publicKey, lamports) → devnet only!
// 1 SOL = 1,000,000,000 lamports (LAMPORTS_PER_SOL)

export function Airdrop() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendAirdropToUser() {
    if (!wallet.publicKey) {
      setStatus("Please connect your wallet first!");
      return;
    }

    const amount = document.querySelector("input").value;
    if (!amount || isNaN(amount) || amount <= 0) {
      setStatus("Enter a valid amount (max 2 SOL per request)");
      return;
    }

    try {
      setLoading(true);
      setStatus("Requesting airdrop...");

      // requestAirdrop takes lamports (not SOL)
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        parseFloat(amount) * LAMPORTS_PER_SOL
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      setStatus(`✅ Airdrop of ${amount} SOL successful! TX: ${signature.slice(0, 20)}...`);
    } catch (err) {
      setStatus(`❌ Airdrop failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Show connected wallet address
  const shortAddress = wallet.publicKey
    ? wallet.publicKey.toBase58().slice(0, 8) + "..." + wallet.publicKey.toBase58().slice(-6)
    : "Not connected";

  return (
    <div style={{ padding: "20px" }}>
      <h2>🚰 Request Airdrop</h2>
      <p>Connected: <strong>{shortAddress}</strong></p>

      <div>
        <input
          type="number"
          placeholder="Amount (SOL)"
          min="0.1"
          max="2"
          step="0.1"
          style={{ marginRight: "10px", padding: "8px" }}
        />
        <button
          onClick={sendAirdropToUser}
          disabled={loading || !wallet.publicKey}
          style={{ padding: "8px 16px" }}
        >
          {loading ? "Requesting..." : "Request Airdrop"}
        </button>
      </div>

      {status && <p style={{ marginTop: "10px" }}>{status}</p>}

      <small style={{ color: "#888" }}>
        ⚠️ Devnet only. Max 2 SOL per request. Rate limited.
      </small>
    </div>
  );
}

/*
KEY CONCEPTS:
- useWallet() returns: publicKey, connected, sendTransaction, signMessage, signTransaction
- useConnection() returns: { connection } — the active RPC Connection object
- connection.requestAirdrop(publicKey, lamports) — works on devnet only
- Always convert SOL to lamports: amount * LAMPORTS_PER_SOL (1 SOL = 10^9 lamports)
- connection.confirmTransaction(signature) — waits for the tx to land on-chain
- Guard: check wallet.publicKey before making any RPC calls
*/
