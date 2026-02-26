// Lecture Code - 3_balance_and_send.jsx
// Topic: Show SOL Balance + Send SOL Transaction via Wallet Adapter
// Day 5.1 - Wallet Adapter & dApp Development

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useState } from "react";

// ── Show SOL Balance ───────────────────────────────────────────────────────────
// connection.getBalance(publicKey) returns lamports
// Divide by LAMPORTS_PER_SOL to get SOL

export function ShowSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  async function getBalance() {
    if (!publicKey) return alert("Connect wallet first");

    setLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      alert("Error fetching balance: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>💰 SOL Balance</h2>
      <button onClick={getBalance} disabled={loading}>
        {loading ? "Fetching..." : "Get Balance"}
      </button>
      {balance !== null && (
        <p>Balance: <strong>{balance.toFixed(4)} SOL</strong></p>
      )}
    </div>
  );
}

// ── Send SOL Transaction ───────────────────────────────────────────────────────
// wallet.sendTransaction(tx, connection) — the wallet signs and sends the tx
// This pops up the Phantom/Backpack approval modal for the user
//
// Steps:
// 1. Build a Transaction with SystemProgram.transfer instruction
// 2. Set recentBlockhash (required by Solana for replay protection)
// 3. Set feePayer (who pays the transaction fee)
// 4. wallet.sendTransaction() — wallet signs + broadcasts

export function SendTransaction() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [txSig, setTxSig] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendTransaction() {
    if (!wallet.publicKey) return alert("Connect wallet first");

    const toAddress = document.getElementById("send-to").value.trim();
    const amount = parseFloat(document.getElementById("send-amount").value);

    if (!toAddress || isNaN(amount) || amount <= 0) {
      return alert("Enter a valid address and amount");
    }

    try {
      setLoading(true);
      let toPubkey;
      try {
        toPubkey = new PublicKey(toAddress);
      } catch {
        return alert("Invalid Solana address");
      }

      // Build the transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey,
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      );

      // Set required fields
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // wallet.sendTransaction() prompts user approval in their wallet (Phantom etc.)
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      setTxSig(signature);
      alert(`✅ Sent ${amount} SOL!\nTX: ${signature}`);
    } catch (err) {
      alert("❌ Transaction failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>💸 Send SOL</h2>
      <div>
        <input
          id="send-to"
          type="text"
          placeholder="Recipient address"
          style={{ display: "block", marginBottom: "8px", padding: "8px", width: "400px" }}
        />
        <input
          id="send-amount"
          type="number"
          placeholder="Amount (SOL)"
          min="0.000001"
          step="0.01"
          style={{ display: "block", marginBottom: "8px", padding: "8px" }}
        />
        <button onClick={sendTransaction} disabled={loading}>
          {loading ? "Sending..." : "Send SOL"}
        </button>
      </div>
      {txSig && (
        <p>
          TX:{" "}
          <a
            href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            {txSig.slice(0, 20)}...
          </a>
        </p>
      )}
    </div>
  );
}

/*
KEY CONCEPTS:
- connection.getBalance(publicKey) → returns lamports (integer)
- SystemProgram.transfer({fromPubkey, toPubkey, lamports}) → transfer instruction
- transaction.recentBlockhash → required, prevents replay attacks (expires after ~150 slots)
- transaction.feePayer → who pays the ~0.000005 SOL network fee
- wallet.sendTransaction(tx, connection) → wallet signs tx, broadcasts to network
  → this is what triggers the Phantom approval popup!
- connection.confirmTransaction(signature) → waits for finality
- wallet.signTransaction() vs wallet.sendTransaction():
  - signTransaction: signs only, you broadcast manually
  - sendTransaction: signs AND broadcasts (most common for dApps)
*/
